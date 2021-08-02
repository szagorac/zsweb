var zsWsAudio = (function (u, bp, win) {
    "use strict";

    //static members
    const LOG_ID = "zsAudio: ";
    const CTX_MAX_RETRY_COUNT = 3;

    // private vars
    var _ctx = null;
    var _isAudioInitialised = false;
    var _audioCtxRetryCount = 1;

    //Class defs
    function ZsWsAudioException(msg) {
        this.message = msg;
        this.name = "ZsWsAudioException";
    }

    //Private functions
    function _initAudio() {
        if (!u) {
            throw new ZsWsAudioException("Invalid libraries. Required: zsUtil");
        }

        try {
            log("initWsAudio: ");
            if (!_ctx) {
                var AudioContext = win.AudioContext || win.webkitAudioContext || win.mozAudioContext || win.oAudioContext;
                _ctx = new AudioContext();
                log("initWsAudio:  created audio context");
            }

            if (_ctx.state === 'suspended') {
                log("initWsAudio: Context suspended, resuming context : " + _ctx.state);
                if (_audioCtxRetryCount >= CTX_MAX_RETRY_COUNT) {
                    log("initAudio: breached MAX Resume Retry Count, giving up ...");
                    return;
                }

                _ctx.resume();

                if (_audioCtxRetryCount === 1) {
                    _ctx.onstatechange = function () {
                        log("initAudio: on AudioContext state change to: " + _ctx.state);
                    }
                }

                _audioCtxRetryCount++;
                setTimeout(function () {
                    _initAudio();
                }, 1000);
                return;
            }

            log("initAudio: AudioContext state: " + _ctx.state);
            _initBeep();
        } catch (e) {
            _isAudioInitialised = false;
            logError('Web Audio API is not supported in this browser');
        }
    }
    function _getCurrentTime() {
        if(isNull(_ctx)) {
            return 0;
        }
        return _ctx.currentTime;
    }    
    function _resetAudio() {
    }
    //beep
    function _initBeep(destination) {
        if (isNull(bp)) {
            log("_initSynth: Can not initialise synth");
            bp = null;
            return;
        }

        if (isNull(destination)) {
            destination = _ctx.destination;
        }

        bp.init(_ctx, destination);
    }
    function _beep() {
        if (isNull(bp)) {
            log("_beep: invalid beep lib");
            return;
        }
        bp.play();
    }
    function  _switchMetro(isOn) {
        if (isNull(bp)) {
            log("_switchMetro: invalid beep lib");
            return;
        }
        bp.switch(isOn);
    }
    function  _setBeepFreqenecy(freq) {
        if (isNull(bp)) {
            log("_setFreqenecy: invalid beep lib");
            return;
        }
        bp.setFreqenecy(freq);
    }
    function logError(val) {
        u.logError(val, LOG_ID);
    }
    function log(val) {
        u.log(val, LOG_ID);
    }
    function isNull(val) {
        return u.isNull(val);
    }

    // PUBLIC API
    return {
        init: function () {
            _initAudio();
        },
        isReady: function () {
            return _isAudioInitialised;
        },
        reset: function () {
            _resetAudio();
        },
        beep: function () {
            _beep();
        },
        switchMetro: function (isOn) {
            _switchMetro(isOn);
        },
        setBeepFreqenecy: function (freq) {
            _setBeepFreqenecy(freq);
        },
        getCurrentTime: function () {
           return _getCurrentTime();
        },
    }

}(zsUtil, zsBeep, window));