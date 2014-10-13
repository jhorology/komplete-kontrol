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
