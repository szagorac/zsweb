var zscore = (function (u, n, s, a, m, win, doc) {
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
        isRunning: false,
        tsBaseBeatMaps: {},
        tsBaseBeatTweens: {},
        currentBeatNo: 0,
        currentBbBeatNo: 0,
        startTimeTl: 0,
        startTimeBb: 0,
        tickBeatNo: 0,
        currentBeatId: "b0",
        tempo: {},
        topStaveTimeline: {},
        bottomStaveTimeline: {},
        lastTimelineBeatNo: 0,
        currentTickTimeSec: 0,
        nextBeatTickTimeSec: 0,
        audioTlBeatTime: 0,
        audioTickBeatTime: 0,
    }
    var config = {
        tsX: [61.5, 99.5, 139.5, 179.5, 219.5, 259.5, 299.5, 339.5, 379.5, 419.5, 459.5, 499.5, 539.5, 579.5, 619.5, 659.5, 699.5, 739.5],    
        tsBaseBeats: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35],
        tsBaseBeatDenom: 8,
        tsY: 0, 
        beatIdPrefix: "b",
        tweenIdPrefix: "tw",
        beatTweenIdPrefix: "btw",
        ballTweenIdPrefix: "bltw",
    }

    function ZScoreException(message) {
        this.message = message;
        this.name = 'ZScoreException';
    }
    function TsMapElement(xStart, xEnd, yStart, yEnd, beatStartNum, beatStartDenom, beatEndNum, beatEndDenom) {
        this.xStart = xStart;
        this.xEnd = xEnd;
        this.yStart = yStart;
        this.yEnd = yEnd;
        this.beatStartNum = beatStartNum;
        this.beatStartDenom = beatStartDenom;
        this.beatEndNum = beatEndNum;
        this.beatEndDenom = beatEndDenom;
    }

    // ---------  API -----------
    function onLoad() {
        log("onLoad: ");
        init();
    }
    function init() {
        if (!u || !n || !s || !a || !m) {
            throw new ZScoreException("Invalid libraries. Required: zsUtil, zsNet, zsSvg, zsAudio and zsMusic");
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
        initTempo();

        initTimeSpace();
        initTimelines();
        initTicker();

        // // onRepeat callback in a dummy tween
        // TweenMax.to({}, 0.25, {
        //     repeat: -1,
        //     onRepeat: function() {
        //       // ...
        //     }
        //   });
        
        //   // create a new ticker object
        //   var ticker = new com.greensock.Ticker(4);
        //   ticker.addEventListener("tick", function() {
        //     // ...
        //   });
        // gsap.ticker.add(myFunction);

        // function myFunction() {
        // //executes on every tick after the core engine updates
        // }

        // //to remove the listener later...
        // gsap.ticker.remove(myFunction);
    }
    function initTicker() {
        gsap.ticker.add(onTick);
    }  
    function initTicker() {
        gsap.ticker.add(onTick);
    }
    function onTick(time, deltaTime, frame) {
        state.currentTickTimeSec = time;
        if(!state.isRunning) {
            return;
        }
        if(isNextBeatTime()) {
            nextBeat();
        }
    }
    function isNextBeatTime() {
        if(state.nextBeatTickTimeSec === 0) {
            return false;
        }
        return state.currentTickTimeSec >= state.nextBeatTickTimeSec;
    }
    function nextBeat() {
        state.tickBeatNo++;
        state.audioTickBeatTime = a.getCurrentTime();
        var delta = state.audioTickBeatTime - state.audioTlBeatTime;
        log("Ticker beat: " + state.tickBeatNo + " tickTime: " + state.audioTickBeatTime + " delta: " + delta);
        var bpm = state.tempo.bpm;
        var beatDurationSec = m.getBeatDurationSec(bpm);        
        state.nextBeatTickTimeSec = state.currentTickTimeSec + beatDurationSec;
    }
    function initTempo() {
        state.tempo = new m.ZsTempo(80, m.NoteDuration.QUARTER);
    }  
    function onTimelineComplete() {
        log("onTimelineComplete");
        state.isRunning = false;
    }
    function initTimelines() {
        var topStaveTimeline = gsap.timeline({onComplete: onTimelineComplete, paused: true});
        // var topStaveTimeline = gsap.timeline();
        var bbMaps = state.tsBaseBeatMaps;
        var bbTweens = state.tsBaseBeatTweens;
        var lineId = "posLine";
        var ballId = "beatBall";
        var beatLineId = "beatLine";
        var tempoBeat = m.NoteDuration.QUARTER;
        var isFirstBeat = true;

        for (var beat in bbMaps){
            var bbMap = bbMaps[beat];            
            var bpm = state.tempo.bpm;
            var beatDurationSec = m.getBeatDurationSec(bpm);

            if(isFirstBeat) {
                var beatId = config.beatIdPrefix + 0;
                var endX = bbMap.xStart;
                var startBeatPositionLineTween = createPositionLineTween(lineId, 0, endX, beatId, 0);    
                topStaveTimeline.add(startBeatPositionLineTween, "<");
                var bbStartBeatPositionLineTween = createBbPositionLineTween(beatLineId, 0, endX, beatId, 0);  
                bbStartBeatPositionLineTween.resume();
                isFirstBeat = false;
            }

            var ballY = 84;
            var endX = bbMap.xEnd;
            var startBeat = bbMap.beatStartNum;
            var beatId = config.beatIdPrefix + startBeat;
            var tweenId = config.tweenIdPrefix + beatId;
            var beatPositionLineTween = createPositionLineTween(lineId, beatDurationSec, endX, beatId, startBeat);
            var beatPositionBallXTween = createPositionBallXTween(ballId, beatDurationSec, endX, beatId);
            var beatPositionBallYTween = createPositionBallYTween(ballId, beatDurationSec/2, ballY, beatId);
            var tweenId = beatPositionLineTween.vars.id;
            topStaveTimeline.addLabel(tweenId, ">");
            topStaveTimeline.add(beatPositionLineTween, ">");
            topStaveTimeline.add(beatPositionBallXTween, "<");
            topStaveTimeline.add(beatPositionBallYTween, tweenId);


            var bbTween = createBbPositionLineTween(beatLineId, beatDurationSec, endX, beatId, startBeat);
            bbTweens[startBeat] = bbTween;

            state.lastTimelineBeatNo = startBeat;
        }

        state.topStaveTimeline = topStaveTimeline;
    }
    function createPositionBallYTween(ballId, beatDurationSec, endY, beatId) {
        var tweenId = config.ballTweenIdPrefix + beatId;
        log("creating ball tween: " + tweenId);
        return gsap.to(u.toCssIdQuery(ballId), {
            duration: beatDurationSec,
            attr: {"cy":endY, "r":2},
            // ease: "sine.out",
            // ease: "slow(0.5, 0.8, false)",
            // ease: "power1.out",
            ease: "power1.out",
            autoAlpha: 0.5,
            repeat: 1, 
            yoyo: true,
        });
    }
    function createPositionBallXTween(ballId, beatDurationSec, endX, beatId) {
        var tweenId = config.ballTweenIdPrefix + beatId;
        log("creating ball tween: " + tweenId);
        return gsap.to(u.toCssIdQuery(ballId), {
            duration: beatDurationSec,
            attr: {"cx":endX},
            ease: "none",
        });
    }
    function createPositionLineTween(lineId, beatDurationSec, endX, beatId, beatNo) {
        var tweenId = config.tweenIdPrefix + beatId;
        log("creating tween: " + tweenId);
        return gsap.to(u.toCssIdQuery(lineId), {
            id: tweenId,
            duration: beatDurationSec,
            attr: {"x1":endX, "x2":endX},
            ease: "none",
            onStart: onBeatStart,
            onStartParams: [beatId, beatNo],
            onComplete: onBeatEnd,
            onCompleteParams: [beatId, beatNo],            
        });
    }
    function createBbPositionLineTween(lineId, beatDurationSec, endX, beatId, beatNo) {
        var tweenId = config.beatTweenIdPrefix + beatId;
        log("creating BB tween: " + tweenId);
        return gsap.to(u.toCssIdQuery(lineId), {
            id: tweenId,
            duration: beatDurationSec,
            attr: {"x1":endX, "x2":endX},
            ease: "none",
            paused: true,
            onStart: onBbBeatStart,
            onStartParams: [beatId, beatNo],
            onComplete: onBbBeatEnd,
            onCompleteParams: [beatId, beatNo],            
        });
    }
    function onNewBpm(bpm) {
        if(!u.isNumeric(bpm)) {
            return;
        }
        var previousBpm = state.tempo.bpm;
        state.tempo.bpm = bpm;
        onTempoChange(previousBpm, bpm);
    }
    function onTempoChange(previousBpm, bpm) {
        var ratio = bpm/previousBpm;        
        var tl = state.topStaveTimeline;
        var currentTimeScale = tl.timeScale();
        var newTimeScale = currentTimeScale * ratio;
        tl.timeScale(newTimeScale);

        var beatDurationSec = m.getBeatDurationSec(bpm);   
        log("####  new duration: " + beatDurationSec + " new ratio: " + ratio + " newTimeScale: " + newTimeScale)
        var currentBbBeatNo = state.currentBbBeatNo;
        var bbTween = state.tsBaseBeatTweens[currentBbBeatNo];
        if(!u.isNull(bbTween)) {
            bbTween.duration(beatDurationSec);
        }
        for (var beatNo in state.tsBaseBeatTweens){
            if(beatNo > currentBbBeatNo) {
                var bbTween = state.tsBaseBeatTweens[beatNo];
                bbTween.duration(beatDurationSec);
            }
        } 

     
        // var currentBeatNo = state.currentBeatNo;
        // var lastBeat = state.lastTimelineBeatNo;

        // for (var i = currentBeatNo; i <= lastBeat; i++) {
        //     var tid = config.tweenIdPrefix + config.beatIdPrefix + i;
        //     var tween = tl.getById(tid);
        //     if(u.isObject(tween)) {
        //         tween.duration(beatDurationSec);
        //     }
        // }
    }
    function onBeatStart(beatId, beatNo) {
        var currentTime = a.getCurrentTime();
        state.audioTlBeatTime = currentTime;
        log("onBeatStart: beat: " + beatId + " beatNo: " + beatNo + " beatTime: " + currentTime);
        setCurrentBeat(beatNo, beatId);
    }
    function onBeatEnd(beatId, beatNo) {
        var now = a.getCurrentTime();
        var diff = now - state.startTimeTl;
        log("onBeatEnd: beat: " + beatId + " beatNo: " + beatNo + " elapsedTime: " + diff);        
    }
    function onBbBeatStart(beatId, beatNo) {
        log("onBbBeatStart: beat: " + beatId + " beatNo: " + beatNo);
        state.currentBbBeatNo = beatNo;
        if(beatNo === 21) {
            onNewBpm(state.tempo.bpm + 20);
        }
    }
    function onBbBeatEnd(beatId, beatNo) {
        var now = a.getCurrentTime();
        var diff = now - state.startTimeTl;
        log("onBbBeatEnd: beat: " + beatId + " beatNo: " + beatNo + " elapsedTime: " + diff);
        var next = beatNo + 2;
        var bbTween = state.tsBaseBeatTweens[next];
        if(u.isObject(bbTween)) {
            bbTween.resume();
        }
    }
    function setCurrentBeat(beatNo, beatId) {
        if(!u.isNumeric(beatNo)) {
            return;
        }
        if(u.isNull(beatId)) {
            beatId = config.beatIdPrefix + beatNo;
        }
        state.currentBeatId = beatId;
        state.currentBeatNo = beatNo;
    }      
    function initTimeSpace() {
        for (var i = 0; i < config.tsX.length - 1; i++) {
            var xStart = config.tsX[i];
            var beatStartNum = config.tsBaseBeats[i];
            var xEnd = config.tsX[i + 1];
            var beatEndNum = config.tsBaseBeats[i + 1];
            var mapElement = new TsMapElement(xStart, xEnd, config.tsY, config.tsY, beatStartNum, config.tsBaseBeatDenom, beatEndNum, config.tsBaseBeatDenom);
            state.tsBaseBeatMaps[beatStartNum] = mapElement;
        }
    }
    function onPlayTopStave() {
        nextBeat();

        var beatNo = state.currentBeatNo;
        var bbTween = state.tsBaseBeatTweens[1];
        if(u.isObject(bbTween)) {
            state.startTimeBb = a.getCurrentTime();
            bbTween.resume();
        }
        
        var tl = state.topStaveTimeline;
        state.startTimeTl = a.getCurrentTime();
        tl.resume();
                
        state.isRunning = true;
    }
    function onTimeStep() {
        log("timeStep: ");
        // incrementBeatNo();
        var beat = state.currentBeatNo;
        var label = config.tweenIdPrefix + config.beatIdPrefix + beat;
        var labels = state.topStaveTimeline.labels;
        if(label in labels) {
            state.topStaveTimeline.seek(label);     
        } else {
            // onTimeStepManual(true);
        }
    }
    function onTimeStepManual(skipIncrement) {
        log("timeStep: ");

        if(!skipIncrement) {
            incrementBeatNo();
        }

        var beat = state.currentBeatNo;
        var beatMap = null;
        if(beat in state.tsBaseBeatMaps) {
            beatMap = state.tsBaseBeatMaps[beat];
        } else {
            var previousBeat = beat - 1;
            beatMap = state.tsBaseBeatMaps[previousBeat];
        }

        if(isNull(beatMap)) {
            logError("Can not find timeSpace map for beat: " + beat);
            return;
        }
        
        var x = 0;
        var startBeat = beatMap.beatStartNum;
        var diff = beat - startBeat;
        if(diff > 1 || diff < 0) {
            logError("Unexpected beat diff: " + diff + " for beat: " + beat);
            return;
        }

        if(diff === 0) {
            x = beatMap.xStart;
        } else {
            x = u.interpolateLinear(beatMap.xStart, beatMap.xEnd, 0.5);
        }
        setBeatLinePosition(x);
    }
    function setBeatLinePosition(x) {
        var pLine = u.getElement("posLine");
        if(isNull(pLine)) {
            return;
        }

        s.setLineX(pLine, x, x);
    } 
    function incrementBeatNo() {
        state.currentBeatNo++;
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
        onInstrumentSelect: function (instName) {
            log("onInstrumentSelect: " + instName);
        },
        onInstrumentControl: function (instName) {
            log("onInstrumentControl: " + instName);
        },
    }
}(zsUtil, zsNet, zsSvg, zsAudio, zsMusic, window, document));