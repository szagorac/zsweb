var zscore = (function () {
    'use strict';

    var isTouch = isTouchDevice();
    var screenLogElement = null;
    var webQueue = null;
    var sseSource = null;
    // INIT on window load
    listen("load", window, onLoad);

    // ---------  MODEL -----------
    var state = {
        tiles: [],
        tileCircles: [],
        centreShape: { isVisible: false, gsapTimeline: {} },
        innerCircle: { isVisible: false, gsapTimeline: {} },
        outerCircle: { isVisible: false, gsapTimeline: {} },
        selectedTileId: null,
    }
    var config = {
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
        elementIdDelimiter: "-",
        svgArcs: [null, null, null, null, null, null, null, null],
        gridParentId: "grid",
        gridStyle: { "fill": "none", "stroke": "aqua", "stroke-width": "2px" },
        svgNameSpace: "http://www.w3.org/2000/svg",
        tilesParentId: "tiles",
        tileStyleVisible: { "fill": "white", "stroke": "silver", "stroke-width": "2px", "pointer-events": "all", "visibility": "visible", "opacity": 1},
        tileStyleActive: { "fill": "lavenderblush", "stroke": "silver", "stroke-width": "2px", "pointer-events": "all", "visibility": "visible", "opacity": 1},
        tileStyleInActive: { "fill": "white", "stroke": "silver", "stroke-width": "2px", "pointer-events": "all", "visibility": "visible", "opacity": 1},
        tileStyleInvisible: { "visibility": "hidden" },
        tileStyleOnPonterEntry: { "fill": "lightblue" },
        tileStyleSelected: { "fill": "paleturquoise", "stroke": "silver", "stroke-width": "2px", "visibility": "visible", "opacity": 1},
        tileStylePlayed: { "visibility": "hidden" },
        tileStylePlaying: { "fill": "lavenderblush", "stroke": "aqua", "stroke-width": "1px", "visibility": "visible", "opacity": 1},
        tileStylePlayingNext: { "fill": "lightgreen", "stroke": "silver", "stroke-width": "2px", "visibility": "visible", "opacity": 1},
        tileStyleTextPath: { "fill": "none", "stroke": "none"},
        tileStyleTextElement: { "dominant-baseline": "middle", "visibility": "visible", "opacity": 1},
        tileStyleTextElementInvisible: { "visibility": "hidden"},
        tileStyleTextElementPath: { "startOffset": "10%", "fill": "none", "stroke": "black", "font-family": "Courier New"},
        tileText: ["Democracy", "God", "Myself", "Maradona", "Messi", "Boris", "Jeremy", "Tito"],
        shapeStyleInvisible: { "visibility": "hidden" },
        shapeStyleVisible: { "visibility": "visible" },
        shapeTimelineDuration: 60,
        screenLogElementId: "appTxt",
        appUrlHttp: "/htp",
        appUrlSse: "/sse",
        zoomDuration: 3,
        all: "ALL",
    }

    if (!Array.isArray) {
        Array.isArray = function (arg) {
            return Object.prototype.toString.call(arg) === '[object Array]';
        };

    }
    function SvgArc(startX, startY, rX, rY, xAxisRotation, largeArcFlag, sweepFlag, endX, endY) {
        this.startX = startX;
        this.startY = startY;
        this.rX = rX;
        this.rY = rY;
        this.xAxisRotation = xAxisRotation;
        this.largeArcFlag = largeArcFlag;
        this.sweepFlag = sweepFlag;
        this.endX = endX;
        this.endY = endY;
    }

    function TileText(value, isVisible) {
        this.value = value;
        this.isVisible = isVisible;
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

    function Point(x, y) {
        this.x = x;
        this.y = y;
    }

    function Event(id, time) {
        this.id = id;
        this.time = time;
        this.propertyBag = {};
    }
    Event.prototype.addParam = function (name, value) {
        if (isNull(name)) {
            logError("Event addParam: invalid name")
            return;
        }
        this.propertyBag[name] = value;
    };

    function Queue() {
        this.data = [];
    }
    Queue.prototype.add = function (record) {
        this.data.unshift(record);
    }
    Queue.prototype.remove = function () {
        return this.data.pop();
    }
    Queue.prototype.first = function () {
        return this.data[0];
    }
    Queue.prototype.last = function () {
        return this.data[this.data.length - 1];
    }
    Queue.prototype.size = function () {
        return this.data.length;
    }

    // ---------  API -----------
    function onLoad() {
        log("onLoad: ");
        init();
    }
    function init() {
        log("init: ");
        webQueue = new Queue();
        initSse();
        initButtons();
        initTiles()
        initShapes();
        // createGrid();
        createTiles();
        getServerState();
    }
    function resetAll() {
        resetTiles();
        resetShapes();
        resetZoom();
    }
    function initButtons() {
        var btn = getElement("testBtn");
        if (!isNull(btn)) {
            listen('click', btn, onButtonClick);
        }

        btn = getElement("startBtn");
        if (!isNull(btn)) {
            listen('click', btn, onButtonClick);
        }
        var txt = getScreenLogElement();
        if (!isNull(txt)) {
            screenLogElement = txt;
            logOnScreen("Is touch device: " + isTouch);
        }
    }
    function initTiles() {
        var isSelected = false;
        var isActive = false;
        var isVisible = true;
        var isPlaying = false
        var isPlayingNext = false;
        var isPlayed = false;
        var clickCount = 0;
        var txt = new TileText('', false);
        var initalTileState = new TileState(null, isSelected, isActive, isVisible, isPlaying, isPlayingNext, isPlayed, clickCount, null, txt);
        state.tiles = init2DArray(8, 8, initalTileState);

        var initialTileCircleState = new TileCircleState(null);
        state.tileCircles = initArray(8, initialTileCircleState);

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
        tileState.isSelected = false;
        tileState.isActive = false;
        tileState.isVisible = true;
        tileState.isPlaying = false
        tileState.isPlayingNext = false;
        tileState.isPlayed = false;
        tileState.clickCount = 0;
        tileState.txt.value = '';
        tileState.txt.isVisible = false;
        for (var z = 0; z < tileState.tweens.length; z++) {
            var tween = tileState.tweens[z];
            if(!isNull(tween)) {
                tween.pause(0);
            }
        }
        var tileObj = getElement(tileState.id);
        setTileStyle(tileState, tileObj);
    }
    function resetShapes() {
        resetShape(state.centreShape);
        resetShape(state.innerCircle);
        resetShape(state.outerCircle);
    }
    function resetShape(shapeState) {
        shapeState.isVisible = false;
        if(isFunction(shapeState.gsapTimeline.pause)) {
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
            var circleElement = createSvgCircle(centre.x, centre.y, radius, i + 1);
            addChildToParentId(config.gridParentId, circleElement);
        }
    }
    function createLines() {
        var arr = config.lineAngles;
        var centre = config.centre;
        var lineEnd = config.lineEnd;

        for (var i = 0; i < arr.length; i++) {
            var angle = arr[i];
            createSvgLine(centre.x, centre.y, lineEnd.x, lineEnd.y, angle, i + 1);
        }
    }
    function initShapes() {            
        initShape("centreShape", state.centreShape, config.shapeTimelineDuration, config.circleRadii[1])
        initShape("innerCircle", state.innerCircle, config.shapeTimelineDuration, config.circleRadii[4])
        initShape("outerCircle", state.outerCircle, config.shapeTimelineDuration, config.circleRadii[7])
    }
    function initShape(shapeId, shapeState, dur, radius) {
        var timeline = gsap.timeline({paused: true, ease: "power4.inOut", onComplete: onShapeTimelineComplete, onCompleteParams: [shapeState]});
        shapeState.gsapTimeline = timeline;

        var shape = getElement(shapeId);
        if(isNull(shape)) {
            logError("Failed to find shape: " + shapeId);
            return;
        }

        setObjectVisibility(shape, shapeState.isVisible);

        var xc = config.centre.x;
        var yc = config.centre.y;
        var direction = 1;
            
        var children = shape.children;
        if(isNull(children)) {
            return;
        }
        for (var i = 0; i < children.length; i++) {
            var child = children[i];
            if (isEmptyString(child.id)) {
                child.id = "csh" + i;
            }

            var bbox = child.getBBox();
            var objX = bbox.x;
            var objY = bbox.y;

            var rndPoint = getRandomPointInsideCircle(xc, yc, radius)
            var angle = randomIntFromInterval(0, 360) * direction;
            direction *= -1;
            var scale = randomFloatFromInterval(0.1, 2.0);
            var xt = rndPoint.x - objX;
            var yt = rndPoint.y - objY;

            var id = child.id;
            var tween = gsap.from("#" + id, {
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
    function createSvgCircle(cX, cY, r, no) {
        var circleId = config.circlePrefix + toStr(no);
        var circleElement = createCircleElement(circleId);
        setElementAttributes(circleElement, config.gridStyle);

        circleElement.setAttribute("cx", cX);
        circleElement.setAttribute("cy", cY);
        circleElement.setAttribute("r", r);
        return circleElement;
    }
    function createSvgLine(startX, startY, endX, endY, angle, no) {
        var lineId = config.linePrefix + toStr(no);

        var lineElement = createLineElement(lineId);
        setElementAttributes(lineElement, config.gridStyle);

        addChildToParentId(config.gridParentId, lineElement);

        lineElement.setAttribute("x1", startX);
        lineElement.setAttribute("y1", startY);
        lineElement.setAttribute("x2", endX);
        lineElement.setAttribute("y2", endY);

        if (isNotNull(angle) && angle !== 0 && isNumeric(angle)) {
            var transform = "rotate(" + angle + " " + startX + " " + startY + ")";
            lineElement.setAttribute("transform", transform);
        }
    }
    function createSvgTile(cX, cY, r, startAngle, endAngle, circleNo, tileNo) {
        var tileId = config.tilePrefix + toStr(circleNo) + config.elementIdDelimiter + toStr(tileNo);

        var tileElement = createPathElement(tileId);
        if (isNull(tileElement)) {
            logError("Failed to create tile: " + tileId);
            return;
        }

        var tileCircleGroupId = config.tileCircleGroupPrefix + toStr(circleNo);

        var tileGroupId = config.tileGroupPrefix + tileId;
        var tileGroupElement = createGroupElement(tileGroupId);
        addChildToParentId(tileCircleGroupId, tileGroupElement);
        listen('mouseenter', tileGroupElement, onPointerEnter);
        listen('mouseleave', tileGroupElement, onPointerLeave);
        listen('touchend', tileGroupElement, onTouchEnd);
        listen('mouseup', tileGroupElement, onMouseUp);

        var tileElement = createPathElement(tileId);

        addChildToParentId(tileGroupId, tileElement);

        var circleIndex = circleNo - 1;
        var tileIndex = tileNo - 1;

        var tileState = state.tiles[circleIndex][tileIndex];
        if (isNull(tileState)) {
            logError("createSvgTile: Invalid tile state");
            return;
        }

        tileState.id = tileId;

        var arc = createArc(cX, cY, r, startAngle, endAngle);
        tileState.arc = arc;

        setTileStyle(tileState, tileElement)

        var tileSvg = null;
        if (circleNo <= 1) {
            tileSvg = createCircleTileSvg(cX, cY, arc);
        } else {
            var previousTileState = state.tiles[circleIndex - 1][tileIndex];
            var previousArc = previousTileState.arc;
            tileSvg = createTorusTileSvg(arc, previousArc);
            createSvgTileText(cX, cY, startAngle, endAngle, tileNo, previousArc, arc, tileId, tileGroupId, tileState);
        }

        if (isNotNull(tileSvg)) {
            tileElement.setAttribute("d", tileSvg);
        }        
    }
    function createSvgTileText(cX, cY, startAngle, endAngle, tileNo, previousArc, arc, tileId, tileGroupId, tileState) {
        var rd = previousArc.rX + (arc.rX - previousArc.rX)/2.0;
        var tarc = createArc(cX, cY, rd, startAngle, endAngle);
        var iArc = invertArc(tarc);
        if(tileNo > 2 && tileNo < 7) {
            iArc = tarc;
        }
        var textPathId = config.tileTextPathElementPrefix + tileId;
        var textPath = createPathElement(textPathId);
        var arcSvg = createArcSvg(iArc);
        textPath.setAttribute("d", arcSvg);
        setElementAttributes(textPath, config.tileStyleTextPath);
        addChildToParent(getSvg(), textPath);

        var textElement = createTextElement(config.tileTextElementPrefix + tileId);
        setElementAttributes(textElement, config.tileStyleTextElement);
        
        var textElementPath = createTextPathElement(config.tileTextElementPathPrefix + tileId);
        textElementPath.setAttribute("href", "#" + textPathId); 
        setElementAttributes(textElementPath, config.tileStyleTextElementPath);

        var tnode = document.createTextNode("");

        textElementPath.appendChild(tnode);
        textElement.appendChild(textElementPath);
        
        addChildToParentId(tileGroupId, textElement);

        setTileText(textElement, tileState, textPath);      
    }
    function setTileText(tileTextElement, tileState, textPath) {
        if(isNull(tileTextElement) || isNull(tileState) || isNull(tileState.txt) || isNull(textPath)) {
            return;
        }

        var textNode = tileTextElement.childNodes[0];  
        if(isNull(textNode)) {
            return;
        }

        var oldVal = textNode.textContent;
        var newVal = tileState.txt.value;
        if(oldVal === newVal) {
            return;
        }
        
        textNode.textContent = newVal;

        var fs = 0.01;
        var fontSize = "" + fs + "em";
        textNode.setAttribute("font-size", fontSize);
        
        var textLen = textNode.getComputedTextLength();        
        var pathLen = textPath.getTotalLength();
        if(0 === textLen) {
            textLen = 0.000001 + pathLen/100.0;
        }
        var ratio = pathLen / textLen;
        
        fs *= ratio * 0.8;
        fontSize = "" + fs + "em";
        textNode.setAttribute("font-size", fontSize);    
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
        if(!tileState.isVisible) {            
            return config.tileStyleTextElementInvisible;
        }

        if(isNotNull(tileState.txt)) {
            if(!tileState.txt.isVisible) {
                return config.tileStyleTextElementInvisible;
            }
        }

        return config.tileStyleTextElement;
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
    function createGroupElement(id) {
        return createSvgElement(id, 'g');
    }
    function createCircleElement(id) {
        return createSvgElement(id, 'circle');
    }
    function createLineElement(id) {
        return createSvgElement(id, 'line');
    }
    function createPathElement(id) {
        return createSvgElement(id, 'path');
    }
    function createTextElement(id) {
        return createSvgElement(id, 'text');
    }
    function createTextPathElement(id) {
        return createSvgElement(id, 'textPath');
    }
    function createRectangleElement(id) {
        return createSvgElement(id, 'rect');
    }
    function createSvgElement(id, elementName) {
        var elem = document.createElementNS(config.svgNameSpace, elementName);
        elem.setAttribute("id", id);
        return elem;
    }
    function setElementAttributes(element, attrAssocArr) {
        if (isNull(element) || isNull(attrAssocArr)) {
            logError("setElementAttributes: invalid inputs");
            return;
        }
        for (var key in attrAssocArr) {
            if (attrAssocArr.hasOwnProperty(key)) {
                var k = key;
                var v = attrAssocArr[key];
                if (isNotNull(k) && isNotNull(v)) {
                    element.setAttribute(k, v);
                }
            }
        }
    }
    function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
        var angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;

        return {
            x: centerX + (radius * Math.cos(angleInRadians)),
            y: centerY + (radius * Math.sin(angleInRadians))
        };
    }
    function createArc(x, y, radius, startAngle, endAngle) {

        var start = polarToCartesian(x, y, radius, endAngle);
        var end = polarToCartesian(x, y, radius, startAngle);

        var largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

        return new SvgArc(start.x, start.y, radius, radius, 0, largeArcFlag, 0, end.x, end.y);
    }
    function createArcSvg(arc) {
        if (!isObjectInstanceOf(SvgArc, arc)) {
            logError("Unexpected object type" + arc + " expected SvfgArc");
            return;
        }
        var d = [
            "M", arc.startX, arc.startY,
            "A", arc.rX, arc.rY, arc.xAxisRotation, arc.largeArcFlag, arc.sweepFlag, arc.endX, arc.endY,
        ].join(" ");
        return d;
    }
    function createCircleTileSvg(cX, cY, arc) {
        if (!isObjectInstanceOf(SvgArc, arc)) {
            logError("Unexpected object type" + arc + " expected SvfgArc");
            return;
        }
        var d = [
            "M", cX, cY,
            "L", arc.startX, arc.startY,
            "A", arc.rX, arc.rY, arc.xAxisRotation, arc.largeArcFlag, arc.sweepFlag, arc.endX, arc.endY, "z"
        ].join(" ");

        return d;
    }
    function createTorusTileSvg(arc, previousArc) {
        if (!isObjectInstanceOf(SvgArc, arc) || !isObjectInstanceOf(SvgArc, previousArc)) {
            logError("createTorusTileSvg: Unexpected object type" + arc + " expected SvfgArc");
            return;
        }
        var iArc = invertArc(arc);
        var d = [
            "M", previousArc.startX, previousArc.startY,
            "A", previousArc.rX, previousArc.rY, previousArc.xAxisRotation, previousArc.largeArcFlag,
            previousArc.sweepFlag, previousArc.endX, previousArc.endY,
            "L", iArc.startX, iArc.startY,
            "A", iArc.rX, iArc.rY, iArc.xAxisRotation, iArc.largeArcFlag, iArc.sweepFlag, iArc.endX, iArc.endY, "z"
        ].join(" ");

        return d;
    }
    function invertArc(arc) {
        // Inverts direction of the arc
        if (!isObjectInstanceOf(SvgArc, arc)) {
            logError("invertArc: Unexpected object type" + arc + " expected SvfgArc");
            return;
        }

        var startX = arc.endX;
        var startY = arc.endY;
        var rX = arc.rX;
        var rY = arc.rY;
        var xAxisRotation = arc.xAxisRotation;
        var largeArcFlag = arc.largeArcFlag;
        var sweepFlag = 1 - arc.sweepFlag;
        var endX = arc.startX;
        var endY = arc.startY;

        return new SvgArc(startX, startY, rX, rY, xAxisRotation, largeArcFlag, sweepFlag, endX, endY);
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
            case "testBtn":
                processTestButtonClick();
                break;
            case "startBtn":
                processStartButtonClick();
                break;
            default:
            // code block
        }
    }
    function onElementPointerEntry(selectedObj) {        
        if (!isObject(selectedObj)) {
            return null;
        }

        var tile = selectedObj;
        var elementId = selectedObj.id;
        log("onPointerEntry: " + elementId);
        isTileGroupId
        if (isTileGroupId(elementId)) {
            elementId = getTileIdFromGroupId(elementId);            
            tile = getElement(elementId);
        } else if (isTileTextId(elementId)) {
            elementId = getTileIdFromTextId(elementId);            
            tile = getElement(elementId);
        } 
        
        if(!isTileId(elementId)) {
            log("getTileState: invalid tile id: " + elementId);
            return null;
        }
        
        setElementAttributes(tile, config.tileStyleOnPonterEntry);
    }
    function onElementPointerExit(selectedObj) {
        if(!isObject(selectedObj)) {
            return;               
        }

        log("onPointerLeave: " + selectedObj.id);

        var tile = getTileObject(selectedObj);
        if(isNull(tile)) {
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
        var tileState = getTileState(selectedObj);
        if (isNull(tileState)) {
            log("processSelectedTile: invalid selected tile");
            return;
        }

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

        if(tileId !== state.selectedTileId) {
            if(isNotNull(state.selectedTileId)) {
                var rowColPoint = getTileRowCol(state.selectedTileId);
                var prevSelectedState = state.tiles[rowColPoint.x][rowColPoint.y];     
                prevSelectedState.isSelected = false;
                var prevSelectedObj = getElement(state.selectedTileId);
                setTileStyle(prevSelectedState, prevSelectedObj);
            }
        }

        tileState.isSelected = !tileState.isSelected;
        state.selectedTileId = tileId;
        setTileStyle(tileState, selectedObj);

        var evParams = { "elementId": tileState.id, "selected": tileState.isSelected };
        sendEvent("ELEMENT_SELECTED", evParams)
    }
    function getTileRowCol(tileId) {
        if(isNull(tileId)) {
            return null;
        }

        var tileInfo = replace(tileId, config.tilePrefix, '');
        var tileInfoArr = tileInfo.split(config.elementIdDelimiter);
        if (!isArray(tileInfoArr) || tileInfoArr.length !== 2) {
            log("getTileState: invalid tile info: " + tileInfo);
            return null;
        }

        var row = toInt(tileInfoArr[0]) - 1;
        var column = toInt(tileInfoArr[1]) - 1;
        return new Point(row, column);
    }
    function sendEvent(eventId, params) {
        var event = createEvent(eventId);
        if (isObject(params)) {
            for (var prop in params) {
                if (params.hasOwnProperty(prop)) {
                    event.addParam(prop, params[prop]);
                }
            }
        }
        webQueue.add(event);
        sendEvents();
    }
    function getServerState() {
        var event = createEvent("GET_SERVER_STATE");
        webQueue.add(event);
        sendEvents();
    }
    function handleAjaxGetResponse() {
        log("handleAjaxGetResponse: ");
        if (isObjectInstanceOf(XMLHttpRequest, this)) {
            var responseURL = this.responseURL;
            var response = this.responseText;
            var jsonVal = parseJson(response);
            var status = this.status;
            // log("handleAjaxGetResponse: responseURL: " + responseURL + " status: " + status);
            if (isNotNull(jsonVal)) {
                var bag = jsonVal.dataBag;
                var t = bag.t;
                var m = bag.msg;
                var st = bag.st;
                var type = bag.type;
                if (isNotNull(type)) {
                    switch (type) {
                        case "ERROR":
                            log("handleAjaxGetResponse: time: " + t + " type: " + type + " message: " + m);
                            processError(m);
                            break;
                        case "OK":
                            log("handleAjaxGetResponse: time: " + t + " type: " + type + " message: " + m);
                            processOkResponse(m)
                            break;
                        case "STATE":
                            // log("handleAjaxGetResponse: time: " + t + " type: " + type + " state: " + st);
                            log("handleAjaxGetResponse: time: " + t + " type: " + type);
                            processStateResponse(st);
                            break;
                    }
                }
            }
        }
    }
    function processError(error) {
        log("processError: Received ERROR: " + error);
    }
    function processOkResponse(message) {
        log("processOkResponse: Received message: " + message);
    }
    function processStateResponse(serverState) {
        if (isNull(serverState)) {
            return;
        }
        processSeverData(serverState)
    }
    function handleAjaxPostResponse() {
        log("handleAjaxPostResponse: ");
        if (isObjectInstanceOf(XMLHttpRequest, this)) {
            var responseURL = this.responseURL;
            var response = this.responseText;
            var jsonVal = parseJson(response);
            var status = this.status;
            log("handleAjaxPostResponse: responseURL: " + responseURL + " status: " + status + " response: " + response);
        }
    }
    function getTileObject(element) {
        if (!isObject(element)) {
            return null;
        }
        var elementId = element.id;

        if(isTileId(elementId)) {
            return element;
        }
        
        if (isTileGroupId(elementId)) {
            elementId = getTileIdFromGroupId(elementId);            
        } else if (isTileTextId(elementId)) {
            elementId = getTileIdFromTextId(elementId);            
        } 
        
        if(isNull(elementId)) {
            return null;
        }
        
        return getElement(elementId);
    }
    function getTileState(element) {
        if (!isObject(element)) {
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
        if(!isTileId(elementId)) {
            log("getTileState: invalid tile id: " + elementId);
            return null;
        }
        
        var rowColPoint = getTileRowCol(elementId);
        if(isNull(rowColPoint)) {
            return null;
        }
        return state.tiles[rowColPoint.x][rowColPoint.y];
    }
    function isTileId(id) {
        if (isNull(id) || !isString(id)) {
            return false;
        }
        return startsWith(id, config.tilePrefix);
    }
    function isTileTextId(id) {
        if (isNull(id) || !isString(id)) {
            return false;
        }
        return startsWith(id, config.tileTextElementPrefix);
    }
    function isTileGroupId(id) {
        if (isNull(id) || !isString(id)) {
            return false;
        }
        return startsWith(id, config.tileGroupPrefix);
    }
    function getTileIdFromTextId(id) {
        if (isNull(id) || !isString(id)) {
            return false;
        }
        var tileId = id.substring(config.tileTextElementPrefix.length, id.length);
        if(!isTileId(tileId)){
            return null;
        }
        return tileId;
    }
    function getTileIdFromGroupId(id) {
        if (isNull(id) || !isString(id)) {
            return false;
        }
        var tileId = id.substring(config.tileGroupPrefix.length, id.length);
        if(!isTileId(tileId)){
            return null;
        }
        return tileId;
    }
    function setTileStyleText(tileState, tileObj) {
        if(isNull(tileState) || isNull(tileObj)) {
            return;
        }

        var tileId = tileObj.id;
        var textPathId = config.tileTextPathElementPrefix + tileId;
        var textPath = getElement(textPathId);
        if(isNull(textPath)) {
            return;
        }

        var textElementId = config.tileTextElementPrefix + tileId;
        var textElement = getElement(textElementId);
        if(isNull(textElement)) {
            return;
        }

        setTileText(textElement, tileState, textPath);      
    }
    function setTileStyle(tileState, tileObj) {
        var tileStyle = getTileStyle(tileState);
        setElementAttributes(tileObj, tileStyle);

        var tileTextElementId = config.tileTextElementPrefix + tileState.id;
        var tileTextElement = getElement(tileTextElementId);    
        if(isNull(tileTextElement) ) {
            return;
        }

        var tileTextStyle = getTileTextStyle(tileState);
        setElementAttributes(tileTextElement, tileTextStyle); 
        // var newVal = tileState.txt.value;
        // if(!isEmptyString(newVal)) {
        //     log("Have new text value: " + newVal);
        // }
        // var textNode = tileTextElement.childNodes[0];  
        // textNode.textContent = newVal;

    }
    function setShapeStyle(shapeState, shapeId) {
        var shapeStyle = getShapeStyle(shapeState);
        var shape = getElement(shapeId);
        setElementAttributes(shape, shapeStyle);
    }
    function createRotateAroundSvgCentre(objId, dur, angle) {
        if (isNull(objId)) {
            logError("rotate: Invalid objectId: " + objId);
            return;
        }

        return gsap.to("#" + objId, {
            duration: dur,
            rotation: angle,
            svgOrigin: ("" + config.centre.x + " " + config.centre.y),
            onComplete: onAnimationComplete,
            onCompleteParams: [objId],
            paused: true
        });
    }
    function createRandomWalk(objId, dur, angle) {
        if (isNull(objId)) {
            logError("createRandomWalk: Invalid objectId: " + objId);
            return;
        }

        var obj = getELement(objId);
        if (isNull(obj)) {
            logError("createRandomWalk: Invalid object for id: " + objId);
            return;
        }

        var bbox = obj.getBBox();
        var objX = bbox.x;
        var objY = bbox.y;

        return gsap.from("#" + objId, {
            duration: dur,
            rotation: angle,
            svgOrigin: ("" + config.centre.x + " " + config.centre.y),
            onComplete: onAnimationComplete,
            onCompleteParams: [objId],
            paused: true
        });
    }
    function getRandomPointInsideCircle(xc, yc, rc) {
        var a = 2 * Math.PI * Math.random();
        var r = Math.sqrt(Math.random());
        var x = (rc * r) * Math.cos(a) + xc;
        var y = (rc * r) * Math.sin(a) + yc;

        return new Point(x, y);
    }
    function processTestButtonClick() {
        var el = null;
        for (var i = 1; i <= 2; i++) {
            el = getElement(config.tileCircleGroupPrefix + i);
            // setElementAttributes(el, { "fill": "none", "stroke": "darkslategray", "stroke-width": "2px" });
            var ch = el.children;
            for (var i = 0; i < ch.length; i++) {
                var cld = ch[i];
                setElementAttributes(cld, { "fill": "white", "stroke": "darkslategray", "stroke-width": "2px", "opacity": 0.9 });
            }
        }

        el = getElement("centreShape");
        // setElementAttributes(el, { "visibility": "hidden" });
        zoomTarget("centreShape");
        setElementAttributes(el, { "visibility": "visible" });

        var timeline = gsap.timeline({paused: true, ease: "power4.inOut", onComplete: onShapeTimelineComplete, onCompleteParams: [state.centreShape]});
        state.centreShape.gsapTimeline = timeline;

        var xc = config.centre.x;
        var yc = config.centre.y;
        var rc = config.circleRadii[1];

        var ch = el.children;
        var direction = 1;
        for (var i = 0; i < ch.length; i++) {
            var cld = ch[i];
            if (isEmptyString(cld.id)) {
                cld.id = "csh" + i;
            }

            var bbox = cld.getBBox();
            var objX = bbox.x;
            var objY = bbox.y;

            var rndPoint = getRandomPointInsideCircle(xc, yc, rc)
            var angle = randomIntFromInterval(0, 360) * direction;
            direction *= -1;
            var scale = randomFloatFromInterval(0.1, 2.0);
            var xt = rndPoint.x - objX;
            var yt = rndPoint.y - objY;

            var id = cld.id;
            var dur = 60;
            var tween = gsap.from("#" + id, {
                x: xt,
                y: yt,
                rotation: angle,
                // duration: dur,
                scale: scale,
                // paused: true
            });

            timeline.add(tween, 0);
        }

        timeline.totalDuration(20);
        timeline.play(0);
    }
    function onShapeTimelineComplete(shapeState) {    
        log("onShapeTimelineComplete: progress: " + shapeState.gsapTimeline.progress());
        // shapeState.gsapTimeline.totalDuration(20);
        // shapeState.gsapTimeline.reverse();
    }
    function randomIntFromInterval(min, max) { // min and max included 
        return Math.floor(Math.random() * (max - min + 1) + min);
    }
    function randomFloatFromInterval(min, max) { // min and max included 
        return Math.random() * (max - min) + min;
    }
    function processRotateButtonClick() {
        var tl = gsap.timeline();

        var angle = 360;
        var dur = 10;
        for (var i = 1; i <= 8; ++i) {
            var objId = config.tileCircleGroupPrefix + i;
            var circles = getElement(objId);
            if (isNull(circles)) {
                log("processRotateButtonClick: invalid circles");
                continue;
            }
            tl.to("#" + objId, { duration: dur, rotation: angle, svgOrigin: ("" + config.centre.x + " " + config.centre.y), onComplete: onAnimationComplete, onCompleteParams: [objId], ease: "power3.out" }, 0);
            angle = -1 * angle;
        }
    }
    function processStartButtonClick() {
        log("processStartButtonClick: ");
        var evParams = { "elementId": "startBtn" };
        resetAll();
        sendEvent("WEB_START", evParams)
    }
    function zoom(targets) {
        if (isArray(targets)) {
            for (var i = 0; i < targets.length; i++) {
                zoomTarget(targets[i]);
            }
        } else {
            zoomTarget(targets);
        }
    }
    function timeline(actionId, targets) {
        if (isArray(targets)) {
            for (var i = 0; i < targets.length; i++) {
                runTimeline(actionId, targets[i]);
            }
        } else {
            runTimeline(actionId, targets);
        }
    }
    function rotate(actionId, targets, params) {
        if (isArray(targets)) {
            for (var i = 0; i < targets.length; i++) {
                runRotate(actionId, targets[i], params);
            }
        } else {
            runRotate(actionId, targets, params);
        }
    }
    function runRotate(actionId, target, params) {
         if(isNull(params || !isObject(params))) {
            return;
        }

        log("rotate: " + target);        

        switch(actionId) {
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
        if(!isNull(params.duration)) {
            dur = params.duration;
        }
        if(!isNull(params.angle)) {
            angle = params.angle;
        }
        
        var tween = null;
        if(isTileId(target)) {
            var tGroupId = config.tileGroupPrefix + target;
            var tileGroup = getElement(tGroupId);
            var tile = getElement(target);
            var tweens = getObjectTweens(tile);
            if(isArray(tweens) && tweens.length > 0) {
                tween = tweens[0];
            } else {
                tween = createRotateAroundSvgCentre(tGroupId, dur, angle);
                tweens.push(tween);
            }           
        }

        playOrRestartTween(tween);
    }
    function runRotateReset(target, params) {
        if(!isString(target)) {
            return;
        }
        if(isTileId(target)) {
            var tile = getElement(target);
            var tweens = getObjectTweens(tile);
            if(isArray(tweens) && tweens.length > 0) {
                var tween = tweens[0];
                if(!isNull(tween)) {
                    tween.pause(0);
                }
            }           
        }

        if(config.all === target.toUpperCase()) {
            state.tiles
        }
    }
    function reset(actionId, targets, params) {
        if (isArray(targets)) {
            for (var i = 0; i < targets.length; i++) {
                runReset(actionId, targets[i], params);
            }
        } else {
            runReset(actionId, targets, params);
        }
    }
    function runReset(actionId, target, params) {
        if(!isString(actionId)) {
            return;
        }

        log("reset: actionId: " + actionId + " " + target);        

        switch(actionId) {
            case 'all':
                runResetAll(target, params);
                break;
            case 'elements':
                resetElements(target, params); 
                break;                
            default:
                logError("Unknown rotate actionId: " + actionId);
                return;
        }                        
    }
    function runResetAll(target, params) {
        if(!isString(target)) {
            return;
        }
        switch(target) {
            case 'tiles':
                resetTiles();
                break;
            case 'shapes':
                resetShapes(); 
                break;                
            case 'elements':
                resetAll();
                break;                
            default:
                logError("Unknown reset target: " + target);
                return;
        }                        
    }   
    function resetElements(target, params) {
        if(isTileId(target)) {
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
        if(isNull(zoomLevel)) {
            return;
        }
        var vBox = getVBox(zoomLevel);
        if(isNull(vBox)) {
            return;
        }
        getElement();
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
    function getVBox(target) {
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
    function runTimeline(actionId, target) {
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
                startTimeline(tl);
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
        return getElement("svgCanvas");
    }
    function startTimeline(timeline) {
        if(isNull(timeline)) {
            logError("startTimeline: invalid timeline");
            return;
        }
        
        var progress = timeline.progress();
        if (progress > 0) {
            timeline.restart();
        } else {
            timeline.play();
        }
    }
    function stopTimeline(timeline) {
        if(isNull(timeline)) {
            logError("stopTimeline: invalid timeline");
            return;
        }    
        timeline.pause();
    } 
    function endTimeline(timeline) {
        if(isNull(timeline)) {
            logError("endTimeline: invalid timeline");
            return;
        }    
        timeline.pause(1);
    }  
    function resetTimeline(timeline) {
        if(isNull(timeline)) {
            logError("stopTimeline: invalid timeline");
            return;
        }  
        timeline.pause(0);
    }    
    function reverseTimeline(timeline) {
        if(isNull(timeline)) {
            logError("reverseTimeline: invalid timeline");
            return;
        }
        
        timeline.reverse();                
    }
    function onAnimationComplete(rotationObjId) {
        var obj = getElement(rotationObjId);
        // log("onAnimationComplete: " + rotationObjId);
    }
    function getObjectTweens(obj) {
        if (!isObject(obj)) {
            return [];
        }
        if (isTileId(obj.id)) {
            var tileState = getTileState(obj);
            return tileState.tweens;
        }
        return gsap.getTweensOf(obj)
    }
    function listen(evnt, elem, func) {
        if (elem.addEventListener) {  // W3C DOM
            elem.addEventListener(evnt, func, false);
        } else if (elem.attachEvent) { // IE DOM
            var r = elem.attachEvent("on" + evnt, func);
            return r;
        } else {
            log('I\'m sorry Dave, I\'m afraid I can\'t do that.');
        }
    }
    function addChildToParent(parent, child) {
        if (isNull(parent)) {
            logError("addChild: Can not find parrent: " + parentId);
            return;
        }
        parent.appendChild(child);
    }
    function addChildToParentId(parentId, child) {
        var parent = getElement(parentId);
        addChildToParent(parent, child);
    }
    function getElement(elementId) {
        if (isNull(elementId)) {
            return;
        }
        return document.getElementById(elementId);
    }
    function initArray(elNo1, initValue) {
        var a1 = [];
        for (var i = 0; i < elNo1; ++i) {
            var val = initValue;
            if (!isNull(initValue) && isObject(initValue)) {
                val = cloneObj(initValue);
            }
            a1.push(val);
        }
        return a1;
    }
    function init2DArray(elNo1, elNo2, initValue) {
        var a1 = [];
        for (var i = 0; i < elNo1; ++i) {
            var a2 = [];
            for (var j = 0; j < elNo2; ++j) {
                var val = initValue;
                if (!isNull(initValue) && isObject(initValue)) {
                    val = cloneObj(initValue);
                }
                a2.push(val);
            }
            a1.push(a2);
        }
        return a1;
    }
    function isObjectInstanceOf(type, obj) {
        if (!isObject(obj)) {
            return false;
        }
        return obj instanceof type || obj.constructor.prototype instanceof type;
    }
    function isTouchDevice() {

        var prefixes = ' -webkit- -moz- -o- -ms- '.split(' ');

        var mq = function (query) {
            return window.matchMedia(query).matches;
        }

        if (('ontouchstart' in window) || window.DocumentTouch && document instanceof DocumentTouch) {
            return true;
        }

        // include the 'heartz' as a way to have a non matching MQ to help terminate the join
        // https://git.io/vznFH
        var query = ['(', prefixes.join('touch-enabled),('), 'heartz', ')'].join('');
        return mq(query);
    }
    function setObjectVisibility(obj, isVisible) {
        if(isNull(obj)) {
            return;
        }
        var vis = "hidden";
        if(isVisible) {
            vis = "visible";
        }
        setElementAttributes(obj, { "visibility": vis });
    }
    function isObject(obj) {
        return typeof obj === 'object';
    }
    function isArray(val) {
        return Array.isArray(val);
    }
    function isNumeric(num) {
        return !isNaN(num)
    }
    function isString(val) {
        return typeof val === 'string';
    }
    function isEmptyString(val) {
        return isString(val) && val === "";
    }
    function isNull(val) {
        return isUndefined(val) || val == null;
    }
    function isUndefined(val) {
        return typeof val === 'undefined';
    }
    function isNotNull(val) {
        return !isNull(val);
    }
    function toInt(val) {
        if (isNull(val)) {
            return null;
        }
        return parseInt(val, 10);
    }
    function toFloat(val) {
        if (isNull(val)) {
            return null;
        }
        return parseFloat(val);
    }
    function toStr(val) {
        return String(val);
    }
    function getWindowWidth() {
        return window.innerWidth
            || document.documentElement.clientWidth
            || document.body.clientWidth;
    }
    function getWindowHeight() {
        return window.innerHeight
            || document.documentElement.clientHeight
            || document.body.clientHeight;
    }
    function startsWith(strVal, startStr) {
        if (!isString(strVal) || !isString(startStr)) {
            return false;
        }
        return strVal.substring(0, startStr.length) === startStr;
    }
    function replace(strVal, strToReplace, strReplaceWith) {
        if (!isString(strVal) || !isString(strToReplace) || !isString(strReplaceWith)) {
            return strVal;
        }
        return strVal.replace(strToReplace, strReplaceWith);
    }
    function cloneObj(obj) {
        if (!isObject(obj)) {
            return null;
        }
        return JSON.parse(JSON.stringify(obj))
    }
    function contains(str, substr) {
        return str.indexOf(substr) !== -1
    }
    function logError(val) {
        log("ERROR: " + val);
    }
    function log(val) {
        console.log(val);
    }

    function getScreenLogElement() {
        return getElement(config.screenLogElementId);
    }
    function logOnScreen(val) {
        if (!isNull(screenLogElement)) {
            screenLogElement.innerHTML = val;
        }
    }
    function appendLogOnScreen(val) {
        if (!isNull(screenLogElement)) {
            screenLogElement.innerHTML += ", " + val;
        }
    }
    function ajaxGet(url, handler) {
        if (isNull(url)) {
            logError("ajaxGet: Invalid params");
            return;
        }
        var xhr = new XMLHttpRequest();
        xhr.onload = function (event) {
            // log('ajaxGet:onload: status: ' + xhr.status + ", respose: " + xhr.responseText);
            log('ajaxGet:onload: status: ' + xhr.status);
            if (!isNull(handler)) {
                handler.call(xhr)
            }
        };
        xhr.onreadystatechange = function () {
            log('ajaxGet:onreadystatechange: readyState: ' + toAjaxReadyStateName(xhr.readyState));
        };

        var outUrl = uniquify(url)
        log('ajaxGet: url len: ' + outUrl.length + " url: " + outUrl);
        xhr.open('GET', outUrl, true);
        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        xhr.send();
    }
    function ajaxPost(url, dataObj, handler) {
        if (isNull(url)) {
            logError("ajaxPost: Invalid params");
            return;
        }
        var xhr = new XMLHttpRequest();
        xhr.onload = function (event) {
            log('ajaxPost:onload: status: ' + xhr.status + ", respose: " + xhr.responseText);
            if (!isNull(handler)) {
                handler.call(xhr)
            }
        };
        xhr.onreadystatechange = function () {
            log('ajaxPost:onreadystatechange: readyState: ' + toAjaxReadyStateName(xhr.readyState));
        };
        xhr.open('POST', url, true);
        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        xhr.send(encodeUrlParams(dataObj));
    }
    function toAjaxReadyStateName(state) {
        switch (state) {
            case 0:
                return 'UNSENT';
            case 1:
                return 'OPENED';
            case 2:
                return 'HEADERS_RECEIVED';
            case 3:
                return 'LOADING';
            case 4:
                return 'DONE';
            default:
                return '';
        }
    }
    function encodeUrlParams(object) {
        var encodedString = '';
        for (var prop in object) {
            if (object.hasOwnProperty(prop)) {
                if (encodedString.length > 0) {
                    encodedString += '&';
                }
                var param = object[prop]
                if (isObject(param) || isArray(param)) {
                    var s = JSON.stringify(param)
                    encodedString += encodeURI(prop + '=' + s);
                } else {
                    encodedString += encodeURI(prop + '=' + param);
                }
            }
        }
        return encodedString;
    }
    function parseJson(val) {
        try {
            return JSON.parse(val);
        } catch (e) {
            return null;
        }
        return null;
    }
    function appendUrlParam(url, name, value) {
        var delimiter = "?";
        if (contains(url, delimiter)) {
            delimiter = "&";
        }
        var toAdd = delimiter + name + "=" + value;
        return url + encodeURI(toAdd);
    }
    function uniquify(url) {
        var delimiter = "?";
        if (contains(url, delimiter)) {
            delimiter = "&";
        }
        var d = new Date();
        return url + delimiter + "t=" + d.getTime();
    }
    function createEvent(id) {
        var time = Date.now();
        return new Event(id, time);
    }
    function sendEvents() {

        if (isNull(webQueue) || webQueue.size() <= 0) {
            return;
        }

        var event = webQueue.remove();
        while (isNotNull(event)) {
            log("sendEvents: " + event.id + " event.time: " + event.time);
            var url = config.appUrlHttp;
            url = appendUrlParam(url, "ev", event.id);
            url = appendUrlParam(url, "evt", event.time);

            var props = event.propertyBag;
            for (var prop in props) {
                if (props.hasOwnProperty(prop)) {
                    url = appendUrlParam(url, prop, props[prop]);
                }
            }

            ajaxGet(url, handleAjaxGetResponse);
            event = webQueue.remove();
        }
    }
    function initSse() {
        if (!!window.EventSource) {
            sseSource = new EventSource(config.appUrlSse);

            sseSource.addEventListener('message', function (e) {
                onSseEventReceived(e)
            }, false);

            sseSource.addEventListener('open', function (e) {
                log("SSE connection open");
            }, false);

            sseSource.addEventListener('error', function (e) {
                if (e.readyState == EventSource.CLOSED) {
                    log("SSE connection closed");
                }
            }, false);

        } else {
            logError("SSE is not supported");
            logOnScreen("SSE is not supported");
        }
    }
    function onSseEventReceived(event) {
        if (isNull(event)) {
            return;
        }
        if (isNotNull(event.data)) {
            processSeverData(event.data);
        }

    }
    function processSeverData(serverData) {
        var serverState = parseJson(serverData);
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

        var grid = serverState.grid;
    }
    function processSeverShapeState(serverShapeState, clientShapeState, shapeId) {
        if (isNull(serverShapeState) || isNull(clientShapeState)) {
            return;
        }

        clientShapeState.isVisible = serverShapeState.isVisible;
        setShapeStyle(clientShapeState, shapeId);
    }
    function processSeverTilesState(serverTileStates) {
        if (!isArray(serverTileStates) || !isArray(serverTileStates[0])) {
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
            var tileObj = getElement(tileState.id);
            // log("updating tile " + tileState.id);
            setTileStyle(tileState, tileObj);
            setTileStyleText(tileState, tileObj);
        }
    }
    function processSeverActions(actions) {
        var id = null;
        var actionType = null;
        var elementIds = [];
        var params = {};
        if (isArray(actions)) {
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
                timeline(id, elementIds);
                break;
            case "ROTATE":                
                rotate(id, elementIds, params);                
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
        if (isArray(elementIds)) {
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
        var element = getElement(elementId);
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
        if(isNull(tween)) {
            return;
        }
        var progress = tween.progress();
        if (progress > 0) {
            tween.restart();
        } else {
            tween.play();
        }
    }
    function isFunction(objFunc){
        return typeof objFunc === 'function';
    }
    // Public members if any??
    return {
        onTileClick: onTileClick
    }

})();