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
    };

    return raw;
  };

  /**
   * Encodes pre-formated messages
   */
  Decoder.formatForSending = function(value, format){
    // TODO: finish this
  };

  function toBinary(arr){
    var str = "";
    arr.forEach(function(value){
      let n = Math.round(value);
      if(value <= 0){
        str += "0";
      }else{
        str += n;
      }
    });
    console.log("%s\n", str);
  };

  /**
   * Compares 2 arrays based on average burst
   * and value ranges only.
   * @returns true if both arrays contain the same
   * data.
   */
  Decoder.compareRawArrays = function(a1, a2){
    var burst = _detectBurst(a1);
    var arr1 = _arrayToBurstList(a1, burst);
    console.log("Arr1:");
    toBinary(arr1);
    var arr2 = _arrayToBurstList(a2, burst);
    console.log("Arr2:");
    toBinary(arr2);
    console.log("\n\n");
    var match = arr1.every(function(item, index){
      if(_inRange(item, arr2[index])){
        return true;
      }else{
        return false;
      }
    });
    
    return match;
  };


  // Check if a is within a pre-defined range of b.
  function _inRange(a, b){
    if( ((b * 0.7) < a) && (a < (b * 1.3) ) ){
      return true;
    }

    return false;
  }

  // Find the smallest value in the array
  function _detectBurst(raw){
    var smallest = Infinity;
    for(var number of raw){
      if(number < smallest){
        smallest = number;
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
