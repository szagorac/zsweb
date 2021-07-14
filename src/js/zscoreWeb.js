var zscore = (function (u, n, s, a, m, win, doc) {
    "use strict";

    // TODO set for prod when ready - gets rid of console logs
    const RUN_MODE = "DEV";
    const EMPTY = "";
    const BLANK = " ";
    const CONNECTED = "Connected";
    const CONNECT = "Connect";
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
        tempo: {},
        topStaveTimeline: {},
        bottomStaveTimeline: {},
        lastTimelineBeatNo: 0,
        currentTickTimeSec: 0,
        nextBeatTickTimeSec: 0,
        audioTlBeatTime: 0,
        audioTickBeatTime: 0,
        instrument: "Part View",
        title: "ZScore",
        isConnected: false,
        isInitialised: false,
        reconnectAttmpts: 0,
        connectionType: null,
    }
    var config = {
        connectionPreference: "ws,sse,poll",
        defaultConnectionType: n.WEBSOCKET,
        appUrlHttp: "/htp",
        appUrlSse: "/sse",
        appUrlWebsockets: "/wsoc",
        reconnectTimeMultiplierMs: 10,
        reconnectMaxTimeMs: 5000,
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
        connectedRectStyle: { "fill": FILL_CONNECTED, "stroke": STROKE_CONNECTED, "stroke-width": "0px", "visibility": "visible", "opacity": 1 },
        disconnectedRectStyle: { "fill": FILL_DISCONNECTED, "stroke": STROKE_DISCONNECTED, "stroke-width": "1px", "visibility": "visible", "opacity": 1 },
        errorRectStyle: { "fill": FILL_ERROR, "stroke": STROKE_ERROR, "stroke-width": "1px", "visibility": "visible", "opacity": 1 },
        connectedTxtStyle: { "fill": TXT_FILL_CONNECTED },
        disconnectedTxtStyle: { "fill": TXT_FILL_DISCONNECTED },
        errorTxtStyle: { "fill": TXT_FILL_DISCONNECTED },
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

    // ---------  API -----------
    function onLoad() {
        log("onLoad: ");
        init();

        if(!state.isConnected) {
            reconnect();
        }        
    }
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
        onError(connType);   
    }
    function onConnected(connType) {
        state.isConnected = true;
        state.connectionType = connType;
        state.reconnectAttmpts = 0;
        setServerStatusView(config.connectedRectStyle, config.connectedBtnAttrib, config.connectedTxtStyle, CONNECTED);
    }
    function onDisconnected(connType) {
        state.isConnected = false;
        setServerStatusView(config.disconnectedRectStyle, config.disconnectedBtnAttrib, config.disconnectedTxtStyle, CONNECT);
        reconnect(connType);
    }
    function onError(connType) {
        state.isConnected = false;
        setServerStatusView(config.idServerStatusRect, config.errorBtnAttrib, config.disconnectedTxtStyle, ERROR);
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
        state.reconnectAttmpts++;        
        var timeout = getReconnectionTimeout();        
        log("reconnect: scheduling reconnect in: " + timeout + " ms");
        setTimeout(function() {
            n.reconnect(connType);
        }, timeout);
    }
    function getReconnectionTimeout() {
        var timeout = config.reconnectTimeMultiplierMs * state.reconnectAttmpts; 
        if(timeout > config.reconnectMaxTimeMs) {
            timeout = config.reconnectMaxTimeMs;
        }
        return timeout;
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
        if (isNotNull(serverState.actions)) {
            processSeverActions(serverState.actions);
        }
    }
    function processScoreInfo(scoreInfo) {
        if(!u.isObject(scoreInfo)) {
            return;
        }
        if (isNotNull(scoreInfo.title)) {
            var title = scoreInfo.title;
            setTitle(title);
        }

        // private List<String> instruments;
        // private int bpm;
    }
    function setTitle(title) {
        var element = u.getElement(config.idTitle);
        if(isNull(element)) {
            return;
        }
        element.textContent = title;
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