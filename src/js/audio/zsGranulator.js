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

    var grains = [];
    var actions = [];

    var audioCtx = null;
    var buffer = null;
    var masterGain = null;
    var startTime = null;
    var currentPosition = null;
    var lastGrainTimeOffsetMs = null;
    var isPlaying = false;
    var isStop = false;
    var isReady = false;

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

        if (!buffer) {
            logError("Grain.play: Invalid buffer");
            setTimeout(function () {
                onGrainComplete(theGrain);
            }, this.size);
            return;
        }

        var isValid = this.validate();
        if (!isValid) {
            logError("Grain.play: Invalid grain");
            setTimeout(function () {
                onGrainComplete(theGrain);
            }, this.size);
            return;
        }

        var gGainNode = createGainNode();
        if (!gGainNode) {
            logError("Grain.play: Invalid gain");
            setTimeout(function () {
                onGrainComplete(theGrain);
            }, this.size);
            return;
        }

        var audioSourceNode = createBufferAudioSourceNode();
        if (!audioSourceNode) {
            logError("Grain.play: Invalid audioSource");
            setTimeout(function () {
                onGrainComplete(theGrain);
            }, this.size);
            return;
        }

        if (!isNull(this.playbackRate)) {
            audioSourceNode.playbackRate.value = this.playbackRate;
        } else {
            this.playbackRate = 1.0;
        }

        var pannerNode = null;
        var isUsePanner = config.panner.isUsePanner;
        if (isUsePanner && isPanGrain()) {
            pannerNode = createPanner();
            setRndPan(pannerNode);
        }

        audioSourceNode.connect(gGainNode);

        if (isNull(pannerNode)) {
            gGainNode.connect(masterGain);
        } else {
            gGainNode.connect(pannerNode);
            pannerNode.connect(masterGain);
        }

        if (this.envelope) {
            this.envelope.applyTo(buffer, gGainNode, playTime, this.durationSec);
        } else {
            gGainNode.gain.setValueAtTime(1, playTime);
        }

        audioSourceNode.onended = function (event) {
            onGrainComplete(theGrain, audioSourceNode);
        }

        log("Grain.play: start grain, playTime: " + playTime + " now: " + audioCtx.currentTime + " position: " + this.position + " duration: " + this.durationSec);
        if (this.playbackRate === 1.0) {
            audioSourceNode.start(playTime, this.position, this.durationSec);
        } else {
            audioSourceNode.start(playTime, this.position);
            audioSourceNode.stop(playTime + this.durationSec + this.playStopTolerance);
        }
    }
    Grain.prototype.validate = function () {
        var bDuration = buffer.duration;

        if (isNull(this.position) || this.position < 0 || this.position > bDuration) {
            logError("Grain.validate: invalid position: " + position);
            return false;
        }

        var gDuration = this.position + this.durationSec;
        if (gDuration > bDuration) {
            log("Grain.validate: grain Duration: " + gDuration + " greater than buffer Duration: " + bDuration);
            return false;
        }

        return true;
    }


    function resetConfig() {
        if (isPlaying) {
            log("resetConfig: granulator is playing, ignore reset config");
            return;
        }

        config.masterGainVal = 1.0;
        config.playDurationSec = 5;
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
    function initGranulator(audioContext, audioBuffer, destination) {
        if (!u) {
            throw new ZsGranulatorException("Invalid libraries. Required: zsUtil");
        }

        log("Init Granulator");

        if (!audioContext || !audioBuffer) {
            logError("initGranulator: invalid context of buffer");
            setReady(false);
            return;
        }
        audioCtx = audioContext;
        buffer = audioBuffer;

        if (isNull(destination)) {
            destination = audioCtx.destination;
        }

        masterGain = createGainNode();
        setMasterGain(config.masterGainVal);

        masterGain.connect(destination);
        setReady(true);
    }
    function playLinear() {
        if (!audioCtx || !buffer) {
            logError("playLinear: invalid context of buffer");
            return;
        }
        if (!isReady) {
            logError("playLinear: granulator is not ready, will not play");
            return;
        }

        if (isPlaying) {
            log("playLinear: granulator is already playing, ignore");
            return;
        }

        log("playLinear: Playing GRANULATOR");

        isStop = false;
        startTime = audioCtx.currentTime;
        currentPosition = 0;
        log("playLinear: startTime : " + startTime + " context.state: " + audioCtx.state);
        isPlaying = true;
        processGrains();
    }
    function processGrains() {
        if (!isReady) {
            logError("processGrains: granulator is not ready, will not play");
            return;
        }

        if (isStop) {
            return;
        }

        validatePlayState();

        if (isStop) {
            log("processGrains: STOPPING Granulator");
            isPlaying = false;
            return;
        }

        var now = audioCtx.currentTime;
        currentPosition = calculateCurrentPosition(now);

        processActions(now);

        var attackTime = config.envelope.attackTime;
        var decayTime = config.envelope.decayTime;
        var sustainLevel = config.envelope.sustainLevel;
        var sustainTime = config.envelope.sustainTime;
        var releaseTime = config.envelope.releaseTime;

        var sizeMs = config.grain.sizeMs;
        var pitchRate = config.grain.pitchRate;
        var maxGrains = config.maxGrains;

        if (isNull(pitchRate) || pitchRate < 0.0) {
            pitchRate = 1.0;
        }

        setMasterGain(config.masterGainVal);

        while (grains.length < maxGrains) {
            var grainOffsetSec = calculateRndGrainOffsetSec(currentPosition);
            var playTime = calculatePlayTime(now);
            var playbackRate = calculateRndPlaybackRate(pitchRate);
            if (playbackRate < 0) {
                playbackRate = pitchRate;
            }

            //Envelope
            var adsr = u.createEnvelope(attackTime, decayTime, sustainLevel, sustainTime, releaseTime);
            //Grain
            var g = new Grain(adsr, sizeMs, grainOffsetSec, playbackRate);

            grains.push(g);
            g.play(playTime);
        }
    }
    function processActions(now) {
        if (!u.isArray(actions)) {
            return;
        }

        for (var i = 0; i < actions.length; i++) {
            var action = actions[i];
            updateConfigValue(action, now);
        }

        purgeCompletedActions();
    }
    function updateConfigValue(action, now) {
        if (!(u.isObjectInstanceOf(u.RampLinear, action) || u.isObjectInstanceOf(u.RampSin, action))) {
            logError("updateConfigValue: invalid action: ");
            return;
        }
        var newVal = action.getValue(now);
        if(!isNull(newVal)) {
            u.setNestedObjectValue(config, action.paramName, newVal);
        } else {
            log("updateConfigValue: action returned invalid value");
        }
        
        if(action.isScheduleReminder) {            
            var durationMs = u.secToMsec(action.reminderSec);            
            addRampLinearAction(action.paramName, action.startValue, durationMs);
        }
    }
    function calculatePlayTime(now) {
        var timeStepMs = config.grain.timeOffsetStepMs;
        var maxOffsetMs = config.grain.sizeMs;
        if (isNull(lastGrainTimeOffsetMs)) {
            lastGrainTimeOffsetMs = -1 * timeStepMs;
        }
        var offsetMs = lastGrainTimeOffsetMs + timeStepMs;
        if (offsetMs >= maxOffsetMs) {
            offsetMs = 0;
        }
        log("calculatePlayTime: offsetMs: " + offsetMs);
        var offsetSec = u.msecToSec(offsetMs);
        lastGrainTimeOffsetMs = offsetMs;
        return now + offsetSec;
    }
    function calculateRndPlaybackRate(pitchRate) {
        var maxPitchRateRange = config.grain.maxPitchRateRange;
        if (isNull(maxPitchRateRange) || maxPitchRateRange === 0) {
            return pitchRate;
        }
        var halfOffset = maxPitchRateRange / 2.0;
        var minOffset = pitchRate - halfOffset;
        var maxOffset = pitchRate + halfOffset;
        return u.getRandomFromRange(minOffset, maxOffset);
    }
    function calculateRndGrainOffsetSec(positionSec) {
        var maxOffsetRangeMs = config.grain.maxPositionOffsetRangeMs;
        var maxOffsetRangeSec = u.msecToSec(maxOffsetRangeMs);
        var bDuration = buffer.duration;
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
    function calculateCurrentPosition(now) {
        var elapsed = now - startTime;
        var bDuration = buffer.duration;
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
    function onGrainComplete(grain, audioSourceNode) {
        if (!grain) {
            return;
        }
        // log("onGrainComplete: " );
        grain.isFinished = true;

        purgeCompletedGrains();
        stopAudioSource(audioSourceNode);
        processGrains();
    }
    function stopAudioSource(audioSourceNode) {
        if (!audioSourceNode) {
            return;
        }
        // log("stopAudioSource: time:" + audioCtx.currentTime);
        audioSourceNode.disconnect();
        audioSourceNode = null;
    }
    function purgeCompletedGrains() {
        var active = [];
        for (var i = 0; i < grains.length; i++) {
            var grain = grains[i];
            if (!isObject(grain)) {
                continue;
            }
            if (!grain.isFinished) {
                active.push(grain);
            }
        }
        grains = active;
    }
    function purgeCompletedActions() {
        var active = [];
        for (var i = 0; i < actions.length; i++) {
            var action = actions[i];
            if (!isObject(action)) {
                continue;
            }
            if (!action.isFinished) {
                active.push(action);
            }
        }
        actions = active;
    }
    function validatePlayState() {
        if (!audioCtx || !buffer) {
            isStop = true;
            logError("validatePlayState: invalid context or buffer, stopping play");
            return;
        }
        var now = audioCtx.currentTime;

        if (isNull(startTime)) {
            isStop = true;
            logError("validatePlayState: invalid startTime, stopping play");
            return;
        }

        var playTime = startTime + config.playDurationSec;
        if (now > playTime) {
            isStop = true;
            log("validatePlayState: stopping granulator, now: " + now + " is greater then allowed playtime: " + playTime);
            return;
        }

        isStop = false;
    }
    function setReady(isOk) {
        if (isNull(isOk)) {
            return;
        }
        log("setReady: " + isOk);
        isReady = isOk;
    }
    function setStop(isValue) {
        if (isNull(isValue)) {
            return;
        }
        log("setStop: " + isValue);
        if (isValue) {
            isPlaying = false;
        }
        isStop = isValue;
    }
    function getReady() {
        return isReady;
    }
    function setAudioBuffer(audioBuffer) {
        if (!audioCtx) {
            logError("setAudioBuffer: invalid audio context");
            return;
        }
        if (!isObject(audioBuffer)) {
            logError("setAudioBuffer: invalid audio buffer");
            return;
        }
        if (isPlaying) {
            log("setAudioBuffer: granulator is playing, can not change the buffer");
            return;
        }

        buffer = audioBuffer;
    }
    function setMasterGain(level, timeMs) {
        if (!audioCtx || !masterGain) {
            logError("setMasterGain: invalid context of master gain");
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
        var now = audioCtx.currentTime;
        if (!isNull(timeMs) && u.isNumeric(timeMs)) {
            var timeSec = u.msecToSec(timeMs);
            var t = now + timeSec;
            log("setMasterGain: " + g + " timeSec: " + timeSec);
            masterGain.gain.linearRampToValueAtTime(g, t);
        } else {
            log("setMasterGain: " + g);
            masterGain.gain.setValueAtTime(g, now);
        }
    }
    function setMaxPlayDuration(durationSec) {
        if (isNull(durationSec)) {
            logError("setMaxPlayDuration: Invalid duration: " + durationSec);
            return;
        }
        if (u.isString(durationSec)) {
            durationSec = u.toFloat(durationSec);
        }
        if (!u.isNumeric(durationSec)) {
            logError("setMaxPlayDuration: Invalid duration: " + durationSec);
            return;
        }
        log("setMaxPlayDuration: " + durationSec);
        config.playDurationSec = durationSec;
    }
    function setEnvelopeConf(params) {
        if (!isObject(params)) {
            logError("setEnvelopeConf: Invalid envelope config");
            return;
        }

        var envConfig = config.envelope;
        for (var prop in params) {
            if (params.hasOwnProperty(prop) && envConfig.hasOwnProperty(prop)) {
                envConfig[prop] = params[prop];
                log("setEnvelopeConf: " + prop + ": " + params[prop]);
            }
        }
    }
    function addRampLinearAction(configParamName, rampEndValue, rampDurationMs) {
        if (!u.isString(configParamName) || !u.isNumeric(rampEndValue) || !u.isNumeric(rampDurationMs)) {
            logError("addRumpLinearAction: Invalid input parameters: configParamName : " + configParamName + " rampEndValue: " + rampEndValue + " rampDurationMs: " + rampDurationMs);
            return;
        }

        for (var i = 0; i < actions.length; i++) {
            var action = actions[i];
            if (!u.isObjectInstanceOf(u.RampLinear, action) || !u.isObjectInstanceOf(u.RampSin, action)) {
                continue;
            }
            if (action.paramName === configParamName && !action.isFinished) {
                action.isFinished = true;
                log("addRumpLinearAction: action already running for configParamName : " + configParamName + " stopping it...");
            }
        }

        var now = audioCtx.currentTime;
        var currentValue = u.getNestedObjectValue(config, configParamName);
        log("addRampLinearAction: configParamName: " + configParamName + "  rampEndValue: " + rampEndValue + "  rampDurationMs: " + rampDurationMs + " now: " + now + " currentValue: " + currentValue);
        var ramp = u.createRampLinear(configParamName, rampEndValue, rampDurationMs, now, currentValue);
        actions.push(ramp);
    }

    function addRampSinAction(configParamName, rampAmplitude, rampFrequency, rampDurationMs) {
        if (!u.isString(configParamName) || !u.isNumeric(rampAmplitude) || !u.isNumeric(rampFrequency) || !u.isNumeric(rampDurationMs)) {
            logError("addRampSinAction: Invalid input parameters: configParamName : " + configParamName + " rampAmplitude: " + rampAmplitude + " rampFrequency: " + rampFrequency + " rampDurationMs: " + rampDurationMs);
            return;
        }

        for (var i = 0; i < actions.length; i++) {
            var action = actions[i];
            if (!u.isObjectInstanceOf(u.RampLinear, action) || !u.isObjectInstanceOf(u.RampSin, action)) {
                continue;
            }
            if (action.paramName === configParamName && !action.isFinished) {
                action.isFinished = true;
                log("addRampSinAction: action already running for configParamName : " + configParamName + " stopping it...");
            }
        }

        var now = audioCtx.currentTime;
        var currentValue = u.getNestedObjectValue(config, configParamName);
        log("addRampSinAction: configParamName: " + configParamName + "  rampAmplitude: " + rampAmplitude + "  rampFrequency: " + rampFrequency + "  rampDurationMs: " + rampDurationMs + " now: " + now + " currentValue: " + currentValue);
        var ramp = u.createRampSin(configParamName, rampAmplitude, rampFrequency, rampDurationMs, now, currentValue);
        actions.push(ramp);
    }
    function addConfigAction(action) {
        if (!isObject(action)) {
            logError("addConfigAction: Invalid action");
            return;
        }

        actions.push(action);
    }
    function setGrainConf(params) {
        if (!isObject(params)) {
            logError("setGrainConf: Invalid grain config");
            return;
        }

        var grainConfig = config.grain;
        for (var prop in params) {
            if (params.hasOwnProperty(prop) && grainConfig.hasOwnProperty(prop)) {
                grainConfig[prop] = params[prop];
                log("setGrainConf: " + prop + ": " + params[prop]);
            }
        }
    }
    function setGranulatorConf(params) {
        u.setConfig(config, params);
    }
    function createBufferAudioSourceNode() {
        if (!buffer) {
            logError("createBufferAudioSource: invalid audio buffer");
            return null;
        }
        if (!audioCtx) {
            logError("createBufferAudioSource: Audio context is not initialised!!");
            return null;
        }
        var audioSource = audioCtx.createBufferSource();
        audioSource.buffer = buffer;

        return audioSource;
    }
    function createPanner() {
        if (!audioCtx) {
            logError("createPanner: Audio context is not initialised!!");
            return null;
        }
        var panner = audioCtx.createPanner();
        var pannerConfig = config.panner;
        panner.panningModel = pannerConfig.panningModel;
        panner.distanceModel = pannerConfig.distanceModel;
        return panner;
    }
    function isPanGrain() {
        //pan about half of grains;
        var panNo = u.getRandomIntFromRange(1, 2);
        return panNo === 1;
    }
    function setRndPan(pannerNode) {
        if (isNull(pannerNode)) {
            logError("setRndPan: invalid panner");
            return;
        }
        var pannerConfig = config.panner;
        var maxAngle = pannerConfig.maxPanAngle;
        var angle = u.getRandomIntFromRange(-1 * maxAngle, maxAngle);
        var x = Math.sin(angle * (Math.PI / 180));

        // x = u.getRandomFromRange(-0.9, 0.9);

        log("setRndPan: x: " + x);
        pannerNode.setPosition(x, 0, x);
    }
    function createGainNode() {
        if (!audioCtx) {
            logError("createBufferAudioSource: Audio context is not initialised!!");
            return null;
        }
        var gain = audioCtx.createGain();
        return gain;
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
    function isObject(obj) {
        return u.isObject(obj);
    }

    // Public members
    return {
        init: function (audioContext, audioBuffer, destination) {
            initGranulator(audioContext, audioBuffer, destination);
        },
        play: function () {
            playLinear();
        },
        stop: function () {
            setStop(true);
        },
        reset: function () {
            resetConfig();
        },
        setGain: function (level, timeMs) {
            setMasterGain(level, timeMs);
        },
        setBuffer: function (audioBuffer) {
            setAudioBuffer(audioBuffer);
        },
        setPlayDuration: function (durationSec) {
            setMaxPlayDuration(durationSec);
        },
        setGrainEnvelope: function (config) {
            setEnvelopeConf(config);
        },
        setGrainConfig: function (config) {
            setGrainConf(config);
        },
        setGranulatorConfig: function (config) {
            setGranulatorConf(config);
        },
        addAction: function (action) {
            addConfigAction(action);
        },
        addRampLinear: function (configParamName, rampEndValue, rampDurationMs) {
            addRampLinearAction(configParamName, rampEndValue, rampDurationMs);
        },
        addRampSin: function (configParamName, rampAmplitude, rampFrequency, rampDurationMs) {
            addRampSinAction(configParamName, rampAmplitude, rampFrequency, rampDurationMs);
        },
        isReady: function () {
            return getReady();
        },
    }
}(zsUtil));