(function(root, Bitwig, _) {
    'use strict';
    // imports
    var utils = root.KompleteKontrol.utils;
    
    // constants
    var LOWEST_CC = 1,
        ENCODER_START_CC = 14,
        ENCODER_END_CC = 21,
        HIGHEST_CC = 119,
        MACRO_MODE = 0;

    var DeviceController = function(midiOut, device) {
        this.midiOut = midiOut;
        this.device = device;
        this.elements = [];
        this.elements.length = HIGHEST_CC - LOWEST_CC + 1;
        this.initialize();
    };

    DeviceController.prototype = {
        initialize: function() {
            var elements = this.elements,
                device = this.device,
                encRange = _.range(ENCODER_START_CC, ENCODER_END_CC + 1),
                userRange = _.difference(_.range(LOWEST_CC, HIGHEST_CC + 1), encRange),
                userControls = Bitwig.createUserControls(userRange.length),
                index = 0;

            _.each(userRange, function(cc) {
                var control = userControls.getControl(index);
                control.setLabel('CC' + (1000 + cc).toString().substring(1));
                elements[cc - LOWEST_CC] = control;
                index++;
            });

            _.each(encRange, function(cc) {
                var macro = device.getMacro(cc - ENCODER_START_CC).getAmount();
                macro.setIndication(true);
                elements[cc - LOWEST_CC] = macro;
            });
        },

        onMidi0: function(s, d1, d2) {
            if (s === 0xB0) {this.onMidiCC(d1, d2);}
        },

        onMidiCC: function(d1, d2) {
            var elements = this.elements,
                index = d1 - LOWEST_CC;
            index >= 0 && index < elements.length && elements[index].set(d2, 128); 
        },

        flush: function() {
        },

        exit: function() {
        }
    };

    // export
    root.KompleteKontrol || (root.KompleteKontrol = {});
    root.KompleteKontrol.DeviceController = DeviceController;
}(this, host, _));
