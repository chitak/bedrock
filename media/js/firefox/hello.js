/* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/. */

;(function(w, $) {
    'use strict';

    if (w.isFirefox()) {
        // if Fx, hide all footer messaging
        // (correct messaging to display determined below)
        $('.dltry-copy').hide();

        // Hello exists in version 35 and up
        if (w.getFirefoxMasterVersion() >= 35) {
            // show  Fx with Hello footer messaging
            $('#ctacopy-hellofx').show();

            // hide footer download button
            $('#download-fx').hide();

            // show footer try button
            $('#try-hello-footer').css('display', 'block');

            // see if Hello is an available target in toolbar/menu
            Mozilla.UITour.getConfiguration('availableTargets', function(config) {
                // 'loop' is the snazzy internal code name for Hello
                if (config.targets && config.targets.indexOf('loop') > -1) {
                    // show the intro try hello button
                    $('#intro .try-hello').addClass('active');

                    // clicking either try hello button will open the Hello panel
                    $('.try-hello').on('click', function() {
                        // will this open the Hello menu no matter where the icon
                        // resides? toolbar, overflow, & menu?
                        Mozilla.UITour.showMenu('loop');
                    });
                } else {
                    // if Hello is not in toolbar/menu, change footer button to link
                    // to a SUMO article
                    $('#try-hello-footer').attr('role', 'link').on('click', function() {
                        window.location.href = 'https://support.mozilla.org/kb/where-firefox-hello-button';
                    });
                }
            });
        } else {
            // if Fx is version 34 or lower display update messaging in footer
            $('#ctacopy-oldfx').show();
        }
    } else {
        // for non-Fx users, show get Fx feature
        // remove node to maintain nth-child margin rules
        // (we wont need this copy for non Fx users)
        $('#feature-account').remove();
        $('#feature-getfx').show();
    }
})(window, window.jQuery);
