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
define(['NEC', 'RAW', 'SAMSUNG', 'helpers'], function(NEC, RAW, SAMSUNG, helper){
  var Decoder = {};

  // Contains the list of analysers
  // Add new ones to the array
  var analysers = [NEC, SAMSUNG,/** This analyser should be the last **/ RAW];
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
    // console.log("A1: %s, A2: %s", c1.type, c2.type);
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



  return Decoder;
});
