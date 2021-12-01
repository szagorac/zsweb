var zscore = (function (u, n, s, a, win, doc) {
    "use strict";

    // TODO set for prod when ready - gets rid of console logs
    const RUN_MODE = "DEV";
    const EMPTY = "";
    const BLANK = " ";
    const SPACER = "m";
    const EVENT_ELEMENT_SELECTED = "ELEMENT_SELECTED";
    const EVENT_PARAM_ELEMENT_ID = "elementId";
    const EVENT_PARAM_SELECTED = "selected";
    const ATTR_FILL = "fill";
    const VISIBLE = "visible";
    const HIDDEN = "hidden";
    const COL_WHITE = "#FFFFFF";
    const COL_BLACK = "#000000";
    const COL_LAVANDER_BLUSH = "#FFF0F5";
    const COL_LIGHT_BLUE = "#ADD8E6";
    const COL_PALE_TURQOISE = "#AFEEEE";
    const COL_LIGHT_GREEN = "#CCFFCC";
    const COL_LIGHT_PURPLE = "#CCCCFF";
    const COL_LIGHT_GRAY = "#DCDCDC";
    const COL_SILVER = "#C0C0C0";
    const COL_TEAL_GRAY = "#2F4F4F"; 
    const COL_DIM_GRAY = "#696969"; 
    const COL_DARK_GRAY = "#4B4B4B"; 
    const COL_ORANGE = "#FFA500";
    const COL_CRYMSON = "#DC143C";    	
    const FILL_CLICK_COUNT = COL_DIM_GRAY;
    const FILL_ACTIVE = COL_DARK_GRAY;
    const FILL_PLAYING = COL_DARK_GRAY;
    const FILL_VISIBLE = COL_DARK_GRAY;
    const FILL_INACTIVE = COL_WHITE;
    const FILL_POINTER_ENTRY = COL_TEAL_GRAY;
    const FILL_SELECTED = COL_TEAL_GRAY;
    const FILL_TEXT = COL_WHITE;
    const FILL_PLAY_NEXT = COL_LIGHT_GREEN;
    const FILL_OUTER_FRAME = COL_WHITE;
    const FILL_STAGE_CIRCLE = COL_BLACK;
    const STROKE_SELECTED = COL_CRYMSON;
    const STROKE_PLAYING = COL_LIGHT_GREEN;
    const STROKE_PLAYING_NEXT = COL_ORANGE;
    const STROKE_GRID = COL_SILVER;
    const TILE_TEXT_TOKEN = "@TILE_TEXT@";
    const ALPHA_TOKEN = "@ALPHA@";
    const TILE_TEXT_FAMILY = "Arial";
    // const TILE_TEXT_FAMILY = "Garamond";    
    
    // const RUN_MODE = "DEV";
    // const RUN_MODE = "PROD";

    var AUDIO_FLIES = [
        '/audio/violin-tuning.mp3',
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
    }

    function ZScoreException(message) {
        this.message = message;
        this.name = 'ZScoreException';
    }

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
        initInstructions();

        // get server state and initialise
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
    function initAudio() {
        if (isNull(a)) {
            logError("initAudio: invalid zsAudio lib");
            return;
        }
        a.init(AUDIO_FLIES, 0);
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
        if(!u.isNumeric(voteCount)) {
            voteCount = u.toInt(voteCount);
        }

        state.voteCount = voteCount;
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
            case 'buffer':
                break;
            case 'granulator':
                break;
            case 'speechSynth':
                break;
        }
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
        if(isNotNull(counter.count)) {
            setVote(counter.count);
        }
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
                l1 = u.wrapInSpanElement(l1, spanId1);
                val += l1;
            }
            if (!u.isEmptyString(l2)) {
                log("displayInstructions: processing line2 " + l2);
                longestLine = checkLongestLine(l2, longestLine);
                l2 = u.wrapInSpanElement(l2, spanId2);
                val = u.addSuffixIfNotThere(val, config.textLineBreak);
                val += l2;
            }
            if (!u.isEmptyString(l3)) {
                log("displayInstructions: processing line3 " + l3);
                longestLine = checkLongestLine(l3, longestLine);
                l3 = u.wrapInSpanElement(l3, spanId3);
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
    }
}(zsUtil, zsNet, zsSvg, zsAudio, window, document));