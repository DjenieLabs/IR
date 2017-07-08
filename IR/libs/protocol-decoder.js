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

  var NEC = requirejs('NEC');
  var helper = requirejs('helper');

  // Contains the list of analysers
  // Add new ones to the array
  var analysers = [NEC];
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
      var res = analyser.decode(raw);
      if(res){
        return res;
      }
    }

    // At this point the protocol decoder hasn't been implemented
    // Try a basic pattern decoding
    var p = Decoder.findPattern(raw);
    return {
      type: 'RAW',
      string: p
    }
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
        var n =helper.inRange(value, min);
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
    // Some protocols only send a repeat sequence after the first
    // command so we need to exclude those
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
    // Convert into binary and eliminate overflows
    var burstListBinary = toBinary(arr, burst);
    // console.log(burstListBinary);
    // Take only the first sequence
    var baseFormat = burstListBinary.split("__"); 
    var repeats = baseFormat.length-1;
    var longest = getLongest(baseFormat);
    var uniqueSequence = longest.replace(/_/g, '');

    return uniqueSequence;
  };


  /**
   * Compares 2 arrays based on average burst.
   * Extracts the unique sequence from each array
   * and compares them both.
   * @param a1 is the code to compare
   * @param a2 is the stored code to compare against
   * @returns true if both arrays contain the same
   * sequence.
   */
  Decoder.compareRawArrays = function(a1, a2){
    var s1 = Decoder.findPattern(a1);
    var s2 = Decoder.findPattern(a2);
    console.log("S1: ", s1);
    console.log("S2: ", s2);
    if(!s1 || !s2) return false; 

    return s1 === s2;
  };

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
  

  function Samsung(raw){
    /* Tested with Soundbar Remote: AH59-02692E */

    var burst = 590;
    var leaderA = 4500; // 4.5ms ON
    var leaderB = 4500; // 4.5ms OFF
    var freq = 38;      // 38khz carrier wave
    var on = 1690;      // 1.69ms after Burst
    var off = 590;      // 0.59ms after burst

    // Check for sings of the protocol
    if(helper.inRange(raw[0], leaderA) && helper.inRange(raw[1], leaderB)){
      // So far so good. Check for a pause BIT after the first 32 bits
      // after the start bursts (leaderA, leaderB)

      if(helper.inRange(raw[35], leaderA)){
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
