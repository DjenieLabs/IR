/**
 * Written by Alexander Agudelo < alex.agudelo@asurantech.com >, 2017
 * Date: 08/Jul/2017
 * Last Modified: 08/07/2017, 11:35:13 am
 * Modified By: Alexander Agudelo
 * Description:  Decoding of raw timing arrays. This module assumes the given
 * array is not supported by any of the implemented protocols, instead it 
 * performs a basic string matching based on the binary data.
 * 
 * ------
 * Copyright (C) 2017 Asuran Technologies - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential.
 */
define(function(){
    var helper = requirejs('helper');

    function RAW(){
        this.decode = decode;
        this.compare = compare;
        return this;
    }

    function decode(raw){
        var p =  findPattern(raw);
        return {
            type: 'RAW',
            string: p
        };   
    }
    
    function compare(c1, c2){
        if(c1.type === 'RAW' && c2.type === 'RAW'){
            return c1.string === c2.string;
        }

        return false;
    };
    
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
    
    /**
     * Finds a common pattern in the given array
     * of timing 
     */
    function findPattern(arr){
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
                var n = helper.inRange(value, min);
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

    // function findSequence(str) {
    //     return String(str).match(/([^_]+)(?=.*?\1)/g);
    // }
    
    return new RAW();
});