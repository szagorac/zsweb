var zsSynth = (function (u) {
    "use strict";
    const LOG_ID = "ZsSynth: ";

    var _audioCtx = null;
    var _isReady = false;
    var _masterGain = null;
    var _filter = null;
    var _oscGain = null;
    var _isRunning = false;
    var _oscillators = [];
    var _lfoDetune = null;
    var _lfoDetuneGain = null;
    var _lfoFreq = null;
    var _lfoFreqGain = null;
    var _ampEnv = null;

    var config = {
        masterGainVal: 0.1,
        filterQMultiplier: 30,
        filterMinValue: 100,
        filterMaxValue: 1000,
        filterNumberOfOctaves: 1,
        fadeInMs: 500,
        fadeOutMs: 500,
        isUseFilter: true,
        ampEnvelope: { attackTime: 0.1, decayTime: 0.0, sustainLevel: 1.0, sustainTime: 0.5, releaseTime: 0.4 }
    }

    function ZsSynthException(msg) {
        this.message = msg;
        this.name = "ZsSynthException";
    }

    function _resetConfig() {
        _log("resetConfig: SYNTH");
        config.masterGainVal = 0.5;
    }
    function _initSynth(audioContext, destination) {
        if (!u) {
            throw new ZsSynthException("Invalid libraries. Required: zsUtil");
        }

        _log("Init Synth");

        if (!audioContext) {
            _logError("_initSynth: invalid context");
            _setReady(false);
            return;
        }
        _audioCtx = audioContext;

        if (_isNull(destination)) {
            destination = _audioCtx.destination;
        }

        //master GAIN
        _masterGain = _createGainNode();
        _masterGain.gain.value = config.masterGainVal;

        //oscillator GAIN
        _oscGain = _createGainNode();
        _oscGain.gain.value = 1.0;
        var envConf = config.ampEnvelope;
        _ampEnv = u.createEnvelope(envConf.attackTime, envConf.decayTime, envConf.sustainLevel, envConf.sustainTime, envConf.releaseTime);

        //oscillator LFO Detune Modulator
        _lfoDetune = _audioCtx.createOscillator();
        _lfoDetune.frequency.value = 0.1;
        _lfoDetuneGain = _audioCtx.createGain();
        _lfoDetuneGain.gain.value = 50;
        _lfoDetune.connect(_lfoDetuneGain);
        _lfoDetune.start();

        //oscillator LFO Freq Modulator
        _lfoFreq = _audioCtx.createOscillator();
        _lfoFreq.type = 'triangle';
        _lfoFreq.frequency.value = 0.05;
        _lfoFreqGain = _audioCtx.createGain();
        _lfoFreqGain.gain.value = 50;
        _lfoFreq.connect(_lfoFreqGain);
        _lfoFreq.start();

        //oscillator filter
        if (config.isUseFilter) {
            // Clamp the frequency between the minimum value (40 Hz) and half of the
            // sampling rate.
            config.filterMaxValue = _audioCtx.sampleRate / 2;
            // Logarithm (base 2) to compute how many octaves fall in the range.
            config.filterNumberOfOctaves = Math.log(config.filterMaxValue / config.filterMinValue) / Math.LN2;
            _filter = _audioCtx.createBiquadFilter();
            _filter.type = (typeof _filter.type === 'string') ? 'lowpass' : 0;
            _filter.frequency.value = 10000;
            _filter.Q.value = 30;
            _oscGain.connect(_filter);
            _filter.connect(_masterGain);
        } else {
            _oscGain.connect(_masterGain);
        }

        _masterGain.connect(destination);
        _setReady(true);
    }
    function _setFilterFreq(zeroToOne) {
        if (!_isReady || _isNull(_filter)) {
            return;
        }
        // Compute a multiplier from 0 to 1 based on an exponential scale.
        var multiplier = Math.pow(2, config.filterNumberOfOctaves * (zeroToOne - 1.0));
        // Get back to the frequency value between min and max.
        _filter.frequency.value = config.filterMaxValue * multiplier;
    };
    function _setFilterQ(zeroToOne) {
        if (!_isReady || _isNull(_filter)) {
            return;
        }
        _filter.Q.value = zeroToOne * config.filterQMultiplier;
    };
    function _stop() {
        _log("_stop: ");
        if (!_isRunning || _isNull(_oscillators)) {
            return;
        }
        for (var i = 0; i < _oscillators.length; ++i) {
            _oscillators[i].stop(_getNow());
            _oscillators[i].disconnect();
        }
        _oscillators = [];
        _isRunning = false;
    }
    function _play(freq, durationSec) {
        if (!_isReady || _isNull(_masterGain)) {
            return;
        }

        if (_isNull(freq)) {
            freq = 440;
        }

        const osc1 = _audioCtx.createOscillator();
        const osc2 = _audioCtx.createOscillator();
        
        osc1.frequency.value = freq;
        osc1.type = 'sine';
        osc1.detune.value = 0;

        osc2.frequency.value = freq;
        osc2.type = 'sine';
        osc2.detune.value = 0;

        osc1.connect(_oscGain);
        osc2.connect(_oscGain);
        _oscillators.push(osc1);
        _oscillators.push(osc2);

        _lfoDetuneGain.connect(osc2.detune);
        _lfoFreqGain.connect(osc1.frequency);

        if (_isNull(durationSec)) {
            var now = _getNow();
            var gain = _oscGain.gain;
            gain.setValueAtTime(1.0, now);
            osc1.start(now);
            osc2.start(now);
        } else {
            var gain = _oscGain.gain;
            gain.cancelScheduledValues(0);
            var now = _getNow();
            var t0 = now;
            gain.setValueAtTime(0.001, t0);
            osc1.start(now);
            osc2.start(now);
            var t1 = t0 + _ampEnv.at * durationSec;
            gain.linearRampToValueAtTime(1.0, t1);
            var t2 = t1 + _ampEnv.dt * durationSec;
            gain.linearRampToValueAtTime(_ampEnv.sl, t2);
            var t3 = t2 + _ampEnv.st * durationSec;
            gain.setValueAtTime(_ampEnv.sl, t3);
            var t4 = t3 + _ampEnv.rt * durationSec;
            gain.linearRampToValueAtTime(0.0001, t4); // avoid 0 for clicks
            var t5 = (durationSec + 0.05) * 1000;
            _log("gain: " + gain.value + " t5: " + t5);
            setTimeout(_stop, t5);
        }

        _isRunning = true;
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
        if (currentConfig !== g) {
            config.masterGainVal = g;
        }
        if (currentValue === g) {
            return;
        }

        if (_isNull(timeMs) || !u.isNumeric(timeMs)) {
            // _log("setMasterGain: " + g);
            _masterGain.gain.setValueAtTime(g, _getNow());
            return;
        }

        var timeSec = u.msecToSec(timeMs);
        var now = _getNow();

        var v1 = g / 4.0;
        var t1 = now + (timeSec / 2.0);
        var v2 = g;
        var t2 = now + timeSec;
        if (g === 0.0) {
            v1 = 0.0;
            v2 = 0.0;
        } else if (g < currentValue) {
            v1 = currentValue - v1;
        } else {
            v1 = currentValue + v1;
        }
        _log("setMasterGain: v1: " + v1 + " v2: " + v2 + " t1: " + t1 + " t2: " + t2 + " g: " + g + " currentValue: " + currentValue);
        _masterGain.gain.linearRampToValueAtTime(v1, t1);
        _masterGain.gain.linearRampToValueAtTime(v2, t2);
    }
    function _getNow() {
        if (_isNull(_audioCtx)) {
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
            _initSynth(audioContext, destination);
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
        play: function (freq, durationSec) {
            return _play(freq, durationSec);
        },
        stop: function () {
            return _stop();
        },
        setFilterFreq: function (zeroToOne) {
            _setFilterFreq(zeroToOne);
        },
        setFilterQ: function (zeroToOne) {
            _setFilterQ(zeroToOne);
        },
    }
}(zsUtil));