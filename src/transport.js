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

    var TransportController = function(midiIn, midiOut) {
        this.midiIn = midiIn;
        this.midiOut = midiOut;
        this.transport = Bitwig.createTransport();
        this.elements = [];
    };

    TransportController.prototype = {
        
        initialize: function() {
            var context  = this,
                midiOut = context.midiOut,
                transport = context.transport;
            
            // transport buttons on daw port.
            this.createElements(SID_TRANSPORT_LOOP, {
                on: function() {
                    transport.toggleLoop();
                }
            });
                                
            this.createElement(SID_TRANSPORT_REWIND, {
                on: function() {
                    midiOut.sendMidi(0x90, SID_TRANSPORT_REWIND, 127);
                    this.rewindMomentary(true);
                },
                off: function() {
                    midiOut.sendMidi(0x90, SID_TRANSPORT_REWIND, 0);
                    this.rewindMomentary(false);
                }
            });

            this.createElement(SID_TRANSPORT_FAST_FORWARD, {
                on: function() {
                    midiOut.sendMidi(0x90, SID_TRANSPORT_FAST_FORWARD, 127);
                    this.fastForwardMomentary(true);
                },
                off: function() {
                    midiOut.sendMidi(0x90, SID_TRANSPORT_FAST_FORWARD, 0);
                    this.fastForwardMomentary(false);
                }
            });

            this.createElement(SID_TRANSPORT_STOP, {
                on: function() {
                    transport.stop();
                }
            });

            this.createElement(SID_TRANSPORT_PLAY, {
                on: function() {
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
                this.isPlaying = playing;
            });

            transport.addIsRecordingObserver(function(recording) {
                midiOut.sendMidi(0x90, SID_TRANSPORT_RECORD, recording ? 127 : 0);
            });

        },

        createElement: function(note, button) {
            this.elements[note = SID_START] = button;
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
