(function(root, Bitwig) {
    'use strict';

        // CC# for cursor buttons
    var MAX_CHARS = 28,
        SID_START = 20,
        SID_NAV_LEFT = 20,
        SID_NAV_RIGHT = 21,
        SID_END = 21,
        PARAM_PREFIX = 'NIKB',
        PLUGIN_PREFIX = 'Komplete Kontrol',
        SYSEX_HEADER = 'f0 00 00 66 14 12 ',
        SYSEX_SEP = '19 ',
        SYSEX_EOX = 'f7';

    var FocusController = function(midiOut, cursorTrack, primaryDevice) {
        this.midiOut = midiOut;
        this.track = cursorTrack;
        this.device = primaryDevice;
        this.status = {};
        this.elements = [];
        this.initialize();
    };

    FocusController.prototype = {
        initialize: function() {
            var track = this.track,
                device = this.device,
                status = this.status;
            
            track.addNameObserver(MAX_CHARS, '', function(value) {
                status.track = value;
                status.hasChanged = true;
            });

            track.addPositionObserver(function(value) {
                status.trackPosition = value;
                status.hasChanged = true;
            });

            device.addNameObserver(MAX_CHARS, '', function(value) {
                status.device = value;
                status.hasChanged = true;
            });

            this.createElement(SID_NAV_LEFT, {
                on: function() {track.selectPrevious();}
            });

            this.createElement(SID_NAV_RIGHT, {
                on: function() {track.selectNext();}
            });
        },

        onMidi: function(s, d1, d2) {
            if (s === 0xB0) {this.onMidiCC(d1, d2);}
        },

        onMidiCC: function(d1, d2) {
            var btn = (d1 >= SID_START && d1 <= SID_END) ? this.elements[d1 - SID_START] : undefined,
                on = d2 !== 0;
            btn && (on ? (btn.on && btn.on.call(this)) : (btn.off && btn.off.call(this)));
        },

        flush: function() {
            var status = this.status;
            if(status.hasChanged) {
                root.println('## flush track:[' + status.track + '] position[' + status.trackPosition + '] device[' + status.device + ']');
                this.midiOut.sendSysex(this.createStatuExMsg());
                status.hasChanged = false;
            }
        },

        exit: function() {
        },

        createElement: function(cc, button) {
            this.elements[cc - SID_START] = button;
        },

        createStatuExMsg: function() {
            var exmsg = SYSEX_HEADER + '00 ',
                status = this.status;
            exmsg += encode(status.track);
            exmsg += SYSEX_SEP;
            exmsg += encode(status.trackPosition.toString());
            if (status.device && status.device.length > 0) {
                exmsg += SYSEX_SEP;
                exmsg += encode(status.device);
                exmsg += SYSEX_SEP;
                var id = (101 + status.trackPosition).toString().substring(1);
                exmsg += encode(id);
            }
            exmsg += SYSEX_EOX;
            root.println('## ex:[' + exmsg + ']');
            return exmsg;
        }
    };

    // string to 7bit encodeed hex string
    function encode(s) {
        var c,str = '';
        if (s) {
            for (var i = 0; i < s.length; i++) {
                c = s.charCodeAt(i);
                // none ascii char to underscore
                c > 0x7F && (c = 0x5F);
                str += c > 0x0f ? c.toString(16) : ('0' + c.toString(16));
                str += ' ';
            }
        }
        return str;
    }


    // export
    root.controller || (root.controller = {});
    root.controller.FocusController = FocusController;
}(this, host));
