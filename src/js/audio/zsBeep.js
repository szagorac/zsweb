var zsBeep = (function (u) {
    "use strict";
    const LOG_ID = "ZsBeep: ";
    
    var _audioCtx = null;
    var _isReady = false;
    var _masterGain = null;
    var _osc1 = null;
    var _osc1Gain = null;
    var _envelope = null;
    var _isRunning = false;

    var config = {
        masterGainVal: 1.0,
        frequency: 1100,
        durationSec: 0.1,
        attackTime: 0.0,
        decayTime: 0.0,
        sustainLevel: 1.0,
        sustainTime: 0.2,
        releaseTime: 0.8,
    }

    function ZsBeepException(msg) {
        this.message = msg;
        this.name = "ZsBeepException";
    }
    
    function _resetConfig() {
        _log("resetConfig: BEEP");
        config.masterGainVal = 1.0;
    }
    function _initBeep(audioContext, destination) {
        if (!u) {
            throw new ZsBeepException("Invalid libraries. Required: zsUtil");
        }

        _log("Init Beep");

        if (!audioContext) {
            _logError("_initBeep: invalid context");
            _setReady(false);
            return;
        }
        _audioCtx = audioContext;

        if (_isNull(destination)) {
            destination = _audioCtx.destination;
        }

        _masterGain = _createGainNode();
        _setMasterGain(config.masterGainVal);

        _envelope = _createEnvelope();

        _osc1 = _createOscillator();
        _setOscFreqenecy(config.frequency);

        _osc1Gain = _createGainNode();
        _osc1Gain.gain.setValueAtTime(0.0, 0);

        _osc1.connect(_osc1Gain);
        _osc1Gain.connect(_masterGain);

        _masterGain.connect(destination);
        _setReady(true);
    }
    function _createEnvelope() {
        var duration = config.durationSec;
        var attack = config.attackTime * duration;
        var decay = config.decayTime * duration;
        var sustain = config.sustainTime * duration;
        var release = config.releaseTime * duration;

        if (attack < 0) {
            attack = 0;
        }
        if (decay < 0) {
            decay = 0;
        }
        if (sustain < 0) {
            sustain = 0;
        }
        if (release < 0) {
            release = 0;
        }

        var sustainLevel = config.sustainLevel;
        if (sustainLevel < 0.0) {
            sustainLevel = 0.0;
        } else if (sustainLevel > 1.0) {
            sustainLevel = 1.0;
        }

        var totalDuration = attack + decay + sustain + release;
        totalDuration = u.round(totalDuration, 5);
        if (totalDuration > duration) {
            _logError("Invalid total duration: " + totalDuration + " longer than required: " + duration);
            var diff = totalDuration - duration;
            if (sustain > diff) {
                sustain -= diff;
            } else if (release > diff) {
                release -= diff;
            } else if (attack > diff) {
                attack -= diff;
            }
        }
        return new u.createEnvelope(attack, decay, sustainLevel, sustain, release);
    }
    function  _startOscillator() {
        if(_isRunning || !_isReady || _isNull(_osc1Gain)) {
            return;
        }
        _osc1 = _createOscillator();
        _setOscFreqenecy(config.frequency);
        _osc1.connect(_osc1Gain);
        _osc1.start();
        _isRunning = true;
    }
    function  _stopOscillator() {
        if(!_isRunning || _isNull(_osc1) || _isNull(_osc1Gain)) {
            return;
        }
        var now = _audioCtx.currentTime;
        var stopTime = now + 0.1;
        _osc1Gain.gain.setValueAtTime(0.0, now);
        _osc1.stop(stopTime);
        _osc1 = null;
        _isRunning = false;
    }
    function  _switch(isOn) {
        if(isOn) {
            _startOscillator();            
        } else {
            _stopOscillator();   
        }
    }
    function  _setFreqenecy(freq) {
        if(config.frequency !== freq) {
            config.frequency = freq;
        }     
        var val = u.toInt(freq);   
        _setOscFreqenecy(val);
    }
    function  _setOscFreqenecy(freq) {
        if(_isNull(_osc1)) {
            return;
        }
        var now = _audioCtx.currentTime;
        _osc1.frequency.linearRampToValueAtTime(freq, now + 0.2);
    }
    function _play() {
        if(!_isRunning || !_isReady || _isNull(_envelope) || _isNull(_osc1Gain)) {
            return;
        }
        var playTime = _audioCtx.currentTime;
        var gain = _osc1Gain.gain;

        gain.cancelScheduledValues(0);
        var t0 = playTime;
        gain.setValueAtTime(0.001, t0);
        var t1 = t0 + _envelope.at;
        gain.linearRampToValueAtTime(1.0, t1);
        var t2 = t1 + _envelope.dt;
        gain.linearRampToValueAtTime(_envelope.sl, t2);
        var t3 = t2 + _envelope.st;
        gain.setValueAtTime(_envelope.sl, t3);
        var t4 = t3 + _envelope.rt;
        gain.linearRampToValueAtTime(0.0001, t4); // avoid 0 for clicks
    }        
    function _setReady(isOk) {
        if (_isNull(isOk)) {
            return;
        }
        _log("setReady: " + isOk);
        _isReady = isOk;
    }   
    function _getReady() {
        return _isReady;
    }   
    function _setMasterGain(level, timeMs) {
        if (!_audioCtx || !_masterGain) {
            _logError("setMasterGain: invalid context of master gain");
            return;
        }
        if (u.isString(level)) {
            level = u.toFloat(level);
        }

        var g = config.masterGainVal;
        if (u.isNumeric(level)) {
            g = level;
        } else {
            _logError("_setMasterGain: Invalid gain level: " + level);
            return;
        }

        if (g < 0.0) {
            g = 0.0;
        } else if (g > 1.0) {
            g = 1.0;
        }

        var currentConfig = config.masterGainVal;
        var currentValue = _masterGain.gain.value;
        if(currentConfig !== g) {
            config.masterGainVal = g;
        }
        if(currentValue === g) {
            return;
        }

        if (!_isNull(timeMs) && u.isNumeric(timeMs)) {
            var timeSec = u.msecToSec(timeMs);
            var now = _getNow(); 
            var t = _audioCtx.currentTime + timeSec;
            // _log("setMasterGain: " + g + " timeSec: " + timeSec + " actualTime: " + t + " now: " + now);
            _masterGain.gain.linearRampToValueAtTime(g, t);
        } else {
            // _log("setMasterGain: " + g);
            _masterGain.gain.setValueAtTime(g, _getNow());
        }
    }
    function _getNow() {
        if(_isNull(_audioCtx)) {
            return 0;
        }
        return _audioCtx.currentTime;
    }    
    function _createGainNode() {
        if (!_audioCtx) {
            _logError("_createGainNode: Audio context is not initialised!!");
            return null;
        }
        return _audioCtx.createGain();    
    }
    function _createOscillator() {
        if (!_audioCtx) {
            _logError("_createGainNode: Audio context is not initialised!!");
            return null;
        }
        return _audioCtx.createOscillator();
    }
    function _logError(val) {
        u.logError(val, LOG_ID);
    }
    function _log(val) {
        u.log(val, LOG_ID);
    }
    function _isNull(val) {
        return u.isNull(val);
    }
   
    // Public members
    return {
        init: function (audioContext, destination) {
            _initBeep(audioContext, destination);
        },
        reset: function () {
            _resetConfig();
        },
        setGain: function (level, timeMs) {
            _setMasterGain(level, timeMs);
        },
        isReady: function () {
            return _getReady();
        },
        play: function () {
            return _play();
        },
        switch: function (isOn) {
            return _switch(isOn);
        },
        setFreqenecy: function (freq) {
            return _setFreqenecy(freq);
        },
    }
}(zsUtil));