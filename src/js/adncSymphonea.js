var zscore = (function (u, n, s, a, m, syn, win, doc) {
    "use strict";

    // TODO set for prod when ready - gets rid of console logs
    const RUN_MODE = "DEV";
    // const RUN_MODE = "PROD";

    const EMPTY = "";
    const SPACE = " ";
    const RECT = "Rect";
    const COL_WHITE = "#FFFFFF";
    const COL_BLACK = "#000000";
    const EVENT_VOTE = "VOTE";
    const EVENT_PARAM_VALUE = "value";
    const VOTE_UP = 1;
    const VOTE_DOWN = -1;
    const SINGLE_QUOTE_HTML = "&#39;";
    const SINGLE_QUOTE = "'";
    const VIEW_THUMBS = "thumbs";
    const VIEW_NOTES = "notes";
    const VIEW_METER = "meter";
    const VIEW_VOTE = "vote";
    const VIEW_AUDIO = "audio";

    var _audioFiles = ["/audio/DialogsRhythm7-1.wav"];
    var _audioFileIndexMap = [[0]];
    var _granulatorAudioIndex = 0;
    var _isTouch = null;
    var _isSafari = null;
    var _instructionsElement = null;

    // INIT on window load
    // u.listen("load", window, onLoad);

    // ---------  MODEL -----------
    var state = {
        bpm: 80,
        synthBpm: 80,
        instructions: { isVisible: false, l1: EMPTY, l2: EMPTY, l3: EMPTY, bckgCol: "rgba(225, 225, 225, 0.85)" },
        voteCount: 0,
        userNo: 10,
        meter: null,
        currentVote: null,
        voteTimeMs: 0,
        thumbUpTween: null,
        thumbDownTween: null,
        regionTweens: [],
        noteUpTween: null,
        noteUpDurationSec: 1,
        noteDownTween: null,
        noteDownDurationSec: 1,
        isVotingEnabled: false,
        isThumbEnabled: false,
        isNoteEnabled: true,
        granulatorIndex: 0,
        filterFreq: 1.0,
        filterQ: 0.0,
        noteUpFreq: [523.25, 631.62, 739.99],
        noteDownFreq: [261.63, 315.81, 369.99],
        noiseFreqs: [261.63, 369.99, 523.25, 739.99, 1046.5, 1479.98, 2093, 2959.96, 4186.01, 5919.91],
        isAudioEnabled: true,
        currentSection: null,
        isSectionActive: false,
        filterMod: null,
        meterAudioValue: 0,
        noiseFreq: 1000,
        noiseQ: 100,
        filterDetuneTween: null,
    }
    var config = {
        connectionPreference: "ws,sse,poll",
        appUrlHttp: "/htp",
        appUrlSse: "/sse",
        appUrlWebsockets: "/wsoc",
        textSpanPrefix: "is",
        instructionTxtElementId: "instructionTxt",
        textLineBreak: "<br/>",
        textStyleInvisible: { "visibility": "hidden" },
        textStyleVisible: { "visibility": "visible" },
        textFontFamily: "Arial",
        textFontType: "normal",
        textFontSize: 50,
        textMaxFontSize: 70,
        textMaxLineLen: 30,
        textHeightCompressor: 1.1,
        textWidthCompressor: 0.9,
        textAreaMax: 0.4,
        textNumberOfLines: 3,
        textSpanIsFadeIn: true,
        textSpanFadeTimeSec: 1.0,
        textSpanFadeStaggerTimeSec: 0.5,
        voteTimeoutMs: 5000,
        noteDurationMultipler: 8,
        noteFreqMultipler: 1.0,
        loadingIconId: "loadingIcon",
        elementGroupSuffix: "Grp",
        meterGroupId: "meterGrp",
        regionGrpId: "regionGrp",
        regionRectId: "regionRect",
        thumbUpRectId: "thUpRect",
        thumbDownRectId: "thDownRect",
        thumbUpGroupId: "thumbUpGrp",
        thumbUpPathId: "thumbUpPth",
        thumbUpSymId: "thumbUpSym",
        thumbDownGroupId: "thumbDownGrp",
        thumbDownPathId: "thumbDownPth",
        thumbDownSymId: "thumbDownSym",
        noteUpGroupId: "noteUpGrp",
        noteUpSymId: "noteUpSym",
        noteDownGroupId: "noteDownGrp",
        noteDownSymId: "noteDownSym",
        meterBoxIdPrefix: "meterBox",
        meterBoxNo: 20,
        meterMaxVotes: 10,
        meterInactiveStyle: { "fill": "none", "stroke": "black", "stroke-width": "4px" },
        meterZeroStyle: { "fill": "yellow" },
        thumbsUpActiveStyle: { "fill": "green" },
        thumbsUpInActiveStyle: { "fill": "none" },
        thumbsDownActiveStyle: { "fill": "red" },
        thumbsDownInActiveStyle: { "fill": "none" },
        centreX: 450,
        centreY: 800,
        meterBoxWidth: 80,
        meterBoxHeight: 40,
        negativeMinCol: { r: 255, g: 165, b: 0 },
        negativeMaxCol: { r: 255, g: 0, b: 0 },
        positiveMinCol: { r: 255, g: 255, b: 0 },
        positiveMaxCol: { r: 0, g: 125, b: 0 },
        maxNoiseLevel: 1.0,
        audioFadeInMs: 1000,
        filterGreenAttrib: { "filter": "url(#dropshadowgreen)" },
        filterRedAttrib: { "filter": "url(#dropshadowred)" },
        filterInActiveAttrib: { "filter": "none" },
        noteUpConfig: { minAngle: 0, maxAngle: 360 },
        noteDurations: [m.DURATION.MINIM, m.DURATION.CROTCHET, m.DURATION.QUAVER, m.DURATION.SEMI_QUAVER],
        noteSymbolsUp: ["minimUp", "crotchetUp", "quaverUp", "semiquaverUp"],
        noteSymbolsDown: ["minimDown", "crotchetDown", "quaverDown", "semiquaverDown"],
        availableViews: [VIEW_THUMBS, VIEW_NOTES, VIEW_METER, VIEW_VOTE, VIEW_AUDIO],
        maxNoiseFreq: 5000,
        minNoiseFreq: 300,
        maxNoiseQ: 10,
        minNoiseQ: 1,
        noiseFilterQSteps: [300, 100, 70, 50, 30, 20, 15, 10, 5, 3],
    }

    function ZScoreException(message) {
        this.message = message;
        this.name = 'ZScoreException';
    }
    // ---- ZScoreMeter
    function ZScoreMeter(boxNo, midX, midY, boxWidth, boxHeight, boxIdPrefix, styleConfig) {
        this.boxNo = boxNo;
        this.midX = midX;
        this.midY = midY;
        this.boxWidth = boxWidth;
        this.boxHeight = boxHeight;
        this.boxIdPrefix = boxIdPrefix;
        this.styleConfig = styleConfig;
        this.boxSvgIdPrefix = boxIdPrefix + RECT;
        this.boxes = [];
        this.isInitialised = false;
        this.positiveMinIndex = 0;
        this.positiveMaxIndex = 0;
        this.negativeMinIndex = 0;
        this.negativeMaxIndex = 0;
        this.zeroIndex = null;
        this.isPlayAudio = false;
        this.currentValue = 0;
        this.currentMaxVal = 0;
    }
    ZScoreMeter.prototype.init = function () {
        if (isNull(this.styleConfig) || !u.isNumeric(this.boxNo) || !u.isNumeric(this.midX) || !u.isNumeric(this.midY)) {
            logError("ZScoreMeter.init: invalid inputs");
            return;
        }

        var isOdd = u.isOddNumber(this.boxNo);
        var halfBoxNo = Math.round(this.boxNo / 2.0)
        this.positiveMaxIndex = this.boxNo - 1;
        this.positiveMinIndex = halfBoxNo;
        this.negativeMinIndex = halfBoxNo - 1;
        this.negativeMaxIndex = 0;
        this.zeroIndex = null;
        var yStart = this.midY + (halfBoxNo * this.boxHeight);
        if (isOdd) {
            this.negativeMinIndex = halfBoxNo - 2;
            this.zeroIndex = halfBoxNo - 1;
            yStart = this.midY + this.boxHeight / 2.0 + (this.zeroIndex * this.boxHeight);
        }
        var yEnd = yStart;
        var x = this.midX - (this.boxWidth / 2.0);
        for (var i = 0; i < this.boxNo; ++i) {
            var boxId = this.boxIdPrefix + i;
            var rectId = this.boxSvgIdPrefix + i;
            var y = yEnd - this.boxHeight;
            var activeStyle = this.getActiveStyle(i);
            var box = new ZScoreMeterBox(boxId, rectId, x, y, this.boxWidth, this.boxHeight, this.styleConfig.inactiveStyle, activeStyle);
            this.boxes[i] = box;
            yEnd = y;
        }
        this.draw();
        this.isInitialised = true;
    }
    ZScoreMeter.prototype.getActiveStyle = function (boxIdx) {
        var col = "yellow";
        if (!isNull(this.zeroIndex) && boxIdx === this.zeroIndex) {
            return this.styleConfig.zeroStyle;
        }
        if (boxIdx >= this.positiveMinIndex && boxIdx <= this.positiveMaxIndex) {
            var factor = 0.0;
            if (this.positiveMaxIndex != this.positiveMinIndex) {
                factor = (boxIdx - this.positiveMinIndex) / (this.positiveMaxIndex - this.positiveMinIndex);
            }
            var colRGB = u.interpolateRgbColours(this.styleConfig.posMinRGB, this.styleConfig.posMaxRGB, factor);
            if (!isNull(colRGB)) {
                col = u.rgbToHex(colRGB.r, colRGB.g, colRGB.b);
            }
        } else if (boxIdx >= this.negativeMaxIndex && boxIdx <= this.negativeMinIndex) {
            var factor = 0.0;
            if (this.negativeMinIndex != this.negativeMaxIndex) {
                factor = (this.negativeMinIndex - boxIdx) / (this.negativeMinIndex - this.negativeMaxIndex);
            }
            var colRGB = u.interpolateRgbColours(this.styleConfig.negMinRGB, this.styleConfig.negMaxRGB, factor);
            if (!isNull(colRGB)) {
                col = u.rgbToHex(colRGB.r, colRGB.g, colRGB.b);
            }
        }

        return { "fill": col };
    }
    ZScoreMeter.prototype.clear = function () {
        for (var i = 0; i < this.boxes.length; ++i) {
            this.setBoxStyle(i, this.styleConfig.inactiveStyle);
        }
    }
    ZScoreMeter.prototype.draw = function () {
        for (var i = 0; i < this.boxes.length; ++i) {
            this.boxes[i].draw();
        }
    }
    ZScoreMeter.prototype.setPlayAudio = function (value) {
        this.isPlayAudio = value;
        this.playAudio(this.currentValue, this.currentMaxVal);
    }
    ZScoreMeter.prototype.set = function (value, maxValAbs) {
        if (!u.isNumeric(value) || !u.isNumeric(maxValAbs)) {
            return;
        }
        this.clear();
        if (!isNull(this.zeroIndex)) {
            this.activateBox(this.zeroIndex, true);
        }
        if (value > 0) {
            if (maxValAbs < 0) {
                maxValAbs = -1 * maxValAbs;
            }
            var minVal = 1;
            var maxVal = maxValAbs;
            if (maxVal < minVal) {
                maxVal = minVal;
            }
            if (value > maxVal) {
                value = maxVal;
            }
            var activeIdx = Math.floor(u.mapRange(value, minVal, maxVal, this.positiveMinIndex, this.positiveMaxIndex));
            for (var i = this.positiveMinIndex; i <= activeIdx; i++) {
                this.activateBox(i, true);
            }
            this.currentValue = value;
            this.currentMaxVal = maxVal;
            this.playAudio(value, maxVal);
        } else {
            if (maxValAbs > 0) {
                maxValAbs = -1 * maxValAbs;
            }
            var minVal = -1;
            var maxVal = maxValAbs;
            if (maxVal > minVal) {
                maxVal = minVal;
            }
            if (value < maxVal) {
                value = maxVal;
            }
            var activeIdx = Math.ceil(u.mapRange(value, minVal, maxVal, this.negativeMinIndex, this.negativeMaxIndex));
            for (var i = this.negativeMinIndex; i >= activeIdx; i--) {
                this.activateBox(i, true);
            }
            this.currentValue = value;
            this.currentMaxVal = maxVal;
            this.playAudio(value, maxVal);
        }
    }
    ZScoreMeter.prototype.activateBox = function (boxIndex, isActive) {
        var box = this.boxes[boxIndex];
        if (isNull(box)) {
            return;
        }
        box.setActive(isActive);
    }
    ZScoreMeter.prototype.setBoxStyle = function (boxIndex, style) {
        var box = this.boxes[boxIndex];
        if (isNull(box)) {
            return;
        }
        box.setStyle(style);
    }
    ZScoreMeter.prototype.playAudio = function (value, maxVal) {
        if (!this.isPlayAudio) {
            return;
        }
        playMeterAudio(value, maxVal);
    }
    // ---- ZScoreMeter END
    // ---- ZScoreMeterConfig 
    function ZScoreMeterConfig(inactiveStyle, zeroStyle, negMinRGB, negMaxRGB, posMinRGB, posMaxRGB) {
        this.inactiveStyle = inactiveStyle;
        this.zeroStyle = zeroStyle;
        this.negMinRGB = negMinRGB;
        this.negMaxRGB = negMaxRGB;
        this.posMinRGB = posMinRGB;
        this.posMaxRGB = posMaxRGB;
    }
    // ---- ZScoreMeterConfig END
    // ---- ZScoreMeterBox
    function ZScoreMeterBox(id, svgId, x, y, width, height, inactiveStyle, activeStyle) {
        this.id = id;
        this.svgId = svgId;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.inactiveStyle = inactiveStyle;
        this.activeStyle = activeStyle;
    }
    ZScoreMeterBox.prototype.draw = function () {
        var meterGrp = getMeterGroup();
        if (isNull(meterGrp)) {
            return;
        }
        var meterBox = s.createSvgRectangle(this.x, this.y, this.width, this.height, this.svgId);
        setElementAttributes(meterBox, this.inactiveStyle);
        u.addChildToParent(meterGrp, meterBox);
    }
    ZScoreMeterBox.prototype.setStyle = function (style) {
        var boxSvg = u.getElement(this.svgId);
        if (isNull(boxSvg)) {
            return;
        }
        setElementAttributes(boxSvg, style);
    }
    ZScoreMeterBox.prototype.setActive = function (isActive) {
        var boxSvg = u.getElement(this.svgId);
        if (isNull(boxSvg)) {
            return;
        }
        if (isActive) {
            setElementAttributes(boxSvg, this.activeStyle);
        } else {
            setElementAttributes(boxSvg, this.inactiveStyle);
        }
    }
    // ---- ZScoreMeterBox END

    // ---------  API -----------
    function onLoad() {
        log("onLoad: ");
        init();
    }
    function init() {
        if (!u || !n || !s || !a || !m || !syn) {
            throw new ZScoreException("Invalid libraries. Required: zsUtil, zsNet, zsSvg, zsAudio, zsSynth and zsMusic");
        }

        u.setRunMode(RUN_MODE);

        log("init: ");
        _isTouch = u.isTouchDevice()
        _isSafari = u.isSafari(navigator);
        log("init: IsTouch Device: " + _isTouch + " isSafari: " + _isSafari);

        state.fontCanvas = doc.createElement("canvas");
        state.canvasCtx = state.fontCanvas.getContext('2d');

        //init server side events
        initNet();
        //init server side events
        initSvg();
        //init audio
        initAudio();
        // init svg and html
        initInstructions();
        initRegions();

        initView();
        getServerState();
    }
    function resetAll() {
        resetAudio();
    }
    function initView() {
        // enableVoting();
        // hideThumbs();
        // hideNotes();
    }
    function initNet() {
        n.init(config.connectionPreference, config.appUrlSse, config.appUrlWebsockets, config.appUrlHttp, processSeverState);
    }
    function getServerState() {
        n.getServerState();
    }
    function onAudioLoaded() {
        a.initNoise();
        a.initPlayer();
        a.initSynth();
        a.initGranulator(state.granulatorIndex);
        u.makeInVisible(config.loadingIconId);
        log("onAudioLoaded: completed");
    }
    function initAudio() {
        log("initAudio: #####");
        if (isNull(a)) {
            logError("initAudio: invalid zsAudio lib");
            return;
        }
        a.init(_audioFiles, onAudioLoaded);
    }
    function resetAudio() {
        if (isNull(a)) {
            logError("resetAudio: invalid zsAudio lib");
            return;
        }
        a.reset();
    }
    function initSvg() {
        s.init();
        initPointerHandlers();
    }
    function initPointerHandlers() {
        for (var i =  1; i < 5; i++) {
            var regionRect = getRegionRect(i);
            regionRect.rgnId = i;
            if (isNotNull(regionRect)) {
                u.listen('touchend', regionRect, onTouchEndRegionSelect);
                u.listen('mouseup', regionRect, onMouseUpRegionSelect);
            }
        }
    }
    // function initPointerHandlers() {
    //     var thUr = getThumbUpRect();
    //     if (isNotNull(thUr)) {
    //         u.listen('touchend', thUr, onTouchEndThumbsUp);
    //         u.listen('mouseup', thUr, onMouseUpThumbsUp);
    //     }
    //     var thD = getThumbDownRect();
    //     if (isNotNull(thD)) {
    //         u.listen('touchend', thD, onTouchEndThumbsDown);
    //         u.listen('mouseup', thD, onMouseUpThumbsDown);
    //     }
    // }
    function initRegions() {
        state.regionTweens = u.initArray(5,null);
        for (var i = 1; i < 5; i++) {
            var regionId = createRegionId(i);
            var regionRectId = createRegionRectId(i);
            var regionRect = u.getElement(regionRectId);
            var yPos = regionRect.y.baseVal.value;
            var dy = 1000 - yPos;
            state.regionTweens[i] = createRegionToPlaylineTween(regionId, regionRectId, dy);
        }
    }
    function initMeter() {
        var meterStyleConfig = new ZScoreMeterConfig(config.meterInactiveStyle, config.meterZeroStyle, config.negativeMinCol, config.negativeMaxCol, config.positiveMinCol, config.positiveMaxCol);
        var meter = new ZScoreMeter(config.meterBoxNo, config.centreX, config.centreY, config.meterBoxWidth, config.meterBoxHeight, config.meterBoxIdPrefix, meterStyleConfig);
        meter.init();
        state.meter = meter;
    }
    function initInstructions() {
        var inst = getInstructionsElement();
        if (isNull(inst)) {
            return;
        }

        _instructionsElement = inst;
        u.listen('resize', win, onWindowResize);
        u.listen('orientationchange', win, onWindowResize);
        setInstructions("Select region to play", "", "", null, true);
    }
    
    function playMeterAudio(value, maxVal) {
        var previousValue = state.meterAudioValue;
        state.meterAudioValue = value;
        if (!state.isAudioEnabled) {
            return;
        }
        if (value === 0) {
            a.stopNoise();
            a.setPlayerVolume(0.0, 500);
            return;
        } else if (value > 0) {
            a.stopNoise();
            var vol = u.mapRange(Math.abs(value), 0.0, Math.abs(maxVal), 0.0, 1.0);
            a.setPlayerVolume(vol, config.audioFadeInMs);
        } else {
            var votes = Math.abs(value);
            if(votes > 10) {
                votes = 10;
            } else if (votes < 1) {
                votes = 1;
            }
            a.setPlayerVolume(0.0, config.audioFadeInMs);
            var vol = u.mapRange(Math.abs(value), 0.0, Math.abs(maxVal), 0.5, config.maxNoiseLevel);  
        
            var minIdx = 0;
            var maxIdx = state.noiseFreqs.length -1;
            if(votes < 4) {
                maxIdx =  Math.floor( maxIdx/3.0 );
            } else if(votes > 3 && votes < 7) {
                minIdx = Math.floor( maxIdx/3.0 );
                maxIdx =  Math.floor( 2 * maxIdx/3.0 );
            } else if (votes > 6) {
                minIdx = Math.floor( maxIdx/2.0 );
            }
            var freqIdx = u.getRandomIntFromRange(minIdx, maxIdx);
            var newFreq = state.noiseFreqs[freqIdx];

            a.setNoiseFilterFreq(newFreq);
            state.noiseFreq = newFreq;
            
            var newQ = config.noiseFilterQSteps[votes - 1];
            state.noiseQ = newQ;
            a.setNoiseFilterQ(newQ);
            a.playNoise(vol);
        }
    }
    function playNoteUp() {
        playSynthNoteUp();
        // playGranulatorNoteUp();
    }
    function playNoteDown() {
        playSynthNoteDown();
        // plaGranulatoryNoteDown();
    }
    function playSynthNoteUp() {
        var freqIdx = u.getRandomIntFromRange(0, state.noteUpFreq.length - 1);
        var freq = state.noteUpFreq[freqIdx];
        freq *= config.noteFreqMultipler;
        log("playing freq: " + freq);
        a.playSynth(freq, state.noteUpDurationSec);
    }
    function playSynthNoteDown() {
        var freqIdx = u.getRandomIntFromRange(0, state.noteDownFreq.length - 1);
        var freq = state.noteDownFreq[freqIdx];
        freq *= config.noteFreqMultipler;
        log("playing freq: " + freq);
        a.playSynth(freq, state.noteDownDurationSec);
    }
    function playGranulatorNoteUp() {
        a.stopGranulator();
        a.initGranulator(state.granulatorIndex);
        var duration = state.noteUpDurationSec;
        playGranulatorNote(duration, duration, -0.7, 1.5);
    }
    function plaGranulatoryNoteDown() {
        a.stopGranulator();
        a.initGranulator(1);
        var duration = state.noteDownDurationSec;
        playGranulatorNote(duration, duration, 0.1, 2);
    }
    function playGranulatorNote(durMin, durMax, pRateMin, pRateMax) {
        // var bufferIndex = 0; // u.randomArrayElement(_audioFiles);
        // var noteDurationSec = getNoteDuration();
        // a.playAudio(bufferIndex, 0, 0, noteDurationSec);        
        // var noteDurationSec = getNoteDuration()*1000;
        // a.stopGranulator();
        var noteDurationSec = u.randomFloatFromInterval(durMin, durMax);
        var noteDurationMs = noteDurationSec * 1000;
        var pRate = u.randomFloatFromInterval(pRateMin, pRateMax);
        var conf = { pitchRate: pRate };
        a.setGranulatorGrainConfig(conf);
        a.playGranulator();
        var sinStart = noteDurationMs * 0.2;
        var sinDur = noteDurationMs * 0.5;
        setTimeout(function() {
            a.setGranulatorRampSin("grain.pitchRate", 0.2, 0.2, sinDur);
        }, sinStart);
        setTimeout(stopNote, noteDurationMs);
    }
    function stopNote() {
        a.stopGranulator();
    }
    function getBeatDuration() {
        var beatDurationSec = m.getBeatDurationSec(state.synthBpm);
        if (isNull(beatDurationSec)) {
            beatDurationSec = 1;
        }
        return beatDurationSec;
    }
    function getWholeNoteDuration() {
        var beatDurationSec = getBeatDuration();
        return beatDurationSec * 4;
    }
    function createRegionToPlaylineTween(regionId, rectId, dy) {
        var duration = 0.2;
        u.getElement(regionId);
        return gsap.to(u.toCssIdQuery(regionId), {
            duration: duration,
            y: dy,
            ease: "slow(0.9, 0.4, false)",
            paused: true,
            onComplete: onRegionMoveComplete,
            onCompleteParams: [regionId, rectId],
        });
    }
    function createRegionPlayTween(regionId, rectId) {
        var duration = 8.0;
        var dy = 1100;
        var regionRect = u.getElement(rectId);
        var yPos = regionRect.y.baseVal.value;
        var dy = 1400 - yPos + 2;
        return gsap.to(u.toCssIdQuery(regionId), {
            duration: duration,
            y: dy,
            ease: Linear.easeNone,
            paused: true,
            onComplete: onRegionPlayComplete,
            onCompleteParams: [regionId, rectId],
        });
    }
    function createRegionDesolveTween(regionId, rectId) {
        var duration = 0.3;
        return gsap.to(u.toCssIdQuery(regionId), {
            duration: duration,
            autoAlpha: 0,
            ease: "slow(0.9, 0.4, false)",
            paused: true,
            onComplete: onRegionDesolveComplete,
            onCompleteParams: [regionId, rectId],
        });
    }
    function createNoteUpTween() {
        var duration = state.noteUpDurationSec;
        var conf = { sign: -1.0, angleMin: 0, angleMax: 120, rMin: 10, rMax: 30, rotAngleMin: -360, rotAngleMax: 360, xmod: 20, ymod: 30 };
        return createNoteTween(duration, config.noteUpSymId, conf, onNoteUpComplete);
    }
    function createNoteDownTween() {
        var duration = state.noteDownDurationSec;
        var conf = { sign: 1.0, angleMin: 0, angleMax: 120, rMin: 20, rMax: 40, rotAngleMin: -360, rotAngleMax: 360, xmod: 0, ymod: 0 };
        return createNoteTween(duration, config.noteDownSymId, conf, onNoteDownComplete);
    }
    function createNoteTween(duration, symbolId, conf, callback) {
        var angle = u.randomIntFromInterval(conf.angleMin, conf.angleMax);
        var r = u.randomIntFromInterval(conf.rMin, conf.rMax);
        var dx = 0;
        var s = conf.sign;
        var dy = s * r;
        if (angle < 90) {
            var rad = u.toRadians(angle);
            dx = s * r * Math.cos(rad);
            dy = s * r * Math.sin(rad);
        } else if (angle > 90) {
            var rad = u.toRadians(180 - angle);
            dx = -1.0 * s * r * Math.cos(rad);
            dy = s * r * Math.sin(rad);
        }
        dx += conf.xmod;
        dy += conf.ymod;
        var rotAngle = u.randomIntFromInterval(conf.rotAngleMin, conf.rotAngleMax);
        return gsap.to(u.toCssIdQuery(symbolId), {
            duration: duration,
            scale: 0.1,
            autoAlpha: 0,
            rotation: rotAngle,
            x: dx,
            y: dy,
            ease: "slow(0.9, 0.4, false)",
            paused: true,
            onComplete: callback,
        });
    }
    function onThumbUpComplete() {
        u.setElementAttributes(getThumbUpGroup(), config.filterGreenAttrib);
    }
    function onThumbDownComplete() {
        u.setElementAttributes(getThumbDownGroup(), config.filterRedAttrib);
    }
    function onRegionMoveComplete(regionId, rectId) {
        log("onRegionMoveComplete: " + regionId);
        var playTween = createRegionPlayTween(regionId, rectId);
        u.playOrRestartTween(playTween);
    }   
    function onRegionPlayComplete(regionId, rectId) {
        log("onRegionPlayComplete: " + regionId);
        var desolveTween = createRegionDesolveTween(regionId, rectId);
        u.playOrRestartTween(desolveTween);
    }    
    function onRegionDesolveComplete(regionId, rectId) {
        log("onRegionDesolveComplete: " + regionId);
    }
    function onNoteUpComplete() {
        runNoteCompleteTween(config.noteUpSymId);
        initNoteUp();
        if(state.isNoteEnabled) {
            showSymbolTween(config.noteUpSymId);
            showSymbolTween(config.noteDownSymId);
        }
    }
    function onNoteDownComplete() {
        runNoteCompleteTween(config.noteDownSymId);
        initNoteDown();
        if(state.isNoteEnabled) {
            showSymbolTween(config.noteDownSymId);
            showSymbolTween(config.noteUpSymId);
        }
    }
    function runNoteCompleteTween(symbolId) {
        gsap.set(u.toCssIdQuery(symbolId), {
            autoAlpha: 0,
            scale: 1.0,
            rotation: 0,
            x: 0,
            y: 0,
        });
    }
    function showSymbolTween(symbolId) {
        if (isNull(symbolId)) {
            return;
        }
        gsap.to(u.toCssIdQuery(symbolId), {
            duration: 1,
            autoAlpha: 1,
        });
    }
    function hideSymbolTween(symbolId) {
        if (isNull(symbolId)) {
            return;
        }
        gsap.to(u.toCssIdQuery(symbolId), {
            duration: 1,
            autoAlpha: 0,
            onComplete: onHideSymbolComplete,
            onCompleteParams: [symbolId],
        });
    }
    function onHideSymbolComplete(symbolId) {
        u.makeInVisible(symbolId);
    }
    function hideSymbolNow(symbolId) {
        if (isNull(symbolId)) {
            return;
        }
        gsap.set(u.toCssIdQuery(symbolId), {
            autoAlpha: 0,
        });
    }
    function onVote(value) {
        state.currentVote = value;
        var evParams = {};
        evParams[EVENT_PARAM_VALUE] = value;
        n.sendEvent(EVENT_VOTE, evParams);
    }
    function isThumbsUpActive() {
        return isNotNull(state.thumbUpTween) && state.thumbUpTween.isActive();
    }
    function isThumbsDownActive() {
        return isNotNull(state.thumbDownTween) && state.thumbDownTween.isActive();
    }
    function isNoteUpActive() {
        return isNotNull(state.noteUpTween) && state.noteUpTween.isActive();
    }
    function isNoteDownActive() {
        return isNotNull(state.noteDownTween) && state.noteDownTween.isActive();
    }
    function setInstructions(l1, l2, l3, colour, isVisible) {
        if (isNull(_instructionsElement)) {
            return;
        }

        var isUpdate = false;

        if (!isNull(l1)) {
            var val = l1.trim();
            if (state.instructions.l1 != val) {
                state.instructions.l1 = val;
                isUpdate = true;
            }
        }
        if (!isNull(l2)) {
            var val = l2.trim();
            if (state.instructions.l2 != val) {
                state.instructions.l2 = val;
                isUpdate = true;
            }
        }
        if (!isNull(l3)) {
            var val = l3.trim();
            if (state.instructions.l3 != val) {
                state.instructions.l3 = val;
                isUpdate = true;
            }
        }
        if (!isNull(colour)) {
            state.instructions.bckgCol = colour;
        }
        if (isVisible) {
            if (isUpdate) {
                displayInstructions();
            }
        } else {
            hideInstructions();
        }
    }
    function updateInstruction(inst, val) {
        if (inst === val) {
            return false;
        }
        inst = val;
        return true;
    }
    function setVote(voteCount) {
        if (isNull(voteCount)) {
            return;
        }
        if (!u.isNumeric(voteCount)) {
            voteCount = u.toInt(voteCount);
        }

        state.voteCount = voteCount;
    }
    function setUserNo(userNo) {
        if (isNull(userNo)) {
            return;
        }
        if (!u.isNumeric(userNo)) {
            userNo = u.toInt(userNo);
        }

        state.userNo = userNo;
    }
    function onWindowResize(event) {
        if (!u.isObject(this)) {
            return null;
        }
        displayInstructions();
    }
    function activate(actionId, targets, params) {
        if (u.isArray(targets)) {
            for (var i = 0; i < targets.length; i++) {
                runActivate(actionId, targets[i], params);
            }
        } else {
            runActivate(actionId, targets, params);
        }
    }
    function runActivate(actionId, target, params) {
        if (isNull(target)) {
            return;
        }
        log("runActivate: " + actionId + SPACE + target);
        switch (target) {
            case 'view':
                activateView(actionId, params);
                break;
        }
    }
    function activateView(actionId, params) {
        if (!u.isString(actionId)) {
            return;
        }
        switch (actionId) {
            case 'section':
                activateSectionView(params);
                break;
            default:
                logError("activateView: Unknown actionId: " + actionId);
                return;
        }
    }
    function activateSectionView(params) {
        if (!u.isObject(params)) {
            return;
        }
        var id = null;
        if (!isNull(params.id)) {
            id = params.id;
        }
        activateSection(id);
    }
    function updateViewState(viewState) {
        if (isNull(viewState)) {
            return;
        }
        var sectionName = null;
        var isSectionActive = false;
        if (isNotNull(viewState.isSectionActive)) {
            isSectionActive = viewState.isSectionActive;
        }
        if (isNotNull(viewState.sectionName)) {
            sectionName = viewState.sectionName;
        }
        setSection(sectionName, isSectionActive);

        if (isNotNull(viewState.activeViews)) {
            var inactiveViews = [];
            for (var i = 0; i < config.availableViews.length; i++) {
                if (!u.arrContains(viewState.activeViews, config.availableViews[i])) {
                    inactiveViews.push(config.availableViews[i])
                }
            }
            deactivateViews(inactiveViews);
            activateViews(viewState.activeViews);
        }

    }
    function setSection(id, isActive) {
        state.currentSection = id;
        state.isSectionActive = isActive;
    }
    function deactivateViews(views) {
        for (var i = 0; i < views.length; i++) {
            deactivateView(views[i]);
        }
    }
    function activateViews(views) {
        for (var i = 0; i < views.length; i++) {
            activateView(views[i]);
        }
    }
    function deactivateView(view) {
        switch (view) {
            case VIEW_THUMBS:
                deactivateThumbs();
                break;
            case VIEW_NOTES:
                deactivateNotes();
                break;
            case VIEW_METER:
                deactivateMeter();
                break;
            case VIEW_VOTE:
                deactivateVote();
                break;
            case VIEW_AUDIO:
                deactivateAudio();
                break;
            default:
                log("deactivateView: unknown view: " + view);
        }
    }
    function activateView(view) {
        switch (view) {
            case VIEW_THUMBS:
                activateThumbs();
                break;
            case VIEW_NOTES:
                activateNotes();
                break;
            case VIEW_METER:
                activateMeter();
                break;
            case VIEW_VOTE:
                activateVote();
                break;
            case VIEW_AUDIO:
                activateAudio();
                break;
            default:
                log("activateView: unknown view: " + view);
        }
    }
    function activateSection(id) {
        // deactivateNotes();
        // activateThumbs();
    }
    function activateNotes() {
        showNotes();
    }
    function activateThumbs() {
        showThumbs();
    }
    function activateMeter() {
        showMeter();
    }
    function activateVote() {
        enableVoting();
    }
    function activateAudio() {
        state.isAudioEnabled = true;
        if (isNotNull(state.meter)) {
            state.meter.setPlayAudio(true);
        }
    }
    function deactivateNotes() {
        hideNotes();
    }
    function deactivateThumbs() {
        hideThumbs();
    }
    function deactivateMeter() {
        hideMeter();
    }
    function deactivateVote() {
        disableVoting();
    }
    function deactivateAudio() {
        state.isAudioEnabled = false;
        if (isNotNull(state.meter)) {
            state.meter.setPlayAudio(false);
        }
        runStopAll();
    }
    function enableVoting() {
        state.isVotingEnabled = true;
    }
    function disableVoting() {
        state.isVotingEnabled = false;
    }
    function showThumbs() {
        u.makeVisible(config.thumbUpGroupId);
        u.makeVisible(config.thumbDownGroupId);
        showSymbolTween(config.thumbUpSymId);
        showSymbolTween(config.thumbDownSymId);
        state.isThumbEnabled = true;
    }
    function hideThumbs() {
        hideSymbolTween(config.thumbUpSymId);
        hideSymbolTween(config.thumbDownSymId);
        // u.makeInVisible(config.thumbUpGroupId);
        // u.makeInVisible(config.thumbDownGroupId);
        state.isThumbEnabled = false;
    }
    function showNotes() {
        u.makeVisible(config.noteUpGroupId);
        u.makeVisible(config.noteDownGroupId);
        showSymbolTween(config.noteUpSymId);
        showSymbolTween(config.noteDownSymId);
        state.isNoteEnabled = true;
    }
    function hideNotes() {
        hideSymbolTween(config.noteUpSymId);
        hideSymbolTween(config.noteDownSymId);
        // u.makeInVisible(config.noteUpGroupId);
        // u.makeInVisible(config.noteDownGroupId);
        state.isNoteEnabled = false;
    }
    function showMeter() {
        u.makeVisible(config.meterGroupId);
        showSymbolTween(config.meterGroupId);
    }
    function hideMeter() {
        hideSymbolTween(config.meterGroupId);
    }
    function audio(actionId, targets, params) {
        if (u.isArray(targets)) {
            for (var i = 0; i < targets.length; i++) {
                runAudio(actionId, targets[i], params);
            }
        } else {
            runAudio(actionId, targets, params);
        }
    }
    function runAudio(actionId, target, params) {
        if (isNull(target)) {
            return;
        }

        log("runAudio: " + actionId + SPACE + target);

        switch (target) {
            case 'all':
                runAudioMaster(actionId, params);
                break;
            case 'player':
                runAudioPlayer(actionId, params);
                break;
            case 'granulator':
                runAudioGranulator(actionId, params);
                break;
            case 'speechSynth':
                break;
            case 'synth':
                runSynth(actionId, params);
                break;
        }
    }
    function runAudioMaster(actionId, params) {
        if (!u.isString(actionId)) {
            return;
        }

        switch (actionId) {
            case 'volume':
                setAudioMasterVolume(params);
                break;
            default:
                logError("runPlayer: Unknown actionId: " + actionId);
                return;
        }
    }
    function setAudioMasterVolume(params) {
        if (isNull(a)) {
            logError("setAudioMasterVolume: Invalid zsAudio lib");
            return;
        }
        if (!u.isObject(params)) {
            return;
        }
        var level = null;
        var timeMs = null;

        if (!isNull(params.level)) {
            level = params.level;
        }
        if (!isNull(params.timeMs)) {
            timeMs = params.timeMs;
        }
        a.setMasterVolume(level, timeMs);
    }
    function runAudioPlayer(actionId, params) {
        if (!u.isString(actionId)) {
            return;
        }

        switch (actionId) {
            case 'play':
                runAudioPlayerPlay(params);
                break;
            case 'volume':
                setAudioPlayerVolume(params);
                break;
            case 'config':
                updateAudioPlayerCofig(params);
                break;
            default:
                logError("runPlayer: Unknown actionId: " + actionId);
                return;
        }
    }
    function runSynth(actionId, params) {
        if (!u.isString(actionId)) {
            return;
        }

        switch (actionId) {
            case 'volume':
                setSynthVolume(params);
                break;
            default:
                logError("runSynth: Unknown actionId: " + actionId);
                return;
        }
    }
    function updateSynthConfig(params) {
        if (isNull(a)) {
            logError("updateAudioPlayerCofig: Invalid zsAudio lib");
            return;
        }
        if (!u.isObject(params)) {
            return;
        }
        var isUpdate = false;
        if (!isNull(params.bpm)) {
            var old = state.synthBpm;
            state.synthBpm = params.bpm;
            if(state.synthBpm !== old) {
                isUpdate = true;
            }
        }
        if (!isNull(params.durationMultiplier)) {
            var old = config.noteDurationMultipler;
            config.noteDurationMultipler = params.durationMultiplier;
            if(config.noteDurationMultipler !== old) {
                isUpdate = true;
            }
        }
        if (!isNull(params.freqMultiplier)) {
            config.noteFreqMultipler = params.freqMultiplier;
        }        
        if (!isNull(params.osc1Freq)) {
            state.noteUpFreq = params.osc1Freq;
        }
        if (!isNull(params.osc2Freq)) {
            state.noteDownFreq = params.osc2Freq;
        }
        if (!isNull(params.osc3Freq)) {
            state.noiseFreqs = params.osc3Freq;
        }
        if(isUpdate) {
            initNotes();
        }
    }
    function updateAudioPlayerCofig(params) {
        if (isNull(a)) {
            logError("updateAudioPlayerCofig: Invalid zsAudio lib");
            return;
        }
        if (!u.isObject(params)) {
            return;
        }
        var isLoadBuffers = false;
        if (!isNull(params.audioFiles)) {
            var audioFiles = params.audioFiles;
            if (!u.isArray(audioFiles)) {
                logError("updateAudioPlayerCofig: invalid audioFiles array");
            } else if (u.arrEquals(_audioFiles, audioFiles)) {
                log("updateAudioPlayerCofig: audioFiles array identical, ignoring update");
            } else {
                _audioFiles = audioFiles;
                log("updateAudioPlayerCofig: audioFiles array set to: " + _audioFiles);
                isLoadBuffers = true;
            }
        }
        if (!isNull(params.audioFilesIndexMap)) {
            var fileIndexMap = params.audioFilesIndexMap;
            if (!u.isArray(fileIndexMap) || fileIndexMap.length < 1) {
                logError("updateAudioPlayerCofig: invalid fileIndexMap array");
            } else {
                _audioFileIndexMap = fileIndexMap;
            }
        }
        if (isLoadBuffers) {
            log("updateAudioPlayerCofig: laoding audioFiles");
            u.makeVisible(config.loadingIconId);
            a.loadAudioBuffers(_audioFiles);
        }
    }
    function runAudioPlayerPlay(params) {
        if (isNull(a)) {
            logError("runPlayerPlay: Invalid zsAudio lib");
            return;
        }
        if (!u.isObject(params)) {
            return;
        }

        var sectionIndex = 0;
        if (!isNull(params.index)) {
            if (u.isString(params.index)) {
                sectionIndex = u.toInt(params.index);
            } else if (u.isNumeric(params.index)) {
                sectionIndex = params.index;
            }
        }

        var bufferIndex = sectionIndex;
        if (sectionIndex > 0 && sectionIndex < _audioFileIndexMap.length) {
            var fileIdxArr = _audioFileIndexMap[sectionIndex];
            bufferIndex = u.randomArrayElement(fileIdxArr);
        }

        var startTime = null;
        var offset = null;
        var duration = null;

        if (!isNull(params.startTime)) {
            startTime = params.startTime;
        }
        if (!isNull(params.offset)) {
            offset = params.offset;
        }
        if (!isNull(params.duration)) {
            duration = params.duration;
        }

        a.playAudio(bufferIndex, startTime, offset, duration);
    }
    function setSynthVolume(params) {
        if (isNull(a)) {
            logError("setAudioMasterVolume: Invalid zsAudio lib");
            return;
        }
        if (!u.isObject(params)) {
            return;
        }
        var level = null;
        var timeMs = null;

        if (!isNull(params.level)) {
            level = params.level;
        }
        if (!isNull(params.timeMs)) {
            timeMs = params.timeMs;
        }
        a.setSynthVolume(level, timeMs);
    }
    function setAudioPlayerVolume(params) {
        if (isNull(a)) {
            logError("setAudioMasterVolume: Invalid zsAudio lib");
            return;
        }
        if (!u.isObject(params)) {
            return;
        }
        var level = null;
        var timeMs = null;

        if (!isNull(params.level)) {
            level = params.level;
        }
        if (!isNull(params.timeMs)) {
            timeMs = params.timeMs;
        }
        a.setPlayerVolume(level, timeMs);
    }
    function runAudioGranulator(actionId, params) {
        if (!u.isString(actionId)) {
            return;
        }

        switch (actionId) {
            case 'play':
                runAudioPlayGranulator(params);
                break;
            case 'stop':
                runAudioStopGranulator(params);
                break;
            case 'config':
                updateGranulatorConfig(params);
                break;
            case 'rampLinear':
                runAudioGranulatorRampLinear(params);
                break;
            case 'rampSin':
                runAudioGranulatorRampSin(params);
                break;
            case 'volume':
                setGranulatorVolume(params);
                break;
            default:
                logError("runAudioGranulator: Unknown actionId: " + actionId);
                return;
        }
    }
    function runAudioPlayGranulator(params) {
        if (isNull(a)) {
            logError("runAudioPlayGranulator: Invalid zsAudio lib");
            return;
        }
        a.playGranulator();
    }
    function runAudioStopGranulator(params) {
        if (isNull(a)) {
            logError("runAudioPlayGranulator: Invalid zsAudio lib");
            return;
        }
        a.stopGranulator();
    }
    function runAudioGranulatorRampLinear(params) {
        if (isNull(a)) {
            logError("runAudioPlayGranulator: Invalid zsAudio lib");
            return;
        }
        if (!u.isObject(params)) {
            return;
        }

        var configParamName = null;
        var rampEndValue = null;
        var rampDurationMs = null;

        if (!isNull(params.paramName)) {
            configParamName = params.paramName;
        }
        if (!isNull(params.endValue)) {
            rampEndValue = params.endValue;
        }
        if (!isNull(params.duration)) {
            rampDurationMs = params.duration;
        }

        a.setGranulatorRampLinear(configParamName, rampEndValue, rampDurationMs);
    }
    function setGranulatorVolume(params) {
        if (isNull(a)) {
            logError("runAudioPlayGranulator: Invalid zsAudio lib");
            return;
        }
        if (!u.isObject(params)) {
            return;
        }
        var level = null;
        var timeMs = null;

        if (!isNull(params.level)) {
            level = params.level;
        }
        if (!isNull(params.timeMs)) {
            timeMs = params.timeMs;
        }
        a.setGranulatorGain(level, timeMs);
    }
    function runAudioGranulatorRampSin(params) {
        if (isNull(a)) {
            logError("runAudioPlayGranulator: Invalid zsAudio lib");
            return;
        }
        if (!u.isObject(params)) {
            return;
        }

        var configParamName = null;
        var rampAmplitude = null;
        var rampFrequency = null;
        var rampDurationMs = null;

        if (!isNull(params.paramName)) {
            configParamName = params.paramName;
        }
        if (!isNull(params.amplitude)) {
            rampAmplitude = params.amplitude;
        }
        if (!isNull(params.frequency)) {
            rampFrequency = params.frequency;
        }
        if (!isNull(params.duration)) {
            rampDurationMs = params.duration;
        }

        a.setGranulatorRampSin(configParamName, rampAmplitude, rampFrequency, rampDurationMs);
    }
    function resetGranulator() {
        if (isNull(a)) {
            logError("runAudioPlayGranulator: Invalid zsAudio lib");
            return;
        }
        a.resetGranulator();
    }
    function resetSelectedTiles() {
        resetSelectedTilesState();
    }
    function updateGranulatorConfig(params) {
        if (isNull(a)) {
            logError("runAudioPlayGranulator: Invalid zsAudio lib");
            return;
        }
        if (!u.isObject(params)) {
            return;
        }
        a.setGranulatorConfig(params);
        a.initGranulator(state.granulatorIndex);
    }
    function reset(actionId, targets, params) {
        if (u.isArray(targets)) {
            for (var i = 0; i < targets.length; i++) {
                runReset(actionId, targets[i], params);
            }
        } else {
            runReset(actionId, targets, params);
        }
    }
    function runReset(actionId, target, params) {
        if (!u.isString(actionId)) {
            return;
        }

        log("reset: actionId: " + actionId + SPACE + target);

        switch (actionId) {
            case 'all':
                break;
            default:
                logError("Unknown reset actionId: " + actionId);
                return;
        }
    }

    function processInstructions(instructions) {
        setInstructions(instructions.line1, instructions.line2, instructions.line3, instructions.colour, instructions.isVisible);
    }

    function processCounter(counter) {
        if (isNotNull(counter.count)) {
            setVote(counter.count);
        }
        if (isNotNull(counter.maxCount)) {
            setUserNo(counter.maxCount);
        }
        setMeter();
    }
    function processPlayerConfig(playerConfig) {
        updateAudioPlayerCofig(playerConfig);
    }
    function processSynthConfig(config) {
        updateSynthConfig(config);
    }
    function processGranulatorConfig(granulatorConfig) {
        updateGranulatorConfig(granulatorConfig);
    }
    function processViewState(viewState) {
        updateViewState(viewState);
    }
    function setMeter() {
        if (isNull(state.meter)) {
            return;
        }
        var maxVotes = state.userNo;
        if (maxVotes <= config.meterMaxVotes) {
            maxVotes = config.meterMaxVotes;
        }

        state.meter.set(state.voteCount, maxVotes);
    }
    function getSvg() {
        return u.getElement("svgCanvas");
    }
    function displayInstructions(val) {
        if (isNull(_instructionsElement)) {
            return;
        }

        _instructionsElement.innerHTML = EMPTY;
        var l1 = state.instructions.l1;
        var spanId1 = config.textSpanPrefix + "1";
        var l2 = state.instructions.l2;
        var spanId2 = config.textSpanPrefix + "2";
        var l3 = state.instructions.l3;
        var spanId3 = config.textSpanPrefix + "3";

        var longestLine = EMPTY;
        if (!val) {
            val = EMPTY;
            if (!u.isEmptyString(l1)) {
                longestLine = checkLongestLine(l1, longestLine);
                l1 = parseLine(l1, spanId1);
                val += l1;
            }
            if (!u.isEmptyString(l2)) {
                log("displayInstructions: processing line2 " + l2);
                longestLine = checkLongestLine(l2, longestLine);
                l2 = parseLine(l2, spanId2);
                val = u.addSuffixIfNotThere(val, config.textLineBreak);
                val += l2;
            }
            if (!u.isEmptyString(l3)) {
                log("displayInstructions: processing line3 " + l3);
                longestLine = checkLongestLine(l3, longestLine);
                l3 = parseLine(l3, spanId3);
                val = u.addSuffixIfNotThere(val, config.textLineBreak);
                val += l3;
            }
        }

        var defaultFontSize = config.textFontSize;

        var fontSize = getFontSizeFit(longestLine, defaultFontSize, _instructionsElement);
        //log("Setting font size: " + fontSize);
        _instructionsElement.style.fontSize = EMPTY + fontSize + "px";
        _instructionsElement.style.fontFamily = config.textFontFamily;
        _instructionsElement.innerHTML = val;

        var span1 = u.getChildElement(_instructionsElement, u.toCssIdQuery(spanId1));
        if (!isNull(span1)) {
            span1.style.opacity = 0;
        }
        var span2 = u.getChildElement(_instructionsElement, u.toCssIdQuery(spanId2));
        if (!isNull(span2)) {
            span2.style.opacity = 0;
        }
        var span3 = u.getChildElement(_instructionsElement, u.toCssIdQuery(spanId3));
        if (!isNull(span3)) {
            span3.style.opacity = 0;
        }

        state.instructions.isVisible = true;
        setInstructionsTextStyle(_instructionsElement, state.instructions);

        if (config.textSpanIsFadeIn) {
            var du = config.textSpanFadeTimeSec;
            var dl = config.textSpanFadeStaggerTimeSec;
            if (!isNull(span1)) {
                gsap.to(span1, { duration: du, autoAlpha: 1, ease: "power1.in" });
            }
            if (!isNull(span2)) {
                gsap.to(span2, { delay: dl, duration: du, autoAlpha: 1, ease: "power1.in" });
            }
            if (!isNull(span3)) {
                gsap.to(span3, { delay: 2 * dl, duration: du, autoAlpha: 1, ease: "power1.in" });
            }
        } else {
            if (!isNull(span1)) {
                span1.style.opacity = 1;
            }
            if (!isNull(span2)) {
                span2.style.opacity = 1;
            }
            if (!isNull(span3)) {
                span3.style.opacity = 1;
            }
        }
    }
    function parseLine(lineToCheck, spanId) {
        while (u.contains(lineToCheck, SINGLE_QUOTE_HTML)) {
            lineToCheck = u.replace(lineToCheck, SINGLE_QUOTE_HTML, SINGLE_QUOTE);
        }
        lineToCheck = u.wrapInSpanElement(lineToCheck, spanId);
        return lineToCheck;
    }
    function checkLongestLine(lineToCheck, longestLine) {
        var line = u.removeMarkup(lineToCheck);
        return (line.length > longestLine.length) ? line : longestLine;
    }
    function getFontString(size) {
        return config.textFontType + SPACE + size + "px " + config.textFontFamily;
    }
    function hideInstructions() {
        if (isNull(_instructionsElement)) {
            return;
        }

        _instructionsElement.innerHTML = EMPTY;

        state.instructions.isVisible = false;
        setInstructionsTextStyle(_instructionsElement, state.instructions);
    }
    function setInstructionsTextStyle(instructionsElement, instructionsState) {
        var instructionsTextStyle = getInstructionsTextStyle(instructionsState);
        if (!isNull(instructionsState.bckgCol)) {
            instructionsTextStyle["background"] = instructionsState.bckgCol;
        }
        u.setElementStyleProperty(instructionsElement, instructionsTextStyle);
    }
    function processSeverState(serverState, isDeltaUpdate) {
        if (isNull(serverState)) {
            return;
        }
        if (!isDeltaUpdate) {
            resetAll();
        }
        if (isNotNull(serverState.actions)) {
            processSeverActions(serverState.actions);
        }
        if (isNotNull(serverState.instructions)) {
            processInstructions(serverState.instructions);
        }
        if (isNotNull(serverState.counter)) {
            processCounter(serverState.counter);
        }
        if (isNotNull(serverState.playerConfig)) {
            processPlayerConfig(serverState.playerConfig);
        }
        if (isNotNull(serverState.granulatorConfig)) {
            processGranulatorConfig(serverState.granulatorConfig);
        }
        if (isNotNull(serverState.viewState)) {
            processViewState(serverState.viewState);
        }
        if (isNotNull(serverState.synthConfig)) {
            processSynthConfig(serverState.synthConfig);
        }
    }
    function getInstructionsTextStyle(textState) {
        if (!textState.isVisible) {
            return config.textStyleInvisible;
        }

        return config.textStyleVisible;
    }
    function processSeverActions(actions) {
        var id = null;
        var actionType = null;
        var elementIds = [];
        var params = {};
        if (u.isArray(actions)) {
            for (var i = 0; i < actions.length; i++) {
                var action = actions[i];
                if (isNotNull(action.id)) {
                    id = action.id;
                }
                if (isNotNull(action.actionType)) {
                    actionType = action.actionType;
                }
                if (isNotNull(action.elementIds)) {
                    elementIds = action.elementIds;
                }
                if (isNotNull(action.params)) {
                    params = action.params;
                }
                doAction(id, actionType, elementIds, params);
            }
        }
    }
    function doAction(id, actionType, elementIds, params) {
        log("doAction: " + id + " actionType: " + actionType);

        if (isNull(actionType) || isNull(elementIds)) {
            return;
        }

        switch (actionType) {
            case "AUDIO":
                audio(id, elementIds, params);
                break;
            case "ACTIVATE":
                activate(id, elementIds, params);
                break;
            case "STOP":
                stop(id, elementIds, params);
                break;
            default:
                logError("doAction: Unknown actionType: " + actionType);
        }
    }
    function stop(actionId, targets, params) {
        if (u.isArray(targets)) {
            for (var i = 0; i < targets.length; i++) {
                runStop(actionId, targets[i], params);
            }
        } else {
            runStop(actionId, targets, params);
        }
    }
    function runStop(actionId, target, params) {
        if (!u.isString(actionId)) {
            return;
        }

        log("stop: actionId: " + actionId + SPACE + target);

        switch (actionId) {
            case 'stop':
                runStopAction(target, params);
                break;
            default:
                logError("Unknown stop actionId: " + actionId);
                return;
        }
    }
    function runStopAction(target, params) {
        if (isNull(target)) {
            return;
        }

        log("runStopAction: target: " + target);

        switch (target) {
            case 'all':
                runStopAll(params);
                break;
            case 'player':
                runAudioStopPlayer(params);
                break;
        }
    }
    function runStopAll(params) {
        log("runStopAll: ");
        if (!isNull(a) && a.isReady()) {
            runAudioStopPlayer();
            runAudioStopNoise();
        }
    }
    function runAudioStopPlayer() {
        if (isNull(a)) {
            logError("runAudioStopPlayer: Invalid zsAudio lib");
            return;
        }
        a.stopPlayer();
    }
    function runAudioStopNoise() {
        if (isNull(a)) {
            logError("runAudioStopNoise: Invalid zsAudio lib");
            return;
        }
        a.stopNoise();
    }
    function playOrRestartTween(tween) {
        if (isNull(tween)) {
            return;
        }
        var progress = tween.progress();
        if (progress > 0) {
            tween.restart();
        } else {
            tween.play();
        }
    }

    function getInstructionsElement() {
        return u.getElement(config.instructionTxtElementId);
    }
    function getMeterGroup() {
        return u.getElement(config.meterGroupId);
    }
    function getThumbUpGroup() {
        return u.getElement(config.thumbUpGroupId);
    }
    function getThumbUpRect() {
        return u.getElement(config.thumbUpRectId);
    }
    function getRegion(regionNo) {
        var regionId = createRegionId(regionNo);
        return u.getElement(regionId);
    }
    function getRegionRect(regionNo) {
        var regionRectId = createRegionRectId(regionNo);
        return u.getElement(regionRectId);
    }
    function createRegionId(regionNo) {
        return config.regionGrpId + regionNo;
    }
    function createRegionRectId(regionNo) {
        return config.regionRectId + regionNo;
    }
    function getThumbUpPath() {
        return u.getElement(config.thumbUpSymId);
    }
    function getThumbDownRect() {
        return u.getElement(config.thumbDownRectId);
    }
    function getThumbDownGroup() {
        return u.getElement(config.thumbDownGroupId);
    }
    function getThumbDownPath() {
        return u.getElement(config.thumbDownSymId);
    }
    function getThumbUpTween() {
        return state.thumbUpTween;
    }
    function getThumbDownTween() {
        return state.thumbDownTween;
    }
    function getNoteUpTween() {
        return state.noteUpTween;
    }
    function getNoteDownTween() {
        return state.noteDownTween;
    }
    function getRegionTween(regionNo) {
        if(isNull(state.regionTweens)) {
            return null;
        }
        return state.regionTweens[regionNo];
    }
    function getFontSizeFit(value, fontSize, container) {
        var fs = 1;
        const overallWidth = win.innerWidth || doc.documentElement.clientWidth || doc.body.clientWidth;
        var overallHeight = win.innerHeight || doc.documentElement.clientHeight || doc.body.clientHeight;
        var font = getFontString(fs);
        var containerLen = container.clientWidth;
        var allowedLen = containerLen * config.textWidthCompressor;
        var allowedHeight = overallHeight * config.textAreaMax;

        fs = getFontLenFit(value, fontSize, allowedLen);
        fs = getFontHeightFit(containerLen, fs, allowedHeight)

        var maxSize = config.textMaxFontSize;
        if (fs > maxSize) {
            fs = maxSize;
        }

        return fs;
    }
    function getFontHeightFit(containerLen, fontSize, allowedHeight) {
        var font = getFontString(fontSize);
        var fs = fontSize;
        var fontHeight = determineFontHeightInPixels(font, containerLen, allowedHeight);
        if (fontHeight < 0) {
            //something went wrong
            return fs;
        }
        var allRowsHeight = fontHeight * config.textNumberOfLines;
        var heightRatio = allowedHeight / allRowsHeight;
        if (heightRatio < 1.0) {
            fs *= heightRatio;
        }

        return fs;
    }
    function getFontLenFit(value, fontSize, allowedLen) {
        var font = getFontString(fontSize);
        var textMatrix = getFontMetrics(font, value);
        var textLen = textMatrix.width;

        if (textLen <= 0.0 || textLen > allowedLen || Math.abs(allowedLen - textLen) < 1.0) {
            return fontSize;
        }

        var lenRatio = allowedLen / textLen;
        var fs = fontSize * lenRatio;
        return getFontLenFit(value, fs, allowedLen);
    }
    function getFontMetrics(fontStyle, text) {
        var fontDraw = state.fontCanvas;
        var ctx = state.canvasCtx;

        ctx.fillRect(0, 0, fontDraw.width, fontDraw.height);
        ctx.textBaseline = 'top';
        ctx.fillStyle = COL_WHITE;
        ctx.font = fontStyle;
        return ctx.measureText(text);
    }
    function determineFontHeightInPixels(fontStyle, width, height) {
        var fontDraw = state.fontCanvas;
        var ctx = state.canvasCtx;

        fontDraw.width = width;
        fontDraw.height = height;
        ctx.fillRect(0, 0, fontDraw.width, fontDraw.height);
        ctx.textBaseline = 'top';
        ctx.fillStyle = COL_WHITE;
        ctx.font = fontStyle;
        var fill = 'gM';
        ctx.fillText(fill, 0, 0);
        var pixels = ctx.getImageData(0, 0, fontDraw.width, fontDraw.height).data;
        var start = -1;
        var end = -1;
        for (var row = 0; row < fontDraw.height; row++) {
            for (var column = 0; column < fontDraw.width; column++) {
                var index = (row * fontDraw.width + column) * 4;
                if (pixels[index] === 0) {
                    if (column === fontDraw.width - 1 && start !== -1) {
                        end = row;
                        row = fontDraw.height;
                        break;
                    }
                    continue;
                }
                else {
                    if (start === -1) {
                        start = row;
                    }
                    break;
                }
            }
        }
        var result = (end - start) * config.textHeightCompressor;
        return result;
    }
    function onRegionSelect(regionId) {
        log("onRegionSelect:");
        u.playOrRestartTween(getRegionTween(regionId));
    }
    function onThumbsUp() {
        log("onThumbsUp:");
        if (state.isThumbEnabled) {
            if (isThumbsUpActive()) {
                return;
            }
            u.setElementAttributes(getThumbUpGroup(), config.filterInActiveAttrib);
            u.playOrRestartTween(getThumbUpTween());
        }
        if (state.isNoteEnabled) {
            if (isNoteUpActive() || isNoteDownActive()) {
                return;
            }
            hideSymbolTween(config.noteDownSymId);
            u.playOrRestartTween(getNoteUpTween());
            playNoteUp();
        }
        if (state.isVotingEnabled) {
            onVote(VOTE_UP);
        }
    }
    function onThumbsDown() {
        log("onThumbsDown:");
        if (state.isThumbEnabled) {
            if (isThumbsDownActive()) {
                return;
            }
            u.setElementAttributes(getThumbDownGroup(), config.filterInActiveAttrib);
            u.playOrRestartTween(getThumbDownTween());
        }
        if (state.isNoteEnabled) {
            if (isNoteUpActive() || isNoteDownActive()) {
                return;
            }
            hideSymbolTween(config.noteUpSymId);
            u.playOrRestartTween(getNoteDownTween());
            playNoteDown();
        }
        if (state.isVotingEnabled) {
            onVote(VOTE_DOWN);
        }
    }
    function onMouseUpThumbsUp(event) {
        log("onMouseUpThumbsUp:");
        if (_isTouch) {
            return;
        }
        // event.preventDefault();
        onThumbsUp();
    }
    function onTouchEndThumbsUp(event) {
        log("onTouchEndThumbsUp:");
        if (!_isTouch) {
            return;
        }
        // event.preventDefault();
        onThumbsUp();
    }
    function onMouseUpRegionSelect(event) {
        log("onMouseUpRegionSelect:");
        if (_isTouch) {
            return;
        }
        var regionId = event.target.rgnId;
        // event.preventDefault();
        onRegionSelect(regionId);
    }
    function onTouchEndRegionSelect(event) {
        log("onTouchEndRegionSelect:");
        if (!_isTouch) {
            return;
        }
        var regionId = event.target.rgnId;
        // event.preventDefault();
        onRegionSelect(regionId);
    }
    function onMouseUpThumbsDown(event) {
        log("onMouseUpThumbsDown:");
        if (_isTouch) {
            return;
        }
        // event.preventDefault();
        onThumbsDown();
    }
    function onTouchEndThumbsDown(event) {
        log("onTouchEndThumbsDown:");
        if (!_isTouch) {
            return;
        }
        // event.preventDefault();
        onThumbsDown();
    }
    function setElementAttributes(element, attrAssocArr) {
        u.setElementAttributes(element, attrAssocArr);
    }
    function isNull(val) {
        return u.isNull(val);
    }
    function isNotNull(val) {
        return u.isNotNull(val);
    }
    function logError(val) {
        u.logError(val);
    }
    function log(val) {
        u.log(val);
    }
    // Public members if any??
    return {
        load: function () {
            onLoad();
        },
        onThumbsDownSelect: function () {
            onThumbsDown();
        },
        onThumbsUpSelect: function () {
            onThumbsUp();
        }
    }
}(zsUtil, zsNet, zsSvg, zsAudio, zsMusic, zsSynth, window, document));