var zsNoise = (function (u) {
    "use strict";
    const LOG_ID = "ZsNoise: ";

    var _audioCtx = null;
    var _isReady = false;
    var _masterGain = null;
    var _isRunning = false;
    var _noiseSource = null;
    var _filter = null;
    var _lfoDetune = null;
    var _lfoDetuneGain = null;

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
        detuneFreq: 0.05,
        detuneMax: 50,
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
        
        _setReady(true);
    }
    function _getOrCreateNoiseSource() {
        if (_isRunning && !_isNull(_noiseSource)) {
            return _noiseSource;
        }
        _buildCommonNodes();
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
    function _buildCommonNodes() {
        if (!_isReady || !_audioCtx) {
            _logError("_buildCommonNodes: invalid context");
            return;
        }
        _stop();
        //Master gain
        _masterGain = _createGainNode();
        _masterGain.gain.value = 0;

         //oscillator LFO Detune Modulator
         _lfoDetune = _audioCtx.createOscillator();
         _lfoDetune.frequency.value = config.detuneFreq;
         _lfoDetuneGain = _audioCtx.createGain();
         _lfoDetuneGain.gain.value = config.detuneMax;
         _lfoDetune.connect(_lfoDetuneGain);
         _lfoDetune.start();
 
         //filter
         if (config.isUseFilter) {
             config.filterMaxValue = _audioCtx.sampleRate / 2;
             config.filterNumberOfOctaves = Math.log(config.filterMaxValue / config.filterMinValue) / Math.LN2;
             _filter = _audioCtx.createBiquadFilter();
             _filter.type = config.filterType;
             _filter.frequency.value = config.filterFreq;
             _filter.Q.value = config.filterQ;
             _lfoDetuneGain.connect(_filter.detune);
             _filter.connect(_masterGain);
         } 

         _masterGain.connect(_audioCtx.destination);
    }
    function _setFilterFreq(freq) {
        if (!_isReady || _isNull(_filter)) {
            return;
        }
        config.filterFreq = freq;
        _filter.frequency.linearRampToValueAtTime(freq, _getNow() + config.rampSec);
    };
    function _setFilterQ(quality) {
        if (!_isReady || _isNull(_filter)) {
            return;
        }
        config.filterQ = quality;
        _filter.Q.linearRampToValueAtTime(quality, _getNow() + config.rampSec);
    };    
    function _setFilterDetune(detune) {
        if (!_isReady || _isNull(_filter)) {
            return;
        }
        _filter.detune.setValueAtTime(detune, _getNow());
    };
    function _setFilterType(type) {
        if (!_isReady || _isNull(_filter)) {
            return;
        }
        config.filterType = type;
        _filter.type = type;
    };

    function _stop() {
        if (!_isRunning) {
            return;
        }
        if(!_isNull(_masterGain)) {
            _masterGain.gain.linearRampToValueAtTime(0.001, _getNow() + 0.1);
        }
        var nodes = [_noiseSource, _lfoDetune, _lfoDetuneGain, _filter, _masterGain];
        setTimeout(function() {
            _stopNodes(nodes);
        }, 200);
        _noiseSource = null;
        _lfoDetune = null;
        _lfoDetuneGain = null;
        _filter = null;
        _masterGain = null;        
        _isRunning = false;
    }
    function _stopNodes(nodes) {
        if(!u.isArray(nodes)) {
            return;
        }
        for (var i = 0; i < nodes.length; i++) {
            _stopNode(nodes[i]);
        }
    }
    function _stopNode(node) {
        if(_isNull(node)) {
            return;
        }
        if(typeof node.stop === 'function') {
            node.stop();
        }
        if(typeof node.disconnect === 'function') {
            node.disconnect();
        }       
    }
    function _play(volume) {
        if (!_isReady) {
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
    function _getRunning() {
        return _isRunning;
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
            return _getRunning();
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
        setFilterDetune: function (detune) {
            _setFilterDetune(detune);
        },
        setFilterType: function (type) {
            _setFilterType(type);
        },
    }
}(zsUtil));