(function(root, Bitwig, _) {
    'use strict';

    var SYSEX_HEADER = 'f0 00 00 66 14 12 ',
        SYSEX_SEP = '19 ',
        SYSEX_EOX = 'f7',
        MAX_CHARS = 28;
    
    
    var utils = {
        statusMessage: function(ary) {
            var items = _.map(ary, utils.encode);
            return SYSEX_HEADER + '00 ' + items.join(SYSEX_SEP) + SYSEX_EOX;
        },

        displlayMessage: function(grid, text) {
            var t = text ? utils.encode(text.substr(0, MAX_CHARS)) : '';
            while(t.length < MAX_CHARS * 3) { t += '20 ';}
            return SYSEX_HEADER + utils.hex(Math.min(grid,3)*28) + t + SYSEX_EOX;
        },

        // string to 7bit encodeed hex string
        encode: function(s) {
            var c,str = '', i = 0;
            if (s && s.length) {
                for (; i < s.length; i++) {
                    c = s.charCodeAt(i);
                    // none ascii char to underscore
                    str += c > 0x7F ? '5f ' : utils.hex(c);
                }
            }
            return str;
        },

        hex: function(c) {
            return (c < 0x10 ? ('0' + c.toString(16)) : c.toString(16)) + ' ';
        }
    };


    // export
    root.KompleteKontrol || (root.KompleteKontrol = {});
    root.KompleteKontrol.utils = utils;
}(this, host, _));
