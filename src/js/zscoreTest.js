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

    // INIT on window load
    // u.listen("load", window, onLoad);

    // ---------  MODEL -----------
    var state = {
   
    }
    var config = {
    
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
        this.selectedId = null;
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
        u.listen('resize', win, onWindowResize);
        u.listen('orientationchange', win, onWindowResize);

        //init server side events
        initNet();
        //init server side events
        initSvg();
        //init audio
        initAudio();
       
    }
    function resetAll() {
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

       
    }
    function onElementPointerExit(selectedObj) {
        if (!u.isObject(selectedObj)) {
            return;
        }

        // log("onPointerLeave: " + selectedObj.id);

    }
    function onElementSelected(selectedObj) {
        if (!a.isReady()) {
            initAudio();
        }

       
    }
    function onWindowResize(event) {
        if (!u.isObject(this)) {
            return null;
        }
       
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
    function createAlphaTween(objId, dur, val) {
        if (isNull(objId)) {
            logError("dissolve: Invalid objectId: " + objId);
            return;
        }

        return gsap.to(u.toCssIdQuery(objId), {
            duration: dur,
            autoAlpha: val,
            onComplete: onAlphaComplete,
            onCompleteParams: [objId],
            paused: true
        });
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
       

        playOrRestartTween(tween);
    }
    function runRotateReset(target, params) {
        if (!u.isString(target)) {
            return;
        }
     
    }
    function alpha(actionId, targets, params) {
        if (u.isArray(targets)) {
            for (var i = 0; i < targets.length; i++) {
                runAlpha(actionId, targets[i], params);
            }
        } else {
            runAlpha(actionId, targets, params);
        }
    }
    function runAlpha(actionId, target, params) {
        if (!u.isString(actionId) || !u.isObject(params)) {
            return;
        }

        log("runAlpha: " + target);

        switch (actionId) {
            case 'start':
                runAlphaStart(target, params);
                break;
            default:
                logError("Unknown aplha actionId: " + actionId);
                return;
        }
    }
    function runAlphaStart(target, params) {
        var dur = 0;
        if (!isNull(params.duration)) {
            dur = params.duration;
        }
        var val = 1;
        if (!isNull(params.value)) {
            val = params.value;
        }

        var tweens = [];
       
        for (var i = 0; i < tweens.length; i++) {
            log("runAlphaStart: tween: " + target);
            playOrRestartTween(tweens[i]);
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
     
            default:
                log("resetElements: unknown target: " + target);
        }
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
        if (!u.isString(actionId)) {
            return;
        }

        log("runActivate: actionId: " + actionId + BLANK + target);

        switch (actionId) {
         
            default:
                logError("Unknown activate actionId: " + actionId);
                return;
        }
    }
    function deActivate(actionId, targets, params) {
        if (u.isArray(targets)) {
            for (var i = 0; i < targets.length; i++) {
                runDeActivate(actionId, targets[i], params);
            }
        } else {
            runDeActivate(actionId, targets, params);
        }
    }
    function runDeActivate(actionId, target, params) {
        if (!u.isString(actionId)) {
            return;
        }

        log("runDeActivate: actionId: " + actionId + BLANK + target);

        switch (actionId) {
      
            default:
                logError("Unknown DeActivate actionId: " + actionId);
                return;
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

        log("stop: actionId: " + actionId + BLANK + target);

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
           
        }
    }
  
    function processInstructions(instructions) {
        setInstructions(instructions.line1, instructions.line2, instructions.line3, instructions.colour, instructions.isVisible);
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
                reverseTimeline(tl, params);
                break;
            case "resume":
                resumeTimeline(tl, params);
                break;
            default:
                logError("runTimeline: invalid actionId: " + actionId);
                return;
        }
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
    function resumeTimeline(timeline, params) {
        if (isNull(timeline)) {
            logError("resumeTimeline: invalid timeline");
            return;
        }

        if (timeline.isActive()) {
            return;
        }
        var dur = timeline.totalDuration();
        if (!isNull(params)) {
            if (!isNull(params.duration)) {
                var dur = params.duration;
            }
        }

        var progress = timeline.progress();
        if (progress == 1.0 || progress == 0.0) {
            timeline.totalDuration(dur);
            timeline.restart();
        } else {
            timeline.resume();
        }
    }
    function reverseTimeline(timeline, params) {
        if (isNull(timeline)) {
            logError("reverseTimeline: invalid timeline");
            return;
        }
        var progress = timeline.progress();
        if (progress < 1) {
            endTimeline(timeline);
        }
        if (!isNull(params)) {
            if (!isNull(params.duration)) {
                var dur = params.duration;
                timeline.totalDuration(dur);
            }
        }
        timeline.reverse();
    }
    function onAnimationComplete(rotationObjId) {
        var obj = u.getElement(rotationObjId);
        // log("onAnimationComplete: " + rotationObjId);
    }
    function onAlphaComplete(objId) {
        var obj = u.getElement(objId);
        log("onAlphaComplete: " + objId + "  opacity: " + obj.style.opacity + "  visiblility: " + obj.style.visibility);
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
   
    function onServerEventReceived(event) {
        if (isNull(event)) {
            return;
        }
        if (isNotNull(event.data)) {
            var serverState = u.parseJson(serverData);
            processSeverState(serverState, false);
        }

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
                activate(id, elementIds, params);
                break;
            case "ANIMATION":
                break;
            case "DEACTIVATE":
                deActivate(id, elementIds, params);
                break;
            case "VISIBLE":
                break;
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
            case "ALPHA":
                alpha(id, elementIds, params);
                break;
            case "AUDIO":
                audio(id, elementIds, params);
                break;
            case "RESET":
                reset(id, elementIds, params);
                break;
            case "STOP":
                stop(id, elementIds, params);
                break;
            default:
                logError("doAction: Unknown actionType: " + actionType);
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
    function zoom(elementIds) {
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