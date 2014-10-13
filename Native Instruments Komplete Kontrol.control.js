(function(root) {
    'use strict';
    root.loadAPI(1);
}(this));

(function(root, Bitwig) {
    'use strict';

    // switch element
    var SID_START = 86,
        SID_TRANSPORT_LOOP = 86,
        SID_TRANSPORT_REWIND = 91,
        SID_TRANSPORT_FAST_FORWARD = 92,
        SID_TRANSPORT_STOP = 93,
        SID_TRANSPORT_PLAY = 94,
        SID_TRANSPORT_RECORD = 95,
        SID_END = 95;

    var TransportController = function(midiOut) {
        // instance variables
        this.midiOut = midiOut;
        this.transport = Bitwig.createTransport();
        this.elements = [];
        this.isPlaying = false;
        this.ffwOn = false;
        this.rwdOn = false;
        this.initialize();
    };

    TransportController.prototype = {
        
        initialize: function() {
            var context  = this,
                midiOut = context.midiOut,
                transport = context.transport;
            
            // transport buttons on daw port.
            this.createElement(SID_TRANSPORT_LOOP, {
                on: function() {
                    transport.toggleLoop();
                }
            });
                                
            this.createElement(SID_TRANSPORT_REWIND, {
                on: function() {
                    midiOut.sendMidi(0x90, SID_TRANSPORT_REWIND, 127);
                    context.rewindMomentary(true);
                },
                off: function() {
                    midiOut.sendMidi(0x90, SID_TRANSPORT_REWIND, 0);
                    context.rewindMomentary(false);
                }
            });

            this.createElement(SID_TRANSPORT_FAST_FORWARD, {
                on: function() {
                    midiOut.sendMidi(0x90, SID_TRANSPORT_FAST_FORWARD, 127);
                    context.fastForwardMomentary(true);
                },
                off: function() {
                    midiOut.sendMidi(0x90, SID_TRANSPORT_FAST_FORWARD, 0);
                    context.fastForwardMomentary(false);
                }
            });

            this.createElement(SID_TRANSPORT_STOP, {
                on: function() {
                    transport.stop();
                }
            });

            this.createElement(SID_TRANSPORT_PLAY, {
                on: function() {
                    root.println('## play transport:' + transport);
                    transport.play();
                }
            });

            this.createElement(SID_TRANSPORT_RECORD, {
                on: function() {
                    transport.record();
                }
            });

            transport.addIsLoopActiveObserver(function(looping) {
                midiOut.sendMidi(0x90, SID_TRANSPORT_LOOP, looping ? 127 : 0);
            });

            transport.addIsPlayingObserver(function(playing) {
                midiOut.sendMidi(0x90, SID_TRANSPORT_PLAY, playing ? 127 : 0);
                midiOut.sendMidi(0x90, SID_TRANSPORT_STOP, playing ? 0 : 127);
                context.isPlaying = playing;
            });

            transport.addIsRecordingObserver(function(recording) {
                midiOut.sendMidi(0x90, SID_TRANSPORT_RECORD, recording ? 127 : 0);
            });

        },

        onMidi: function(s, d1, d2) {
            if (s === 0x80) {this.onMidiNote(d1, 0);}
            else if (s === 0x90) {this.onMidiNote(d1, d2);}
        },

        onMidiNote: function(d1, d2) {
            var btn =  (d1 >= SID_START && d1 <= SID_END) ? this.elements[d1 - SID_START] : undefined,
                on = d2 !== 0;
            btn && (on ? (btn.on && btn.on()) : (btn.off && btn.off()));
        },

        flush: function() {
        },

        exit: function() {
        },

        createElement: function(note, button) {
            this.elements[note - SID_START] = button;
        },

        fastForwardMomentary: function() {
            arguments.length > 0 && (this.ffwOn = arguments[0]);
            if (this.ffwOn) {
                this.considerPlaying(this.transport, this.transport.fastForward);
                var context = this;
                Bitwig.scheduleTask(function() {
                    context.fastForwardMomentary();
                }, null, 100);
            }
        },

        rewindMomentary: function() {
            arguments.length > 0 && (this.rwdOn = arguments[0]);
            if (this.rwdOn) {
                this.considerPlaying(this.transport, this.transport.rewind);
                var context = this;
                Bitwig.scheduleTask(function() {
                    context.rewindMomentary();
                }, null, 100);
            }
        },

        considerPlaying: function(context, func) {
            if (this.isPlaying) {
                this.transport.stop();
                func.call(context);
                var thisContext = this;
                Bitwig.scheduleTask(function() {
                    thisContext.transport.play();
                }, null, 50);
            } else {
                func.call(context);
            }
        }
    };

    // export
    root.controller || (root.controller = {});
    root.controller.TransportController = TransportController;

}(this, host));

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

