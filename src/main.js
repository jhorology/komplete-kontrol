(function(root, Bitwig, KompleteKontrol, _) {
    'use strict';

    // imports
    var NoteExpression = root.NoteExpression;
    // variables
    var controllers;

    Bitwig.defineController(
        'Native Instruments',
        'Komplete Kontrol',
        '0.2',
        '6edb3760-4fb6-11e4-916c-0800200c9a66',
        'jhorology jhorology2014@gmail.com'
    );
    Bitwig.defineMidiPorts(2, 2);

    // this is OSX device name, I don't know about other environment.
    // I tested only S61.

    if (Bitwig.platformIsMac()) {
        Bitwig.addDeviceNameBasedDiscoveryPair(
            ['KOMPLETE KONTROL S61 Port 1', 'Komplete Kontrol DAW - 1'],
            ['KOMPLETE KONTROL S61 Port 1', 'Komplete Kontrol DAW - 1']);
        Bitwig.addDeviceNameBasedDiscoveryPair(
            ['KOMPLETE KONTROL S49 Port 1', 'Komplete Kontrol DAW - 1'],
            ['KOMPLETE KONTROL S49 Port 1', 'Komplete Kontrol DAW - 1']);
        Bitwig.addDeviceNameBasedDiscoveryPair(
            ['KOMPLETE KONTROL S25 Port 1', 'Komplete Kontrol DAW - 1'],
            ['KOMPLETE KONTROL S25 Port 1', 'Komplete Kontrol DAW - 1']);
    } else if (Bitwig.platformIsWindows()) {
        Bitwig.addDeviceNameBasedDiscoveryPair(
            ['Komplete Kontrol- 1', 'Komplete Kontrol DAW-1'],
            ['Komplete Kontrol- 1', 'Komplete Kontrol DAW-1']);
    }

    root.init = function() {
        var i,
            in0 = Bitwig.getMidiInPort(0),
            in1 = Bitwig.getMidiInPort(1),
            out0 = Bitwig.getMidiOutPort(0),
            out1 = Bitwig.getMidiOutPort(1),
            noteIn0 =  in0.createNoteInput('', '??????'),
            track = Bitwig.createArrangerCursorTrack(3, 0),
            device = track.createCursorDevice();
        
        in0.setMidiCallback(onMidi0);
        in1.setMidiCallback(onMidi1);
        noteIn0.setShouldConsumeEvents(false);
        noteIn0.assignPolyphonicAftertouchToExpression(0, NoteExpression.TIMBRE_UP, 2);

        controllers = [
            new KompleteKontrol.TransportController(out1),
            new KompleteKontrol.FocusController(out1, track, device),
            new KompleteKontrol.DeviceController(out1, device)
        ];
    };

    root.flush = function() {
        _.each(controllers, function(c) {_.isFunction(c.flush) && c.flush();});
    };

    root.exit = function() {
        _.each(controllers.reverse(), function(c) {_.isFunction(c.exit) && c.exit();});
        controllers = undefined;
    };

    function onMidi0(s, d1, d2) {
        _.each(controllers, function(c) {_.isFunction(c.onMidi0) && c.onMidi0(s, d1, d2);});
    }

    function onMidi1(s, d1, d2) {
        _.each(controllers, function(c) {_.isFunction(c.onMidi1) && c.onMidi1(s, d1, d2);});
    }

}(this, host, this.KompleteKontrol, _));
