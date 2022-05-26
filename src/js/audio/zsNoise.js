var zsNoise = (function (u) {
    "use strict";
    const LOG_ID = "ZsNoise: ";

    var _audioCtx = null;
    var _isReady = false;
    var _masterGain = null;
    var _isRunning = false;
    var _noiseSource = null;
    var _filter = null;

    var config = {
        masterGainVal: 0.0,
        isUseFilter: true,
        filterQMultiplier: 30,
        filterMinValue: 100,
        filterMaxValue: 1000,
        filterNumberOfOctaves: 1,
        filterFreq: 1000,
        filterType: 'bandpass',
        filterQ: 100,
        fadeInMs: 500,
        fadeOutMs: 500,
        rampSec: 2.0,
    }

    function ZsNoiseException(msg) {
        this.message = msg;
        this.name = "ZsNoiseException";
    }

    function _resetConfig() {
        _log("resetConfig: NOISE");
        config.masterGainVal = 0.0;
    }
    function _initNoise(audioContext, destination) {
        if (!u) {
            throw new ZsNoiseException("Invalid libraries. Required: zsUtil");
        }

        _log("Init Noise");
        if(_isRunning) {
            _stop();
        }

        if (!audioContext) {
            _logError("_initNoise: invalid context");
            _setReady(false);
            return;
        }
        _audioCtx = audioContext;

        if (_isNull(destination)) {
            destination = _audioCtx.destination;
        }

        _masterGain = _createGainNode();
        _masterGain.gain.value = 0;
        // _setMasterGain(config.masterGainVal, 0);

        //oscillator filter
        if (config.isUseFilter) {
            config.filterMaxValue = _audioCtx.sampleRate / 2;
            config.filterNumberOfOctaves = Math.log(config.filterMaxValue / config.filterMinValue) / Math.LN2;
            _filter = _audioCtx.createBiquadFilter();
            _filter.type = config.filterType;
            _filter.frequency.value = config.filterFreq;
            _filter.Q.value = config.filterQ;
            _filter.connect(_masterGain);
        } 

        _masterGain.connect(destination);
        _setReady(true);
    }
    function _setFilterFreq(freq) {
        if (!_isReady || _isNull(_filter)) {
            return;
        }
        _filter.frequency.linearRampToValueAtTime(freq, _audioCtx.currentTime + config.rampSec);
    };
    function _setFilterQ(quality) {
        if (!_isReady || _isNull(_filter)) {
            return;
        }
        _filter.Q.linearRampToValueAtTime(quality, _audioCtx.currentTime + config.rampSec);
    };
    function _setFilterType(type) {
        if (!_isReady || _isNull(_filter)) {
            return;
        }
        _filter.type = type;
    };
    function _getOrCreateNoiseSource() {
        if (!_isNull(_noiseSource)) {
            return _noiseSource;
        }
        _noiseSource = _createNoiseSource();
        if(_isNull(_filter)) {
            _noiseSource.connect(_masterGain);
        } else {
            _noiseSource.connect(_filter);
        }
        
        return _noiseSource;
    }
    function _createNoiseSource() {
        var noiseSource = _audioCtx.createBufferSource();
        const bufferSize = 2 * _audioCtx.sampleRate;
        const noiseBuffer = _audioCtx.createBuffer(1, bufferSize, _audioCtx.sampleRate);
        const output = noiseBuffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        noiseSource.buffer = noiseBuffer;
        return noiseSource;
    }
    function _stop() {
        if (!_isRunning || _isNull(_noiseSource)) {
            return;
        }
        _noiseSource.stop();
        _noiseSource.disconnect();
        _noiseSource = null;
        _isRunning = false;
    }
    function _play(volume) {
        if (!_isReady || _isNull(_masterGain)) {
            return;
        }
        if (_isNull(volume)) {
            volume = config.masterGainVal;
        }
        var noiseNode = _getOrCreateNoiseSource();
        if (_isNull(noiseNode)) {
            return;
        }

        var now = _getNow();
        if (!_isRunning) {
            _masterGain.gain.setValueAtTime(0, now);
        }
        _setMasterGain(volume, config.fadeInMs);

        if (!_isRunning) {
            noiseNode.loop = true;
            noiseNode.start();
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
        // _log("setMasterGain: v1: " + v1 + " v2: " + v2 + " t1: " + t1 + " t2: " + t2 + " g: " + g + " currentValue: " + currentValue);
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
            _initNoise(audioContext, destination);
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
        isRunning: function () {
            return _isRunning;
        },
        play: function (volume) {
            return _play(volume);
        },
        stop: function (isOn) {
            return _stop(isOn);
        },
        setFilterFreq: function (freq) {
            _setFilterFreq(freq);
        },
        setFilterQ: function (quality) {
            _setFilterQ(quality);
        },
        setFilterType: function (type) {
            _setFilterType(type);
        },
    }
}(zsUtil));