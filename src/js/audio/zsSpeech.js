var zsSpeech = (function (u, win) {
    "use strict";
    const LOG_ID = "ZsSpeech: ";
    const EMPTY = "";

    var config = {
        volume: 1.0, //0 (lowest) and 1 (highest) 
        pitch: 1.0,  //0 (lowest) and 2 (highest)
        rate: 0.7,   //0.1 (lowest) and 10 (highest)     
        lang: "en-GB",
        maxVoiceLoadAttempts: 10,
        maxUtterances: 5,
        utteranceTimeoutSec: 30,
        underscore: "_",
        hyphen: "-",
        englishPrefix: "en",
        random: "random",
        default: "default",
        isInterrupt: false,
        interruptTimeout: 250,
    }
    var _speechSynth = null;
    var _voices = [];
    var _utterances = [];
    var _voice = null;
    var _isInitialised = false;
    var _isSupported = false;
    var _loadVoiceAttempts = 0;

    function ZsSpeechException(msg) {
        this.message = msg;
        this.name = "ZsSpeechException";
    }

    function ZsUtterance(utid) {
        this.id = utid;
        this.utterance = null;
        this.createdTime = 0;
        this.finishedTime = 0;
        this.isComplete = false;
    }    

    function _resetConfig() {
        if (_isPlaying()) {
            _log("resetConfig: speech is playing, ignore reset config");
            return;
        }
        config.volume = 1.0;
        config.pitch = 1.0;
        config.rate = 1.0;       
        config.lang = "en-GB";
        config.maxVoiceLoadAttempts = 10;
    }
    function _initSpeech() {
        if (!u || !win) {
            throw new ZsSpeechException("Invalid libraries. Required: zsUtil and window");
        }

        if (win.hasOwnProperty('speechSynthesis')) {
            _setSupported(true);
        }else{
            _log("_initSpeech:  speech not supported");
            return;
        }

        _speechSynth = win.speechSynthesis;

        if (!_speechSynth) {
            _logError("_initSpeech: invalid context");
            _setInitialised(false);
            return;
        }

        _initVoices();
        _initUterrances();
    }
    function _initUterrances() {
        for(var i = 0; i < config.maxUtterances ; i++) {  
            _utterances[i] = new ZsUtterance(i + 1);
        }
    }
    function _initVoices() {
        if(!_isSupported) {
            return;
        }
        _loadVoiceAttempts++;
        _log("InitVoices: attempt: " + _loadVoiceAttempts);
        var out = [];
        var voices = _speechSynth.getVoices();
        if(u.isEmptyArray(voices)) {
            if (_loadVoiceAttempts < config.maxVoiceLoadAttempts) {
                setTimeout(() => {
                    _initVoices();
                }, 250);
            } else {
                _logError("_initVoices: Failed to retrieve voices");
            }
            return;
        }

        for(var i = 0; i < voices.length ; i++) {  
            var voice = voices[i];
            var name = voice.name;
            var isDefault = voice.default;
            var lang = voice.lang;
            var isLocal = voice.localService;
            if(u.contains(lang, config.underscore)) {
                lang = u.replace(lang, config.underscore, config.hyphen);
            }
            if(u.startsWith(lang, config.englishPrefix) && isLocal)  {                
                out.push(voice);
                if(_isNull(_voice) && lang === config.lang) {
                    _setVoice(voice);
                }
                ///TODO remove
                var defMarker = isDefault? " Default": " ";
                var vline = "voice: " + name + defMarker  + ", lang: " + lang + ", localService: " + isLocal + ", voiceURI: " + voice.voiceURI;
                _log(vline);
            }
        }
        _voices = out;
        if(!u.isEmptyArray(_voices) && !_isNull(_voice)) {
            _setInitialised(true);
            _log("Init Speech done, have: " + _voices.length + " voices, default voice: " + _voice.name);
        }        
    }
    function _speak(text, voiceName, isInterrupt) {
        if(!_isReady() || _isNull(text) || u.isEmptyString(text)) {
            return;
        }
        if(_isNull(voiceName)) {
            voiceName = config.random;
        }
        if(_isNull(isInterrupt)) {
            isInterrupt = config.isInterrupt;
        }
        if(isInterrupt && _speechSynth.speaking) {
            _stop();
            setTimeout(() => {
                _speak(text, voiceName, false);
            }, config.interruptTimeout);
            return;
        } 
        var voice = null;
        switch (voiceName) {
            case config.default:
                voice = _voice;
                break;
            case config.random:
                voice = _findRandomVoice();
                break;
            default:
                voice = _findVoice(voiceName);    
        }

        if(_isNull(voice)) {
            _log("speak: Could not find voice");
            return;
        }
        var zsUtterance = _createUtterance(text, voice, config.volume, config.pitch, config.rate);
        if(_isNull(zsUtterance) || _isNull(zsUtterance.utterance)) {
            return;
        }
        _log("_speak: utId: " + zsUtterance.id + ", voice: " + voice.name + " text: " + text);
        _speechSynth.speak(zsUtterance.utterance);
    }
    function _createUtterance(text, voice, volume, pitch, rate) {
        if(!_isReady() || _isNull(text)) {
            return null;
        }

        var zsUtterance = _getNextUtterance();
        if(_isNull(zsUtterance)) {
            _log("Could not find available ZsUtterance");
            return null;    
        }
        if(_isNull(voice)) {
            voice = _voice;
        }
        if(_isNull(volume)) {
            volume = 1.0;
        }
        if(_isNull(pitch)) {
            pitch = 1.0;
        }
        if(_isNull(rate)) {
            rate = 1.0;
        }
        var utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = voice;
        utterance.lang = voice.lang;
        utterance.pitch = pitch;
        utterance.rate = rate;
        utterance.volume = volume;
        utterance.onerror = function(event) {
            var utterance = event.utterance;
            var utteranceStr = EMPTY;
            if(!_isNull(utterance)) {
                utteranceStr = " voice : " + utterance.voice + " utterance.text: " + utterance.text;
            }
            var out = "Received Speech error " + event.error + " event: " + event.name + utteranceStr; 
            _logError(out);
        }
        utterance.onend = function(event) {
            _onUtteranceEnd(event, zsUtterance);
        }

        zsUtterance.utterance = utterance;
        zsUtterance.createdTime = Date.now();
        zsUtterance.finishedTime = 0;
        zsUtterance.isComplete = false;
        return zsUtterance;
    }
    function _getNextUtterance() {
        var now = Date.now();
        var oldestTime = now;
        var oldest = null;
        for(var i = 0; i < _utterances.length ; i++) {  
            var zsUtternace = _utterances[i];
            if(zsUtternace.createdTime < oldestTime) {
                oldest = zsUtternace;
                oldestTime = zsUtternace.createdTime;
            }
            if(_isNull(zsUtternace.utterance) || zsUtternace.isComplete) {
                return zsUtternace;
            } 
        }
        var diff = u.msecToSec(now - oldestTime);
        if(diff > config.utteranceTimeoutSec) {
            _log("_getNextUtterance: could not find any available utterances, re-using oldest: " + oldest.id);
            return oldest;
        }
        
        return null;
    }
    function _onUtteranceEnd(event, zsUtterance) {
        if(!_isNull(zsUtterance)) {
            _setUtteranceComplete(zsUtterance);
        }
        var utterance = zsUtterance.utterance;
        var voiceName = (_isNull(utterance.voice))?EMPTY:utterance.voice.name; 
        var duration = u.round(u.msecToSec(zsUtterance.finishedTime - zsUtterance.createdTime), 2);
        _log("_onUtteranceEnd: utId: " + zsUtterance.id + ", voice: " + voiceName + ", duration: " + duration + "sec, text: " + utterance.text);
    }
    function _setUtteranceComplete(zsUtterance) {
        if(_isNull(zsUtterance) || zsUtterance.isComplete) {
            return;
        }
        zsUtterance.isComplete = true;
        zsUtterance.finishedTime = Date.now();
    }
    function _findRandomVoice() {
        if(!u.isArray(_voices)) {
            return _voice;
        }
        return u.randomArrayElement(_voices);
    }
    function _findVoice(voiceName) {
        if(_isNull(voiceName)) {
            return _voice;
        }
        for(var i = 0; i < _voices.length ; i++) {
            var voice = _voices[i];
            if(u.contains(voice.name, voiceName)) {
                return voice;
            }
        }        
        return _voice;
    }
    function _setVoice(voice) {
        if (!u.isObject(voice)) {
            return;
        }
        _log("Default voice set to: " + voice.name + ", isDefault: "  + voice.default  + ", lang: " + voice.lang + ", localService: " + voice.localService + ", voiceURI: " + voice.voiceURI);
        _voice = voice;
    }
    function _setInitialised(isOk) {
        if (_isNull(isOk)) {
            return;
        }
        _log("_setInitialised: " + isOk);
        _isInitialised = isOk;
    }
    function _setSupported(isOk) {
        if (_isNull(isOk)) {
            return;
        }
        _log("setSupported: " + isOk);
        _isSupported = isOk;
    }
    function _onGsapRampLinearUpdate(grl) {
        // _log("_onGsapRampLinearUpdate: volume: " + config.volume);
        // _log("_onGsapRampLinearUpdate: param: " + grl.propName + " value: " + grl.currentValue);
    }
    function _onGsapRampLinearComplete(grl) {
        // _log("_onGsapRampLinearUpdate: volume: " + config.volume);
        // _log("_onGsapRampLinearUpdate: param: " + grl.propName + " value: " + grl.currentValue);
    }
    function _rampLinearConfigParam(param, endValue, duration) {
        if(!u.isString(param) || _isNull(config[param]) || _isNull(endValue) || _isNull(duration)) {
            return;
        } 
        u.runGsapRampLinear(config, param, config[param], endValue, duration, _onGsapRampLinearUpdate, _onGsapRampLinearComplete);        
    }
    function _setSpeechConfig(params) {
        u.setConfig(config, params);
    }
    function _stop() {
        _log("stop: ");
        if(!_isReady()) {
            return;
        }
        _speechSynth.cancel();
        for(var i = 0; i < config.maxUtterances ; i++) {  
            _setUtteranceComplete(_utterances[i]);
        }
    }
    function _isReady() {
        return _isSupported && _isInitialised && !_isNull(_speechSynth);
    }
    function _isPlaying() {
        if(!_isReady()) {
            return false;
        }
        return _speechSynth.speaking;
    }
    function _getSupported() {
        return _isSupported;
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
        init: function () {
            _initSpeech();
        },
        speak: function (text, voiceName, isInterrupt) {
            _speak(text, voiceName, isInterrupt);
        },
        stop: function () {
            _stop();
        },
        reset: function () {
            _resetConfig();
        },
        isReady: function () {
            return _isReady();
        },
        setVolume: function (volume) {
            config.volume = volume;
        },
        setPitch: function (pitch) {
            config.pitch = pitch;
        },
        setRate: function (rate) {
            config.rate = rate;
        },
        setLang: function (lang) {
            config.lang = lang;
        },
        isSupported: function () {
            return _getSupported();
        },
        setSpeechConfig: function (params) {
            _setSpeechConfig(params);
        }, 
        rampLinearConfigParam: function (param, endValue, duration) {
            _rampLinearConfigParam(param, endValue, duration);
        },        
    }
}(zsUtil, window));