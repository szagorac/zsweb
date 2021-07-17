var zscore = (function (u, n, s, a, m, win, doc) {
    "use strict";

    // TODO set for prod when ready - gets rid of console logs
    const RUN_MODE = "DEV";
    const EMPTY = "";
    const BLANK = " ";
    const AV = "AV";
    const FULL_SCORE = "FullScore";
    const CONNECTED = "Connected";
    const CONNECT = "Connect";
    const RECONNECTING = "Reconnecting";
    const ERROR = "Error";
    const CLR_GREEN = "green";
    const CLR_RED = "red";
    const CLR_ORANGE = "orange";
    const CLR_WHITE = "white";
    const CLR_BLACK = "black";
    const FILL_CONNECTED = CLR_GREEN;
    const FILL_DISCONNECTED = CLR_RED;
    const FILL_ERROR = CLR_ORANGE;
    const STROKE_CONNECTED = CLR_GREEN;
    const STROKE_DISCONNECTED = CLR_RED;
    const STROKE_ERROR = CLR_ORANGE;
    const TXT_FILL_CONNECTED = CLR_WHITE;
    const TXT_FILL_DISCONNECTED = CLR_WHITE;
    const TXT_FILL_ERROR = CLR_BLACK;
    const COUNTER_TOKEN = "@CNT@";
    const PART_TOKEN = "@PART@";

    const EVENT_ID_PART_REG= "PART_REG";
    const EVENT_PARAM= "part";
   
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
        startTimeTl: 0,
        currentBeatId: "b0",
        tempo: 0,
        topStaveTimeline: {},
        bottomStaveTimeline: {},
        lastTimelineBeatNo: 0,
        currentTickTimeSec: 0,
        nextBeatTickTimeSec: 0,
        audioTlBeatTime: 0,
        audioTickBeatTime: 0,
        parts: [],
        instrument: "Part View",
        title: "ZScore",
        isConnected: false,
        isInitialised: false,
        connectionType: null,
    }
    var config = {
        connectionPreference: "ws,sse,poll",
        defaultConnectionType: n.WEBSOCKET,
        appUrlHttp: "/htp",
        appUrlSse: "/sse",
        appUrlWebsockets: "/wsoc",
        tsBaseBeatDenom: 8,
        tsY: 0, 
        beatIdPrefix: "b",
        tweenIdPrefix: "tw",
        beatTweenIdPrefix: "btw",
        ballTweenIdPrefix: "bltw",
        idTitle: "title",
        idServerStatusRect: "srvrStatusRect",
        idServerStatusTxt: "srvrStatusTxt",
        idServerStatusBtn: "srvrStatBtn",
        idParts: "parts",
        idPartsListOuterDiv: "partListOuterDiv",
        idInstrument: "part",
        idTempoBpm: "tmpBpm",
        filterOutParts: [AV, FULL_SCORE],
        connectedRectStyle: { "fill": FILL_CONNECTED, "stroke": STROKE_CONNECTED, "stroke-width": "0px", "visibility": "visible", "opacity": 1 },
        disconnectedRectStyle: { "fill": FILL_DISCONNECTED, "stroke": STROKE_DISCONNECTED, "stroke-width": "1px", "visibility": "visible", "opacity": 1 },
        errorRectStyle: { "fill": FILL_ERROR, "stroke": STROKE_ERROR, "stroke-width": "1px", "visibility": "visible", "opacity": 1 },
        connectedTxtStyle: { "fill": TXT_FILL_CONNECTED },
        disconnectedTxtStyle: { "fill": TXT_FILL_DISCONNECTED },
        errorTxtStyle: { "fill": TXT_FILL_ERROR },
        connectedBtnAttrib: { "filter": ""},
        disconnectedBtnAttrib: { "filter": "url(#dropshadow)"},
        errorBtnAttrib: { "filter": "url(#dropshadow)"},
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
    function PartBtnAttrs(btnNo, partName) {
        this.id = "partBtn"+btnNo;
        this.class = "partListButton";
        this.onclick = "onPartSelect('"+partName+"')";
    }
    function EventParams() {
    }    

    // ---------  API -----------
    function init() {
        if(state.isInitialised) {
            return;
        } 
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

        //init libs
        initNet();
        initSvg();
        initAudio();

        state.isInitialised = true;
    }
    function onStateBtnClick() {
        if(state.isInitialised) {
            log("onStateBtnClick: zscore initialised");
            if(!n.isConnected()) {                
                log("onStateBtnClick: zscore not connected, reconnecting...");
                reconnect();
            }
        } else {
            log("onStateBtnClick: initialising");
            init();
        }
    }
    function onPartSelection(part) {
        if(!u.arrContains(state.parts, part)) {
            log("onPartSelection: unexpected part: " + part);
            return;
        }
        state.instrument = part;
        registerPart(part);
        u.makeInVisible(config.idPartsListOuterDiv);
    }
    function onInstrumentSelection(instrument) {
        
    }
    function resetAll() {
        resetAudio();
    }
    function initNet() {
        n.init(config.connectionPreference, config.appUrlSse, config.appUrlWebsockets, config.appUrlHttp, processServerState, onConnectionEvent);
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
    function onWindowResize(event) {
        if (!u.isObject(this)) {
            return null;
        }       
    }
    function onConnectionEvent(connState, connType) {
        switch(connState) {
            case n.OPEN:
                onConnectionOpen(connType);
                break;
            case n.CLOSED:
                onConnectionClosed(connType);
                break;                
            case n.ERROR:
                onConnectionError(connType);
                break;                                
            default:
                logError("Unknown Connection Event State: " + connState + " for type: " + connType);
        }
    } 
    function onConnectionOpen(connType) {
        log(connType + " connection opened.");        
        onConnected(connType);
    }
    function onConnectionClosed(connType) {
        log(connType + " connection closed.");
        onDisconnected(connType);
    }
    function onConnectionError(connType) {
        log(connType + " connection error.");     
        onConError(connType);   
    }
    function onConnected(connType) {
        state.isConnected = true;
        state.connectionType = connType;
        state.reconnectAttmpts = 0;
        setServerStatusView(config.connectedRectStyle, config.connectedBtnAttrib, config.connectedTxtStyle, CONNECTED);
    }
    function onDisconnected(connType) {
        state.isConnected = false;
        setServerStatusView(config.disconnectedRectStyle, config.disconnectedBtnAttrib, config.disconnectedTxtStyle, RECONNECTING);
        reconnect(connType);
    }
    function onConError(connType) {
        state.isConnected = false;
        setServerStatusView(config.errorRectStyle, config.errorBtnAttrib, config.errorTxtStyle, ERROR);
        reconnect(connType);
    }
    function setServerStatusView(rectStyle, btnStyle, txtStyle, txtVal) {
        var rect = u.getElement(config.idServerStatusRect);
        if(!isNull(rect)) {
            setElementStyleProperty(rect, rectStyle);
        }
        var btn = u.getElement(config.idServerStatusBtn);
        if(!isNull(btn)) {
            setElementAttributes(btn, btnStyle);
        }
        var txt = u.getElement(config.idServerStatusTxt);
        if(!isNull(txt)) {
            setElementStyleProperty(txt, txtStyle);
            txt.textContent = txtVal;
        }    
    }
    function reconnect(connType) {
        n.reconnect(connType, true);
    }
    function closeConnection(connType) {
        n.closeConnection(connType);
    }
    function getConnectionType() {
        var connType = state.connectionType;
        if(isNull(connType)) {
            connType = config.defaultConnectionType;
        }
        return connType;
    }
    function processServerState(serverState, isDeltaUpdate) {
        if(!state.isConnected) {
            onConnected();
        }
        if (isNull(serverState)) {
            return;
        }
        if (!isDeltaUpdate) {
            resetAll();
        }
        if (isNotNull(serverState.scoreInfo)) {
            processScoreInfo(serverState.scoreInfo);
        }
        if (isNotNull(serverState.part)) {
            processPart(serverState.part);
        }
        if (isNotNull(serverState.actions)) {
            processSeverActions(serverState.actions);
        }
    }
    function processScoreInfo(scoreInfo) {
        if(!u.isObject(scoreInfo)) {
            return;
        }
        if (isNotNull(scoreInfo.title)) {
            setTitle(scoreInfo.title);
        }
        if (isNotNull(scoreInfo.instruments)) {
            processinstruments(scoreInfo.instruments);
        }
        if (isNotNull(scoreInfo.bpm)) {
            setBpm(scoreInfo.bpm);
        }
    }
    function setTitle(title) {
        if(state.title === title) {
            return;
        }
        state.title = title;
        s.setElementText(config.idTitle, title);
    }
    function setBpm(bpm) {
        if(state.tempo === bpm) {
            return;
        }
        state.tempo = bpm;
        s.setElementText(config.idTempoBpm, bpm);
    }
    function processPart(part) {
        state.instrument = part;
        s.setElementText(config.idInstrument, part);
    }  
    function processinstruments(instruments) {
        var parts = [];
        if(!u.isArray(instruments)) {
            parts.push(instruments);
        } else {
            parts = instruments;
        }
        if(!u.arrEquals(state.parts, parts)) {
            state.parts = parts;
        }
        if(isInstrumentInScore(parts)) {
            registerPart(state.instrument);
            return;
        }
        showParts(parts);
    }
    function isInstrumentInScore(parts) {
        if(isNull(state.instrument) || !u.isArray(parts)) {
            return false;
        }
        var instrument = state.instrument;
        for (var i = 0; i < parts.length; i++) {
            if(instrument === parts[i]) {
                return true;
            }
        }
        return false;
    }
    function showParts(parts) {
        var partsElement = u.getElement(config.idParts);
        if(isNull(partsElement)) {
            return;
        }
        u.removeElementChildren(partsElement);
        for (var i = 0; i < parts.length; i++) {
            var part = parts[i];
            if(u.arrContains(config.filterOutParts, part)) {
                continue;
            }
            var attrs = new PartBtnAttrs(i+1, part);            
            var btnDiv = u.createDiv();
            var partBtn = u.createButton(attrs);
            u.setText(partBtn, part);
            u.addChildToParent(btnDiv, partBtn);
            u.addChildToParent(partsElement, btnDiv);
        }        
        u.makeVisible(config.idPartsListOuterDiv);
    }
    function registerPart(part) {
        //TODO send to server
        var evParams = new EventParams();
        evParams[EVENT_PARAM] = part;
        n.sendEvent(EVENT_ID_PART_REG, evParams);
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
            case "TIMELINE":
                // timeline(id, elementIds, params);
                break;
            default:
                logError("doAction: Unknown actionType: " + actionType);
        }
    }    
    function setElementStyleProperty(element, attrAssocArr) {
        u.setElementStyleProperty(element, attrAssocArr);
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
        onStateBtn: function () {
            onStateBtnClick();
        },
        onPartSelect: function (part) {
            onPartSelection(part);
        },
        onInstrumentSelect: function (instrument) {
            onInstrumentSelection(instrument);
        },
    }
}(zsUtil, zsNet, zsSvg, zsAudio, zsMusic, window, document));