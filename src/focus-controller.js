(function(root, Bitwig, _) {
    'use strict';
    // imports
    var utils = root.KompleteKontrol.utils;

    // constants
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

    // constructor
    var FocusController = function(midiOut, cursorTrack, cursorDevice) {
        // instance variables
        this.midiOut = midiOut;
        this.track = cursorTrack;
        this.device = cursorDevice;
        this.status = {
            track: undefined,   // current selected track name
            device: undefined,  // current selected device name
            id: undefined,      // Komplete Kontrol device id
            hasChanged: false
        };
        this.elements = [];
        this.elements.length = SID_END - SID_START + 1;
        // initialize
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

            // Komplete Kontrol MIKBnn paramater must map top of common paramater.
            // MIKBnn  nn = id of Komplete Kontrol instance.
            device.getCommonParameter(0).addNameObserver(MAX_CHARS, '', function(value) {
                var device = status.device;
                status.id = (device && device.lastIndexOf(PLUGIN_PREFIX) === 0 &&
                             value.lastIndexOf(PARAM_PREFIX) === 0) ?
                    value.substring(PARAM_PREFIX.length) : undefined;
                status.hasChanged = true;
            });

            this.createElement(SID_NAV_LEFT, {
                on: function() {track.selectPrevious();}
            });

            this.createElement(SID_NAV_RIGHT, {
                on: function() {track.selectNext();}
            });
        },

        flush: function() {
            this.sendStatus();
        },

        exit: function() {
        },

        onMidi1: function(s, d1, d2) {
            if (s === 0xB0) {this.onMidiCC(d1, d2);}
        },

        onMidiCC: function(d1, d2) {
            var btn = (d1 >= SID_START && d1 <= SID_END) ? this.elements[d1 - SID_START] : undefined;
            btn && (d2 !== 0 ? (btn.on && btn.on.call(this)) : (btn.off && btn.off.call(this)));
        },

        createElement: function(cc, button) {
            this.elements[cc - SID_START] = button;
        },

        sendStatus: function() {
            var status = this.status;
            if(status.hasChanged) {
                var d = [];
                root.println('## flush track:[' + status.track + 
                             '] position:[' + status.trackPosition + 
                             '] device:[' + status.device + 
                             '] id:[' + status.id + ']');
                d.push(status.track);
                d.push(status.trackPosition.toString());
                // add device name
                if (status.device && status.device.length > 0) {
                    d.push(status.device);
                    // add komplete kontrol instance id.
                    if (status.id) {
                        d.push(status.id);
                    }
                }
                this.midiOut.sendSysex(utils.statusMessage(d));
                status.hasChanged = false;
            }
        }
    };
    // export
    root.KompleteKontrol || (root.KompleteKontrol = {});
    root.KompleteKontrol.FocusController = FocusController;
}(this, host, _));
