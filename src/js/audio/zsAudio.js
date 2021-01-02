var zsAudio = (function (u, gr, sp, win) {
    "use strict";

    //static members
    const LOG_ID = "zsAudio: ";
    const CTX_MAX_RETRY_COUNT = 3;

    // private vars
    var _ctx = null;
    var _isAudioInitialised = false;
    var _audioCtxRetryCount = 1;
    var _audioBuffers = null;
    var _granulatorFileIndex = 0;
    var _audioFilesToLoad = [
        '/audio/violin-tuning.mp3',
    ];

    //Class defs
    function ZsAudioException(msg) {
        this.message = msg;
        this.name = "ZsAudioException";
    }
    // ----- AudioBufferLoader 
    function AudioBufferLoader(context, urlList, callback) {
        this.context = context;
        this.urlList = urlList;
        this.onload = callback;
        this.bufferList = new Array();
        this.loadCount = 0;
    }
    AudioBufferLoader.prototype.loadBuffer = function (url, index) {
        var request = new XMLHttpRequest();
        request.open("GET", url, true);
        request.responseType = "arraybuffer";
        var loader = this;

        request.onload = function () {
            loader.context.decodeAudioData(
                request.response,
                function (buffer) {
                    if (!buffer) {
                        logError('error decoding file data: ' + url);
                        return;
                    }
                    loader.bufferList[index] = buffer;
                    if (++loader.loadCount == loader.urlList.length) {
                        loader.onload(loader.bufferList);
                    }
                },
                function (error) {
                    logError('decodeAudioData error', error);
                }
            );
        }
        request.onerror = function () {
            logError('BufferLoader: XHR error');
        }
        request.send();
    }
    AudioBufferLoader.prototype.load = function () {
        for (var i = 0; i < this.urlList.length; ++i) {
            this.loadBuffer(this.urlList[i], i);
        }
    }
    // ----- AudioBufferLoader  END

    //Private functions
    function _initAudio(audioFilesToLoad, granulatorFileIndex) {
        if (!u || !gr || ! sp) {
            throw new ZsAudioException("Invalid libraries. Required: zsUtil, zsGranulator and zsSpeech");
        }

        try {
            log("initAudio: ");
            if (!_ctx) {
                var AudioContext = win.AudioContext || win.webkitAudioContext || win.mozAudioContext || win.oAudioContext;
                _ctx = new AudioContext();
                log("initAudio:  created audio context");
            }

            if (_ctx.state === 'suspended') {
                log("initAudio: Context suspended, resuming context : " + _ctx.state);
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

                if (win.hasOwnProperty('speechSynthesis')) {
                    win.speechSynthesis.getVoices();
                }

                _audioCtxRetryCount++;
                setTimeout(function () {
                    _initAudio(audioFilesToLoad, granulatorFileIndex);
                }, 1000);
                return;
            }

            log("initAudio: AudioContext state: " + _ctx.state);
            _initSpeech();

            if (u.isArray(audioFilesToLoad)) {
                _audioFilesToLoad = audioFilesToLoad;
            } else {
                logError("Invalid audio files to load array");
            }

            if (granulatorFileIndex < 0 || granulatorFileIndex > _audioFilesToLoad.length) {
                logError("Invalid granulator file index: " + granulatorFileIndex);
            } else {
                _granulatorFileIndex = granulatorFileIndex;
            }

            var bufferLoader = new AudioBufferLoader(
                _ctx, _audioFilesToLoad, _onAudioLoaded
            );

            bufferLoader.load();
        } catch (e) {
            _isAudioInitialised = false;
            logError('Web Audio API is not supported in this browser');
        }
    }
    function _onAudioLoaded(bufferList) {
        _audioBuffers = bufferList;

        _initGranulator(_granulatorFileIndex);
        _isAudioInitialised = true;
        //TODO remove
        // setGranulatorGain(0.4);        
        // setTimeout(function () {
        //     setGranulatorRampSin('grain.pitchRate', 0.05, 0.03, 25500);
        //     setGranulatorRampSin('grain.sizeMs', 25, 0.07, 25500);
        //     // setGranulatorRampLinear('grain.pitchRate', 2.0, 5000);
        // }, 1000);

        // setTimeout(function () {
        //     setGranulatorRampLinear('masterGainVal', 0.0, 7000);
        //     // setGranulatorGain(0.0, 10000);
        // }, 5000);

        // setTimeout(function () {
        //     setGranulatorRampLinear('masterGainVal', 0.1, 5000);
        //     // setGranulatorGain(0.0, 10000);
        // }, 15000);

        // setTimeout(function () {
        //     setGranulatorRampLinear('masterGainVal', 0.0, 10000);
        //     // setGranulatorGain(0.0, 10000);
        // }, 20000);

        // playGranulator();
    }
    function _createBufferAudioSource(buffer) {
        if (!buffer) {
            logError("createBufferAudioSource: invalid audio buffer");
            return null;
        }
        if (!_ctx) {
            logError("createBufferAudioSource: Audio context is not initialised!!");
            return null;
        }

        var audioSource = _ctx.createBufferSource();
        audioSource.buffer = buffer;

        audioSource.connect(_ctx.destination);
        return audioSource;
    }
    function _playAudioBuffer(bufferIndex, startTime, offset, duration) {

        if (bufferIndex < 0 || bufferIndex > _audioBuffers.length) {
            logError("playAudioBuffer: Invalid buffer index: " + bufferIndex);
            return;
        }

        var buffer = _audioBuffers[bufferIndex];
        if (!buffer) {
            log("playAudioBuffer: invalid buffer");
            return;
        }

        var audioSourceNode = _createBufferAudioSource(buffer);
        if (isNull(audioSourceNode)) {
            logError("playAudioBuffer: invalid audio source");
            return;
        }
        if (!audioSourceNode.start) {
            audioSourceNode.start = audioSourceNode.noteOn;
        }
        if (!startTime) {
            startTime = _ctx.currentTime;
        }
        if (!offset) {
            offset = 0;
        }
        if (!duration) {
            duration = buffer.duration;
        }

        audioSourceNode.onended = function (event) {
            _onPlayComplete(audioSourceNode);
        }

        audioSourceNode.start(startTime, offset, duration);
    }
    function _onPlayComplete(audioSourceNode) {
        log("onPlayComplete: ");
        _stopAudioSource(audioSourceNode);
    }
    function _stopAudioSource(audioSourceNode) {
        log("stopAudioSource: time:" + _ctx.currentTime);
        if (!audioSourceNode) {
            return;
        }
        audioSourceNode.disconnect();
        audioSourceNode = null;
    }
    function _resetAudio() {
        _resetGranulator();
    }
    //speech
    function _initSpeech() {
        if (isNull(sp)) {
            logError("_initSpeech: Can not initialise speech");
            sp = null;
            return;
        }

        sp.init();
    }
    //granulator
    function _initGranulator(bufferIndex, destination) {
        if (isNull(gr)) {
            logError("initGranulator: Can not initialise zsGranulator");
            gr = null;
            return;
        }

        if (isNull(bufferIndex)) {
            bufferIndex = 0;
        }

        if (isNull(destination)) {
            destination = _ctx.destination;
        }

        if (bufferIndex < 0 || bufferIndex >= _audioBuffers.length) {
            logError("initGranulator: invalid buffer index");
            return;
        }

        gr.init(_ctx, _audioBuffers[bufferIndex], destination);
    }
    function _setGranulatorRampLinear(configParamName, rampEndValue, rampDurationMs) {
        if (isNull(gr)) {
            logError("setGranulatorRampLinear: Invalid granulator");
            return;
        }
        gr.addRampLinear(configParamName, rampEndValue, rampDurationMs);
    }
    function _setGranulatorRampSin(configParamName, rampAmplitude, rampFrequency, rampDurationMs) {
        if (isNull(gr)) {
            logError("setGranulatorRampSin: Invalid granulator");
            return;
        }
        gr.addRampSin(configParamName, rampAmplitude, rampFrequency, rampDurationMs);
    }
    function _setGranulatorGain(level, timeMs) {
        if (isNull(gr)) {
            logError("setGranulatorGain: Invalid granulator");
            return;
        }
        gr.setGain(level, timeMs);
    }
    function _setGranulatorEnvelope(envelopeConfig) {
        if (isNull(gr)) {
            logError("setGranulatorEnvelope: Invalid granulator");
            return;
        }
        gr.setGrainEnvelope(envelopeConfig);
    }
    function _setGranulatorConfig(granulatorConfig) {
        if (isNull(gr)) {
            logError("setGranulatorConfig: Invalid granulator");
            return;
        }
        gr.setGranulatorConfig(granulatorConfig);
    }
    function _setGranulatorGrainConfig(grainConfig) {
        if (isNull(gr)) {
            logError("setGranulatorGrainConfig: Invalid granulator");
            return;
        }
        gr.setGrainConfig(grainConfig);
    }
    function _setGranulatorPlayDuration(durationSec) {
        if (isNull(gr)) {
            logError("setGranulatorPlayDuration: Invalid granulator");
            return;
        }
        if (isNull(durationSec)) {
            logError("setGranulatorPlayDuration: invalid duration");
            return;
        }
        gr.setPlayDuration(durationSec);
    }
    function _playGranulator() {
        if (isNull(gr)) {
            logError("playGranulator: Invalid granulator");
            return;
        }
        if (!gr.isReady()) {
            log("playGranulator: Granulator is not initialised, can not play");
            return;
        }
        gr.play();
    }
    function _stopGranulator() {
        if (isNull(gr)) {
            logError("stopGranulator: Invalid granulator");
            return;
        }
        if (!gr.isReady()) {
            log("stopGranulator: Granulator is not initialised, can not stop");
            return;
        }
        gr.stop();
    }
    function _resetGranulator() {
        if (isNull(gr)) {
            logError("stopGranulator: Invalid granulator");
            return;
        }
        gr.reset();
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
        init: function (audioFilesToLoadArr, granulatorFileIndex) {
            _initAudio(audioFilesToLoadArr, granulatorFileIndex);
        },
        isReady: function () {
            return _isAudioInitialised;
        },
        playAudio: function (bufferIndex, startTime, offset, duration) {
            _playAudioBuffer(bufferIndex, startTime, offset, duration);
        },
        setGranulatorRampLinear: function (configParamName, rampEndValue, rampDurationMs) {
            _setGranulatorRampLinear(configParamName, rampEndValue, rampDurationMs);
        },
        setGranulatorRampSin: function (configParamName, rampAmplitude, rampFrequency, rampDurationMs) {
            _setGranulatorRampSin(configParamName, rampAmplitude, rampFrequency, rampDurationMs);
        },
        setGranulatorGain: function (level, timeMs) {
            _setGranulatorGain(level, timeMs);
        },
        setGranulatorEnvelope: function (lenvelopeConfig) {
            _setGranulatorEnvelope(lenvelopeConfig);
        },
        setGranulatorConfig: function (granulatorConfig) {
            _setGranulatorConfig(granulatorConfig);
        },
        setGranulatorGrainConfig: function (grainConfig) {
            _setGranulatorGrainConfig(grainConfig);
        },
        setGranulatorPlayDuration: function (durationSec) {
            _setGranulatorPlayDuration(durationSec);
        },
        playGranulator: function () {
            _playGranulator();
        },
        stopGranulator: function () {
            _stopGranulator();
        },
        resetGranulator: function () {
            _resetGranulator();
        },
        isSpeachReady: function () {
            return sp.isReady();
        },
        speak: function (text, voiceName, isInterrupt) {
            return sp.speak(text, voiceName, isInterrupt);
        },
        reset: function () {
            _resetAudio();
        },
    }

}(zsUtil, zsGranulator, zsSpeech, window));