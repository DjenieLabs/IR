/**
 * Written by Alexander Agudelo < alex.agudelo@asurantech.com >, 2017
 * Date: 08/Jul/2017
 * Last Modified: 08/07/2017, 1:53:07 pm
 * Modified By: Alexander Agudelo
 * Description:  Samsung protocol decoder:
 *      37.9Kz
 *      LeaderA = 4500 (ON)
 *      LeaderB = 4500 (OFF)
 *      Logic1  = 590 + 1690 space
 *      Logic0  = 590 + 590 space
 *      Data    = 32 bits
 *      Stop    = 590 + 590 space 
 * ------
 * Copyright (C) 2017 Asuran Technologies - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential.
 */
define(['helpers'], function(helper){
    function SAMSUNG(){
        // NOTE: Testing with IR Block shows that the
        // actual spacing between code is around 500us
        this.protocol = {
            leaderA: 4500,
            leaderB: 4500,
            logic1:{burst: 550, space: 1660}, 
            logic0:{burst: 550, space: 550},
            end:{burst: 550, space: 550},
            timeout: 84
        };
        
        this.decode = decode;
        this.compare = compare
        return this;
    }

    function compare(c1, c2){
        if(c1.type === 'SAMSUNG' && c2.type === 'SAMSUNG'){
            // We don't care about the address, just the command code
            return c1.command === c2.command;
        }

        return false;
    }
    
    function decode(raw){
        if(helper.inRange(raw[0], this.protocol.leaderA) && helper.inRange(raw[1], this.protocol.leaderB)){
            var res = bitIfy(this.protocol, raw.slice(2));
            if(res){
                this._lastCode = res;
                this._lastAt = helper.millis();
                res.type = 'SAMSUNG';
            }

            return res;
        }

        return false;
    }

    // Custom protocol decoder
    // Converts the given array (p) into
    // a string of bits.
    function bitIfy(p, raw){
        var d = "";
        var bits = 0;
        for(var i = 0; i < raw.length; i+=2){
            if(bits === 32){
                if(helper.inRange(raw[i], p.end.burst) && helper.inRange(raw[i+1], p.end.space)){
                    d += "_";
                }else{
                    d += "E";
                }

                bits = 0;
            }

            if(helper.inRange(raw[i], p.logic1.burst) && helper.inRange(raw[i+1], p.logic1.space)){
                d += "1";
                bits++;
            }else if(helper.inRange(raw[i], p.logic0.burst) && helper.inRange(raw[i+1], p.logic0.space)){
                d += "0";
                bits++;
            }
        }

        var res = {
            string: d.split("_")[0],
            repeat: d.split("_").length-1
        };

        res.code = parseInt(res.string, 2);
        
        return res;
    }

    return new SAMSUNG();
});

