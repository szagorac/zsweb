var zsAudio = (function (u, gr, sp, pl, nz, syn, win) {
    "use strict";

    //static members
    const LOG_ID = "zsAudio: ";
    const CTX_MAX_RETRY_COUNT = 3;
    const OSCILATOR_TYPES = ['SAWTOOTH', 'SINE', 'SQUARE', 'TRIANGLE', 'RANDOM'];

    // private vars
    var _ctx = null;
    var _isAudioInitialised = false;
    var _audioCtxRetryCount = 1;
    var _audioBuffers = null;
    var _masterVolume = 1.0;
    var _audioFilesToLoad = [
        '/audio/violin-tuning.mp3',
    ];
    var _onLoadedCallback = null;

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
        log("loading file: " + url);

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
    function _initAudio(audioFilesToLoad, onLoadedCallback) {
        if (!u || !gr || !sp || !pl) {
            throw new ZsAudioException("Invalid libraries. Required: zsUtil, zsGranulator and zsSpeech");
        }

        try {
            log("initAudio: ");
            if (!_ctx) {
                var AudioContext = win.AudioContext || win.webkitAudioContext || win.mozAudioContext || win.oAudioContext;
                _ctx = new AudioContext();
                log("initAudio:  created audio context");
            }
            if (u.isNotNull(onLoadedCallback)) {
                _onLoadedCallback = onLoadedCallback;
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
                    _initAudio(audioFilesToLoad, onLoadedCallback);
                }, 1000);
                return;
            }
            _loadAudioBuffers(audioFilesToLoad);
        } catch (e) {
            _isAudioInitialised = false;
            logError('Web Audio API is not supported in this browser');
        }
    }
    function _loadAudioBuffers(audioFilesToLoad) {
        log("_initAudioBuffers: AudioContext state: " + _ctx.state);
        if (_ctx.state !== 'running') {
            log("_initAudioBuffers: ignoring call. Invalid AudioContext state: " + _ctx.state);
            return;
        }
        if (u.isArray(audioFilesToLoad)) {
            _audioFilesToLoad = audioFilesToLoad;
        }
        if (!u.isArray(_audioFilesToLoad)) {
            logError("Invalid audio files to load array, ignoring load");
            return;
        }
        _isAudioInitialised = false;
        var bufferLoader = new AudioBufferLoader(
            _ctx, _audioFilesToLoad, _onAudioLoaded
        );
        bufferLoader.load();
    }
    function _onAudioLoaded(bufferList) {
        _audioBuffers = bufferList;

        if (u.isNotNull(_onLoadedCallback)) {
            _onLoadedCallback();
        } else {
            _initSpeech();
            _initPlayer();
            _initGranulator(0);
            _initNoise();
        }
        _isAudioInitialised = true;

        // _playAudioBuffer(0);
        // _playNoise(0.5);
        // setTimeout(function () {
        //     _playNoise(0.2);
        // }, 3000);
        // setTimeout(function () {
        //     _playNoise(0.0);
        // }, 4000);
        // setTimeout(function () {
        //     _stopNoise();
        // }, 5000);
        // pl.play(1);
        // _playGranulator();
        // var text = "This is a very long text."
        // var timerId = setInterval(function () {
        //     sp.speak(text, "random", true);
        // }, 2000);

        // setTimeout(function () {
        //     _setMasterVolume(0.1, 2000);
        // }, 2000);

        // setTimeout(function () {
        //     _setMasterVolume(1.0, 2000);
        // }, 6000);

        // setTimeout(function () {
        //     _stopGranulator();
        //     clearInterval(timerId);
        //     pl.stop();
        // }, 10000);
        // pl.play(1);
        // setTimeout(function () {
        //     pl.setGain(0.1, 900, 1);
        // }, 1000);
        // setTimeout(function () {
        //     pl.setGain(1.0, 5000, 1);
        // }, 4000);
        // setTimeout(function () {
        //     pl.stop();
        // }, 1000);
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

        // playGranulator();

        // var name = "testParam" 
        // var startTime = _getCurrentTime(); 
        // var minValue = 10; 
        // var maxValue = 20; 
        // var oscillatorType = "DOWN"; 
        // var frequancy = 1;
        // var osc = new u.ParamOscillator(name, startTime, minValue, maxValue, oscillatorType, frequancy);
        // setTimeout(function () {
        //     _checkOscillator(osc);
        // }, 100);
    }
    // function _checkOscillator(osc) {
    //     var time = _getCurrentTime();
    //     var val = osc.getValue(time);
    //     log("_checkOscillator: got value: " + val + " time: " + time);
    //     setTimeout(function () {
    //         _checkOscillator(osc);
    //     }, 100);
    // }
    function _getCurrentTime() {
        if (isNull(_ctx)) {
            return 0;
        }
        return _ctx.currentTime;
    }
    function _resetAudio() {
        // _resetGranulator();
    }
    function _setMasterVolume(level, timeMs) {
        if (!_ctx) {
            logError("_setMasterVolume: invalid context");
            return;
        }
        if (u.isString(level)) {
            level = u.toFloat(level);
        }

        var g = _masterVolume;
        if (u.isNumeric(level)) {
            g = level;
        } else {
            logError("_setMasterVolume: Invalid gain level: " + level);
            return;
        }
        if (g < 0.0) {
            g = 0.0;
        } else if (g > 1.0) {
            g = 1.0;
        }
        _masterVolume = g;
        _setComponentVolume(_masterVolume, timeMs)
    }
    function _setComponentVolume(maxLevel, timeMs) {
        _setPlayerMaxVolume(maxLevel);
        _setPlayerVolume(maxLevel, timeMs);
        _setGranulatorMaxVolume(maxLevel);
        _setGranulatorVolume(maxLevel, timeMs);
        _setSpeechMaxVolume(maxLevel, timeMs);
        _setSpeechVolume(maxLevel, timeMs);
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
    function _setSpeechVolume(level, timeMs) {
        sp.setVolume(level);
    }
    function _setSpeechMaxVolume(level, timeMs) {
        sp.setMaxVolume(level);
    }
    //speech END

    //player
    function _initPlayer() {
        if (isNull(pl)) {
            logError("_playAudioBuffer: Invalid player");
            return;
        }
        pl.init(_ctx, _audioBuffers);
    }
    function _playAudioBuffer(bufferIndex, startTime, offset, duration) {
        if (isNull(pl) || !_isAudioInitialised) {
            logError("_playAudioBuffer: Invalid player");
            return;
        }
        pl.play(bufferIndex, startTime, offset, duration);
    }
    function _setPlayerVolume(level, timeMs) {
        if (isNull(pl) || !_isAudioInitialised) {
            logError("_setPlayerVolume: Invalid player");
            return;
        }
        pl.setGain(level, timeMs);
    }
    function _setPlayerMaxVolume(level) {
        if (isNull(pl) || !_isAudioInitialised) {
            logError("_setPlayerMaxVolume: Invalid player");
            return;
        }
        pl.setMaxGain(level);
    }
    function _stopPlayer() {
        if (isNull(pl) || !_isAudioInitialised) {
            logError("_stopPlayer: Invalid player");
            return;
        }
        pl.stop();
    }
    //player END

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
    function _setGranulatorMaxVolume(level) {
        if (isNull(gr)) {
            logError("setGranulatorRampLinear: Invalid granulator");
            return;
        }
        gr.setMaxGain(level);
    }
    function _setGranulatorVolume(level, timeMs) {
        _setGranulatorRampLinear('masterGainVal', level, timeMs);
        // _setGranulatorGain(level, timeMs);
    }
    function _setGranulatorRampLinear(configParamName, rampEndValue, rampDurationMs) {
        if (isNull(gr)) {
            logError("setGranulatorRampLinear: Invalid granulator");
            return;
        }
        gr.addRampLinear(configParamName, rampEndValue, rampDurationMs);
    }
    function _setGranulatorRampSin(configParamName, rampAmplitude, rampFrequency, rampDurationMs) {
        if (isNull(gr) || !_isAudioInitialised) {
            logError("setGranulatorRampSin: Invalid granulator");
            return;
        }
        gr.addRampSin(configParamName, rampAmplitude, rampFrequency, rampDurationMs);
    }
    function _setGranulatorGain(level, timeMs) {
        _setGranulatorVolume(level, timeMs);
        // if (isNull(gr) || !_isAudioInitialised) {
        //     logError("setGranulatorGain: Invalid granulator");
        //     return;
        // }
        // if (u.isString(level)) {
        //     level = u.toFloat(level);
        // }
        // var g = _masterVolume;
        // if (u.isNumeric(level) && level <= _masterVolume) {
        //     g = level;
        // } else {
        //     _logError("_setGranulatorGain: Invalid gain level: " + level);
        //     return;
        // }
        // gr.setGain(g, timeMs);
    }
    function _setGranulatorEnvelope(envelopeConfig) {
        if (isNull(gr)) {
            logError("setGranulatorEnvelope: Invalid granulator");
            return;
        }
        gr.setGrainEnvelope(envelopeConfig);
    }
    function _applyGranulatorGainEvelope(envelope, durationSec) {
        if (isNull(gr)) {
            logError("_applyGranulatorGainEvelope: Invalid granulator");
            return;
        }
        gr.applyGainEvelope(envelope, durationSec);
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
        if (isNull(gr) || !_isAudioInitialised) {
            logError("playGranulator: Invalid granulator");
            return;
        }
        if (!gr.isReady()) {
            log("playGranulator: Granulator is not initialised, can not play");
            return;
        }
        gr.play();
    }
    function _isGranulatorPlaying() {
        if (isNull(gr) || !_isAudioInitialised) {
            return false;
        }
        return gr.isPlaying();
    }
    function _stopGranulator() {
        if (isNull(gr) || !_isAudioInitialised) {
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
        if (isNull(gr) || !_isAudioInitialised) {
            logError("stopGranulator: Invalid granulator");
            return;
        }
        gr.reset();
    }
    //granulator END

    //noise
    function _initNoise(destination) {
        if (!nz) {
            return;
        }
        if (isNull(nz)) {
            nz = null;
            return;
        }
        if(nz.isReady() || nz.isRunning()) {
            return;
        }
        nz.init(_ctx, destination);
    }
    function _playNoise(volume) {
        nz.play(volume);
    }
    function _stopNoise() {
        nz.stop();
    }
    function _setNoiseFilterFreq(freq) {
        nz.setFilterFreq(freq);
    }
    function _setNoiseFilterQ(quality) {
        nz.setFilterQ(quality);
    }
    function _setNoiseFilterType(type) {
        nz.setFilterType(type);
    }
    //noise END

    //synth
    function _initSynth(destination) {
        if (!syn) {
            return;
        }
        if (isNull(syn)) {
            syn = null;
            return;
        }

        syn.init(_ctx, destination);
    }
    function _playSynth(freq, durationSec) {
        syn.play(freq, durationSec);
    }
    function _stopSynth() {
        syn.stop();
    }
    function _setSynthFilterFreq(zeroToOne) {
        syn.setFilterFreq(zeroToOne);
    }
    function _setSynthFilterQ(zeroToOne) {
        syn.setFilterQ(zeroToOne);
    }
    //synth END


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
        init: function (audioFilesToLoadArr, onLoadedCallback) {
            _initAudio(audioFilesToLoadArr, onLoadedCallback);
        },
        initSpeech: function () {
            _initSpeech();
        },
        initPlayer: function () {
            _initPlayer();
        },
        initGranulator: function (granulatorFileIndex) {
            _initGranulator(granulatorFileIndex);
        },
        initNoise: function () {
            _initNoise();
        },
        initSynth: function () {
            _initSynth();
        },
        setSynthFilterFreq: function (zeroToOne) {
            _setSynthFilterFreq(zeroToOne);
        },
        setSynthFilterQ: function (zeroToOne) {
            _setSynthFilterQ(zeroToOne);
        },
        isReady: function () {
            return _isAudioInitialised;
        },
        playAudio: function (bufferIndex, startTime, offset, duration) {
            _playAudioBuffer(bufferIndex, startTime, offset, duration);
        },
        stopPlayer: function () {
            return _stopPlayer();
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
        isGranulatorPlaying: function () {
            return _isGranulatorPlaying();
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
        stopSpeach: function () {
            return sp.stop();
        },
        setSpeechConfig: function (params) {
            return sp.setSpeechConfig(params);
        },
        playNoise: function (volume) {
            _playNoise(volume);
        },
        stopNoise: function () {
            _stopNoise();
        },
        setNoiseFilterFreq: function (freq) {
            _setNoiseFilterFreq(freq);
        },
        setNoiseFilterQ: function (quality) {
            _setNoiseFilterQ(quality);
        },
        setNoiseFilterType: function (type) {
            _setNoiseFilterType(type);
        },
        playSynth: function (freq, durationSec) {
            _playSynth(freq, durationSec);
        },
        stopSynth: function () {
            _stopSynth();
        },
        rumpLinearSpeechParam: function (param, endValue, duration) {
            return sp.rampLinearConfigParam(param, endValue, duration);
        },
        reset: function () {
            _resetAudio();
        },
        getCurrentTime: function () {
            return _getCurrentTime();
        },
        setMasterVolume: function (level, timeMs) {
            return _setMasterVolume(level, timeMs);
        },
        setPlayerVolume: function (level, timeMs) {
            return _setPlayerVolume(level, timeMs);
        },
        setPlayerMaxVolume: function (level, timeMs) {
            return _setPlayerMaxVolume(level, timeMs);
        },
        loadAudioBuffers: function (audioFilesToLoad) {
            return _loadAudioBuffers(audioFilesToLoad);
        },
        setSpeechVolume: function (level, timeMs) {
            return _setSpeechVolume(level, timeMs);
        },
        setGranulatorVolume: function (level, timeMs) {
            return _setGranulatorVolume(level, timeMs);
        },
        applyGranulatorGainEvelope: function (envelope, durationSec) {
            return _applyGranulatorGainEvelope(envelope, durationSec);
        },
    }

}(zsUtil, zsGranulator, zsSpeech, zsPlayer, zsNoise, zsSynth, window));