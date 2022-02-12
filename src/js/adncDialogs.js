var zscore = (function (u, n, s, a, win, doc) {
    "use strict";

    // TODO set for prod when ready - gets rid of console logs
    const RUN_MODE = "DEV";
    // const RUN_MODE = "PROD";

    const EMPTY = "";
    const BLANK = " ";
    const RECT = "Rect";
    const COL_WHITE = "#FFFFFF";
    const COL_BLACK = "#000000";
    const EVENT_VOTE = "VOTE";
    const EVENT_PARAM_VALUE = "value";
    const VOTE_UP = 1;
    const VOTE_DOWN = -1;
    const SINGLE_QUOTE_HTML = "&#39;";
    const SINGLE_QUOTE = "'";

    var AUDIO_FLIES = [
        '/audio/DialogsPitch1-1.mp3',
        '/audio/DialogsPitch1-2.mp3',
        '/audio/DialogsPitch1-3.mp3',
        '/audio/DialogsPitch2-1.mp3',
        '/audio/DialogsPitch2-2.mp3',
        '/audio/DialogsPitch2-3.mp3',
        '/audio/DialogsPitch3-1.mp3',
        '/audio/DialogsPitch3-2.mp3',
        '/audio/DialogsPitch3-3.mp3',
    ];

    var AUDIO_FILE_INDEX_MAP = [
        [],
        [0,1,2],
        [3,4,5],
        [6,7,8],
    ];

    var isTouch = null;
    var isSafari = null;
    var instructionsElement = null;

    // INIT on window load
    // u.listen("load", window, onLoad);

    // ---------  MODEL -----------
    var state = {
        instructions: { isVisible: false, l1: EMPTY, l2: EMPTY, l3: EMPTY, bckgCol: "rgba(225, 225, 225, 0.85)" },
        voteCount: 0,
        userNo: 10,
        meter: null,
        currentVote: null,
        voteTimeMs: 0,
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
        elementGroupSuffix: "Grp",
        meterGroupId: "meterGrp",
        thumbUpRectId: "thUpRect",
        thumbDownRectId: "thDownRect",
        thumbUpGroupId: "thumbUpGrp",
        thumbUpPathId: "thumbUpPth",
        thumbDownGroupId: "thumbDownGrp",
        thumbDownPathId: "thumbDownPth",
        meterBoxIdPrefix: "meterBox",
        meterBoxNo: 20,
        meterMaxVotes: 5,
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
        maxNoiseLevel: 0.5,
        audioFadeInMs: 1000,
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
        this.isPlayAudio = true;
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
        if (value === 0) {
            a.playNoise(0.0);
            a.setPlayerVolume(0.0, 500);
            return;
        } else if (value > 0) {
            a.playNoise(0.0);
            var vol = u.mapRange(Math.abs(value), 0.0, Math.abs(maxVal), 0.0, 1.0);
            a.setPlayerVolume(vol, config.audioFadeInMs);
        } else {
            a.setPlayerVolume(0.0, config.audioFadeInMs);
            var vol = u.mapRange(Math.abs(value), 0.0, Math.abs(maxVal), 0.0, config.maxNoiseLevel);
            a.playNoise(vol);
        }        
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
        if (!u || !n || !s || !a) {
            throw new ZScoreException("Invalid libraries. Required: zsUtil, zsNet, zsSvg and zsAudio");
        }

        u.setRunMode(RUN_MODE);

        log("init: ");
        isTouch = u.isTouchDevice()
        isSafari = u.isSafari(navigator);
        log("init: IsTouch Device: " + isTouch + " isSafari: " + isSafari);

        state.fontCanvas = doc.createElement("canvas");
        state.canvasCtx = state.fontCanvas.getContext('2d');

        //init server side events
        initNet();
        //init server side events
        initSvg();
        //init audio
        initAudio();
        // init svg and html
        initMeter();
        initInstructions();

        getServerState();
    }
    function resetAll() {
        resetAudio();
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
    }
    function initAudio() {
        if (isNull(a)) {
            logError("initAudio: invalid zsAudio lib");
            return;
        }
        a.init(AUDIO_FLIES, onAudioLoaded);
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
        var thUr = getThumbUpRect();
        if (isNotNull(thUr)) {
            u.listen('touchend', thUr, onTouchEndThumbsUp);
            u.listen('mouseup', thUr, onMouseUpThumbsUp);
        }
        var thD = getThumbDownRect();
        if (isNotNull(thD)) {
            u.listen('touchend', thD, onTouchEndThumbsDown);
            u.listen('mouseup', thD, onMouseUpThumbsDown);
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

        instructionsElement = inst;
        u.listen('resize', win, onWindowResize);
        u.listen('orientationchange', win, onWindowResize);
        setInstructions("Welcome to", "<span style='color:blueviolet;'>ZScore</span>", "awaiting performance start ...", null, true);
    }
    function onVote(value) {
        var now = Date.now();
        if (isNotNull(state.currentVote) && state.currentVote === value) {
            var prevVoteTime = state.voteTimeMs;
            var threshold = prevVoteTime + config.voteTimeoutMs;
            var diff = now - threshold;
            if (diff < 0) {
                return;
            }
        }
        state.currentVote = value;
        state.voteTimeMs = now;
        var evParams = {};
        evParams[EVENT_PARAM_VALUE] = value;
        n.sendEvent(EVENT_VOTE, evParams);
    }
    function setThumbsUpStyle(isActive) {
        var thUpEl = getThumbUpPath();
        if (isNull(thUpEl)) {
            return;
        }
        if (isActive) {
            setElementAttributes(thUpEl, config.thumbsUpActiveStyle);
        } else {
            setElementAttributes(thUpEl, config.thumbsUpInActiveStyle);
        }
    }
    function setThumbsDownStyle(isActive) {
        var thDnEl = getThumbDownPath();
        if (isNull(thDnEl)) {
            return;
        }
        if (isActive) {
            setElementAttributes(thDnEl, config.thumbsDownActiveStyle);
        } else {
            setElementAttributes(thDnEl, config.thumbsDownInActiveStyle);
        }
    }
    function setInstructions(l1, l2, l3, colour, isVisible) {
        if (isNull(instructionsElement)) {
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
    function zoom(targets) {
        if (u.isArray(targets)) {
            for (var i = 0; i < targets.length; i++) {
                zoomTarget(targets[i]);
            }
        } else {
            zoomTarget(targets);
        }
    }
    function timeline(actionId, targets, params) {
        if (u.isArray(targets)) {
            for (var i = 0; i < targets.length; i++) {
                runTimeline(actionId, targets[i], params);
            }
        } else {
            runTimeline(actionId, targets, params);
        }
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

        log("runAudio: " + actionId + BLANK + target);

        switch (target) {
            case 'player':
                runAudioPlayer(actionId, params);
                break;
            case 'granulator':
                break;
            case 'speechSynth':
                break;
        }
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
            default:
                logError("runPlayer: Unknown actionId: " + actionId);
                return;
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
        if(sectionIndex > 0  && sectionIndex < AUDIO_FILE_INDEX_MAP.length) {
            var fileIdxArr = AUDIO_FILE_INDEX_MAP[sectionIndex];
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

        log("reset: actionId: " + actionId + BLANK + target);

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
        if (isNull(instructionsElement)) {
            return;
        }

        instructionsElement.innerHTML = EMPTY;
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

        var fontSize = getFontSizeFit(longestLine, defaultFontSize, instructionsElement);
        //log("Setting font size: " + fontSize);
        instructionsElement.style.fontSize = EMPTY + fontSize + "px";
        instructionsElement.style.fontFamily = config.textFontFamily;
        instructionsElement.innerHTML = val;

        var span1 = u.getChildElement(instructionsElement, u.toCssIdQuery(spanId1));
        if (!isNull(span1)) {
            span1.style.opacity = 0;
        }
        var span2 = u.getChildElement(instructionsElement, u.toCssIdQuery(spanId2));
        if (!isNull(span2)) {
            span2.style.opacity = 0;
        }
        var span3 = u.getChildElement(instructionsElement, u.toCssIdQuery(spanId3));
        if (!isNull(span3)) {
            span3.style.opacity = 0;
        }

        state.instructions.isVisible = true;
        setInstructionsTextStyle(instructionsElement, state.instructions);

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
        return config.textFontType + BLANK + size + "px " + config.textFontFamily;
    }
    function hideInstructions() {
        if (isNull(instructionsElement)) {
            return;
        }

        instructionsElement.innerHTML = EMPTY;

        state.instructions.isVisible = false;
        setInstructionsTextStyle(instructionsElement, state.instructions);
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
            default:
                logError("doAction: Unknown actionType: " + actionType);
        }
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
    function getThumbUpPath() {
        return u.getElement(config.thumbUpPathId);
    }
    function getThumbDownRect() {
        return u.getElement(config.thumbDownRectId);
    }
    function getThumbDownGroup() {
        return u.getElement(config.thumbDownGroupId);
    }
    function getThumbDownPath() {
        return u.getElement(config.thumbDownPathId);
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
    function onThumbsUp() {
        log("onThumbsUp:");
        setThumbsUpStyle(true);
        setThumbsDownStyle(false);
        onVote(VOTE_UP);
    }
    function onThumbsDown() {
        log("onThumbsDown:");
        setThumbsUpStyle(false);
        setThumbsDownStyle(true);
        onVote(VOTE_DOWN);
    }
    function onMouseUpThumbsUp(event) {
        log("onMouseUpThumbsUp:");
        if (isTouch) {
            return;
        }
        // event.preventDefault();
        onThumbsUp();
    }
    function onTouchEndThumbsUp(event) {
        log("onTouchEndThumbsUp:");
        if (!isTouch) {
            return;
        }
        // event.preventDefault();
        onThumbsUp();
    }
    function onMouseUpThumbsDown(event) {
        log("onMouseUpThumbsDown:");
        if (isTouch) {
            return;
        }
        // event.preventDefault();
        onThumbsDown();
    }
    function onTouchEndThumbsDown(event) {
        log("onTouchEndThumbsDown:");
        if (!isTouch) {
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
}(zsUtil, zsNet, zsSvg, zsAudio, window, document));