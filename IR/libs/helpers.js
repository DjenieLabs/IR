/**
 * Written by Alexander Agudelo < alex.agudelo@asurantech.com >, 2017
 * Date: 08/Jul/2017
 * Last Modified: 08/07/2017, 10:54:19 am
 * Modified By: Alexander Agudelo
 * Description:  Helper methods for decoders
 * 
 * ------
 * Copyright (C) 2017 Asuran Technologies - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential.
 */

define(function(){
    /**
     * @returns true if the value 'a' is in a pre-defined rangse of 'b'
     */

    return {
        inRange: function(a, b){
            if( (Number(a) > (Number(b) * 0.7)) && (Number(a) < (Number(b) * 1.3) ) ){
                return true;
            }

            return false;
        },
        // returns the current time in milliseconds
        millis: function(){
            return new Date().getTime();
        },

        isNumeric: function(n) {
            return !isNaN(parseFloat(n)) && isFinite(n);
        }
    }
});
