/**
 * Written by Alexander Agudelo < alex.agudelo@asurantech.com >, 2017
 * Date: 08/Jul/2017
 * Last Modified: 08/07/2017, 11:11:26 am
 * Modified By: Alexander Agudelo
 * Description:  Decoder for the NEC protocol:
 *      9ms burst (16 times length of a logical data bit)
 *      4.5 ms space
 *      8 bits address
 *      8 bits reverse address
 *      8 bits command
 *      8 bits reverse of command
 *      562.5uS end of message
 *
 *      Repeat codes: 9ms burst + 2.25ms space + 562.5 end of message
 *      Logic 0: 562.5us pulse + 562.5us space (total transmit = 1.125ms)
 *      Logic 1: 562.5us pulse + 1687us space (total transmit = 2.25ms)
 *      total Message: 67.5
 *      Total length time: 108ms
 * 
 * ------
 * Copyright (C) 2017 Asuran Technologies - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential.
 */
define(function(){
    var h = requirejs('helper');
    
    function NEC(){
        this.protocol = {
            logic1:{burst: 562.5, space: 1687}, 
            logic0:{burst: 562.5, space: 562.5},
            end: 562.5,
            totalMessage: 108000, /* The duration of a full message */
            totalData: 67500,    /* The duration of just the data */
            repeat:{burst: 9000, space: 2250, end: 562.5}
        };

        this.decode = decode;
        this.compare = compare;
            
        return this;
    }

    function compare(c1, c2){
        if(c1.type === 'NEC' && c2.type === 'NEC'){
            // We don't care about the address, just the command code
            return c1.command === c2.command;
        }

        return false;
    }

    function decode(raw){
        if(h.inRange(raw[0], 9000)){
            if(h.inRange(raw[1], 4500)){
                var res = bitIfy(
                    this.protocol.logic1,
                    this.protocol.logic0,
                    this.protocol.end,
                    this.protocol.totalMessage-this.protocol.totalData,
                    this.protocol.repeat,
                    raw.slice(2)
                );

                if(res){
                    // we use 4 bit address + 4 bit command
                    res.address = parseInt(res.string.substr(0, 8), 2);
                    res.command = parseInt(res.string.substr(16, 8), 2);
                    res.type = 'NEC'
                    // Store the code
                    this._lastCode = res;
                    this._lastAt = h.millis();
                }
                
                return res;
            }
        }

        return false;
    }

    /**
     * converts an array of timing values
     * into a string of binary data
     * @param logic1 & logic0 are objects
     * that contains burst + space parameters
     * @param end is the timing value that represents
     * the end of the message
     * @param spaceBetween is the timing between a message
     * ends and the next one starts
     * @param repeat is an object with burst, space and end
     * @param raw is the array to analyze
     * @param returns a string
     */ 
    function bitIfy(logic1, logic0, end, spaceBetween, repeat, raw){
        var d = "";
        for(var i = 0; i < raw.length; i+=2){
            if(h.inRange(raw[i], logic1.burst) && h.inRange(raw[i+1], logic1.space)){
                d+= "1";
            }else if(h.inRange(raw[i], logic0.burst) && h.inRange(raw[i+1], logic0.space)){
                d+= "0";
            }else if(h.inRange(raw[i], end) && h.inRange(raw[i+1], spaceBetween)){
                d+= "_";
            }else if(h.inRange(raw[i], repeat.burst) && h.inRange(raw[i+1], repeat.space)){
                d += "R";
                // In NEC, the space between is the same as in messages, so the above cases
                // also covers spaces between repeat commands
            }
        }

        var res = {
            string: d.split("_")[0],
            repeat: d.split("R").length
        };

        if(res.string.length){
            res.code = parseInt(res.string, 2);
        }else if(res.repeat){
            // Could be a repeat code
            if(this._lastAt && (h.millis() - this._lastAt) < 108){
                res = this._lastCode;
                this._lastAt = h.millis();
            }
        }else{
            console.log("Corrupted NEC data")
            return false;
        }
        

        return res;
    }

    return new NEC();
});