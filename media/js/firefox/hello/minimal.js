/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

;(function($, Mozilla) {
    'use strict';

    var highlightTimeout;
    var highlightsSupressed = false;

    // make sure we strip any HTML tags before injecting door hanger text
    function _getText(string) {
        return $('<div/>').html(window.trans(string)).text();
    }

    // Closes any open menus and hides info panels
    function hideUITourHighlights() {
        Mozilla.UITour.hideInfo();
        Mozilla.UITour.hideMenu('loop');
    }

    function handleVisibilityChange() {
        if (document.hidden) {
            hideUITourHighlights();
        } else {
            clearTimeout(highlightTimeout);
            highlightTimeout = setTimeout(showTourStep, 900);
        }
    }

    // hide and reshow tour highlight on resize
    function handleResize() {
        clearTimeout(highlightTimeout);
        if (!highlightsSupressed) {
            hideUITourHighlights();
            highlightsSupressed = true;
        }
        highlightTimeout = setTimeout(function() {
            highlightsSupressed = false;
            showTourStep();
        }, 300);
    }

    // Opens the Hello panel and triggers callback once
    // the opening animation finishes
    function showHelloPanel(callback) {
        // Only open the info panel if tab is visible
        if (document.hidden) {
            return;
        }
        // Make sure loop icon is available before opening Hello panel (bug 1111828)
        Mozilla.UITour.getConfiguration('availableTargets', function (config) {
            if (config.targets && $.inArray('loop', config.targets) !== -1) {
                Mozilla.UITour.showMenu('loop', function() {
                    if (typeof callback === 'function') {
                        callback();
                    }
                });
            }
        });
    }

    // Highlights Hello panel target.
    function highlightGetStartedButton() {
        Mozilla.UITour.showInfo(
            'loop-newRoom',
            _getText('getStartedTitle'),
            _getText('getStartedText')
        );
    }

    function showTourStep() {
        showHelloPanel(highlightGetStartedButton);
    }

    function init() {

        // Make sure that the Hello icon is an available target in the UI.
        // Hello is still referred to as 'loop' internally for legacy reasons.
        Mozilla.UITour.getConfiguration('availableTargets', function (config) {
            if (config.targets && $.inArray('loop', config.targets) !== -1) {

                // hide and reshow uitour highlights on resize
                $(window).on('resize', handleResize);

                // hide and reshow uitour highlights page visibility
                $(document).on('visibilitychange', handleVisibilityChange);

                showTourStep();
            }
        });
    }

    if (window.isFirefox() && !window.isFirefoxMobile() && window.getFirefoxMasterVersion() >= 35) {
        init();
    }

})(window.jQuery, window.Mozilla);
