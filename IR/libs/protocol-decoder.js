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
define(['./NEC.js', './RAW.js', './helpers.js'], function(NEC, RAW, helper){
  var Decoder = {};

  // Contains the list of analysers
  // Add new ones to the array
  var analysers = [NEC, /** This analyser should be the last **/ RAW];
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

    console.log("Error analyzing the data: ", raw);
    return false;
  };


  /**
   * Decodes both arrays and then compare them.
   */
  Decoder.compareRawArrays = function(a1, a2){
    var c1 = this.analyse(a1);
    var c2 = this.analyse(a2);
    return this.compareCodes(c1, c2);
  };

  /**
   * Checks for 2 codes based on 
   */
  Decoder.compareCodes = function(c1, c2){
    for(var analyser of analysers){
      var res = analyser.compare(c1, c2);
      if(res){
        return res;
      }
    }

    // console.log("Error comparing the codes: ", c1, c2);
    return false;
  };

  

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