(function(root, Bitwig) {
    'use strict';

    // constants
    var LOWEST_CC = 1,
        HIGHEST_CC = 119,
        DEVICE_START_CC = 14,
        DEVICE_END_CC = 21;

    var primaryInstrument,
        userControls,
        transportController,
        focusController;

    Bitwig.defineController(
        'Native Instruments',
        'Komplete Kontrol',
        '0.1',
        '6edb3760-4fb6-11e4-916c-0800200c9a66',
        'jhorology jhorology2014@gmail.com'
    );
    Bitwig.defineMidiPorts(2, 2);

    // this is OSX device name, I don't know about other environment.
    // I tested only S61.
    Bitwig.addDeviceNameBasedDiscoveryPair(
        ['KOMPLETE KONTROL S61 Port 1', 'Komplete Kontrol DAW - 1'],
        ['KOMPLETE KONTROL S61 Port 1', 'Komplete Kontrol DAW - 1']);
    Bitwig.addDeviceNameBasedDiscoveryPair(
        ['KOMPLETE KONTROL S49 Port 1', 'Komplete Kontrol DAW - 1'],
        ['KOMPLETE KONTROL S49 Port 1', 'Komplete Kontrol DAW - 1']);
    Bitwig.addDeviceNameBasedDiscoveryPair(
        ['KOMPLETE KONTROL S25 Port 1', 'Komplete Kontrol DAW - 1'],
        ['KOMPLETE KONTROL S25 Port 1', 'Komplete Kontrol DAW - 1']);

    root.init = function() {
        var i;
	    Bitwig.getMidiInPort(0).setMidiCallback(onMidi);
	    Bitwig.getMidiInPort(1).setMidiCallback(onMidiDaw);
        Bitwig.getMidiInPort(0).createNoteInput('', '??????')
            .setShouldConsumeEvents(false);

	    // Map CC 20 - 27 to device parameters
        var cursorTrack = Bitwig.createArrangerCursorTrack(3, 0);
	    primaryInstrument = cursorTrack.getPrimaryInstrument();

	    for (i = 0; i < 8; i++) {
		    var p = primaryInstrument.getMacro(i).getAmount();
		    p.setIndication(true);
	    }

	    // Make the rest freely mappable
	    userControls = Bitwig.createUserControlsSection(HIGHEST_CC - LOWEST_CC + 1 - 8);

	    for (i = LOWEST_CC; i < HIGHEST_CC; i++) {
		    if (i < DEVICE_START_CC || i > DEVICE_END_CC) {
			    userControls.getControl(userIndexFromCC(i)).setLabel('CC' + i);
		    }
	    }

        var dawMidiOut = Bitwig.getMidiOutPort(1);
        transportController = new root.controller.TransportController(dawMidiOut);
        focusController = new root.controller.FocusController(dawMidiOut, cursorTrack, primaryInstrument);
    };

    root.flush = function() {
        transportController.flush();
        focusController.flush();
    };

    root.exit = function() {
        transportController.exit();
        focusController.exit();
    };

    function userIndexFromCC(cc) {
	    if (cc > DEVICE_END_CC) {
		    return cc - LOWEST_CC - 8;
	    }
	    return cc - LOWEST_CC;
    }

    function onMidi(s, d1, d2) {
	    if ((s & 0xF0) === 0xB0) {
		    if (d1 >= DEVICE_START_CC && d1 <= DEVICE_END_CC) {
			    primaryInstrument.getMacro(d1 - DEVICE_START_CC).getAmount().set(d2, 128);
		    }  else if (d1 >= LOWEST_CC && d1 <= HIGHEST_CC) {
			    userControls.getControl(userIndexFromCC(d1)).set(d2, 128);
		    }
	    }
    }

    function onMidiDaw(s, d1, d2) {
        transportController.onMidi(s, d1, d2);
        focusController.onMidi(s, d1, d2);
    }

}(this, host));
