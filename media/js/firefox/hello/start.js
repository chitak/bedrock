/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

;(function($, Mozilla) {
    'use strict';

    var $main = $('main');
    var $defaultCopy = $('.default');
    var $startCopy = $('.start');
    var $endCopy = $('.end');

    var highlightTimeout;
    var highlightsSupressed = false;
    var tourStep = 'default';

    // make sure we strip any HTML tags before injecting door hanger text
    function _getText(string) {
        return $('<div/>').html(window.trans(string)).text();
    }

    // GA event for successful Hello conversations
    function trackGAConversationConnect() {
        gaTrack(['_trackEvent', 'hello interactions','tour','TourConnectConversation']);
    }

    // Closes any open menus and hides info panels
    function hideUITourHighlights() {
        Mozilla.UITour.hideInfo();
        Mozilla.UITour.hideMenu('loop');
    }

    function handleVisibilityChange() {
        if (document.hidden) {
            hideUITourHighlights();
            unbindHelloEvents();
        } else {
            clearTimeout(highlightTimeout);
            bindHelloEvents();
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

    function showTourStep() {
        switch(tourStep) {
        case 'get-started':
            showHelloPanel(highlightNewRoomButton);
            break;
        case 'invite':
            targetConversationView(highlightSelectedRoomButtons);
            break;
        case 'shared':
            targetConversationView(showSharedInfoPanel);
            break;
        case 'conversation-waiting':
            showHelloPanel(highlightRoomList);
            break;
        case 'conversation-open':
            showPageState('end', true);
            break;
        }
    }

    function showPageState(state, anim) {
        $defaultCopy.hide();

        if (state && state === 'start') {
            $startCopy.show();
            $endCopy.hide();
            // TODO animate page transitions?
        } else if (state && state === 'end') {
            if (anim) {
                $startCopy.stop().fadeOut('fast', function () {
                    $endCopy.stop().fadeIn('fast');
                });
            } else {
                $startCopy.hide();
                $endCopy.show();
            }

        } else {
            $startCopy.hide();
            $endCopy.hide();
            $defaultCopy.show();
        }
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
    function highlightNewRoomButton() {
        Mozilla.UITour.showInfo(
            'loop-newRoom',
            _getText('getStartedTitle'),
            _getText('getStartedText')
        );
    }

    // Highlights Hello room list when a conversation is waiting.
    function highlightRoomList() {
        Mozilla.UITour.showInfo(
            'loop-roomList',
            _getText('roomListTitle'),
            _getText('roomListText')
        );
    }

    function targetConversationView(callback) {
        // Only open the info panel if tab is visible
        if (document.hidden) {
            return;
        }

        Mozilla.UITour.getConfiguration('availableTargets', function (config) {
            if (config.targets && $.inArray('loop-selectedRoomButtons', config.targets) !== -1) {
                if (typeof callback === 'function') {
                    callback();
                }
            }
        });
    }

    function highlightSelectedRoomButtons() {
        Mozilla.UITour.showInfo(
            'loop-selectedRoomButtons',
            _getText('inviteTitle'),
            _getText('inviteText')
        );
    }

    function showSharedInfoPanel() {
        Mozilla.UITour.showInfo(
            'loop-selectedRoomButtons',
            _getText('sharedTitle'),
            _getText('sharedText')
        );
    }

    function bindHelloEvents() {
        // register for Hello UITour events
        Mozilla.UITour.observe(function(event, data) {
            console.log(event);
            console.log(data);

            switch(event) {
            case 'Loop:ChatWindowOpened':
                // only show invite step if conversation is not waiting
                if (tourStep === 'get-started') {

                    tourStep = 'invite';
                    showTourStep();
                    // track user has clicked "Start a conversation" button
                    gaTrack(['_trackEvent', 'hello interactions', 'tour', 'StartConversation-Tour']);

                } if (tourStep === 'invite') {

                    showTourStep();
                } else if (tourStep === 'conversation-waiting') {

                    tourStep = 'conversation-open';
                    showTourStep();
                    // set param to done, so if the user shares the URL
                    // the next person can still take the tour from the start.
                    replaceURLState('waiting', 'done');
                    // track conversation connect
                    trackGAConversationConnect();
                }
                break;
            case 'Loop:ChatWindowClosed':
                hideUITourHighlights();
                break;
            case 'Loop:ChatWindowHidden':
                hideUITourHighlights();
                break;
            case 'Loop:ChatWindowDetached':
                hideUITourHighlights();
                break;
            case 'Loop:IncomingConversation':
                if (data && data.conversationOpen === true) {
                    tourStep = 'conversation-open';

                    hideUITourHighlights();
                    showPageState('end', true);

                    // track conversation connect
                    trackGAConversationConnect();

                } else if (data && data.conversationOpen === false) {
                    tourStep = 'conversation-waiting';
                    showHelloPanel(highlightRoomList);
                }
                break;
            case 'Loop:RoomURLCopied':
                // tell Firefox to re-connect to the FTE tour when user has their first conversation.
                // We only do this once the user has clicked to share the room URL.
                Mozilla.UITour.setConfiguration('Loop:ResumeTourOnFirstJoin', true);

                tourStep = 'shared';
                showTourStep();

                // track user has clicked email/copy button
                gaTrack(['_trackEvent', 'hello interactions', 'tour', 'RoomClick-Tour']);
                break;
            }

        }, function () {
            // ping callback
        });
    }

    function unbindHelloEvents() {
        Mozilla.UITour.observe(null);
    }

    // sets incomingConversation param to 'done'
    function replaceURLState(currentValue, newValue) {
        var url = window.location.href;
        var currentParam;

        if (!currentValue || !newValue) {
            return;
        }

        currentParam = 'incomingConversation=' + currentValue;

        if (url.indexOf(currentParam) !== -1) {
            url = url.replace(currentParam, 'incomingConversation=' + newValue);
            window.history.replaceState({}, '', url);
        }
    }

    function init() {

        // URL query param populated at template level in the view
        var incomingConversation = $main.data('incomingConversation');

        // set the tour state based on incomingConversation status
        switch(incomingConversation) {
        case 'none':
            tourStep = 'get-started';
            break;
        case 'done':
            tourStep = 'get-started';
            break;
        case 'waiting':
            tourStep = 'conversation-waiting';
            break;
        case 'open':
            tourStep = 'conversation-open';
            break;
        }

        // Make sure that the Hello icon is an available target in the UI.
        // Hello is still referred to as 'loop' internally for legacy reasons.
        Mozilla.UITour.getConfiguration('availableTargets', function (config) {
            if (config.targets && $.inArray('loop', config.targets) !== -1) {

                // hide and reshow uitour highlights on resize
                $(window).on('resize', handleResize);

                // hide and reshow uitour highlights page visibility
                $(document).on('visibilitychange', handleVisibilityChange);

                if (tourStep === 'conversation-open') {
                    // conversation is open and rooms view is visible,
                    // so show the page end state. Job done! \o/
                    showPageState('end');
                    // set param to done, so if the user shares the URL
                    // the next person can still take the tour from the start.
                    replaceURLState('open', 'done');

                    // track conversation connect
                    trackGAConversationConnect();
                } else {
                    // show the first page copy state
                    showPageState('start');

                    // track start of tour in GA
                    if (tourStep === 'get-started') {
                        gaTrack(['_trackEvent', 'hello interactions', 'tour', 'GetStarted']);
                    }
                }

                // register for Hello events
                bindHelloEvents();

                // show tour step highlight
                showTourStep();

                console.log(document.referrer);
            }
        });
    }

    // use a slight delay for showing the main page content
    // to allow for page state to be determined first
    setTimeout(function () {
        $main.css('visibility', 'visible');
    }, 500);

    if (window.isFirefox() && !window.isFirefoxMobile() && window.getFirefoxMasterVersion() >= 35) {
        init();
    }

})(window.jQuery, window.Mozilla);
