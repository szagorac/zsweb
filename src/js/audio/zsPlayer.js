var zsPlayer = (function (u, win) {
    "use strict";
    const LOG_ID = "ZsBuffer: ";
    var _audioBuffers = null;
    var _szBuffers = null;
    var _audioCtx = null;
    var _isInitialised = false;
    var _maxGain = 1.0;

    var config = {
        gain: 1.0, //0 (lowest) and 1 (highest)
        modTimeSec: 0.2,
        stopToleranceSec: 0.1
    }
    
    function ZsBufferException(msg) {
        this.message = msg;
        this.name = "ZsBufferException";
    }
    // ----- ZsBuffer 
    function ZsBuffer(index) {
        this.index = index;
        this.isInitialised = false;
        this.isPlaying = false;
        this.audioBuffer = null;
        this.audioSourceNode = null;
        this.gainNode = null;
    }
    ZsBuffer.prototype.init = function () {
        if (this.index < 0 || this.index > _audioBuffers.length) {
            _logError("initBuffer: Invalid buffer index: " + bufferIndex);
            return;
        }

        this.audioBuffer = _audioBuffers[this.index];
        if (!this.audioBuffer) {
            _log("initBuffer: invalid buffer");
            return;
        }

        this.audioSourceNode = _createBufferAudioSource(this.audioBuffer);
        if (_isNull(this.audioSourceNode)) {
            _logError("initBuffer: invalid audio source");
            return;
        }

        this.gainNode = _createGainNode();
        this.gainNode.gain.setValueAtTime(config.gain, _getNow());
        this.audioSourceNode.connect(this.gainNode);
        this.gainNode.connect(_audioCtx.destination);;

        if (!this.audioSourceNode.start) {
            this.audioSourceNode.start = this.audioSourceNode.noteOn;
        }
        var idx = this.index;
        this.audioSourceNode.onended = function (event) {
            _onPlayComplete(idx);
        }
        this.isInitialised = true;
    }
    ZsBuffer.prototype.play = function (startTime, offset, duration) {
        if(_isNull(this.audioSourceNode)) {
            return;
        } 
        this.audioSourceNode.start(startTime, offset, duration);
        this.isPlaying = true;
    }
    ZsBuffer.prototype.stop = function () {
        if(!this.isPlaying) {
            return;
        }        
        if(_isNull(this.audioSourceNode)) {
            return;
        }
        var stopTime = _getNow();
        if(!_isNull(this.gainNode)) {
            stopTime = stopTime + config.modTimeSec;
            this.gainNode.gain.linearRampToValueAtTime(0, stopTime);
        }
        _log("ZsBuffer stop: time:" + stopTime + " index: " + this.index);
        this.audioSourceNode.stop(stopTime + config.stopToleranceSec);
    }
    ZsBuffer.prototype.onEnded = function () {
        if(_isNull(this.audioSourceNode)) {
            return;
        }
        _log("ZsBuffer onComplete: time:" + _getNow() + " index: " + this.index);
        this.audioSourceNode.disconnect();
        this.gainNode.disconnect();
        this.audioSourceNode = null;
        this.gainNode = null;
        this.isPlaying = false;
    }
    ZsBuffer.prototype.setGain = function (level, timeSec) {
        if(_isNull(this.gainNode)) {
            return;
        }
        if(!u.isNumeric(level) || !u.isNumeric(timeSec)) {
            return;
        }
        if(level > _maxGain) {
            level = _maxGain;
        }
        var currentValue = this.gainNode.gain.value;
        if(currentValue === level) {
            return;
        }
        var t = _getNow();
        t  = t + timeSec;
        _log("ZsBuffer setGain: time:" + _getNow() + " index: " + this.index + " level: " + level + " duration: " + timeSec);
        this.gainNode.gain.linearRampToValueAtTime(level, t);
    }
    // ----- ZsBuffer END

    // ----- functions
    function _init(ctx, bufferList) {
        if (!u || !win) {
            throw new ZsBufferException("Invalid libraries. Required: zsUtil and window");
        }
        if(_isNull(ctx) || _isNull(bufferList)) {
            _logError("_init: invalid buffer list");
            return;
        }
        _audioCtx = ctx;
        _audioBuffers = bufferList;
        _szBuffers = u.initArray(_audioBuffers.length, null);
        _isInitialised = true;
    }
    function _resetConfig() {
        _setGain(1.0);
    }
    function _playAudioBuffer(bufferIndex, startTime, offset, duration) {
        if(_isNull(_audioCtx)) {
            _logError("playAudioBuffer: Invalid audio context");
            return;
        }
        if(_isNull(bufferIndex)) {
            bufferIndex = 0;
        }
        var buffer = _szBuffers[bufferIndex];
        if(_isNull(buffer)) {
            buffer = new ZsBuffer(bufferIndex);
            buffer.init();
            if(!buffer.isInitialised) {
                _logError("failed to Initialise buffer: " + bufferIndex);
                return;
            }
            _szBuffers[bufferIndex] = buffer;
        }
        if(_isNull(buffer)) {
            _logError("Invalid buffer: " + bufferIndex);
            return;
        }
        if (!startTime) {
            startTime = _getNow();
        }
        if (!offset) {
            offset = 0;
        }
        if (!duration) {
            duration = buffer.audioBuffer.duration;
        }
        buffer.play(startTime, offset, duration);
    }
    function _createBufferAudioSource(buffer) {
        if (!buffer) {
            _logError("createBufferAudioSource: invalid audio buffer");
            return null;
        }
        if (!_audioCtx) {
            _logError("createBufferAudioSource: Audio context is not initialised!!");
            return null;
        }

        var audioSource = _audioCtx.createBufferSource();
        audioSource.buffer = buffer;
        return audioSource;
    }    
    function _createGainNode() {
        if (!_audioCtx) {
            _logError("createBufferAudioSource: Audio context is not initialised!!");
            return null;
        }
        var gain = _audioCtx.createGain();
        return gain;
    }
    function _onPlayComplete(bufferIndex) {
        _log("onPlayComplete: index:" + bufferIndex);
        var buffer = _szBuffers[bufferIndex];
        if(_isNull(buffer)) {
            _logError("_onPlayComplete: Invalid buffer: " + bufferIndex);    
            return;        
        }
        
        buffer.onEnded();
        _szBuffers[bufferIndex] = null;
    }
    function _setPlayerConfig(params) {
        u.setConfig(config, params);
    }
    function _stop(bufferIndex) {
        _log("stop: bufferIndex: " + bufferIndex);
        if(!_isReady()) {
            return;
        }
        if(_isNull(bufferIndex)) {
            _stopAll();
        }
        var buffer = _szBuffers[bufferIndex];
        if(_isNull(buffer)) {
            _logError("stop: invalid bufferIndex: " + bufferIndex);
            return;
        }
        buffer.stop();
    }
    function _stopAll() {
        _log("stopAll: ");
        if(!_isReady()) {
            return;
        }        
        for (var i = 0; i < _szBuffers.length; ++i) {
            var buffer = _szBuffers[i];
            if(!_isNull(buffer)) {
                buffer.stop();
            }
        }
    }
    function _setMaxGain(level) {
        if(_isNull(level)) {
            return;
        }
        var g = level;
        if (u.isString(g)) {
            g = u.toFloat(g);
        }        
        if (!u.isNumeric(g)) {
            _logError("_setMaxGain: Invalid gain level: " + g);
            return;
        }
        _maxGain = g;
    }
    function _setGain(level, timeMs, bufferIndex) {
        if (_isNull(_audioCtx)) {
            _logError("setGain: invalid context of master gain");
            return;
        }
        if (u.isString(level)) {
            level = u.toFloat(level);
        }
        
        var g = config.gain;
        if (u.isNumeric(level)) {
            g = level;
        } else {
            _logError("_setGain: Invalid gain level: " + level);
            return;
        }

        if (g < 0.0) {
            g = 0.0;
        } else if (g > 1.0) {
            g = 1.0;
        }
        if(g > _maxGain) {
            g = _maxGain;
        }
        var currentConfig = config.gain;
        if(currentConfig !== g) {
            config.gain = g;
        }
        var timeSec = config.modTimeSec;
        if (!_isNull(timeMs) && u.isNumeric(timeMs)) {
            timeSec = u.msecToSec(timeMs);            
        }

        if(_isNull(bufferIndex)) {
            for (var i = 0; i < _szBuffers.length; ++i) {
                var buffer = _szBuffers[i];
                if(!_isNull(buffer)) {
                    buffer.setGain(g, timeSec);
                }
            }
        } else {
            var buffer = _szBuffers[bufferIndex];
            if(_isNull(buffer)) {
                _logError("_setGain: invalid bufferIndex: " + bufferIndex);
                return;
            }
            buffer.setGain(g, timeSec);
        }
    }
    function _getNow() {
        if(_isNull(_audioCtx)) {
            return 0;
        }
        return _audioCtx.currentTime;
    }
    function _isReady() {
        return _isInitialised;
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
        init: function (ctx, bufferList) {
            _init(ctx, bufferList);
        },
        play: function (bufferIndex, startTime, offset, duration) {
            _playAudioBuffer(bufferIndex, startTime, offset, duration);
        },
        stop: function (bufferIndex) {
            _stop(bufferIndex);
        },
        stopAll: function () {
            _stopAll(bufferIndex);
        },
        reset: function () {
            _resetConfig();
        },
        isReady: function () {
            return _isReady();
        },
        setPlayerConfig: function (params) {
            _setPlayerConfig(params);
        },
        setGain: function (level, timeMs, bufferIndex) {
            _setGain(level, timeMs, bufferIndex);
        },
        setMaxGain: function (level) {
            _setMaxGain(level);
        },
    }
}(zsUtil, window));