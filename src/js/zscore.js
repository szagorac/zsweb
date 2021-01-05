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
    const COL_WHITE = "#FFFFFF";
    const COL_LAVANDER_BLUSH = "#FFF0F5";
    const COL_LIGHT_BLUE = "#ADD8E6";
    const COL_PALE_TURQOISE = "#AFEEEE";
    const COL_LIGHT_GREEN = "#CCFFCC";
    const COL_LIGHT_PURPLE = "#CCCCFF";
    const FILL_ACTIVE = COL_LAVANDER_BLUSH;
    const FILL_PLAYING = COL_LAVANDER_BLUSH;
    const FILL_VISIBLE = COL_WHITE;
    const FILL_INACTIVE = COL_WHITE;
    const FILL_POINTER_ENTRY = COL_LIGHT_BLUE;
    const FILL_SELECTED = COL_LIGHT_PURPLE;
    const FILL_PLAY_NEXT = COL_LIGHT_GREEN;
    const TILE_TEXT_TOKEN = "@TILE_TEXT@";
    // const RUN_MODE = "DEV";
    // const RUN_MODE = "PROD";

    var AUDIO_FLIES = [
        '/audio/violin-tuning.mp3',
        '/audio/UnionRoseE2m.mp3',
        '/audio/UnionRoseE3.mp3',
        '/audio/UnionRoseE4.mp3',
        '/audio/UnionRoseE5.mp3',
        '/audio/ligetiS1-1.mp3',
    ];

    var isTouch = null;
    var isSafari = null;
    var instructionsElement = null;

    // INIT on window load
    // u.listen("load", window, onLoad);

    // ---------  MODEL -----------
    var state = {
        tiles: [],
        tileCircles: [],
        centreShape: { isVisible: false, gsapTimeline: {} },
        innerCircle: { isVisible: false, gsapTimeline: {} },
        outerCircle: { isVisible: false, gsapTimeline: {} },
        instructions: { isVisible: false, l1: EMPTY, l2: EMPTY, l3: EMPTY, bckgCol: "rgba(225, 225, 225, 0.85)" },
        selectedTileId: null,
        playingTileId: null,
        fontCanvas: null,
        canvasCtx: null,
        isPlaySpeechSynthOnClick: false,
        speechText: "I, believe. I believe in " + TILE_TEXT_TOKEN + ".",
        speechVoice: "random",
        speechIsInterrupt: true,
    }
    var config = {
        connectionPreference: "ws,poll",
        centre: { x: 762, y: 762 },
        circleRadii: [55, 92, 125, 194, 291, 401, 552, 750],
        lineEnd: { x: 762, y: 12 },
        lineLen: 750,
        lineAngles: [0, 45, 90, 135, 180, 225, 270, 315],
        tileAngles: [0, 45, 90, 135, 180, 225, 270, 315, 360],
        circlePrefix: "c",
        linePrefix: "l",
        tilePrefix: "t",
        tileCircleGroupPrefix: "ctg",
        tileGroupPrefix: "g",
        tileTextElementPrefix: "x",
        tileTextPathElementPrefix: "px",
        tileTextElementPathPrefix: "hx",
        tileTextSpanPrefix: "sp",
        elementIdDelimiter: "-",
        svgArcs: [null, null, null, null, null, null, null, null],
        gridParentId: "grid",
        gridStyle: { "fill": "none", "stroke": "aqua", "stroke-width": "2px" },
        tilesParentId: "tiles",
        tileStyleVisible: { "fill": FILL_VISIBLE, "stroke": "silver", "stroke-width": "2px", "pointer-events": "all", "visibility": "visible", "opacity": 1 },
        tileStyleActive: { "fill": FILL_ACTIVE, "stroke": "silver", "stroke-width": "2px", "pointer-events": "all", "visibility": "visible", "opacity": 1 },
        tileStyleInActive: { "fill": FILL_INACTIVE, "stroke": "silver", "stroke-width": "2px", "pointer-events": "all", "visibility": "visible", "opacity": 1 },
        tileStyleInvisible: { "visibility": "hidden" },
        tileStyleOnPonterEntry: { "fill": FILL_POINTER_ENTRY },
        tileStyleSelected: { "fill": FILL_SELECTED, "stroke": "silver", "stroke-width": "2px", "visibility": "visible", "opacity": 1 },
        tileStylePlayed: { "visibility": "hidden" },
        tileStylePlaying: { "fill": FILL_PLAYING, "stroke": "lime", "stroke-width": "1px", "visibility": "visible", "opacity": 1 },
        tileStylePlayingNext: { "stroke": "teal", "stroke-width": "2px", "visibility": "visible", "opacity": 1 },
        tileStyleTextPathDef: { "fill": "none", "stroke": "none" },
        tileStyleTextElement: { "visibility": "visible", "opacity": 1 },
        tileStyleTextElementInvisible: { "visibility": "hidden" },
        tileStyleTorusTextPathElement: { "startOffset": "50%", "text-anchor": "middle", "fill": "black", "stroke": "none" },
        tileStylePieTextPathElement: { "startOffset": "90%", "text-anchor": "end", "fill": "black", "stroke": "none" },
        tileStyleInvertedPieTextPathElement: { "startOffset": "10%", "text-anchor": "start", "fill": "black", "stroke": "none" },
        tileStyleTextSpan: { "font-family": "Arial", "dominant-baseline": "middle" },
        tileTextMinLength: 4,
        tileTextSizeMultiplier: { torus: 0.8, pie: 0.7 },
        shapeStyleInvisible: { "visibility": "hidden" },
        shapeStyleVisible: { "visibility": "visible" },
        shapeTimelineDuration: 60,
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
        textSpanPrefix: "is",
        textSpanIsFadeIn: true,
        textSpanFadeTimeSec: 1.0,
        textSpanFadeStaggerTimeSec: 0.5,
        appUrlHttp: "/htp",
        appUrlSse: "/sse",
        appUrlWebsockets: "/wsoc",
        zoomDuration: 3,
        all: "ALL",
        testTextElementId: "testTxt",
        colModPerClick: -20,
        maxColModPerClick: -150,
    }

    function ZScoreException(message) {
        this.message = message;
        this.name = 'ZScoreException';
    }

    function TileText(value, isVisible, sizeMultiplier) {
        this.value = value;
        this.isVisible = isVisible;
        this.sizeMultiplier = sizeMultiplier;
    }

    function TileState(id, isSelected, isActive, isVisible, isPlaying, isPlayingNext, isPlayed, clickCount, arc, txt) {
        this.id = id;
        this.isSelected = isSelected;
        this.isActive = isActive;
        this.isVisible = isVisible;
        this.isPlaying = isPlaying;
        this.isPlayingNext = isPlayingNext;
        this.isPlayed = isPlayed;
        this.clickCount = clickCount;
        this.arc = arc;
        this.txt = txt;
        this.tweens = [];
    }

    function TileCircleState(id) {
        this.id = id;
        this.tweens = [];
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
        initTiles()
        initShapes();
        initInstructions();
        // createGrid();
        createTiles();

        // get server state and initialise
        getServerState();
    }
    function resetAll() {
        resetTiles();
        resetShapes();
        resetZoom();
        resetAudio();
    }
    function initNet() {
        n.init(config.connectionPreference, config.appUrlSse, config.appUrlWebsockets, config.appUrlHttp, onServerEventReceived, processSeverState);
    }
    function getServerState() {
        n.getServerState();
    }
    function initAudio() {
        if (isNull(a)) {
            logError("initAudio: invalid zsAudio lib");
            return;
        }
        a.init(AUDIO_FLIES, 5);
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
    function initTiles() {
        var isSelected = false;
        var isActive = false;
        var isVisible = true;
        var isPlaying = false
        var isPlayingNext = false;
        var isPlayed = false;
        var clickCount = 0;
        var txt = new TileText(EMPTY, false, 1.0);
        var initalTileState = new TileState(null, isSelected, isActive, isVisible, isPlaying, isPlayingNext, isPlayed, clickCount, null, txt);
        state.tiles = u.init2DArray(8, 8, initalTileState);

        var initialTileCircleState = new TileCircleState(null);
        state.tileCircles = u.initArray(8, initialTileCircleState);
    }
    function resetTiles() {
        for (var i = 0; i < state.tiles.length; i++) {
            var rows = state.tiles[i];
            for (var j = 0; j < rows.length; j++) {
                resetTileState(state.tiles[i][j]);
            }
        }
    }
    function resetTileState(tileState) {
        resetTileGroup(tileState.id);
        tileState.isSelected = false;
        tileState.isActive = false;
        tileState.isVisible = true;
        tileState.isPlaying = false
        tileState.isPlayingNext = false;
        tileState.isPlayed = false;
        tileState.clickCount = 0;
        tileState.txt.value = EMPTY;
        tileState.txt.isVisible = false;
        for (var z = 0; z < tileState.tweens.length; z++) {
            var tween = tileState.tweens[z];
            if (!isNull(tween)) {
                tween.pause(0);
            }
        }
        var tileObj = u.getElement(tileState.id);
        setTileStyle(tileState, tileObj);
    }
    function resetTileGroup(tileId) {
        var tileGroupId = config.tileGroupPrefix + tileId;
        var tileGroup = u.getElement(tileGroupId);
        if (!isNull(tileGroup)) {
            tileGroup.style.opacity = "1";
        }
    }
    function resetShapes() {
        resetShape(state.centreShape);
        resetShape(state.innerCircle);
        resetShape(state.outerCircle);
    }
    function resetShape(shapeState) {
        shapeState.isVisible = false;
        if (u.isFunction(shapeState.gsapTimeline.pause)) {
            shapeState.gsapTimeline.pause(0);
        }
    }
    function resetZoom() {
        processZoomLevel("centreShape");
    }
    function createGrid() {
        createCircles();
        createLines();
    }
    function createCircles() {
        var arr = config.circleRadii;
        var centre = config.centre;

        for (var i = 0; i < arr.length; i++) {
            var radius = arr[i];
            var circleElement = s.createSvgCircle(centre.x, centre.y, radius, i + 1);
            u.setElementAttributes(circleElement, config.gridStyle);
            u.addChildToParentId(config.gridParentId, circleElement);
        }
    }
    function createLines() {
        var arr = config.lineAngles;
        var centre = config.centre;
        var lineEnd = config.lineEnd;

        for (var i = 0; i < arr.length; i++) {
            var angle = arr[i];
            var lineElement = s.createSvgLine(centre.x, centre.y, lineEnd.x, lineEnd.y, angle, i + 1);
            u.setElementAttributes(lineElement, config.gridStyle);
            u.addChildToParentId(config.gridParentId, lineElement);
        }
    }
    function initShapes() {
        initShape("centreShape", state.centreShape, config.shapeTimelineDuration, config.circleRadii[1])
        initShape("innerCircle", state.innerCircle, config.shapeTimelineDuration, config.circleRadii[4])
        initShape("outerCircle", state.outerCircle, config.shapeTimelineDuration, config.circleRadii[7])
    }
    function initShape(shapeId, shapeState, dur, radius) {
        var timeline = gsap.timeline({ paused: true, ease: "power4.inOut", onComplete: onShapeTimelineComplete, onCompleteParams: [shapeState] });
        shapeState.gsapTimeline = timeline;

        var shape = u.getElement(shapeId);
        if (isNull(shape)) {
            logError("Failed to find shape: " + shapeId);
            return;
        }

        setObjectVisibility(shape, shapeState.isVisible);

        var xc = config.centre.x;
        var yc = config.centre.y;
        var direction = 1;

        var children = shape.children;
        if (isNull(children)) {
            return;
        }
        for (var i = 0; i < children.length; i++) {
            var child = children[i];
            if (u.isEmptyString(child.id)) {
                child.id = "csh" + i;
            }

            var bbox = child.getBBox();
            var objX = bbox.x;
            var objY = bbox.y;

            var rndPoint = getRandomPointInsideCircle(xc, yc, radius)
            var angle = u.randomIntFromInterval(0, 360) * direction;
            direction *= -1;
            var scale = u.randomFloatFromInterval(0.1, 2.0);
            var xt = rndPoint.x - objX;
            var yt = rndPoint.y - objY;

            var id = child.id;
            var tween = gsap.from(u.toCssIdQuery(id), {
                x: xt,
                y: yt,
                rotation: angle,
                scale: scale,
            });

            timeline.add(tween, 0);
        }

        timeline.totalDuration(dur);
    }
    function createTiles() {
        var cRadii = config.circleRadii;
        var centre = config.centre;
        var tAngles = config.tileAngles;
        var dur = 10;
        var angle = 360;

        for (var i = 0; i < cRadii.length; i++) {
            var tileCircleState = state.tileCircles[i];
            tileCircleState.id = config.tileCircleGroupPrefix + (i + 1);
            var tween = createRotateAroundSvgCentre(tileCircleState.id, dur, angle);
            tileCircleState.tweens.push(tween);
            angle = -1 * angle;

            var radius = cRadii[i];
            for (var j = 1; j < tAngles.length; j++) {
                var startAngle = tAngles[j - 1];
                var endAngle = tAngles[j];
                createSvgTile(centre.x, centre.y, radius, startAngle, endAngle, i + 1, j);
            }
        }
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
    function createSvgTile(cX, cY, r, startAngle, endAngle, circleNo, tileNo) {
        var tileId = config.tilePrefix + u.toStr(circleNo) + config.elementIdDelimiter + u.toStr(tileNo);

        var tileElement = s.createPathElement(tileId);
        if (isNull(tileElement)) {
            logError("createSvgTile: Failed to create tile: " + tileId);
            return;
        }

        var tileCircleGroupId = config.tileCircleGroupPrefix + u.toStr(circleNo);

        var tileGroupId = config.tileGroupPrefix + tileId;
        var tileGroupElement = s.createGroupElement(tileGroupId);
        u.addChildToParentId(tileCircleGroupId, tileGroupElement);
        u.listen('mouseenter', tileGroupElement, onPointerEnter);
        u.listen('mouseleave', tileGroupElement, onPointerLeave);
        u.listen('touchend', tileGroupElement, onTouchEnd);
        u.listen('mouseup', tileGroupElement, onMouseUp);

        var tileElement = s.createPathElement(tileId);

        u.addChildToParentId(tileGroupId, tileElement);

        var circleIndex = circleNo - 1;
        var tileIndex = tileNo - 1;

        var tileState = state.tiles[circleIndex][tileIndex];
        if (isNull(tileState)) {
            logError("createSvgTile: Invalid tile state");
            return;
        }

        tileState.id = tileId;

        var arc = s.createArc(cX, cY, r, startAngle, endAngle);
        tileState.arc = arc;

        setTileStyle(tileState, tileElement)

        var txtState = null;
        if (!isNull(tileState.txt)) {
            txtState = tileState.txt;
        }

        var tilePath = null;
        if (circleNo <= 1) {
            tilePath = s.createPieTilePath(cX, cY, arc);
            createPieTileSvgText(cX, cY, r, startAngle, endAngle, tileNo, tileId, tileGroupId, txtState);
        } else {
            var previousTileState = state.tiles[circleIndex - 1][tileIndex];
            var previousArc = previousTileState.arc;
            tilePath = s.createTorusTilePath(arc, previousArc);
            createTorusTileSvgText(cX, cY, startAngle, endAngle, tileNo, previousArc, arc, tileId, tileGroupId, txtState);
        }

        if (isNotNull(tilePath)) {
            tileElement.setAttribute("d", tilePath);
        }
    }
    function createPieTileSvgText(cX, cY, r, startAngle, endAngle, tileNo, tileId, tileGroupId, txtState) {

        var textPathId = config.tileTextPathElementPrefix + tileId;
        var textPathDef = s.createPathElement(textPathId);
        var textPathStyle = config.tileStylePieTextPathElement;
        var angle = startAngle + u.round((endAngle - startAngle) / 2, 1);

        var lineEndX = cX;
        var lineEndY = cY - r;
        var linePath = null;
        if (tileNo > 4 && tileNo < 9) {
            linePath = s.createLinePath(lineEndX, lineEndY, cX, cY);
            textPathStyle = config.tileStyleInvertedPieTextPathElement;
        } else {
            linePath = s.createLinePath(cX, cY, lineEndX, lineEndY);
        }
        textPathDef.setAttribute("d", linePath);
        s.rotateElement(textPathDef, angle, cX, cY);

        txtState.sizeMultiplier = config.tileTextSizeMultiplier.pie;

        createTileTextElement(txtState, textPathDef, textPathId, tileGroupId, tileId, textPathStyle);
    }
    function createTorusTileSvgText(cX, cY, startAngle, endAngle, tileNo, previousArc, arc, tileId, tileGroupId, txtState) {
        var rd = previousArc.rX + (arc.rX - previousArc.rX) / 2.0;
        var tarc = s.createArc(cX, cY, rd, startAngle, endAngle);
        var iArc = s.invertArc(tarc);
        if (tileNo > 2 && tileNo < 7) {
            iArc = tarc;
        }
        var textPathId = config.tileTextPathElementPrefix + tileId;
        var arcPath = s.createArcPath(iArc);

        var textPathDef = s.createPathElement(textPathId);
        textPathDef.setAttribute("d", arcPath);

        var textPathStyle = config.tileStyleTorusTextPathElement;
        txtState.sizeMultiplier = config.tileTextSizeMultiplier.torus;

        createTileTextElement(txtState, textPathDef, textPathId, tileGroupId, tileId, textPathStyle);
    }
    function createTileTextElement(txtState, textPathDef, textPathId, tileGroupId, tileId, textPathStyle) {

        setElementAttributes(textPathDef, config.tileStyleTextPathDef);
        u.addFirstChildToParent(getSvg(), textPathDef);

        var textElement = s.createTextElement(config.tileTextElementPrefix + tileId);
        setElementAttributes(textElement, config.tileStyleTextElement);

        var textPathElemen = s.createTextPathElement(config.tileTextElementPathPrefix + tileId);
        textPathElemen.setAttribute("href", u.toCssIdQuery(textPathId));
        setElementAttributes(textPathElemen, textPathStyle);

        var textSpanElement = s.createTspanElement(config.tileTextSpanPrefix + tileId);
        setElementAttributes(textSpanElement, config.tileStyleTextSpan);

        var tnode = doc.createTextNode(EMPTY);

        textSpanElement.appendChild(tnode);
        textPathElemen.appendChild(textSpanElement);
        textElement.appendChild(textPathElemen);

        u.addChildToParentId(tileGroupId, textElement);

        var txt = EMPTY;
        var textSizeMultiplier = 1.0;
        if (!u.isObjectInstanceOf(TileText, txtState)) {
            txt = txtState.value;
            textSizeMultiplier = txtState.sizeMultiplier;
        }

        setTileText(txt, textPathDef, textSpanElement, textSizeMultiplier);
    }
    function setTileText(txt, textPath, textSpanElement, textSizeMultiplier) {
        if (isNull(textSpanElement) || isNull(textPath)) {
            return;
        }

        var textNode = textSpanElement;

        if (isNull(textNode)) {
            return;
        }

        var oldVal = textNode.textContent;
        var newVal = EMPTY;
        if (u.isString(txt) && EMPTY !== txt) {
            newVal = txt;
        }
        if (oldVal === newVal) {
            return;
        }

        var testValue = newVal;
        var len = testValue.length;
        if (len < config.tileTextMinLength) {
            var diff = config.tileTextMinLength - len;
            for (var i = 0; i < diff; i++) {
                testValue += SPACER;
            }
        }

        var pathLen = textPath.getTotalLength();
        var fontSizeMultiplier = textSizeMultiplier;

        var testElement = u.getElement(config.testTextElementId);
        testElement.textContent = testValue;

        var fs = 10;
        var fontSize = EMPTY + fs + "px";

        testElement.setAttribute("font-size", fontSize);
        var testTextLen = testElement.getComputedTextLength();

        if (0 === testTextLen) {
            testTextLen = pathLen;
        }

        var ratio = pathLen / testTextLen;

        fs *= ratio * fontSizeMultiplier;
        fs = Math.floor(fs);
        fontSize = EMPTY + fs + "px";

        log("setTileText: text: " + newVal + " pathLen: " + pathLen + " testTextLen: " + testTextLen + " ratio: " + ratio + " fontSize: " + fontSize);
        textNode.setAttribute("font-size", fontSize);
        textNode.textContent = newVal;
    }
    function getShapeStyle(shapeState) {
        if (isNull(shapeState)) {
            return null;
        }
        if (!shapeState.isVisible) {
            return config.shapeStyleInvisible;
        }
        return config.shapeStyleVisible;
    }
    function getTileTextStyle(tileState) {
        if (!tileState.isVisible) {
            return config.tileStyleTextElementInvisible;
        }

        if (isNotNull(tileState.txt)) {
            if (!tileState.txt.isVisible) {
                return config.tileStyleTextElementInvisible;
            }
        }

        return config.tileStyleTextElement;
    }
    function getInstructionsTextStyle(textState) {
        if (!textState.isVisible) {
            return config.textStyleInvisible;
        }

        return config.textStyleVisible;
    }
    function getTileStyle(tileState) {
        if (isNull(tileState)) {
            return null;
        }

        if (tileState.isPlaying) {
            return config.tileStylePlaying;
        }

        if (tileState.isPlayingNext) {
            return config.tileStylePlayingNext;
        }

        if (tileState.isPlayed) {
            return config.tileStylePlayed;
        }

        if (!tileState.isVisible) {
            return config.tileStyleInvisible;
        }

        if (tileState.isSelected) {
            return config.tileStyleSelected;
        }

        if (!tileState.isActive) {
            return config.tileStyleInActive;
        }

        return config.tileStyleActive;
    }
    function modifyFillOnClickCount(tileObj, tileState) {
        if (!tileState.isActive || tileState.isSelected) {
            return;
        }
        var fill = FILL_ACTIVE;
        var clickCount = tileState.clickCount;
        if (clickCount <= 0) {
            return;
        }
        var mod = getTileFillMod(tileState);
        // config.colModPerClick * clickCount;
        log("fill before: " + fill);
        fill = u.modColour(fill, mod);
        log("fill after: " + fill + " clickCount: " + clickCount);
        tileObj.setAttribute(ATTR_FILL, fill);
    }
    function getTileFillMod(tileState) {
        var tileCount = tileState.clickCount;
        var mod = config.colModPerClick * tileCount;
        if(isNull(tileState)) {
            return mod;
        }
        var rowCol = getTileRowCol(tileState.id);
        if(isNull(rowCol)) {
            return mod;
        }
        
        var row = rowCol.x;
        var col = rowCol.y;
        var clickCounts = getRowClickCounts(row);
        if(isNull(clickCounts)) {
            return mod;
        }
        var nonZeroArr = u.arrSortedNonZeroElem(clickCounts);
        if(nonZeroArr.length < 1) {
            return mod;
        }
        var maxMod = config.maxColModPerClick;
        var minMod = 0;
        var maxVal = nonZeroArr[0];
        var minVal = 0;
        var mod = u.mapRange(tileCount, minVal, maxVal, minMod, maxMod);

        log("getTileFillMod: mod: " + mod);
        return mod;
    }
    function getRowClickCounts(row) {
        var clickCounts = u.initArray(state.tiles[0].length, 0);
        if(row < 0 || row >= state.tiles.length) {
            return clickCounts;
        }
        var rows = state.tiles[row];
        for (var j = 0; j < rows.length; j++) {
            var tileState = state.tiles[row][j];
            clickCounts[j] = tileState.clickCount;
        }
        return clickCounts;
    }
    function getMinMaxRowClickCount() {
    }
    function onTileClick() {
        log("onTileClick: ");
    }
    function onPointerDown() {
        log("onPointerDown:");
    }
    function onMouseUp(event) {
        log("onMouseUp:");
        if (isTouch) {
            return;
        }
        // event.preventDefault();
        onElementSelected(this);
    }
    function onTouchEnd(event) {
        log("onTouchEnd:");
        // event.preventDefault();
        onElementSelected(this);
    }
    function onPointerEnter(event) {
        if (isTouch) {
            return;
        }
        onElementPointerEntry(this);
    }
    function onPointerLeave(event) {
        if (isTouch) {
            return;
        }
        onElementPointerExit(this);
    }
    function onButtonClick(event) {
        log("onButtonClick:");
        // event.preventDefault();
        if (isNull(event) || isNull(event.target) || isNull(event.target.id)) {
            return;
        }

        var btnId = event.target.id;
        switch (btnId) {
            default:
        }
    }
    function onElementPointerEntry(selectedObj) {
        if (!u.isObject(selectedObj)) {
            return null;
        }

        var tile = selectedObj;
        var elementId = selectedObj.id;
        // log("onPointerEntry: " + elementId);

        if (isTileGroupId(elementId)) {
            elementId = getTileIdFromGroupId(elementId);
            tile = u.getElement(elementId);
        } else if (isTileTextId(elementId)) {
            elementId = getTileIdFromTextId(elementId);
            tile = u.getElement(elementId);
        }

        if (!isTileId(elementId)) {
            log("getTileState: invalid tile id: " + elementId);
            return null;
        }

        setElementAttributes(tile, config.tileStyleOnPonterEntry);
    }
    function onElementPointerExit(selectedObj) {
        if (!u.isObject(selectedObj)) {
            return;
        }

        // log("onPointerLeave: " + selectedObj.id);

        var tile = getTileObject(selectedObj);
        if (isNull(tile)) {
            return;
        }

        var tileState = getTileState(tile)
        if (isNull(tileState)) {
            log("onPointerLeave: invalid selected tile");
            return;
        }

        setTileStyle(tileState, tile);
    }
    function onElementSelected(selectedObj) {
        if (!a.isReady()) {
            initAudio();
        }             

        var tileState = getTileState(selectedObj);
        if (isNull(tileState)) {
            log("processSelectedTile: invalid selected tile");
            return;
        }
        onTileSelected(tileState);
    }
    function onTileSelected(tileState) {
        playSelectedTileAudio(tileState);

        var tileId = tileState.id;
        if (!tileState.isActive && tileState.isVisible) {
            var rowColPoint = getTileRowCol(tileId);
            var tileCircleState = state.tileCircles[rowColPoint.x];
            var tweens = tileCircleState.tweens;
            for (var i = 0; i < tweens.length; i++) {
                var tween = tweens[i];
                playOrRestartTween(tween);
            }
            return;
        }

        if (tileState.isPlaying || tileState.isPlayingNext || tileState.isPlayed) {
            return;
        }

        if (tileId !== state.selectedTileId) {
            if (isNotNull(state.selectedTileId)) {
                var rowColPoint = getTileRowCol(state.selectedTileId);
                var prevSelectedState = state.tiles[rowColPoint.x][rowColPoint.y];
                prevSelectedState.isSelected = false;
                var prevSelectedObj = u.getElement(state.selectedTileId);
                setTileStyle(prevSelectedState, prevSelectedObj);
            }
        }

        tileState.isSelected = !tileState.isSelected;
        state.selectedTileId = tileId;
        var tileObj = u.getElement(tileId);
        setTileStyle(tileState, tileObj);

        var evParams = {};
        evParams[EVENT_PARAM_ELEMENT_ID] = tileState.id;
        evParams[EVENT_PARAM_SELECTED] = tileState.isSelected;
        n.sendEvent(EVENT_ELEMENT_SELECTED, evParams);
    }
    function playSelectedTileAudio(tileState) {
        if(!state.isPlaySpeechSynthOnClick || !a.isSpeachReady() || !u.isString(state.speechText)) {
            return;
        }
        playSpeechText(state.speechText, state.speechVoice, state.speechIsInterrupt, tileState);
    }
    function onWindowResize(event) {
        if (!u.isObject(this)) {
            return null;
        }
        displayInstructions();
    }
    function getTileRowCol(tileId) {
        if (isNull(tileId)) {
            return null;
        }
        if (!u) {
            logError("getTileRowCol: invalid zsUtil");
            return null;
        }

        var tileInfo = u.replace(tileId, config.tilePrefix, EMPTY);
        var tileInfoArr = tileInfo.split(config.elementIdDelimiter);
        if (!u.isArray(tileInfoArr) || tileInfoArr.length !== 2) {
            log("getTileState: invalid tile info: " + tileInfo);
            return null;
        }

        var row = u.toInt(tileInfoArr[0]) - 1;
        var column = u.toInt(tileInfoArr[1]) - 1;
        return u.createPoint(row, column);
    }

    function getTileObject(element) {
        if (!u.isObject(element)) {
            return null;
        }
        var elementId = element.id;

        if (isTileId(elementId)) {
            return element;
        }

        if (isTileGroupId(elementId)) {
            elementId = getTileIdFromGroupId(elementId);
        } else if (isTileTextId(elementId)) {
            elementId = getTileIdFromTextId(elementId);
        }

        if (isNull(elementId)) {
            return null;
        }

        return u.getElement(elementId);
    }
    function getTileState(element) {
        if (!u.isObject(element)) {
            return null;
        }

        var elementId = element.id;
        if (isTileGroupId(elementId)) {
            elementId = getTileIdFromGroupId(elementId);
        } else if (isTileTextId(elementId)) {
            elementId = getTileIdFromTextId(elementId);
        }

        return getTileIdState(elementId);
    }
    function getTileIdState(elementId) {
        if (!isTileId(elementId)) {
            log("getTileState: invalid tile id: " + elementId);
            return null;
        }

        var rowColPoint = getTileRowCol(elementId);
        if (isNull(rowColPoint)) {
            return null;
        }
        return state.tiles[rowColPoint.x][rowColPoint.y];
    }
    function isTileId(id) {
        if (isNull(id) || !u.isString(id)) {
            return false;
        }
        return u.startsWith(id, config.tilePrefix);
    }
    function isCircleGroupId(id) {
        if (isNull(id) || !u.isString(id)) {
            return false;
        }
        return u.startsWith(id, config.tileCircleGroupPrefix);
    }
    function isTileTextId(id) {
        if (isNull(id) || !u.isString(id)) {
            return false;
        }
        return u.startsWith(id, config.tileTextElementPrefix);
    }
    function isTileGroupId(id) {
        if (isNull(id) || !u.isString(id)) {
            return false;
        }
        return u.startsWith(id, config.tileGroupPrefix);
    }
    function getTileIdFromTextId(id) {
        if (isNull(id) || !u.isString(id)) {
            return false;
        }
        var tileId = id.substring(config.tileTextElementPrefix.length, id.length);
        if (!isTileId(tileId)) {
            return null;
        }
        return tileId;
    }
    function getTileIdFromGroupId(id) {
        if (isNull(id) || !u.isString(id)) {
            return false;
        }
        var tileId = id.substring(config.tileGroupPrefix.length, id.length);
        if (!isTileId(tileId)) {
            return null;
        }
        return tileId;
    }
    function getCircleGroup(id) {
        if (isNull(id) || !u.isString(id)) {
            return false;
        }
        var groupId = id.substring(config.tileCircleGroupPrefix.length, id.length);
        var groupIdIndex = u.toInt(groupId) - 1;
        if (groupIdIndex < 0 || groupIdIndex >= state.tileCircles.length) {
            logError("getCircleGroupIndexFromId: Invalid circle group index: " + groupIdIndex);
            return;
        }
        return state.tileCircles[groupIdIndex];
    }
    function setTileStyleText(tileState, tileObj) {
        if (isNull(tileState) || isNull(tileObj)) {
            return;
        }

        var tileId = tileObj.id;
        var textPathId = config.tileTextPathElementPrefix + tileId;
        var textPath = u.getElement(textPathId);
        if (isNull(textPath)) {
            return;
        }

        var textElementId = config.tileTextElementPrefix + tileId;
        var textElement = u.getElement(textElementId);
        if (isNull(textElement)) {
            return;
        }

        var txtState = EMPTY;
        if (!isNull(tileState) && !isNull(tileState.txt)) {
            txtState = tileState.txt;
        }

        var tspanElementId = config.tileTextSpanPrefix + tileId;
        var tspanElement = u.getChildElement(textElement, u.toCssIdQuery(tspanElementId));
        if (isNull(tspanElement)) {
            return;
        }

        var txt = EMPTY;
        var textSizeMultipler = 1.0;
        if (!u.isObjectInstanceOf(TileText, txtState)) {
            txt = txtState.value;
            textSizeMultipler = txtState.sizeMultiplier;
        }

        setTileText(txt, textPath, tspanElement, textSizeMultipler);
    }
    function setTileStyle(tileState, tileObj) {
        var tileStyle = getTileStyle(tileState);
        setElementAttributes(tileObj, tileStyle);

        modifyFillOnClickCount(tileObj, tileState);

        var tileTextElementId = config.tileTextElementPrefix + tileState.id;
        var tileTextElement = u.getElement(tileTextElementId);
        if (isNull(tileTextElement)) {
            return;
        }

        var tileTextStyle = getTileTextStyle(tileState);
        setElementAttributes(tileTextElement, tileTextStyle);
    }
    function setShapeStyle(shapeState, shapeId) {
        var shapeStyle = getShapeStyle(shapeState);
        var shape = u.getElement(shapeId);
        setElementAttributes(shape, shapeStyle);
    }
    function createRotateAroundSvgCentre(objId, dur, angle) {
        if (isNull(objId)) {
            logError("rotate: Invalid objectId: " + objId);
            return;
        }

        return gsap.to(u.toCssIdQuery(objId), {
            duration: dur,
            rotation: angle,
            svgOrigin: (EMPTY + config.centre.x + BLANK + config.centre.y),
            onComplete: onAnimationComplete,
            onCompleteParams: [objId],
            paused: true
        });
    }
    function createDissolve(objId, dur) {
        if (isNull(objId)) {
            logError("dissolve: Invalid objectId: " + objId);
            return;
        }

        return gsap.to(u.toCssIdQuery(objId), {
            duration: dur,
            opacity: 0,
            onComplete: onAnimationComplete,
            onCompleteParams: [objId],
            paused: true
        });
    }
    function getRandomPointInsideCircle(xc, yc, rc) {
        if (!u) {
            logError("getRandomPointInsideCircle: invalid zsUtil");
            return null;
        }

        var a = 2 * Math.PI * Math.random();
        var r = Math.sqrt(Math.random());
        var x = (rc * r) * Math.cos(a) + xc;
        var y = (rc * r) * Math.sin(a) + yc;

        return u.createPoint(x, y);
    }
    function onShapeTimelineComplete(shapeState) {
        log("onShapeTimelineComplete: progress: " + shapeState.gsapTimeline.progress());
        // shapeState.gsapTimeline.totalDuration(20);
        // shapeState.gsapTimeline.reverse();
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
                runAudioBuffer(actionId, params);
                break;
            case 'granulator':
                runAudioGranulator(actionId, params);
            case 'speechSynth':
                runSpeechSynth(actionId, params);    
                break;
        }
    }
    function runAudioBuffer(actionId, params) {
        if (!u.isString(actionId)) {
            return;
        }

        switch (actionId) {
            case 'play':
                runAudioPlayBuffer(params);
                break;
            default:
                logError("runAudioBuffer: Unknown actionId: " + actionId);
                return;
        }
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
                updateGranulatorCofig(params);
                break;
            case 'rampLinear':
                runAudioGranulatorRampLinear(params);
                break;
            case 'rampSin':
                runAudioGranulatorRampSin(params);
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
    function updateGranulatorCofig(params) {
        if (isNull(a)) {
            logError("runAudioPlayGranulator: Invalid zsAudio lib");
            return;
        }
        if (!u.isObject(params)) {
            return;
        }
        a.setGranulatorConfig(params);
    }
    function runSpeechSynth(actionId, params) {
        if (!u.isString(actionId)) {
            return;
        }

        switch (actionId) {
            case 'play':
                runPlaySpeechSynth(params);
                break;
            case 'stop':
                runStopSpeechSynth(params);
                break;
            case 'config':
                updateSpeechCofig(params);
            case 'state':
                setSpeechState(params);                
                break;
            default:
                logError("runSpeechSynth: Unknown actionId: " + actionId);
                return;
        }
    }
    function runPlaySpeechSynth(params) {
        if (isNull(a)) {
            logError("runPlaySpeechSynth: Invalid zsAudio lib");
            return;
        }
        if (isNull(params)) {
            logError("runPlaySpeechSynth: Invalid params");
            return;
        }
        var text = EMPTY;
        var voiceName = "random";
        var isInterrupt = false;

        if (!isNull(params.text)) {
            text = params.text;
        }
        if (!isNull(params.voiceName)) {
            voiceName = params.voiceName;
        }
        if (!isNull(params.isInterrupt)) {
            isInterrupt = params.isInterrupt;
        }
        var tileId = state.playingTileId;
        if(isNull(tileId)) {
           tileId = state.selectedTileId;
        }
        
        var selectedTileState = getTileIdState(tileId);

        playSpeechText(text, voiceName, isInterrupt, selectedTileState);
    }
    function playSpeechText(text, voice, isInterrupt, tileState) {
        if(isNull(text)) {
            return;
        }
        if(u.contains(text, TILE_TEXT_TOKEN)) {
            var tileText = null;
            if(!isNull(tileState)) {
                tileText = tileState.txt;
            }
            if(u.isString(tileText)) {
                text = u.replace(text, TILE_TEXT_TOKEN, tileText);
            } else {
                text = u.replace(text, TILE_TEXT_TOKEN, EMPTY);
            }
        }        
        a.speak(text, voice, isInterrupt);
    }
    function runStopSpeechSynth(params) {
        if (isNull(a)) {
            logError("runStopSpeechSynth: Invalid zsAudio lib");
            return;
        }
        a.stopSpeach();
    }
    function updateSpeechCofig(params) {
        if (isNull(a)) {
            logError("updateSpeechCofig: Invalid zsAudio lib");
            return;
        }
        a.setSpeechConfig(params);
    }
    function setSpeechState(params) {
        if (!u.isObject(params)) {
            logError("setSpeechState: Invalid params");
            return;
        }
        if (!isNull(params.isPlaySpeechSynthOnClick)) {
            state.isPlaySpeechSynthOnClick = params.isPlaySpeechSynthOnClick;
        }
        if (!isNull(params.speechText)) {
            state.speechText = params.speechText;
        }
    }
    function runAudioPlayBuffer(params) {
        if (isNull(a)) {
            logError("runAudioPlayGranulator: Invalid zsAudio lib");
            return;
        }
        if (!u.isObject(params)) {
            return;
        }

        var bufferIndex = 0;
        if (!isNull(params.index)) {
            if (u.isString(params.index)) {
                bufferIndex = u.toInt(params.index);
            } else if (u.isNumeric(params.index)) {
                bufferIndex = params.index;
            }
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
    function rotate(actionId, targets, params) {
        if (u.isArray(targets)) {
            for (var i = 0; i < targets.length; i++) {
                runRotate(actionId, targets[i], params);
            }
        } else {
            runRotate(actionId, targets, params);
        }
    }
    function runRotate(actionId, target, params) {
        if (!u.isString(actionId) || !u.isObject(params)) {
            return;
        }

        log("rotate: " + target);

        switch (actionId) {
            case 'start':
                runRotateStart(target, params);
                break;
            case 'reset':
                runRotateReset(target, params);
                break;
            default:
                logError("Unknown rotate actionId: " + actionId);
                return;
        }
    }
    function runRotateStart(target, params) {
        var dur = 0;
        var angle = 360;
        if (!isNull(params.duration)) {
            dur = params.duration;
        }
        if (!isNull(params.angle)) {
            angle = params.angle;
        }

        var tween = null;
        if (isTileId(target)) {
            var tGroupId = config.tileGroupPrefix + target;
            var tile = u.getElement(target);
            var tweens = getObjectTweens(tile);
            if (u.isArray(tweens) && tweens.length > 0) {
                tween = tweens[0];
            } else {
                tween = createRotateAroundSvgCentre(tGroupId, dur, angle);
                tweens.push(tween);
            }
        } else if (isCircleGroupId(target)) {
            var tileCircleState = getCircleGroup(target);
            if (!isNull(tileCircleState)) {
                var circleTweens = tileCircleState.tweens;
                tween = circleTweens;
                if (u.isArray(circleTweens)) {
                    tween = circleTweens[0];
                }
            }
        }

        playOrRestartTween(tween);
    }
    function runRotateReset(target, params) {
        if (!u.isString(target)) {
            return;
        }
        if (isTileId(target)) {
            var tile = u.getElement(target);
            var tweens = getObjectTweens(tile);
            if (u.isArray(tweens) && tweens.length > 0) {
                var tween = tweens[0];
                if (!isNull(tween)) {
                    tween.pause(0);
                }
            }
        }

        if (config.all === target.toUpperCase()) {
            state.tiles
        }
    }
    function dissolve(actionId, targets, params) {
        if (u.isArray(targets)) {
            for (var i = 0; i < targets.length; i++) {
                runDissolve(actionId, targets[i], params);
            }
        } else {
            runDissolve(actionId, targets, params);
        }
    }
    function runDissolve(actionId, target, params) {
        if (!u.isString(actionId) || !u.isObject(params)) {
            return;
        }

        log("runDissolve: " + target);

        switch (actionId) {
            case 'start':
                runDissolveStart(target, params);
                break;
            default:
                logError("Unknown dissolve actionId: " + actionId);
                return;
        }
    }
    function runDissolveStart(target, params) {
        var dur = 0;
        if (!isNull(params.duration)) {
            dur = params.duration;
        }

        var tween = null;
        if (isTileId(target)) {
            var tGroupId = config.tileGroupPrefix + target;
            tween = createDissolve(tGroupId, dur);
        }

        playOrRestartTween(tween);
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
                runResetAll(target, params);
                break;
            case 'elements':
                resetElements(target, params);
                break;
            default:
                logError("Unknown reset actionId: " + actionId);
                return;
        }
    }
    function runResetAll(target, params) {
        if (!u.isString(target)) {
            return;
        }
        switch (target) {
            case 'tiles':
                resetTiles();
                break;
            case 'shapes':
                resetShapes();
                break;
            case 'elements':
                resetAll();
                break;
            case 'granulator':
                resetGranulator();
                break;
            default:
                logError("Unknown reset target: " + target);
                return;
        }
    }
    function resetElements(target, params) {
        if (isTileId(target)) {
            resetTileState(getTileIdState(elementId));
            return;
        }

        switch (target) {
            case "centreShape":
                return resetShape(state.centreShape);
            case "innerCircle":
                return resetShape(state.innerCircle);
            case "outerCircle":
                return resetShape(state.outerCircle);
            case "zoom":
                return resetZoom();
            default:
                log("resetElements: unknown target: " + target);
        }
    }
    function processZoomLevel(zoomLevel) {
        if (isNull(zoomLevel)) {
            return;
        }
        zoomTarget(zoomLevel);
    }
    function zoomTarget(target) {
        var svg = getSvg();
        if (isNull(svg)) {
            log("zoom: invalid canvas");
            return;
        }

        log("zoomTarget: " + target);
        var vBox = getVBox(target);
        gsap.to(svg, { attr: { viewBox: vBox }, ease: "power3.out", duration: config.zoomDuration })
    }
    function processInstructions(instructions) {
        setInstructions(instructions.line1, instructions.line2, instructions.line3, instructions.colour, instructions.isVisible);
    }
    function getVBox(target) {
        if (!u.isString(target)) {
            target = "default";
        }
        switch (target) {
            case "centreShape":
                return "660 660 204 204";
            case "innerCircle":
                return "471 471 582 582";
            case "outerCircle":
            default:
                return "0 0 1525 1525";
        }
    }
    function runTimeline(actionId, target, params) {
        if (!u.isString(target) || !u.isString(actionId)) {
            return;
        }
        log("runTimeline: " + target);
        var tl = null;
        switch (target) {
            case "centreShape":
                tl = state.centreShape.gsapTimeline;
                break;
            case "innerCircle":
                tl = state.innerCircle.gsapTimeline;
                break;
            case "outerCircle":
                tl = state.outerCircle.gsapTimeline;
                break;
            default:
                logError("runTimeline: invalid target: " + target);
                return;
        }

        switch (actionId) {
            case "start":
                startTimeline(tl, params);
                break;
            case "stop":
                stopTimeline(tl);
                break;
            case "end":
                endTimeline(tl);
                break;
            case "reset":
                resetTimeline(tl);
                break;
            case "reverse":
                reverseTimeline(tl);
                break;
            default:
                logError("runTimeline: invalid actionId: " + actionId);
                return;
        }
    }
    function getSvg() {
        return u.getElement("svgCanvas");
    }
    function startTimeline(timeline, params) {
        if (isNull(timeline)) {
            logError("startTimeline: invalid timeline");
            return;
        }

        if (!isNull(params)) {
            if (!isNull(params.duration)) {
                var dur = params.duration;
                timeline.totalDuration(dur);
            }
        }

        var progress = timeline.progress();
        if (progress > 0) {
            timeline.restart();
        } else {
            timeline.play();
        }
    }
    function stopTimeline(timeline) {
        if (isNull(timeline)) {
            logError("stopTimeline: invalid timeline");
            return;
        }
        timeline.pause();
    }
    function endTimeline(timeline) {
        if (isNull(timeline)) {
            logError("endTimeline: invalid timeline");
            return;
        }
        timeline.pause(1);
    }
    function resetTimeline(timeline) {
        if (isNull(timeline)) {
            logError("stopTimeline: invalid timeline");
            return;
        }
        timeline.pause(0);
    }
    function reverseTimeline(timeline) {
        if (isNull(timeline)) {
            logError("reverseTimeline: invalid timeline");
            return;
        }

        timeline.reverse();
    }
    function onAnimationComplete(rotationObjId) {
        var obj = u.getElement(rotationObjId);
        // log("onAnimationComplete: " + rotationObjId);
    }
    function getObjectTweens(obj) {
        if (!u.isObject(obj)) {
            return [];
        }
        if (isTileId(obj.id)) {
            var tileState = getTileState(obj);
            return tileState.tweens;
        }
        return gsap.getTweensOf(obj)
    }
    function setObjectVisibility(obj, isVisible) {
        if (isNull(obj)) {
            return;
        }
        var vis = "hidden";
        if (isVisible) {
            vis = "visible";
        }
        setElementAttributes(obj, { "visibility": vis });
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
    function onServerEventReceived(event) {
        if (isNull(event)) {
            return;
        }
        if (isNotNull(event.data)) {
            var serverState = u.parseJson(serverData);
            processSeverState(serverState);
        }

    }
    function processSeverState(serverState) {
        if (isNull(serverState)) {
            return;
        }
        if (isNotNull(serverState.tiles)) {
            processSeverTilesState(serverState.tiles);
        }
        if (isNotNull(serverState.centreShape)) {
            processSeverShapeState(serverState.centreShape, state.centreShape, 'centreShape');
        }
        if (isNotNull(serverState.innerCircle)) {
            processSeverShapeState(serverState.innerCircle, state.innerCircle, 'innerCircle');
        }
        if (isNotNull(serverState.outerCircle)) {
            processSeverShapeState(serverState.outerCircle, state.outerCircle, 'outerCircle');
        }
        if (isNotNull(serverState.actions)) {
            processSeverActions(serverState.actions);
        }
        if (isNotNull(serverState.zoomLevel)) {
            processZoomLevel(serverState.zoomLevel);
        }
        if (isNotNull(serverState.instructions)) {
            processInstructions(serverState.instructions);
        }
    }
    function processSeverShapeState(serverShapeState, clientShapeState, shapeId) {
        if (isNull(serverShapeState) || isNull(clientShapeState)) {
            return;
        }

        clientShapeState.isVisible = serverShapeState.isVisible;
        setShapeStyle(clientShapeState, shapeId);
    }
    function processSeverTilesState(serverTileStates) {
        if (!u.isArray(serverTileStates) || !u.isArray(serverTileStates[0])) {
            return;
        }

        var toUpdate = [];
        for (var i = 0; i < serverTileStates.length; i++) {
            var columns = serverTileStates[i];
            for (var j = 0; j < columns.length; j++) {
                var serverTile = serverTileStates[i][j];
                var clientTileState = state.tiles[i][j];
                var serverId = serverTile.id;
                var clientId = clientTileState.id;
                if (serverId !== clientId) {
                    logError("processSeverTilesState: Server id " + serverId + "and client id " + clientId + "not identical")
                    continue;
                }
                var serverTileState = serverTile.state;
                var serverTileText = serverTile.tileText;
                var clientText = clientTileState.txt;
                if (!areTileStatesEqual(clientTileState, serverTileState) || !areTileTextsEqual(clientText, serverTileText)) {
                    clientTileState.isActive = serverTileState.isActive;
                    clientTileState.isVisible = serverTileState.isVisible;
                    clientTileState.isPlaying = serverTileState.isPlaying;
                    clientTileState.isPlayingNext = serverTileState.isPlayingNext;
                    clientTileState.isPlayed = serverTileState.isPlayed;
                    clientTileState.clickCount = serverTileState.clickCount;

                    clientText.value = serverTileText.value;
                    clientText.isVisible = serverTileText.isVisible;

                    toUpdate.push(clientTileState);
                }
            }
        }
        log("Have " + toUpdate.length + " tile changes");
        for (var i = 0; i < toUpdate.length; i++) {
            var tileState = toUpdate[i]
            var tileObj = u.getElement(tileState.id);
            // log("updating tile " + tileState.id);
            setTileStyle(tileState, tileObj);
            setTileStyleText(tileState, tileObj);
            if(tileState.isPlaying) {
                state.playingTileId = tileState.id;
            }
        }
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
            case "ACTIVATE":
            case "ANIMATION":
            case "DEACTIVATE":
            case "VISIBLE":
            case "INVISIBLE":
                makeInvisible(elementIds);
                break;
            case "ZOOM":
                zoom(elementIds);
                break;
            case "TIMELINE":
                timeline(id, elementIds, params);
                break;
            case "ROTATE":
                rotate(id, elementIds, params);
                break;
            case "DISSOLVE":
                dissolve(id, elementIds, params);
                break;
            case "AUDIO":
                audio(id, elementIds, params);
                break;
            case "RESET":
                reset(id, elementIds, params);
                break;
        }
    }
    function makeInvisible(elementIds) {
        if (isNull(elementIds)) {
            return;
        }
        if (u.isArray(elementIds)) {
            for (var i = 0; i < elementIds.length; i++) {
                makeElementInvisible(elementIds[i]);
            }
        } else {
            makeElementInvisible(elementIds);
        }
    }
    function makeElementInvisible(elementId) {
        if (isNull(elementId)) {
            return;
        }
        var element = u.getElement(elementId);
        if (isTileId(elementId)) {
            var tileState = getTileState(element);
            if (isNull(tileState)) {
                return;
            }
            tileState.isVisible = false;
            setTileStyle(tileState, element);
        }
    }
    function areTileStatesEqual(tileState1, tileState2) {
        if (isNull(tileState1) || isNull(tileState2)) {
            return false;
        }
        if (tileState1.id !== tileState2.id) {
            return false;
        }

        return (tileState1.isSelected === tileState2.isSelected &&
            tileState1.isVisible === tileState2.isVisible &&
            tileState1.isActive === tileState2.isActive &&
            tileState1.isPlaying === tileState2.isPlaying &&
            tileState1.isPlayingNext === tileState2.isPlayingNext &&
            tileState1.clickCount === tileState2.clickCount &&
            tileState1.isPlayed === tileState2.isPlayed)
    }
    function areTileTextsEqual(tileText1, tileText2) {
        if (isNull(tileText1) || isNull(tileText2)) {
            return false;
        }

        return (tileText1.isVisible === tileText2.isVisible &&
            tileText1.value === tileText2.value)
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
        createSvgTile: createSvgTile,
        initTiles: initTiles,
        setTileText: setTileText,
    }
}(zsUtil, zsNet, zsSvg, zsAudio, window, document));