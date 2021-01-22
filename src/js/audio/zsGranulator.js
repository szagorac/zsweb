var zsGranulator = (function (u) {
    "use strict";
    const LOG_ID = "ZsGranulator: ";

    var config = {
        masterGainVal: 0.1,
        playDurationSec: 30,
        playStartOffsetSec: 0.0,
        maxGrains: 16,
        bufferPositionPlayRate: 0.22,
        audioStopToleranceMs: 5,
        panner: { isUsePanner: false, panningModel: "equalpower", distanceModel: "linear", maxPanAngle: 45 },
        envelope: { attackTime: 0.5, decayTime: 0.0, sustainTime: 0.0, releaseTime: 0.5, sustainLevel: 1.0 },
        grain: { sizeMs: 100, pitchRate: 3.0, maxPositionOffsetRangeMs: 10, maxPitchRateRange: 0.00, timeOffsetStepMs: 10 },
    }

    var _grains = [];
    var _actions = [];

    var _audioCtx = null;
    var _buffer = null;
    var _masterGain = null;
    var _startTime = null;
    var _currentPosition = null;
    var _lastGrainTimeOffsetMs = null;
    var _isPlaying = false;
    var _isStop = false;
    var _isReady = false;

    function ZsGranulatorException(msg) {
        this.message = msg;
        this.name = "ZsGranulatorException";
    }

    function Grain(adsr, sizeMs, offsetSec, pitchRate) {
        this.envelope = adsr;
        this.size = sizeMs;
        this.durationSec = u.msecToSec(sizeMs);
        this.position = offsetSec;
        this.playbackRate = pitchRate;
        this.isFinished = false;
        this.playStopTolerance = u.msecToSec(config.audioStopToleranceMs);
    }
    Grain.prototype.play = function (playTime) {
        var theGrain = this;

        if (!_buffer) {
            _logError("Grain.play: Invalid buffer");
            setTimeout(function () {
                _onGrainComplete(theGrain);
            }, this.size);
            return;
        }

        var isValid = this.validate();
        if (!isValid) {
            _logError("Grain.play: Invalid grain");
            setTimeout(function () {
                _onGrainComplete(theGrain);
            }, this.size);
            return;
        }

        var gGainNode = _createGainNode();
        if (!gGainNode) {
            _logError("Grain.play: Invalid gain");
            setTimeout(function () {
                _onGrainComplete(theGrain);
            }, this.size);
            return;
        }

        var audioSourceNode = _createBufferAudioSourceNode();
        if (!audioSourceNode) {
            _logError("Grain.play: Invalid audioSource");
            setTimeout(function () {
                _onGrainComplete(theGrain);
            }, this.size);
            return;
        }

        if (!_isNull(this.playbackRate)) {
            audioSourceNode.playbackRate.value = this.playbackRate;
        } else {
            this.playbackRate = 1.0;
        }

        var pannerNode = null;
        var isUsePanner = config.panner.isUsePanner;
        if (isUsePanner && _isPanGrain()) {
            pannerNode = _createPanner();
            _setRndPan(pannerNode);
        }

        audioSourceNode.connect(gGainNode);

        if (_isNull(pannerNode)) {
            gGainNode.connect(_masterGain);
        } else {
            gGainNode.connect(pannerNode);
            pannerNode.connect(_masterGain);
        }

        if (this.envelope) {
            this.envelope.applyTo(_buffer, gGainNode, playTime, this.durationSec);
        } else {
            gGainNode.gain.setValueAtTime(1, playTime);
        }

        audioSourceNode.onended = function (event) {
            _onGrainComplete(theGrain, audioSourceNode);
        }

        // _log("Grain.play: start grain, playTime: " + playTime + " now: " + _audioCtx.currentTime + " position: " + this.position + " duration: " + this.durationSec);
        if (this.playbackRate === 1.0) {
            audioSourceNode.start(playTime, this.position, this.durationSec);
        } else {
            audioSourceNode.start(playTime, this.position);
            audioSourceNode.stop(playTime + this.durationSec + this.playStopTolerance);
        }
    }
    Grain.prototype.validate = function () {
        var bDuration = _buffer.duration;

        if (_isNull(this.position) || this.position < 0 || this.position > bDuration) {
            _logError("Grain.validate: invalid position: " + position);
            return false;
        }

        var gDuration = this.position + this.durationSec;
        if (gDuration > bDuration) {
            _log("Grain.validate: grain Duration: " + gDuration + " greater than buffer Duration: " + bDuration);
            return false;
        }

        return true;
    }

    function _resetConfig() {
        if (_isPlaying) {
            _log("resetConfig: granulator is playing, ignore reset config");
            return;
        }
        _log("resetConfig: GRANULATOR");
        config.masterGainVal = 1.0;
        config.playDurationSec = 30;
        config.playStartOffsetSec = 0.0;
        config.maxGrains = 12;
        config.bufferPositionPlayRate = 1.0;
        config.audioStopToleranceMs = 5;
        config.panner.isUsePanner = false;
        config.panner.panningModel = "equalpower";
        config.panner.distanceModel = "linear";
        config.panner.maxPanAngle = 45;
        config.envelope.attackTime = 0.5;
        config.envelope.decayTime = 0.0;
        config.envelope.sustainTime = 0.0;
        config.envelope.releaseTime = 0.5;
        config.envelope.sustainLevel = 1.0
        config.grain.sizeMs = 100;
        config.grain.pitchRate = 1.0;
        config.grain.maxPositionOffsetRangeMs = 0;
        config.grain.maxPitchRateRange = 0.0;
        config.grain.timeOffsetStepMs = 10;
    }
    function _initGranulator(audioContext, audioBuffer, destination) {
        if (!u) {
            throw new ZsGranulatorException("Invalid libraries. Required: zsUtil");
        }

        _log("Init Granulator");

        if (!audioContext || !audioBuffer) {
            _logError("initGranulator: invalid context of buffer");
            _setReady(false);
            return;
        }
        _audioCtx = audioContext;
        _buffer = audioBuffer;

        if (_isNull(destination)) {
            destination = _audioCtx.destination;
        }

        _masterGain = _createGainNode();
        _setMasterGain(config.masterGainVal);

        _masterGain.connect(destination);
        _setReady(true);
    }
    function _playLinear() {
        if (!_audioCtx || !_buffer) {
            _logError("playLinear: invalid context of buffer");
            return;
        }
        if (!_isReady) {
            _logError("playLinear: granulator is not ready, will not play");
            return;
        }

        if (_isPlaying) {
            _log("playLinear: granulator is already playing, ignore");
            return;
        }

        _log("playLinear: Playing GRANULATOR");

        _isStop = false;
        _startTime = _audioCtx.currentTime;
        _currentPosition = 0;
        _log("playLinear: startTime : " + _startTime + " context.state: " + _audioCtx.state);
        _isPlaying = true;
        _processGrains();
    }
    function _processGrains() {
        if (!_isReady) {
            _logError("processGrains: granulator is not ready, will not play");
            return;
        }

        if (_isStop) {
            return;
        }

        _validatePlayState();

        if (_isStop) {
            _log("processGrains: STOPPING Granulator");
            _isPlaying = false;
            return;
        }

        var now = _audioCtx.currentTime;
        _currentPosition = _calculateCurrentPosition(now);

        _processActions(now);

        var attackTime = config.envelope.attackTime;
        var decayTime = config.envelope.decayTime;
        var sustainLevel = config.envelope.sustainLevel;
        var sustainTime = config.envelope.sustainTime;
        var releaseTime = config.envelope.releaseTime;

        var sizeMs = config.grain.sizeMs;
        var pitchRate = config.grain.pitchRate;
        var maxGrains = config.maxGrains;

        if (_isNull(pitchRate) || pitchRate < 0.0) {
            pitchRate = 1.0;
        }

        _setMasterGain(config.masterGainVal);

        while (_grains.length < maxGrains) {
            var grainOffsetSec = _calculateRndGrainOffsetSec(_currentPosition);
            var playTime = _calculatePlayTime(now);
            var playbackRate = _calculateRndPlaybackRate(pitchRate);
            if (playbackRate < 0) {
                playbackRate = pitchRate;
            }

            //Envelope
            var adsr = u.createEnvelope(attackTime, decayTime, sustainLevel, sustainTime, releaseTime);
            //Grain
            var g = new Grain(adsr, sizeMs, grainOffsetSec, playbackRate);

            _grains.push(g);
            g.play(playTime);
        }
    }
    function _processActions(now) {
        if (!u.isArray(_actions)) {
            return;
        }

        for (var i = 0; i < _actions.length; i++) {
            var action = _actions[i];
            _updateConfigValue(action, now);
        }

        _purgeCompletedActions();
    }
    function _updateConfigValue(action, now) {
        if (!(u.isObjectInstanceOf(u.RampLinear, action) || u.isObjectInstanceOf(u.RampSin, action))) {
            _logError("updateConfigValue: invalid action: ");
            return;
        }
        var newVal = action.getValue(now);
        if(!_isNull(newVal)) {
            u.setNestedObjectValue(config, action.paramName, newVal);
        } else {
            _log("updateConfigValue: action returned invalid value");
        }
        
        if(action.isScheduleReminder) {            
            var durationMs = u.secToMsec(action.reminderSec);            
            _addRampLinearAction(action.paramName, action.startValue, durationMs);
        }
    }
    function _calculatePlayTime(now) {
        var timeStepMs = config.grain.timeOffsetStepMs;
        var maxOffsetMs = config.grain.sizeMs;
        if (_isNull(_lastGrainTimeOffsetMs)) {
            _lastGrainTimeOffsetMs = -1 * timeStepMs;
        }
        var offsetMs = _lastGrainTimeOffsetMs + timeStepMs;
        if (offsetMs >= maxOffsetMs) {
            offsetMs = 0;
        }
        // _log("calculatePlayTime: offsetMs: " + offsetMs);
        var offsetSec = u.msecToSec(offsetMs);
        _lastGrainTimeOffsetMs = offsetMs;
        return now + offsetSec;
    }
    function _calculateRndPlaybackRate(pitchRate) {
        var maxPitchRateRange = config.grain.maxPitchRateRange;
        if (_isNull(maxPitchRateRange) || maxPitchRateRange === 0) {
            return pitchRate;
        }
        var halfOffset = maxPitchRateRange / 2.0;
        var minOffset = pitchRate - halfOffset;
        var maxOffset = pitchRate + halfOffset;
        return u.getRandomFromRange(minOffset, maxOffset);
    }
    function _calculateRndGrainOffsetSec(positionSec) {
        var maxOffsetRangeMs = config.grain.maxPositionOffsetRangeMs;
        var maxOffsetRangeSec = u.msecToSec(maxOffsetRangeMs);
        var bDuration = _buffer.duration;
        var halfOffsetSec = maxOffsetRangeSec / 2.0;
        var minOffsetSec = positionSec - halfOffsetSec;
        var maxOffsetSec = positionSec + halfOffsetSec;
        if (positionSec < maxOffsetRangeSec) {
            minOffsetSec = 0;
        }
        if (positionSec > (bDuration - maxOffsetRangeSec)) {
            maxOffsetSec = bDuration;
        }
        return u.getRandomFromRange(minOffsetSec, maxOffsetSec);
    }
    function _calculateCurrentPosition(now) {
        var elapsed = now - _startTime;
        var bDuration = _buffer.duration;
        var playRate = config.bufferPositionPlayRate;
        var position = config.grain.defaultOffsetSec;

        if (playRate !== 0.0) {
            position = elapsed * playRate;
        }

        if (position > bDuration) {
            var reminder = (position * 100.0) % (bDuration * 100.0) / 100.0;
            // log("calculateCurrentPosition: position: " + position + " bDuration: " + bDuration + " reminder: " + reminder);
            position = reminder;
        }

        if (position < 0.0 || position > bDuration) {
            position = 0.0;
        }

        return position;

    }
    function _onGrainComplete(grain, audioSourceNode) {
        if (!grain) {
            return;
        }
        // log("onGrainComplete: " );
        grain.isFinished = true;

        _purgeCompletedGrains();
        _stopAudioSource(audioSourceNode);
        _processGrains();
    }
    function _stopAudioSource(audioSourceNode) {
        if (!audioSourceNode) {
            return;
        }
        // log("stopAudioSource: time:" + audioCtx.currentTime);
        audioSourceNode.disconnect();
        audioSourceNode = null;
    }
    function _purgeCompletedGrains() {
        var active = [];
        for (var i = 0; i < _grains.length; i++) {
            var grain = _grains[i];
            if (!_isObject(grain)) {
                continue;
            }
            if (!grain.isFinished) {
                active.push(grain);
            }
        }
        _grains = active;
    }
    function _purgeCompletedActions() {
        var active = [];
        for (var i = 0; i < _actions.length; i++) {
            var action = _actions[i];
            if (!_isObject(action)) {
                continue;
            }
            if (!action.isFinished) {
                active.push(action);
            }
        }
        _actions = active;
    }
    function _validatePlayState() {
        if (!_audioCtx || !_buffer) {
            _isStop = true;
            _logError("validatePlayState: invalid context or buffer, stopping play");
            return;
        }
        var now = _audioCtx.currentTime;

        if (_isNull(_startTime)) {
            _isStop = true;
            _logError("validatePlayState: invalid startTime, stopping play");
            return;
        }

        var playTime = _startTime + config.playDurationSec;
        if (now > playTime) {
            _isStop = true;
            _log("validatePlayState: stopping granulator, now: " + now + " is greater then allowed playtime: " + playTime);
            return;
        }

        _isStop = false;
    }
    function _setReady(isOk) {
        if (_isNull(isOk)) {
            return;
        }
        _log("setReady: " + isOk);
        _isReady = isOk;
    }
    function _setStop(isValue) {
        if (_isNull(isValue)) {
            return;
        }
        _log("setStop: " + isValue);
        if (isValue) {
            _isPlaying = false;
        }
        _isStop = isValue;
    }
    function _getReady() {
        return _isReady;
    }
    function _setAudioBuffer(audioBuffer) {
        if (!_audioCtx) {
            _logError("setAudioBuffer: invalid audio context");
            return;
        }
        if (!_isObject(audioBuffer)) {
            _logError("setAudioBuffer: invalid audio buffer");
            return;
        }
        if (_isPlaying) {
            _log("setAudioBuffer: granulator is playing, can not change the buffer");
            return;
        }

        _buffer = audioBuffer;
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
        }

        if (g < 0.0) {
            g = 0.0;
        } else if (g > 1.0) {
            g = 1.0;
        }

        config.masterGainVal = g;
        var now = _audioCtx.currentTime;
        if (!_isNull(timeMs) && u.isNumeric(timeMs)) {
            var timeSec = u.msecToSec(timeMs);
            var t = now + timeSec;
            // _log("setMasterGain: " + g + " timeSec: " + timeSec);
            _masterGain.gain.linearRampToValueAtTime(g, t);
        } else {
            // _log("setMasterGain: " + g);
            _masterGain.gain.setValueAtTime(g, now);
        }
    }
    function _setMaxPlayDuration(durationSec) {
        if (_isNull(durationSec)) {
            _logError("setMaxPlayDuration: Invalid duration: " + durationSec);
            return;
        }
        if (u.isString(durationSec)) {
            durationSec = u.toFloat(durationSec);
        }
        if (!u.isNumeric(durationSec)) {
            _logError("setMaxPlayDuration: Invalid duration: " + durationSec);
            return;
        }
        _log("setMaxPlayDuration: " + durationSec);
        config.playDurationSec = durationSec;
    }
    function _setEnvelopeConf(params) {
        if (!_isObject(params)) {
            _logError("setEnvelopeConf: Invalid envelope config");
            return;
        }

        var envConfig = config.envelope;
        for (var prop in params) {
            if (params.hasOwnProperty(prop) && envConfig.hasOwnProperty(prop)) {
                envConfig[prop] = params[prop];
                _log("setEnvelopeConf: " + prop + ": " + params[prop]);
            }
        }
    }
    function _addRampLinearAction(configParamName, rampEndValue, rampDurationMs) {
        if (!u.isString(configParamName) || !u.isNumeric(rampEndValue) || !u.isNumeric(rampDurationMs)) {
            _logError("addRumpLinearAction: Invalid input parameters: configParamName : " + configParamName + " rampEndValue: " + rampEndValue + " rampDurationMs: " + rampDurationMs);
            return;
        }

        for (var i = 0; i < _actions.length; i++) {
            var action = _actions[i];
            if (!u.isObjectInstanceOf(u.RampLinear, action) || !u.isObjectInstanceOf(u.RampSin, action)) {
                continue;
            }
            if (action.paramName === configParamName && !action.isFinished) {
                action.isFinished = true;
                _log("addRumpLinearAction: action already running for configParamName : " + configParamName + " stopping it...");
            }
        }

        var now = _audioCtx.currentTime;
        var currentValue = u.getNestedObjectValue(config, configParamName);
        _log("addRampLinearAction: configParamName: " + configParamName + "  rampEndValue: " + rampEndValue + "  rampDurationMs: " + rampDurationMs + " now: " + now + " currentValue: " + currentValue);
        var ramp = u.createRampLinear(configParamName, rampEndValue, rampDurationMs, now, currentValue);
        _actions.push(ramp);
    }

    function _addRampSinAction(configParamName, rampAmplitude, rampFrequency, rampDurationMs) {
        if (!u.isString(configParamName) || !u.isNumeric(rampAmplitude) || !u.isNumeric(rampFrequency) || !u.isNumeric(rampDurationMs)) {
            _logError("addRampSinAction: Invalid input parameters: configParamName : " + configParamName + " rampAmplitude: " + rampAmplitude + " rampFrequency: " + rampFrequency + " rampDurationMs: " + rampDurationMs);
            return;
        }

        for (var i = 0; i < _actions.length; i++) {
            var action = _actions[i];
            if (!u.isObjectInstanceOf(u.RampLinear, action) || !u.isObjectInstanceOf(u.RampSin, action)) {
                continue;
            }
            if (action.paramName === configParamName && !action.isFinished) {
                action.isFinished = true;
                _log("addRampSinAction: action already running for configParamName : " + configParamName + " stopping it...");
            }
        }

        var now = _audioCtx.currentTime;
        var currentValue = u.getNestedObjectValue(config, configParamName);
        _log("addRampSinAction: configParamName: " + configParamName + "  rampAmplitude: " + rampAmplitude + "  rampFrequency: " + rampFrequency + "  rampDurationMs: " + rampDurationMs + " now: " + now + " currentValue: " + currentValue);
        var ramp = u.createRampSin(configParamName, rampAmplitude, rampFrequency, rampDurationMs, now, currentValue);
        _actions.push(ramp);
    }
    function _addConfigAction(action) {
        if (!_isObject(action)) {
            _logError("addConfigAction: Invalid action");
            return;
        }

        _actions.push(action);
    }
    function _setGrainConf(params) {
        if (!_isObject(params)) {
            _logError("setGrainConf: Invalid grain config");
            return;
        }

        var grainConfig = config.grain;
        for (var prop in params) {
            if (params.hasOwnProperty(prop) && grainConfig.hasOwnProperty(prop)) {
                grainConfig[prop] = params[prop];
                _log("setGrainConf: " + prop + ": " + params[prop]);
            }
        }
    }
    function _setGranulatorConf(params) {
        u.setConfig(config, params);
    }
    function _createBufferAudioSourceNode() {
        if (!_buffer) {
            _logError("createBufferAudioSource: invalid audio buffer");
            return null;
        }
        if (!_audioCtx) {
            _logError("createBufferAudioSource: Audio context is not initialised!!");
            return null;
        }
        var audioSource = _audioCtx.createBufferSource();
        audioSource.buffer = _buffer;

        return audioSource;
    }
    function _createPanner() {
        if (!_audioCtx) {
            _logError("createPanner: Audio context is not initialised!!");
            return null;
        }
        var panner = _audioCtx.createPanner();
        var pannerConfig = config.panner;
        panner.panningModel = pannerConfig.panningModel;
        panner.distanceModel = pannerConfig.distanceModel;
        return panner;
    }
    function _isPanGrain() {
        //pan about half of grains;
        var panNo = u.getRandomIntFromRange(1, 2);
        return panNo === 1;
    }
    function _setRndPan(pannerNode) {
        if (_isNull(pannerNode)) {
            _logError("setRndPan: invalid panner");
            return;
        }
        var pannerConfig = config.panner;
        var maxAngle = pannerConfig.maxPanAngle;
        var angle = u.getRandomIntFromRange(-1 * maxAngle, maxAngle);
        var x = Math.sin(angle * (Math.PI / 180));

        // x = u.getRandomFromRange(-0.9, 0.9);

        _log("setRndPan: x: " + x);
        pannerNode.setPosition(x, 0, x);
    }
    function _createGainNode() {
        if (!_audioCtx) {
            _logError("createBufferAudioSource: Audio context is not initialised!!");
            return null;
        }
        var gain = _audioCtx.createGain();
        return gain;
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
    function _isObject(obj) {
        return u.isObject(obj);
    }

    // Public members
    return {
        init: function (audioContext, audioBuffer, destination) {
            _initGranulator(audioContext, audioBuffer, destination);
        },
        play: function () {
            _playLinear();
        },
        stop: function () {
            _setStop(true);
        },
        reset: function () {
            _resetConfig();
        },
        setGain: function (level, timeMs) {
            _setMasterGain(level, timeMs);
        },
        setBuffer: function (audioBuffer) {
            _setAudioBuffer(audioBuffer);
        },
        setPlayDuration: function (durationSec) {
            _setMaxPlayDuration(durationSec);
        },
        setGrainEnvelope: function (config) {
            _setEnvelopeConf(config);
        },
        setGrainConfig: function (config) {
            _setGrainConf(config);
        },
        setGranulatorConfig: function (config) {
            _setGranulatorConf(config);
        },
        addAction: function (action) {
            _addConfigAction(action);
        },
        addRampLinear: function (configParamName, rampEndValue, rampDurationMs) {
            _addRampLinearAction(configParamName, rampEndValue, rampDurationMs);
        },
        addRampSin: function (configParamName, rampAmplitude, rampFrequency, rampDurationMs) {
            _addRampSinAction(configParamName, rampAmplitude, rampFrequency, rampDurationMs);
        },
        isReady: function () {
            return _getReady();
        },
    }
}(zsUtil));