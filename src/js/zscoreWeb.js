var zscore = (function (u, n, s, a, m, win, doc) {
    "use strict";

    // TODO set for prod when ready - gets rid of console logs
    const RUN_MODE = "DEV";
    const EMPTY = "";
    const BLANK = " ";
    const UNDERSCORE = "_";
    const AV = "AV";
    const FULL_SCORE = "FullScore";
    const CONNECTED = "Connected";
    const LOADING = "Loading";
    const READY = "READY";
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
    const PAGE_NO_CONTINUOUS = 6666;
    const PAGE_ID_CONTINUOUS = "p" + PAGE_NO_CONTINUOUS;

    const EVENT_ID_PART_REG = "PART_REG";
    const EVENT_ID_PART_READY = "PART_READY";
    const EVENT_ID_PING = "PING";
    const EVENT_PARAM_PART = "part";
    const EVENT_PARAM_SERVER_TIME = "serverTime";

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
    var config = {
        connectionPreference: "ws,sse,poll",
        defaultConnectionType: n.WEBSOCKET,
        appUrlHttp: "/htp",
        appUrlSse: "/sse",
        appUrlWebsockets: "/wsoc",
        pageNoToken: "@PgNo@",
        pageIdPrefix: "p",
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
        connectedBtnAttrib: { "filter": "" },
        disconnectedBtnAttrib: { "filter": "url(#dropshadow)" },
        errorBtnAttrib: { "filter": "url(#dropshadow)" },
    }
    var state = {
        isRunning: false,
        isReady: false,
        score: { title: "ZScore", noSpaceTitle: "ZScore", instrument: "Part View", parts: ["Part View"], firstPageNo: 1, lastPageNo: 2},
        part: {name: "Part View", imgDir: null, imgPageNameToken: null, imgContPageName: null, contPageNo: 6666, pageRanges: [{start: 1, end: 1}], pages: {}},
        topStave: { pageId: "0", filename: "img/blankStave.png", timeSpaceMap: {} },
        bottomStave: { pageId: "0", filename: "img/blankStave.png", timeSpaceMap: {} },
        tsBaseBeatMaps: {},
        startTimeTl: 0,
        currentBeatId: "b0",
        tempo: 0,
        scoreDir: "/score/",
        topStaveTimeline: {},
        bottomStaveTimeline: {},
        lastTimelineBeatNo: 0,
        currentTickTimeSec: 0,
        nextBeatTickTimeSec: 0,
        audioTlBeatTime: 0,
        audioTickBeatTime: 0,
        isConnected: false,
        isInitialised: false,
        connectionType: null,
        pageNoToLoad: 0,
    }

    function ZScoreException(message) {
        this.message = message;
        this.name = 'ZScoreException';
    }
    function ZsTsMapElement(xStart, xEnd, yStart, yEnd, beatStartNum, beatStartDenom, beatEndNum, beatEndDenom) {
        this.xStart = xStart;
        this.xEnd = xEnd;
        this.yStart = yStart;
        this.yEnd = yEnd;
        this.beatStartNum = beatStartNum;
        this.beatStartDenom = beatStartDenom;
        this.beatEndNum = beatEndNum;
        this.beatEndDenom = beatEndDenom;
    }
    function ZsPage(id, no, imgFileName, imgFileUrl) {
        this.id = id;
        this.no = no;
        this.imgFileName = imgFileName;
        this.imgFileUrl = imgFileUrl;
        this.isLoaded = false;        
        this.img = new Image();
        this.img.pageId = id;
    }
    ZsPage.prototype.loadImg = function (imgFileUrl) {        
        this.img.src = imgFileUrl;
        this.img.onload = function() {
            log("pageImgOnLoad: id: " + this.pageId);
            onPageImageLoad(this.pageId);
        }         
    };

    function PartBtnAttrs(btnNo, partName) {
        this.id = "partBtn" + btnNo;
        this.class = "partListButton";
        this.onclick = "onPartSelect('" + partName + "')";
    }
    function EventParams() {
    }

    // ---------  API -----------
    function init() {
        if (state.isInitialised) {
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
        if (state.isInitialised) {
            log("onStateBtnClick: zscore initialised");
            if (!n.isConnected()) {
                log("onStateBtnClick: zscore not connected, reconnecting...");
                reconnect();
            }
        } else {
            log("onStateBtnClick: initialising");
            init();
        }
    }
    function onPartSelection(part) {
        if (!u.arrContains(state.score.parts, part)) {
            log("onPartSelection: unexpected part: " + part);
            return;
        }
        state.part.name = part;
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
        switch (connState) {
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
        if (!isNull(rect)) {
            setElementStyleProperty(rect, rectStyle);
        }
        var btn = u.getElement(config.idServerStatusBtn);
        if (!isNull(btn)) {
            setElementAttributes(btn, btnStyle);
        }
        var txt = u.getElement(config.idServerStatusTxt);
        if (!isNull(txt)) {
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
        if (isNull(connType)) {
            connType = config.defaultConnectionType;
        }
        return connType;
    }
    function processServerState(serverState, isDeltaUpdate) {
        if (!state.isConnected) {
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
        if (isNotNull(serverState.partInfo)) {
            processPartInfo(serverState.partInfo);
        }
        if (isNotNull(serverState.pageInfo)) {
            processPageinfo(serverState.pageInfo);
        }
        if (isNotNull(serverState.actions)) {
            processSeverActions(serverState.actions);
        }
    }
    function processScoreInfo(scoreInfo) {
        if (!u.isObject(scoreInfo)) {
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
        if (isNotNull(scoreInfo.scoreDir)) {
            setScoreDir(scoreInfo.scoreDir);
        }
    }
    function setTitle(title) {
        if (state.score.title === title) {
            return;
        }
        state.score.title = title;
        state.score.noSpaceTitle = u.replaceEmptySpaces(title, UNDERSCORE);
        s.setElementText(config.idTitle, title);
    }
    function setScoreDir(scoreDir) {
        if (state.scoreDir === scoreDir) {
            return;
        }
        state.scoreDir = scoreDir;
    }
    function setBpm(bpm) {
        if (state.tempo === bpm) {
            return;
        }
        state.tempo = bpm;
        s.setElementText(config.idTempoBpm, bpm);
    }
    function processPageinfo(pageInfo) {
        if (isNull(pageInfo.staveId)) {
            return;
        }
        var staveId = pageInfo.staveId;
        var stave = state[staveId];
        if(isNull(stave)) {
            logError("processPageinfo: Invalid stave for id: {}", staveId);
            return;
        }
        if (isNotNull(pageInfo.filename)) {
            stave.filename = pageInfo.filename;
        }
        if (isNotNull(pageInfo.pageId)) {
            stave.pageId = pageInfo.filename;
        }
        showStave(stave);
    }
    function showStave(stave) {
        if(isNull(stave)) {
            return;
        }

    }
    function onPageImageLoad(pageId) {
        var page = state.part.pages[pageId]
        if(isNotNull(page)) {
            page.isLoaded = true;
        }

        state.pageNoToLoad--;
        if(state.pageNoToLoad === 0) {
            onPageLoadComplete();
        }
        notifyPageLoadListeners(state.pageNoToLoad);
    }
    function notifyPageLoadListeners(noPagesToLoad) {
        if(noPagesToLoad > 0) {
            var txt = LOADING + " " + noPagesToLoad;
            setServerStatusView(config.errorRectStyle, config.errorBtnAttrib, config.errorTxtStyle, txt);
        } else {
            setServerStatusView(config.connectedRectStyle, config.connectedBtnAttrib, config.connectedTxtStyle, READY);
        }
    }
    function onPageLoadComplete() {
        log("onPageLoadComplete: ");
        var pages = state.part.pages;
        var isOk = true;
        for (var key in pages) {
            if (pages.hasOwnProperty(key)) {
                var page = pages[key];
                if(!page.isLoaded) {
                    log("onPageLoadComplete: page: " + key + " is not loaded, retying load");
                    loadPageNo(page.no);
                    isOk = false;
                }
            }
        }
        if(isOk) {
            log("All Pages loaded: ");
            state.isReady = true;
            sendReady();
        }
    }
    function processPartInfo(partInfo) {
        if (isNotNull(partInfo.name)) {
            state.part.name = partInfo.name;
            s.setElementText(config.idInstrument, partInfo.name);
        }
        if (isNotNull(partInfo.pageRanges)) {
            var pgRanges = partInfo.pageRanges;
            if (u.isArray(pgRanges)) {
                for (var i = 0; i < pgRanges.length; i++) {
                    addInstrumentPageRange(pgRanges[i]);
                }
            } else {
                addInstrumentPageRange(pgRanges);
            }
        }
        if (isNotNull(partInfo.imgDir)) {
            state.part.imgDir = partInfo.imgDir;
        }
        if (isNotNull(partInfo.imgPageNameToken)) {
            state.part.imgPageNameToken = partInfo.imgPageNameToken;
        }
        if (isNotNull(partInfo.imgContPageName)) {
            state.part.imgContPageName = partInfo.imgContPageName;
        }
        if (isNotNull(partInfo.contPageNo)) {
            state.part.contPageNo = partInfo.contPageNo;
        }
        loadPartPages();
    }
    function loadPartPages() {
        var part = state.part;
        var pageRanges = part.pageRanges;
        if(!u.isArray(pageRanges)) {
            return;
        }
        for (var i = 0; i < pageRanges.length; i++) {
            loadPageRange(pageRanges[i]);
        }
        loadContinuousPage();
    }
    function loadContinuousPage() {
        var page = getOrCreateContPage();
        state.pageNoToLoad++;
        loadPage(page);
    }
    function loadPageRange(pgRange) {
        if(!u.isObject(pgRange)) {
            return;
        }
        var startPage = 1;
        var endPage = 1;
        if(isNotNull(pgRange.start)) {
            startPage = u.toInt(pgRange.start);
        }
        if(isNotNull(pgRange.end)) {
            endPage = u.toInt(pgRange.end)
        }
        var pagesToLoad = state.pageNoToLoad + (endPage - startPage + 1);
        state.pageNoToLoad = pagesToLoad;
        for (var i = startPage; i <= endPage; i++) {
            loadPageNo(i);
        }
    }
    function loadPageNo(pageNo) {
        var page = getOrCreatePage(pageNo); 
        loadPage(page);
    }
    function loadPage(page) {
        if(isNull(page)) {
            return;
        }
        var imgUrl = page.imgFileUrl;
        if(isNull(imgUrl)) {
            return;
        }
        page.loadImg(imgUrl, page.id);
    }
    function getOrCreatePage(pageNo) {
        var pageId = createPageId(pageNo);
        var page = state.part.pages[pageId];
        if(isNotNull(page)) {
            return page;
        }
        var imgFileName = state.part.imgPageNameToken;
        if(isNull(imgFileName)) {
            imgFileName = createDefaultPageImgFileName(pageNo);
        } else {
            imgFileName = u.replace(imgFileName, config.pageNoToken, ""+pageNo);
        }
        var imgFileUrl = state.part.imgDir + imgFileName;
        var page = new ZsPage(pageId, pageNo, imgFileName, imgFileUrl)
        state.part.pages[pageId] = page;
        return page;
    }
    function getOrCreateContPage() {
        var pageNo = state.part.contPageNo;
        var pageId = createPageId(pageNo);
        var page = state.part.pages[pageId];
        if(isNotNull(page)) {
            return page;
        }
        var imgFileName = state.part.imgContPageName;
        var imgFileUrl = state.part.imgDir + imgFileName;
        var page = new ZsPage(pageId, pageNo, imgFileName, imgFileUrl)
        state.part.pages[pageId] = page;
        return page;
    }
    function createDefaultPageImgFileName(pageNo) {
        return state.score.noSpaceTitle  + UNDERSCORE + instrumentName + "_page" + pageNo + ".png";
    }
    function createPageId(pageNo) {
        return config.pageIdPrefix + pageNo;
    }
    function addInstrumentPageRange(pgRange) {
        if (isNull(pgRange) || isNull(pgRange.start) || isNull(pgRange.end)) {
            return;
        }
        var startPage = pgRange.start;
        var endPage = pgRange.end;
        var pr = {start: startPage, end: endPage};
        state.part.pageRanges = [];
        state.part.pageRanges.push(pr);
    }
    function processinstruments(instruments) {
        var parts = [];
        if (!u.isArray(instruments)) {
            parts.push(instruments);
        } else {
            parts = instruments;
        }
        if (!u.arrEquals(state.score.parts, parts)) {
            state.score.parts = parts;
        }
        if (isInstrumentInScore(parts)) {
            registerPart(state.part.name);
            return;
        }
        showParts(parts);
    }
    function isInstrumentInScore(parts) {
        if (isNull(state.part.name) || !u.isArray(parts)) {
            return false;
        }
        var instrument = state.part.name;
        for (var i = 0; i < parts.length; i++) {
            if (instrument === parts[i]) {
                return true;
            }
        }
        return false;
    }
    function showParts(parts) {
        var partsElement = u.getElement(config.idParts);
        if (isNull(partsElement)) {
            return;
        }
        u.removeElementChildren(partsElement);
        for (var i = 0; i < parts.length; i++) {
            var part = parts[i];
            if (u.arrContains(config.filterOutParts, part)) {
                continue;
            }
            var attrs = new PartBtnAttrs(i + 1, part);
            var btnDiv = u.createDiv();
            var partBtn = u.createButton(attrs);
            u.setText(partBtn, part);
            u.addChildToParent(btnDiv, partBtn);
            u.addChildToParent(partsElement, btnDiv);
        }
        u.makeVisible(config.idPartsListOuterDiv);
    }
    function registerPart(part) {
        var evParams = new EventParams();
        evParams[EVENT_PARAM_PART] = part;
        n.sendEvent(EVENT_ID_PART_REG, evParams);
    }
    function sendReady() {
        var evParams = new EventParams();
        evParams[EVENT_PARAM_PART] = state.part.name;
        n.sendEvent(EVENT_ID_PART_READY, evParams);
    }
    function sendPing(serverTime) {
        var evParams = new EventParams();
        evParams[EVENT_PARAM_SERVER_TIME] = serverTime;
        n.sendEvent(EVENT_ID_PING, evParams);
    }
    function processSeverActions(actions) {
        var id = null;
        var type = null;
        var targets = [];
        var params = {};
        if (u.isArray(actions)) {
            for (var i = 0; i < actions.length; i++) {
                var action = actions[i];
                if (isNotNull(action.type)) {
                    type = action.type;
                }
                if (isNotNull(action.targets)) {
                    targets = action.targets;
                }
                if (isNotNull(action.params)) {
                    params = action.params;
                }
                doAction(type, targets, params);
            }
        }
    }
    function doAction(actionType, targets, params) {
        u.logDebug("doAction: " + actionType);

        if (isNull(actionType)) {
            return;
        }

        switch (actionType) {
            case "PING":
                onPing(params);
                break;
            default:
                logError("doAction: Unknown actionType: " + actionType);
        }
    }
    function onPing(params) {
        if (!u.isObject(params)) {
            return;
        }
        if (isNotNull(params.sendTimeMs)) {
            sendPing(params.sendTimeMs);
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