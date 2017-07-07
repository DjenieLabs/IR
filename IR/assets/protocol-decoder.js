// ************************************************************************************************************
// Written by Alexander Agudelo <alex.agudelo@asurantech.com>, 2016
// Date: 18/Oct/2016
// Description: Receives RAW data arrays and passes them through a protocol analyser to try to understand
// the meaning of the data.
//
// TODO:
//  - Split decoders to individual files.
//  - Finish Samsung Decoder.
//
// ------
// Copyright (C) Asuran Technologies - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential.
// ************************************************************************************************************
define(function(){
  var Decoder = {};
  // Contains the list of analysers
  // Add new ones to the array
  var analysers = [Samsung];

  /**
   * @returns a formatted structure
   * with the decoded code.
   * - format:String
   * - LeaderA:Number
   * - LeaderB:Number
   * - Logic1:Number
   * - Logic0:Number
   * - Burst:Number
   * - Code:Number      // 32 bit number
   * - Carrier:Number   // Frequency in Khz
   */
  Decoder.analyse = function(raw){
    for(var analyser of analysers){
      var res = analyser(raw);
      if(res.decoded){
        return res;
      }
    }

    return raw;
  };

  // Turns an array with formatted values
  // that are in rage of the givin minimum value,
  // each item becoming 1 or 0 depending on whether
  // they are in or out of a predefined range
  function toBinary(arr, min){
    var str = "";
    arr.forEach(function(value){
      if(Number(value) > min*4){
        str += "_";
      }else{
        var n =_inRange(value, min);
        str += n?"1":"0";
      }
    });
    return str;
  }

  function getLongest(arr){
    var index = 0;
    var selected = 0;
    arr.forEach(function(item){
      if(item.length > index){
        index = item.length;
        selected = item;
      }
    });

    return selected;
  }

  function findSequence(str) {
    return String(str).match(/([^_]+)(?=.*?\1)/g);
  }

  function trimTo(str, bits){
    return str.substr(0, 32);
  }

  /**
   * Finds unique occurrences of a string from list of options
   * in another string separated by a character.
   * @param {*Array} opt is the array of unique options
   * to look for in the string between the separator.
   * @param {*String} str the combined string to analyse
   * @param {*String} sep the separator to look for
   * 
   * TODO: This could be achieved by a Regex more efficiently
   */
  function findCommon(opt, str, sep){
    var res = [];
    var sp = str.split(sep);

    var checkInside = function(word){
      return !sp.some(function(item){
        if(item.trim() !== ""){
          return item.split(word).length !== 2;
        }
      });
    };

    for(var i = 0; i<opt.length; i++){
      if(checkInside(opt[i])){
        res.push(opt[i]);
      }
    }

    return res;
  }

  /**
   * Finds a common pattern in the given array
   * of timing 
   */
  Decoder.findPattern = function(arr){
    var burst = findSmallest(arr);
    // console.log("Burst:", burst);
    // Convert into binary and eliminate overflows
    var burstListBinary = toBinary(arr, burst);
    // console.log('Binary: ', burstListBinary);
    var uniqueSequence = findCommon(findSequence(burstListBinary), burstListBinary, "_");
    if(uniqueSequence.length === 0){
      console.log("Impossible to find a patter");
      return false;
    }

    var longestFromSequence = getLongest(uniqueSequence);
    return longestFromSequence;
  };

  /**
   * Compares 2 arrays based on average burst.
   * Extracts the unique sequence from each array
   * and compares them both.
   * @returns true if both arrays contain the same
   * sequence.
   */
  Decoder.compareRawArrays = function(a1, a2){
    var s1 = Decoder.findPattern(a1);
    var s2 = Decoder.findPattern(a2);
    if(!s1 || !s2) return false; 

    var s1Seq = getLongest(findSequence(s1));
    var s2Seq = getLongest(findSequence(s2));

    return s1Seq === s2Seq;
  };


  // Check if a is within a pre-defined range of b.
  function _inRange(a, b){
    if( (Number(a) > (Number(b) * 0.7)) && (Number(a) < (Number(b) * 1.3) ) ){
      return true;
    }

    return false;
  }

  
  function isNumeric(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
  }

  // Find the smallest value in the array
  function findSmallest(raw){
    var smallest = Infinity;
    for(var number of raw){
      if(Number(number) < Number(smallest)){
        smallest = Number(number);
      }
    }

    return smallest;
  }

  // @returns an array of the given list
  // represented in burst packages.
  function _arrayToBurstList(raw, burst){
    var list = [];
    for(var item of raw){
      list.push(Number(item / burst).toFixed(2));
    }

    return list;
  }

  /*************** Analysers *************/

  function Samsung(raw){
    /* Tested with Soundbar Remote: AH59-02692E */

    var burst = 590;
    var leaderA = 4500; // 4.5ms ON
    var leaderB = 4500; // 4.5ms OFF
    var freq = 38;      // 38khz carrier wave
    var on = 1690;      // 1.69ms after Burst
    var off = 590;      // 0.59ms after burst

    // Check for sings of the protocol
    if(_inRange(raw[0], leaderA) && _inRange(raw[1], leaderB)){
      // So far so good. Check for a pause BIT after the first 32 bits
      // after the start bursts (leaderA, leaderB)

      if(_inRange(raw[35], leaderA)){
        // Stop bit detected, the next 10 bits represent the actual data.
        // The first bit is ignored?

        var code = 0;

        // Pre-build the object
        var response = {
          format: "Samsung",
          carrier: freq,
          leaderA: leaderA,
          leaderB: leaderB,
          burst: burst,
          logic1: on,
          logic2: off,
          code: code
        };

        return response;
      }
    }

    return raw;
  }



  return Decoder;
});
