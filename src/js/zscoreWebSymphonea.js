var zscore = (function (u, n, s, a, m, win, doc) {
    "use strict";

    // TODO set for prod when ready - gets rid of console logs
    const RUN_MODE = "dev";
    const EMPTY = "";
    const UNDERSCORE = "_";
    const SLASH = "/";
    const AV = "AV";
    const FULL_SCORE = "FullScore";
    const CONNECTED = "Connected";
    const LOADING = "Loading";
    const READY = "READY";
    const RECONNECTING = "Reconnecting";
    const ERROR = "Error";
    const VISIBLE = "visible";
    const HIDDEN = "hidden";
    const NONE = "none";
    const X = "x";
    const Y = "y";
    const X1 = "x1";
    const X2 = "x2";
    const DX = "dx";
    const DY = "dy";
    const WIDTH = "width";
    const TL_START_OF_PREVIOUS = "<";
    const TL_END_OF_PREVIOUS = ">";
    const CLR_GREEN = "green";
    const CLR_RED = "red";
    const CLR_ORANGE = "orange";
    const CLR_YELLOW = "yellow";
    const CLR_WHITE = "white";
    const CLR_BLACK = "black";
    const CLR_BLUE = "blue";
    const CLR_GREY = "grey";
    const CLR_LIGHT_GREY = "lightgrey";
    const CLR_NONE = NONE;
    const FILL_ACTIVE = CLR_NONE;
    const FILL_INACTIVE = CLR_WHITE;
    const FILL_CONNECTED = CLR_GREEN;
    const FILL_DISCONNECTED = CLR_RED;
    const FILL_ERROR = CLR_ORANGE;
    const STROKE_ACTIVE = CLR_BLUE;
    const STROKE_INACTIVE = CLR_GREY;
    const STROKE_CONNECTED = CLR_GREEN;
    const STROKE_DISCONNECTED = CLR_RED;
    const STROKE_ERROR = CLR_ORANGE;
    const TXT_FILL_CONNECTED = CLR_WHITE;
    const TXT_FILL_DISCONNECTED = CLR_WHITE;
    const TXT_FILL_ERROR = CLR_BLACK;
    const PAGE_NO_CONTINUOUS = 6666;
    const LS_CLIENT_ID_KEY = "zsClientId";

    const EVENT_ID_HELLO = "HELLO";
    const EVENT_ID_PART_REG = "PART_REG";
    const EVENT_ID_PART_READY = "PART_READY";
    const EVENT_ID_PING = "PING";
    const EVENT_ID_SELECT_ISLOT = "SELECT_ISLOT";
    const EVENT_ID_SELECT_SECTION = "SELECT_SECTION";
    const EVENT_PARAM_PART = "part";
    const EVENT_PARAM_SERVER_TIME = "serverTime";
    const EVENT_PARAM_IS_ACTIVE = "isActive";
    const EVENT_PARAM_IS_PLAY = "isPlay";
    const EVENT_PARAM_BEAT_NO = "beatNo";
    const EVENT_PARAM_CSV_INSTRUMENTS = "csvInstruments";
    const EVENT_PARAM_SLOT_NO = "slotNo";
    const EVENT_PARAM_SLOT_INSTRUMENT = "slotInstrument";
    const EVENT_PARAM_OVERLAY_TYPE = "overlayType";
    const EVENT_PARAM_OVERLAY_ELEMENT = "overlayElement";
    const EVENT_PARAM_OVERLAY_LINE_Y = "overlayLineY";
    const EVENT_PARAM_IS_ENABLED = "isEnabled";
    const EVENT_PARAM_OPACITY = "opacity";
    const EVENT_PARAM_COLOUR = "colour";
    const EVENT_PARAM_SECTION = "section";
    const EVENT_PARAM_CLIENT_ID = "clientId";
    const EVENT_PARAM_TRANSPOSITION = "transposition";
    const EVENT_PARAM_TEXT_L1 = "l1";
    const EVENT_PARAM_TEXT_L2 = "l2";
    const EVENT_PARAM_TEXT_L3 = "l3";
    const EVENT_PARAM_VOTE_COUNT = "voteCount";
    const EVENT_PARAM_VOTER_NO = "voterNo";


    const DEFAULT_PAGE_IMG_URL = "img/blankStave.png";
    const DEFAULT_PAGE_ID = "p0";

    const STRATEGY_BUILDER = "BUILDER";
    const STRATEGY_RND = "RND";
    const STRATEGY_DYNAMIC = "DYNAMIC";

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
        partNameToken: "@Part@",
        pageNoToken: "@PgNo@",
        instToken: "@Inst@",
        slotNoToken: "@SlotNo@",
        pageIdPrefix: "p",
        meterBoxDefaultWidth: 1,
        meterBoxSizeDimension: "height",
        meterMaxVotes: 10,
        meterBoxMaxSize: 35,
        tsBaseBeatDenom: 8,
        tsY: 0,
        textSpanFadeTimeSec: 1.0,
        textSpanFadeStaggerTimeSec: 0.5,
        textSpanIsFadeIn: true,
        transpoLetterDy: "0.35em",
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
        idSections: "sections",
        idSectionsListOuterDiv: "sectionListOuterDiv",
        idSectionBtnPrefix: "sectionBtn",
        idOwnedSections: "ownedSections",
        idInstrument: "part",
        idInstControls: "instControls",
        idTranspoControls: "transpositionListOuterDiv",
        idInstSlotPrefix: "instSlot",
        idInstSlotTxtPrefix: "instSlotTxt",
        idInstSlotBtnPrefix: "instSlotRect",
        idTempoBpm: "tmpBpm",
        idSemaphorePrefix: "semC",
        idLineSuffix: "Line",
        idBridgeSuffix: "Bridge",
        idOrdSuffix: "Ord",
        idMidSuffix: "Mid",
        idRectSuffix: "Rect",
        idTxtSuffix: "Txt",
        idTxtLineSuffix: "TxtLn",        
        idClientIdGroup: "clientIdGroup",
        idClientId: "clientId",
        idTranspoKey: "transpoKey",
        idTranspoMod: "transpoMod",
        idTranspoInfo: "transpoInfo",
        blankPageUrl: "img/blankStave.png",
        audienceMeterUpBoxId: "audienceMeterUpBox",
        audienceMeterDownBoxId: "audienceMeterDownBox",
        filterOutParts: [AV, FULL_SCORE],
        connectedRectStyle: { "fill": FILL_CONNECTED, "stroke": STROKE_CONNECTED, "stroke-width": "0px", "visibility": VISIBLE, "opacity": 1 },
        disconnectedRectStyle: { "fill": FILL_DISCONNECTED, "stroke": STROKE_DISCONNECTED, "stroke-width": "1px", "visibility": VISIBLE, "opacity": 1 },
        errorRectStyle: { "fill": FILL_ERROR, "stroke": STROKE_ERROR, "stroke-width": "1px", "visibility": VISIBLE, "opacity": 1 },
        connectedTxtStyle: { "fill": TXT_FILL_CONNECTED },
        disconnectedTxtStyle: { "fill": TXT_FILL_DISCONNECTED },
        errorTxtStyle: { "fill": TXT_FILL_ERROR },
        activeStaveStyle: { "fill": FILL_ACTIVE, "stroke": STROKE_ACTIVE, "stroke-width": "1px", "visibility": VISIBLE, "opacity": 0.5 },
        inactiveStaveStyle: { "fill": FILL_INACTIVE, "stroke": STROKE_INACTIVE, "stroke-width": "1px", "visibility": VISIBLE, "opacity": 0.4 },
        instSlotBtnActiveStyle: { "fill": CLR_WHITE, "stroke": CLR_BLACK, "stroke-width": "1px", "visibility": VISIBLE, "opacity": 1.0 },
        instSlotBtnActiveInstStyle: { "fill": "#d7f2cd", "stroke": CLR_BLACK, "stroke-width": "1px", "visibility": VISIBLE, "opacity": 1.0 },
        instSlotBtnInActiveStyle: { "fill": CLR_LIGHT_GREY, "stroke": NONE, "visibility": VISIBLE, "opacity": 1.0 },
        instSlotTxtActiveStyle: { "fill": CLR_BLACK, "visibility": VISIBLE, "opacity": 1.0 },
        instSlotTxtInActiveStyle: { "fill": CLR_BLACK, "stroke": NONE, "visibility": HIDDEN, "opacity": 0.0 },
        instSlotActiveAttrib: { "filter": "url(#dropshadow)" },
        instSlotInActiveAttrib: { "filter": "none" },
        connectedBtnAttrib: { "filter": "" },
        disconnectedBtnAttrib: { "filter": "url(#dropshadow)" },
        transpoInfoAttrib: { "font-family": "sans-serif", "font-weight": "bold", "font-size": "0.75em" },
        transpoPitchModAttrib: {"dy": -1, "dx": -1.5, "font-family": "sans-serif", "font-weight": "bold", "font-size": "0.75em"},
        transpoExtRectAttrib: { "fill": CLR_WHITE, "stroke": NONE, "visibility": VISIBLE, "opacity": 1.0 },
        errorBtnAttrib: { "filter": "url(#dropshadow)" },
        topStave: { gId: "stvTop", imgId: "stvTopImg", startLineId: "stvTopStartLine", positionLineId: "stvTopPosLine", beatBallId: "stvTopBeatBall", maskId: "stvTopMask", ovrlPosId: "ovrlTopPos", ovrlPitchId: "ovrlTopPitch", ovrlPitchStaveId: "ovrlTopPitchStave", ovrlPitchStaveInfoId: "ovrlTopPitchStaveInfo", ovrlSpeedId: "ovrlTopSpeed", ovrlPressId: "ovrlTopPres", ovrlDynId: "ovrlTopDyn", ovrlTimbreId: "ovrlTopTimb", ballYmax: 84, xLeftMargin: 31.5, posLineConf: { x1: "95", y1: "80", x2: "95", y2: "281" }, posBallConf: { cx: "95", cy: "110", r: "4" } },
        bottomStave: { gId: "stvBot", imgId: "stvBotImg", startLineId: "stvBotStartLine", positionLineId: "stvBotPosLine", beatBallId: "stvBotBeatBall", maskId: "stvBotMask", ovrlPosId: "ovrlBotPos", ovrlPitchId: "ovrlBotPitch", ovrlPitchStaveId: "ovrlBotPitchStave", ovrlPitchStaveInfoId: "ovrlBotPitchStaveInfo", ovrlSpeedId: "ovrlBotSpeed", ovrlPressId: "ovrlBotPres", ovrlDynId: "ovrlBotDyn", ovrlTimbreId: "ovrlBotTimb", ballYmax: 305, xLeftMargin: 31.5, posLineConf: { x1: "95", y1: "301", x2: "95", y2: "502" }, posBallConf: { cx: "95", cy: "331", r: "4" } },
        metro: { idMetronomeRect: "metroRect", idMetronome: "metro", idMetroSlider: "metroFreqSlider", idMetroFreqRect: "metroFreq", idMetroFreqLine: "metroFreqLine", ifSymbolMetroOff: "#metronome", ifSymbolMetroOn: "#metronomeOn", ifMetroFreqSlider: "#metroFreq", minFreq: 220, maxFreq: 2200 },
    }
    var state = {
        clientId: null,
        isPlaying: false,
        isReady: false,
        score: { title: "ZScore", noSpaceName: "ZScore", htmlFile: null, instrument: "", parts: [], firstPageNo: 1, lastPageNo: 2, sections: [], ownedSections: [], mySections: [], assignmentType: null },
        movement: { name: "Movement", parts: [], imgDir: null, imgPageNameToken: null, imgContPageName: null, contPageNo: PAGE_NO_CONTINUOUS, blankPageNo: 0, firstPage: -1, lastPage: -1, partPages: {} },
        part: { name: "Part View", imgDir: null, imgPageNameToken: null, imgContPageName: null, blankPageNo: 0, contPageNo: PAGE_NO_CONTINUOUS, currentSection: null, transpo: "C", pageRanges: [{ start: 1, end: 1 }]},
        topStave: { id: "topStave", config: config.topStave, part: null, pageId: DEFAULT_PAGE_ID, rndPageId: null, filename: DEFAULT_PAGE_IMG_URL, beatMap: null, timeline: null, isActive: true, isPlaying: false, currentBeat: null, transpos: [] },
        bottomStave: { id: "bottomStave", config: config.bottomStave, part: null, pageId: DEFAULT_PAGE_ID, rndPageId: null, filename: DEFAULT_PAGE_IMG_URL, beatMap: null, timeline: null, isActive: false, isPlaying: false, currentBeat: null, transpos: [] },
        startTimeTl: 0,
        currentBeatId: "b0",
        currentBeatNo: 0,
        tempo: 0,
        tempoModifier: 1,
        scoreDir: "/score/",
        currentTickTimeSec: 0,
        nextBeatTickTimeSec: 0,
        audioTlBeatTime: 0,
        audioTickBeatTime: 0,
        isConnected: false,
        isInitialised: false,
        connectionType: null,
        pageNoToLoad: 0,
        metro: { isMetroOn: false, slider: { xMax: 60, xMin: 40, xMid: 50, range: 20, } },
        isClientIdVisible: false,
        transpo: m.TRANSPOSITION.C,
        counter: 0,
        voteCount: 0,
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
    function ZsPage(id, no, part, imgFileName, imgFileUrl) {
        this.id = id;
        this.no = no;
        this.part = part;
        this.imgFileName = imgFileName;
        this.imgFileUrl = imgFileUrl;
        this.isLoaded = false;
        this.img = new Image();
        this.img.pageId = id;
        this.img.instrument = part;
    }
    ZsPage.prototype.loadImg = function (imgFileUrl) {
        this.img.src = imgFileUrl;
        this.img.onload = function () {
            log("pageImgOnLoad: id: " + this.pageId + " part: " + this.instrument);
            onPageImageLoad(this.pageId, this.instrument);
        }
    };

    function PartBtnAttrs(btnNo, partName) {
        this.id = "partBtn" + btnNo;
        this.class = "partListButton";
        this.onclick = "onPartSelect('" + partName + "')";
    }
    function SectionBtnAttrs(btnNo, sectionName) {
        this.id = config.idSectionBtnPrefix + sectionName;
        this.no = btnNo;
        this.class = "sectionListButton";
        this.onclick = "onSectionSelect('" + sectionName + "')";
    }
    function SectionBtnDisabledAttrs() {
        this.class = "sectionListButtonDisabled";
        this.onclick = "";
    }
    function InstSlotActiveAttrs(slotNo, instrument) {
        this.onclick = "onInstrumentSelect(" + slotNo + ",'" + instrument + "')";
    }
    function InstSlotInActiveAttrs() {
        this.onclick = "";
    }
    function Strategy() {
        this.name = "";
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
        setClientId();
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
        initMetro();
        test();

        state.isInitialised = true;
    }
    function test() {
        try {
            // m.test();
        } catch (err) {
            logError("test: failed tests: " + err.message);
        }
    }
    function setClientId() {
        var zsClientId = u.getLocalParam(LS_CLIENT_ID_KEY);
        if (isNull(zsClientId)) {
            zsClientId = u.generateRandomId();
            u.storeLocalParam(LS_CLIENT_ID_KEY, zsClientId);
        }
        state.clientId = zsClientId;
        log("clientId: " + state.clientId);
        s.setElementIdText(config.idClientId, state.clientId);
        showClientId();
    }
    function resetOnNewScore() {
        state.movement.partPages = {};
    }
    function resetStateOnStop() {
        resetStaveOnStop(state.topStave);
        resetStaveOnStop(state.bottomStave);
    }
    function resetOverlay(stave) {
        if (isNull(stave) || isNull(stave.config)) {
            return;
        }
        var conf = stave.config;        
        u.removeChildren(conf.ovrlPitchStaveInfoId);
    }
    function resetStaveOnStop(stave) {
        if (isNull(stave) || isNull(stave.config)) {
            return;
        }
        var conf = stave.config;
        u.setElementIdAttributes(conf.positionLineId, conf.posLineConf);
        u.setElementIdAttributes(conf.beatBallId, conf.posBallConf);
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
    function onSectionSelection(section) {
        if (!u.arrContains(state.score.sections, section)) {
            log("onSectionSelection: unexpected section: " + section);
            return;
        }
        disableSection(section);
        sendSectionSelection(section);
    }
    function disableSection(section) {
        var btnId = config.idSectionBtnPrefix + section;
        var sectionBtn = u.getElement(btnId);
        if (isNull(sectionBtn)) {
            return;
        }
        disableSectionButton(sectionBtn);
    }
    function disableSectionButton(sectionBtn) {
        if (isNull(sectionBtn)) {
            return;
        }
        // u.setText(sectionBtn, section);
        u.setElementAttributes(sectionBtn, new SectionBtnDisabledAttrs());
    }
    function setSectionsOwnedByClient() {
        var ownedSections = u.getElement(config.idOwnedSections);
        if (isNull(ownedSections)) {
            return;
        }
        var clientSections = state.score.mySections;
        var displaySections = "";
        var delim = "";
        for (var i = 0; i < clientSections.length; i++) {
            displaySections = displaySections + delim + clientSections[i];
            delim = "; ";
        }
        u.setText(ownedSections, displaySections);
    }
    function onInstrumentSelection(slotNo, instrument) {
        if (isNull(slotNo) || isNull(instrument) || isNull(state.part.name)) {
            return;
        }
        sendInstrumentSlot(slotNo, instrument, state.part.name);
        onResetInstrumentSlots();
    }
    function showClientId() {
        var isVisible = state.isClientIdVisible;
        if (isVisible) {
            u.makeVisible(config.idClientId);
        } else {
            u.makeInVisible(config.idClientId);
        }
    }
    function onClientIdSelection() {
        state.isClientIdVisible = !state.isClientIdVisible;
        showClientId();
    }
    function onTranspoSelection(note) {
        onStateBtnClick();
        if (isNull(note)) {
            return;
        }
        var transposition = m.getTransposition(note);
        if (isNull(transposition)) {
            return;
        }
        state.transpo = transposition;
        hideTranspositionSlots();
        showTransposition();
    }
    function resetAll() {
        resetAudio();
    }
    function initNet() {
        n.init(config.connectionPreference, config.appUrlSse, config.appUrlWebsockets, config.appUrlHttp, processServerState, onConnectionEvent);
    }
    function initMetro() {
        var metro = u.getElement(config.metro.idMetronomeRect);
        if (isNull(metro)) {
            return;
        }
        u.listen('click', metro, onMetro);
        initMetroFreqSlider();
    }
    function initMetroFreqSlider() {
        var freqLine = u.getElement(config.metro.idMetroFreqLine);
        var freqRect = u.getElement(config.metro.idMetroFreqRect);
        if (isNotNull(freqLine) && isNotNull(freqRect)) {
            var x2 = u.toInt(freqLine.getAttribute(X2));
            var sliderWidth = u.toInt(freqRect.getAttribute(WIDTH));
            var sliderWidthHalf = Math.round(sliderWidth / 2);
            var xMax = x2 - sliderWidthHalf;
            state.metro.slider.xMax = xMax;
            var x1 = u.toInt(freqLine.getAttribute(X1));
            var xMin = x1 + sliderWidthHalf;
            state.metro.slider.xMin = xMin;
            var range = xMax - xMin;
            state.metro.slider.range = range;
            var xMid = Math.round((xMax + xMin) / 2);
            state.metro.slider.xMid = xMid;
        }

        Draggable.create(config.metro.ifMetroFreqSlider, {
            type: X,
            bounds: document.getElementById(config.metro.idMetroFreqLine),
            onDrag: onFreqSliderMove,
        });
    }
    function onFreqSliderMove(event) {
        var midDiffX = gsap.getProperty(config.metro.ifMetroFreqSlider, X);
        var ballPosX = state.metro.slider.xMid + midDiffX;
        var val = ballPosX - state.metro.slider.xMin;
        var percent = Math.round(val * 100 / state.metro.slider.range);
        var freq = u.mapRange(percent, 0, 100, config.metro.minFreq, config.metro.maxFreq);
        if (freq < 200) {
            freq = 200;
        }
        a.setBeepFreqenecy(freq);
        log("onFreqSliderMove: freq: " + freq);
    }
    function onMetro(event) {
        if (state.metro.isMetroOn) {
            switchMetroOff();
        } else {
            switchMetroOn();
        }
    }
    function switchMetroOff() {
        a.switchMetro(false);
        s.setElementIdHref(config.metro.idMetronome, config.metro.ifSymbolMetroOff);
        u.makeInVisible(config.metro.idMetroSlider);
        state.metro.isMetroOn = false;
    }
    function switchMetroOn() {
        a.switchMetro(true);
        s.setElementIdHref(config.metro.idMetronome, config.metro.ifSymbolMetroOn);
        u.makeVisible(config.metro.idMetroSlider);
        state.metro.isMetroOn = true;
    }
    function initAudio() {
        if (isNull(a)) {
            logError("initAudio: invalid zsAudio lib");
            return;
        }
        a.init();
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
        sendHello();
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
        if (isNotNull(serverState.strategyInfo)) {
            processStrategyInfo(serverState.strategyInfo);
        }
        if (isNotNull(serverState.partInfo)) {
            processPartInfo(serverState.partInfo);
        }
        if (isNotNull(serverState.pageInfo)) {
            processPageinfo(serverState.pageInfo);
        }
        if (isNotNull(serverState.mapInfo)) {
            processMapinfo(serverState.mapInfo);
        }
        if (isNotNull(serverState.bpm) && serverState.bpm != 0) {
            processTempoChange(serverState.bpm);
        }
        if (isNotNull(serverState.actions)) {
            processSeverActions(serverState.actions);
        }
    }
    function processScoreInfo(scoreInfo) {
        if (!u.isObject(scoreInfo)) {
            return;
        }
        if (isNotNull(scoreInfo.partHtmlPage)) {
            var isLoad = setPartHtmlPage(scoreInfo.partHtmlPage);
            var currentPage = u.getPageName();
            if (isLoad && scoreInfo.partHtmlPage !== currentPage) {
                u.loadPage(scoreInfo.partHtmlPage);
            }
        }
        if (isNotNull(scoreInfo.name)) {
            setName(scoreInfo.name);            
        }
        if (isNotNull(scoreInfo.title)) {
            var isNew = setTitle(scoreInfo.title);
            if (isNew) {
                resetOnNewScore();
            }
        }
        if (isNotNull(scoreInfo.instruments)) {
            processInstruments(scoreInfo.instruments);
        }
        if (isNotNull(scoreInfo.bpm)) {
            // setBpm(scoreInfo.bpm);
        }
        if (isNotNull(scoreInfo.scoreDir)) {
            setScoreDir(scoreInfo.scoreDir);
        }
    }
    function processStrategyInfo(strategyInfo) {
        if (isNotNull(strategyInfo.strategies)) {
            processStrategies(strategyInfo.strategies);
        }
    }
    function setTitle(title) {
        if (state.score.title === title) {
            return false;
        }
        state.score.title = title;
        s.setElementIdText(config.idTitle, title);
        return true;
    }
    function setName(name) {
        state.score.noSpaceName = u.replaceEmptySpaces(name, UNDERSCORE);
    }
    function setPartHtmlPage(partFile) {
        var previous = state.score.htmlFile;
        if (isNull(previous)) {
            state.score.htmlFile = partFile;
            return false;
        }
        if (previous === partFile) {
            return false;
        }
        state.score.htmlFile = partFile;
        return true;
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
        s.setElementIdText(config.idTempoBpm, bpm);
    }
    function processTempoChange(tempo) {
        var bpm = u.toInt(tempo);
        if (isNull(bpm)) {
            return;
        }
        var previousBpm = state.tempo;
        var modifier = bpm / previousBpm;
        state.tempoModifier = modifier;
        setBpm(bpm);
        if (state.isPlaying) {
            setStaveTimelinesTempo(modifier);
        } else {
            resetStaveTimelines();
        }
    }
    function processMapinfo(mapInfo) {
        if (isNull(mapInfo.map) || isNull(mapInfo.pageId)) {
            return;
        }
        var pageId = mapInfo.pageId;
        var staveId = mapInfo.staveId;
        var mapStr = mapInfo.map;
        var stave = state[staveId];
        if (isNull(stave)) {
            return;
        }
        var xLeftMargin = stave.config.xLeftMargin;

        var map = JSON.parse(JSON.stringify(mapStr));
        if (!u.isArray(map)) {
            return;
        }
        var beatMap = {};
        for (var i = 0; i < map.length; i++) {
            addMapLement(beatMap, map[i], xLeftMargin);
        }
        stave.beatMap = beatMap;
        initStaveTimelines(staveId);
    }
    function addMapLement(beatMap, mapElement, xMargin) {
        if (isNull(beatMap) || isNull(mapElement) || isNull(mapElement.beatStartNum)) {
            return;
        }
        var startBeat = mapElement.beatStartNum;
        var xStart = mapElement.xStart + xMargin;
        var xEnd = mapElement.xEnd + xMargin;
        var zsMapElement = new ZsTsMapElement(xStart, xEnd, mapElement.yStart, mapElement.yEnd, startBeat, mapElement.beatStartDenom, mapElement.beatEndNum, mapElement.beatEndDenom);
        beatMap[startBeat] = zsMapElement;
    }
    function setStaveTimelinesTempo(modifier) {
        setTimelineTempoMod(state.topStave.timeline, modifier);
        setTimelineTempoMod(state.bottomStave.timeline, modifier);
    }
    function setTimelineTempoMod(tl, mod) {
        if (isNull(tl)) {
            return;
        }
        var currentTimeScale = tl.timeScale();
        var newTimeScale = currentTimeScale * mod;
        tl.timeScale(newTimeScale);
    }
    function resetStaveTimelines() {
        createStaveTimeline(state.topStave);
        createStaveTimeline(state.bottomStave);
    }
    function initStaveTimelines(staveId) {
        if (isNull(staveId)) {
            return;
        }
        createStaveTimeline(state[staveId]);
    }
    function createStaveTimeline(stave) {
        if (isNull(stave)) {
            return;
        }
        var staveTimeline = gsap.timeline({ onComplete: onTimelineComplete, onCompleteParams: [stave.id], paused: true });
        var beatMaps = stave.beatMap;
        if (isNull(beatMaps)) {
            return;
        }
        var lineId = stave.config.positionLineId;
        var ballId = stave.config.beatBallId;
        var ballYmax = stave.config.ballYmax;

        var isFirstBeat = true;
        for (var beat in beatMaps) {
            var beatMap = beatMaps[beat];
            var bpm = state.tempo;
            var beatDurationSec = m.getBeatDurationSec(bpm);
            var startBeat = beatMap.beatStartNum;

            if (isFirstBeat) {
                var beatId = config.beatIdPrefix + (startBeat - 1);
                var endX = beatMap.xStart;
                var startBeatPositionLineTween = createPositionLineTween(lineId, 0, endX, beatId, 0);
                staveTimeline.add(startBeatPositionLineTween, TL_START_OF_PREVIOUS);
                var startPositionBallXTween = createPositionBallXTween(ballId, 0, endX, beatId);
                staveTimeline.add(startPositionBallXTween, TL_END_OF_PREVIOUS);
                isFirstBeat = false;
            }

            var endX = beatMap.xEnd;
            var beatId = config.beatIdPrefix + startBeat;
            var tweenId = config.tweenIdPrefix + beatId;
            var beatPositionLineTween = createPositionLineTween(lineId, beatDurationSec, endX, beatId, startBeat);
            var beatPositionBallXTween = createPositionBallXTween(ballId, beatDurationSec, endX, beatId);
            var beatPositionBallYTween = createPositionBallYTween(ballId, beatDurationSec / 2, ballYmax, beatId);
            var tweenId = beatPositionLineTween.vars.id;
            staveTimeline.addLabel(tweenId, TL_END_OF_PREVIOUS);
            staveTimeline.add(beatPositionLineTween, TL_END_OF_PREVIOUS);
            staveTimeline.add(beatPositionBallXTween, TL_START_OF_PREVIOUS);
            staveTimeline.add(beatPositionBallYTween, tweenId);
        }
        if (isNotNull(stave.currentBeat)) {
            setTimelineBeat(staveTimeline, stave.currentBeat);
        }
        stave.timeline = staveTimeline;
    }
    function createPositionLineTween(lineId, beatDurationSec, endX, beatId, beatNo) {
        var tweenId = config.tweenIdPrefix + beatId;
        return gsap.to(u.toCssIdQuery(lineId), {
            id: tweenId,
            duration: beatDurationSec,
            attr: { "x1": endX, "x2": endX },
            ease: "none",
            onStart: onBeatStart,
            onStartParams: [beatId, beatNo],
            onComplete: onBeatEnd,
            onCompleteParams: [beatId, beatNo],
        });
    }
    function createPositionBallXTween(ballId, beatDurationSec, endX, beatId) {
        var tweenId = config.ballTweenIdPrefix + beatId;
        return gsap.to(u.toCssIdQuery(ballId), {
            id: tweenId,
            duration: beatDurationSec,
            attr: { "cx": endX },
            ease: "none",
        });
    }
    function createPositionBallYTween(ballId, beatDurationSec, endY, beatId) {
        var tweenId = config.ballTweenIdPrefix + beatId;
        return gsap.to(u.toCssIdQuery(ballId), {
            id: tweenId,
            duration: beatDurationSec,
            attr: { "cy": endY, "r": 2 },
            ease: "power1.out",
            autoAlpha: 0.5,
            repeat: 1,
            yoyo: true,
        });
    }
    function onTimelineComplete(staveid) {
        logDebug("onTimelineComplete stave: " + staveid);
        var stave = state[staveid];
        if (isNotNull(stave)) {
            stave.isRunning = false;
        }
        if (isNotNull(stave.timeline)) {
            stave.timeline.pause(0);
        }
    }
    function onBeatStart(beatId, beatNo) {
        var currentTime = a.getCurrentTime();
        state.audioTlBeatTime = currentTime;
        logDebug("onBeatStart: beat: " + beatId + " beatNo: " + beatNo + " beatTime: " + currentTime);
        setCurrentBeat(beatNo, beatId);
    }
    function onBeatEnd(beatId, beatNo) {
        var now = a.getCurrentTime();
        var diff = now - state.startTimeTl;
        logDebug("onBeatEnd: beat: " + beatId + " beatNo: " + beatNo + " elapsedTime: " + diff);
    }
    function setCurrentBeat(beatNo, beatId) {
        if (!u.isNumeric(beatNo)) {
            return;
        }
        if (u.isNull(beatId)) {
            beatId = config.beatIdPrefix + beatNo;
        }
        state.currentBeatId = beatId;
        state.currentBeatNo = beatNo;
    }
    function processPageinfo(pageInfo) {
        if (isNull(pageInfo.staveId)) {
            return;
        }
        var staveId = pageInfo.staveId;
        var stave = state[staveId];
        if (isNull(stave)) {
            logError("processPageinfo: Invalid stave for id: {}", staveId);
            return;
        }
        if (isNotNull(pageInfo.filename)) {
            stave.filename = pageInfo.filename;
        }
        if (isNotNull(pageInfo.pageId)) {
            stave.pageId = pageInfo.pageId;
        }
        if (isNotNull(pageInfo.rndPageId)) {
            stave.rndPageId = pageInfo.rndPageId;
        } else {
            stave.rndPageId = null;
        }
        if (isNotNull(pageInfo.part)) {
            stave.part = pageInfo.part;
        }
        clearTranspositions(stave);
        if (isNotNull(pageInfo.transpositionInfo)) {
            processTranspositionInfo(pageInfo.transpositionInfo, stave);
        }
        showStavePage(stave);
    }
    function clearTranspositions(stave) {
        var ovrlStave = u.getElement(stave.config.ovrlPitchStaveInfoId);
        if (isNotNull(ovrlStave)) {
            u.removeElementChildren(ovrlStave);
        }
    }
    function processTranspositionInfo(transpositionInfo, stave) {
        if (isNull(transpositionInfo) || isNull(stave)) {
            return;
        }
        processTranspoRectInfos(transpositionInfo.rectInfos, stave);
        processTranspoTxtInfos(transpositionInfo.txtInfos, stave);
    }
    function processTranspoRectInfos(rectInfos, stave) {
        if (isNull(rectInfos)) {
            return;
        }        
        var ovrlStave = u.getElement(stave.config.ovrlPitchStaveInfoId);
        if (u.isArray(rectInfos)) {
            for (var i = 0; i < rectInfos.length; i++) {
                processTranspoRectInfo(rectInfos[i], ovrlStave);
            }
        } else {
            processTranspoRectInfo(rectInfos, ovrlStave);
        }
    }
    function processTranspoRectInfo(rectInfo, ovrlStave) {
        if (isNull(rectInfo) || isNull(ovrlStave)) {
            return;
        }
        var x = null;
        var y = null;
        var width = null;
        var height = null;
        if (isNotNull(rectInfo.x)) {
            x = rectInfo.x;
        }
        if (isNotNull(rectInfo.y)) {
            y = rectInfo.y;
        }
        if (isNotNull(rectInfo.width)) {
            width = rectInfo.width;
        }
        if (isNotNull(rectInfo.height)) {
            height = rectInfo.height;
        }
        if (isNull(x) || isNull(y) || isNull(width) || isNull(height)) {
            return;
        }
        var rectElementId = config.idTranspoInfo + getNextElementIdNo();
        var rectElement = s.createRectangleElement(rectElementId);
        rectElement.setAttribute("x", x);
        rectElement.setAttribute("y", y);
        rectElement.setAttribute("width", width);
        rectElement.setAttribute("height", height);
        u.setElementAttributes(rectElement, config.transpoExtRectAttrib);        

        u.addChildToParent(ovrlStave, rectElement);
    }
    function processTranspoTxtInfos(txtInfos, stave) {
        if (isNull(txtInfos)) {
            return;
        }        
        var ovrlStave = u.getElement(stave.config.ovrlPitchStaveInfoId);
        if (u.isArray(txtInfos)) {
            for (var i = 0; i < txtInfos.length; i++) {
                processTranspoTxtInfo(txtInfos[i], ovrlStave);
            }
        } else {
            processTranspoTxtInfo(txtInfos, ovrlStave);
        }
    }
    function processTranspoTxtInfo(txtInfo, ovrlStave) {
        if (isNull(txtInfo) || isNull(ovrlStave)) {
            return;
        }
        var x = null;
        var y = null;
        var txt = null;
        if (isNotNull(txtInfo.x)) {
            x = txtInfo.x;
        }
        if (isNotNull(txtInfo.y)) {
            y = txtInfo.y;
        }
        if (isNotNull(txtInfo.txt)) {
            txt = txtInfo.txt;
        }
        if (isNull(x) || isNull(y) || isNull(txt)) {
            return;
        }
        var pitch = m.getPitch(txt);
        var mod = m.PITCH_MOD.NATURAL;
        if (isNotNull(pitch)) {
            mod = pitch.mod;
            var transPitch = m.transpose(pitch, state.transpo);
            if (isNotNull(transPitch)) {
                pitch = transPitch;
                txt = transPitch.pitchName;
                mod = transPitch.mod;
            }
        }

        var txtElementId = config.idTranspoInfo + getNextElementIdNo();
        var txtElement = s.createTextElement(txtElementId);
        txtElement.setAttribute(X, x);
        txtElement.setAttribute(Y, y);
        u.setElementAttributes(txtElement, config.transpoInfoAttrib);

        var letterTspanElementId = config.idTranspoInfo + getNextElementIdNo();
        var letterTspanElement = s.createTspanElement(letterTspanElementId);
        s.setElementText(letterTspanElement, txt);
        u.addChildToParent(txtElement, letterTspanElement);

        if (isNotNull(pitch) && m.PITCH_MOD.NATURAL !== mod && isNotNull(pitch.modUnicode)) {
            var modTspanElementId = config.idTranspoInfo + getNextElementIdNo();
            var modTspanElement = s.createTspanElement(modTspanElementId);
            u.setElementAttributes(modTspanElement, config.transpoPitchModAttrib);            
            letterTspanElement.setAttribute(DX, -2);
            s.setElementText(modTspanElement, pitch.modUnicode);
            u.addChildToParent(letterTspanElement, modTspanElement);
        } else {
            letterTspanElement.setAttribute(DX, 2);
        }
        letterTspanElement.setAttribute(DY, config.transpoLetterDy);

        u.addChildToParent(ovrlStave, txtElement);
    }
    function getNextElementIdNo() {
        return ++state.counter;
    }
    function showTransposition() {
        if (isNull(state.transpo)) {
            return;
        }
        var transpo = state.transpo;
        var pitch = m.PITCH.C;
        if (isNotNull(transpo)) {
            pitch = transpo.pitch;
        }
        if (isNull(pitch)) {
            return;
        }
        if (isNotNull(pitch.pitchName)) {
            s.setElementIdText(config.idTranspoKey, pitch.pitchName);
        }
        if (isNotNull(pitch.modUnicode)) {
            s.setElementIdText(config.idTranspoMod, pitch.modUnicode);
        }
    }
    function showStavePage(stave) {
        if (isNull(stave)) {
            return;
        }

        var conf = stave.config;
        if (isNull(conf)) {
            return;
        }

        var fileName = stave.filename;        
        var imgSrc = state.movement.imgDir + fileName;

        var imgElement = u.getElement(conf.imgId);
        imgElement.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", imgSrc);
        imgElement.setAttribute("href", imgSrc);

        var ovrlStave = u.getElement(stave.config.ovrlPitchStaveInfoId);
        var isStaveOvrlEnabled = false;
        if (u.hasChildrenElements(ovrlStave)) {
            isStaveOvrlEnabled = true;
        }
        showPitchStaveOverlay(conf, isStaveOvrlEnabled);
    }
    function showDefaultStavePage(stave) {
        if (isNull(stave)) {
            return;
        }

        var conf = stave.config;
        if (isNull(conf)) {
            return;
        }
        var imgSrc = stave.filename;
        var imgElement = u.getElement(conf.imgId);
        imgElement.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", imgSrc);
        imgElement.setAttribute("href", imgSrc);
    }
    function createStaveImgUrl(fileName) {
        return state.scoreDir + fileName;
    }
    function onPageImageLoad(pageId, part) {
        deleteMovementPartPage(pageId, part);
        state.pageNoToLoad--;        

        if(isMovementLoaded()) {
            onPageLoadComplete();
        }

        notifyPageLoadListeners(state.pageNoToLoad);
    }
    function notifyPageLoadListeners(noPagesToLoad) {
        if (noPagesToLoad > 0) {
            var txt = LOADING + " " + noPagesToLoad;
            setServerStatusView(config.errorRectStyle, config.errorBtnAttrib, config.errorTxtStyle, txt);
        } else {
            setServerStatusView(config.connectedRectStyle, config.connectedBtnAttrib, config.connectedTxtStyle, READY);
        }
    }
    function onPageLoadComplete() {
        log("onPageLoadComplete: ");
        var parts = state.movement.parts;
        var isOk = true;
        for (var i = 0; i < parts.length; i++) {
            var part = parts[i];            
            var pages = getMovementPartPages(part);
            for (var key in pages) {
                if (pages.hasOwnProperty(key)) {
                    var page = pages[key];
                    if (!page.isLoaded) {
                        log("onPageLoadComplete: page: " + key + " is not loaded, retying load");
                        loadPageNo(page.no, part);
                        isOk = false;
                    }
                }
            }                
        }
        if (isOk) {
            log("All Pages loaded: ");
            state.isReady = true;
            sendReady();
        }
    }
    function processPartInfo(partInfo) {
        if (isNotNull(partInfo.name)) {
            state.part.name = partInfo.name;
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
        if (isNotNull(partInfo.currentSection)) {
            state.part.currentSection = partInfo.currentSection;
        }
        // loadPartPages();
        showPartInfo();
    }
    function showPartInfo() {
        var partName = state.part.name;
        var section = state.part.currentSection;
        var out = "";
        if (isNotNull(section)) {
            out += u.capitalizeFirstLetter(section) + " - ";
        }
        out += partName;
        s.setElementIdText(config.idInstrument, out);
    }
    function loadMovementPages() {
        var parts = state.movement.parts;
        if(isNull(parts)) {
            return;
        }
        var start = state.movement.firstPage;
        var end = state.movement.lastPage;
        if(start < 0 || end < 0 ) {
            logError("loadMovementPages: invalid page range");
            return;
        }    
        state.pageNoToLoad = (end - start + 1) * parts.length;
        state.movement.partPages = {};
        for (var i = 0; i < parts.length; i++) {
            loadMovementPartPages(parts[i], start, end);
        }
    }
    function loadMovementPartPages(part, startPage, endPage) {
        for (var i = startPage; i <= endPage; i++) {
            loadPageNo(i, part);
        }
        loadBlankPage(part);
        loadContinuousPage(part);
    }
    function loadBlankPage(part) {
        var page = getOrCreateBlankPage(part);
        state.pageNoToLoad++;
        loadPage(page);
    }
    function loadContinuousPage(part) {
        var page = getOrCreateContPage(part);
        state.pageNoToLoad++;
        loadPage(page);
    }
    function loadPageNo(pageNo, part) {
        var page = getOrCreatePage(pageNo, part);
        loadPage(page, part);
    }
    function loadPage(page) {
        if (isNull(page)) {
            return;
        }
        var imgUrl = page.imgFileUrl;
        if (isNull(imgUrl)) {
            return;
        }
        page.loadImg(imgUrl, page.id);
    }
    function getMovementPartPages(part) {
        if(isNull(part)) {
            return null;
        }
        var pagesMap = state.movement.partPages;
        if(isNull(pagesMap)) {
            return null;
        }
        if(isNull(pagesMap[part])) {
            pagesMap[part] = {};
        }
        return pagesMap[part];
    }
    function getMovementPartPage(pageId, part) {
        var pagesMap = getMovementPartPages(part);
        if(isNull(pagesMap)) {
            return null;
        }
        return pagesMap[pageId];
    }
    function deleteMovementPartPage(pageId, part) {
        var pagesMap = getMovementPartPages(part);
        if(isNull(pagesMap)) {
            return null;
        }
        delete pagesMap[pageId];
    }
    function isMovementLoaded() {
        for (var i = 0; i < state.movement.parts.length; i++) {
            var part = state.movement.parts[i];
            if(Object.keys(state.movement.partPages[part]).length){
                return false;
            }
        }
        return true;
    }
    function getOrCreatePage(pageNo, part) {
        var pageId = createPageId(pageNo);
        var page = getMovementPartPage(pageId, part);
        if (isNotNull(page)) {
            return page;
        }
        var imgFileName = state.movement.imgPageNameToken;
        if (isNull(imgFileName)) {
            imgFileName = createDefaultPageImgFileName(pageNo, part);
        } else {
            imgFileName = u.replace(imgFileName, config.partNameToken, part);
            imgFileName = u.replace(imgFileName, config.pageNoToken, "" + pageNo);            
        }
        var imgFileUrl = state.movement.imgDir + imgFileName;
        var page = new ZsPage(pageId, pageNo, part, imgFileName, imgFileUrl);
        var partPages =  getMovementPartPages(part);
        partPages[pageId] = page;
        return page;
    }
    function getOrCreateContPage(part) {
        var pageNo = state.movement.contPageNo;
        var pageId = createPageId(pageNo);
        var page = getMovementPartPage(pageId, part);
        if (isNotNull(page)) {
            return page;
        }
        var imgFileName = state.movement.imgContPageName;
        if (isNull(imgFileName)) {
            imgFileName = createDefaultPageImgFileName(pageNo, part);
        } else {
            imgFileName = u.replace(imgFileName, config.partNameToken, part);
        }
        var imgFileUrl = state.movement.imgDir + imgFileName;
        var page = new ZsPage(pageId, pageNo, part, imgFileName, imgFileUrl);
        var pagesMap = state.movement.partPages;
        var partPages = pagesMap[part];
        partPages[pageId] = page;
        return page;
    }
    function getOrCreateBlankPage(part) {
        var pageNo = state.movement.blankPageNo;
        var pageId = createPageId(pageNo);
        var page = getMovementPartPage(pageId, part);
        if (isNotNull(page)) {
            return page;
        }
        var imgFileName = state.movement.imgContPageName;
        if (isNull(imgFileName)) {
            imgFileName = createDefaultPageImgFileName(pageNo, part);
        } else {
            imgFileName = u.replace(imgFileName, config.partNameToken, part);
        }
        var imgFileUrl = state.movement.imgDir + imgFileName;
        var page = new ZsPage(pageId, pageNo, part, imgFileName, imgFileUrl);
        var pagesMap = state.movement.partPages;
        var partPages = pagesMap[part];
        partPages[pageId] = page;
        return page;
    }
    function createDefaultPageImgFileName(pageNo, part) {
        return state.score.noSpaceName + UNDERSCORE + part + "_page" + pageNo + ".png";
    }
    function createPageId(pageNo) {
        return config.pageIdPrefix + pageNo;
    }
    function getPageNo(pageId) {
        if(isNull(pageId)) {
            return null;
        }
        if(u.startsWith(pageId), config.pageIdPrefix) {
            var no = pageId.substring(pageId.indexOf(config.pageIdPrefix) + 1);
            if(isNotNull(no)) {                
                return u.toInt(no);
            }
        }
        return u.toInt(pageId);
    }
    function addInstrumentPageRange(pgRange) {
        if (isNull(pgRange) || isNull(pgRange.start) || isNull(pgRange.end)) {
            return;
        }
        var startPage = pgRange.start;
        var endPage = pgRange.end;
        var pr = { start: startPage, end: endPage };
        state.part.pageRanges = [];
        state.part.pageRanges.push(pr);
    }
    function processStrategies(strategies) {
        if (isNull(strategies)) {
            return;
        }
        if (u.isArray(strategies)) {
            for (var i = 0; i < strategies.length; i++) {
                processStrategy(strategies[i]);
            }
        } else {
            processStrategy(strategies);
        }
    }
    function processStrategy(strategy) {
        if (!u.isObject(strategy)) {
            return;
        }
        if (isNull(strategy.name)) {
            logError("processStrategies: invalid strategy name");
            return;
        }
        var strategyName = strategy.name;
        switch (strategyName) {
            case STRATEGY_BUILDER:
                processBuidlerStrategy(strategy);
                break;
            case STRATEGY_RND:
                processRndStrategy(strategy);
                break;
            case STRATEGY_DYNAMIC:
                processDynamicMovementStrategy(strategy);
                break;
            default:
                logError("processStrategies: Unknown strategy: " + strategyName);
        }
    }
    function processDynamicMovementStrategy(strategy) {
        if (isNotNull(strategy.currentMovement)) {
            processMovement(strategy.currentMovement);
        }
    }
    function processMovement(movement) {
        if (isNotNull(movement.name)) {
            state.movement.name = movement.name;
        }
        if (isNotNull(movement.parts)) {
            var parts = extractParts(movement.parts);
            state.movement.parts = parts;
        }
        if (isNotNull(movement.startPage)) {
            state.movement.firstPage = movement.startPage;
        }
        if (isNotNull(movement.endPage)) {
            state.movement.lastPage = movement.endPage;
        }
        if (isNotNull(movement.imgPageNameToken)) {
            state.movement.imgPageNameToken = movement.imgPageNameToken;
        }
        if (isNotNull(movement.imgContPageName)) {
            state.movement.imgContPageName = movement.imgContPageName;
        }
        if (isNotNull(movement.contPageNo)) {
            state.movement.contPageNo = movement.contPageNo;
        }
        if (isNotNull(movement.imgDir)) {
            state.movement.imgDir = movement.imgDir;
        }
        loadMovementPages();
    }
    function processBuidlerStrategy(strategy) {
        var isReady = false;
        if (isNotNull(strategy.isReady)) {
            isReady = u.toBoolean(strategy.isReady);
        }
        if (isNotNull(strategy.sections)) {
            if (state.score.sections.length > 0) {
                state.score.sections = [];
            }
            if (u.isArray(strategy.sections)) {
                for (var i = 0; i < strategy.sections.length; i++) {
                    addSection(strategy.sections[i]);
                }
            } else {
                addSection(strategy.sections);
            }
        }
        if (isNotNull(strategy.assignmentType)) {
            state.score.assignmentType = strategy.assignmentType;
        }
        state.score.ownedSections = [];
        state.score.mySections = [];
        if (isNotNull(strategy.sectionOwners)) {
            for (var section in strategy.sectionOwners) {
                var owner = strategy.sectionOwners[section];
                state.score.ownedSections.push(section);
                if (state.clientId === owner) {
                    state.score.mySections.push(section);
                }
            }
        }
        if (isReady) {
            hideSections();
        } else {
            showSections();
        }
    }
    function addSection(section) {
        if (isNull(section)) {
            return;
        }
        state.score.sections.push(section);
    }
    function showSections() {
        var sections = state.score.sections;
        if (sections.length < 1) {
            return;
        }
        var sectionsElement = u.getElement(config.idSections);
        if (isNull(sectionsElement)) {
            return;
        }
        // u.removeElementChildren(sectionsElement);
        for (var i = 0; i < sections.length; i++) {
            var section = sections[i];
            var btnId = config.idSectionBtnPrefix + section;
            var sectionBtn = u.getElement(btnId);
            if (isNull(sectionBtn)) {
                var attrs = new SectionBtnAttrs(i + 1, section);
                sectionBtn = u.createButton(attrs);
                u.setText(sectionBtn, section);
                u.addChildToParent(sectionsElement, sectionBtn);
            }
            if (u.arrContains(state.score.ownedSections, section)) {
                disableSectionButton(sectionBtn);
            }
        }
        setSectionsOwnedByClient();
        u.makeVisible(config.idSectionsListOuterDiv);
    }
    function hideSections() {
        var sectionsElement = u.getElement(config.idSections);
        if (isNull(sectionsElement)) {
            return;
        }
        u.removeElementChildren(sectionsElement);
        u.makeInVisible(config.idSectionsListOuterDiv);
    }
    function processRndStrategy(strategy) {
    }
    function processInstruments(instruments) {
        var parts = extractParts(instruments);
        if (!u.arrEquals(state.score.parts, parts)) {
            state.score.parts = parts;
        }
    }
    function extractParts(instruments) {
        var parts = [];
        if (!u.isArray(instruments)) {
            if (!u.arrContains(config.filterOutParts, instruments)) {
                parts.push(instruments);
            }
        } else {
            for (var i = 0; i < instruments.length; i++) {
                var part = instruments[i]
                if (u.arrContains(config.filterOutParts, part)) {
                    continue;
                }
                parts.push(part);
            }
        }
        return parts;
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
    function sendHello() {
        var evParams = createReqParams();
        n.sendEvent(EVENT_ID_HELLO, evParams);
    }
    function registerPart(part) {
        var evParams = createReqParams();
        var transposition = "C";
        if (isNotNull(state.transpo)) {
            transposition = state.transpo;
        }
        evParams[EVENT_PARAM_PART] = part;
        evParams[EVENT_PARAM_TRANSPOSITION] = transposition;
        n.sendEvent(EVENT_ID_PART_REG, evParams);
    }
    function sendReady() {
        var evParams = createReqParams();
        evParams[EVENT_PARAM_PART] = state.part.name;
        n.sendEvent(EVENT_ID_PART_READY, evParams);
    }
    function sendPing(serverTime) {
        var evParams = createReqParams();
        evParams[EVENT_PARAM_SERVER_TIME] = serverTime;
        n.sendEvent(EVENT_ID_PING, evParams);
    }
    function sendInstrumentSlot(slotNo, slotInstrument, thisPart) {
        var evParams = createReqParams();
        evParams[EVENT_PARAM_SLOT_NO] = slotNo;
        evParams[EVENT_PARAM_SLOT_INSTRUMENT] = slotInstrument;
        evParams[EVENT_PARAM_PART] = thisPart;
        n.sendEvent(EVENT_ID_SELECT_ISLOT, evParams);
    }
    function sendSectionSelection(section) {
        var evParams = createReqParams();
        evParams[EVENT_PARAM_SECTION] = section;
        n.sendEvent(EVENT_ID_SELECT_SECTION, evParams);
    }
    function createReqParams() {
        var evParams = new EventParams();
        evParams[EVENT_PARAM_CLIENT_ID] = state.clientId;
        return evParams;
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
            case "START":
                callForTargets(play, targets, null);
                break;
            case "STOP":
                onStop();
                break;
            case "SEMAPHORE_ON":
                onSemaphoreOn(params);
                break;
            case "SEMAPHORE_OFF":
                onSemaphoreOff(params);
                break;
            case "ACTIVATE":
                callForTargets(activate, targets, params);
                break;
            case "BEAT":
                callForTargets(serverBeat, targets, params);
                break;
            case "START_MARK":
                callForTargets(setStartMark, targets, params);
                break;
            case "INSTRUMENT_SLOTS":
                onInstrumentSlots(params);
                break;
            case "RESET_INSTRUMENT_SLOTS":
                onResetInstrumentSlots();
                break;
            case "RESET_STAVES":
                onResetStaves();
                break;
            case "OVERLAY_ELEMENT":
                callForTargets(setOverlayElementInfo, targets, params);
                break;
            case "OVERLAY_LINE":
                callForTargets(setOverlayLine, targets, params);
                break;
            case "OVERLAY_COLOUR":
                callForTargets(onOverlayColour, targets, params);
                break;
            case "OVERLAY_TEXT":
                callForTargets(setOverlayTextInfo, targets, params);
                break;
            case "VOTE":
                onVote(params);
                break;
            default:
                logError("doAction: Unknown actionType: " + actionType);
        }
    }
    function callForTargets(func, targets, params) {
        if (isNull(func)) {
            return;
        }
        if (u.isArray(targets)) {
            for (var i = 0; i < targets.length; i++) {
                func(targets[i], params);
            }
        } else {
            func(target, params);
        }
    }
    function onOverlayColour(target, params) {
        if (isNull(params) || isNull(target)) {
            return;
        }
        var stave = state[target];
        var overlayType = params[EVENT_PARAM_OVERLAY_TYPE];
        var col = params[EVENT_PARAM_COLOUR];
        setOverlayColour(stave, overlayType, col);
    }
    function setOverlayColour(stave, overlayType, col) {
        if (isNull(stave) || isNull(overlayType) || isNull(col)) {
            return;
        }
        switch (overlayType) {
            case "SPEED":
            case "PRESSURE":
            case "POSITION":
                break;
            case "PITCH":
                setFill(stave.config.ovrlPitchId + config.idRectSuffix, col);
                break;
            case "DYNAMICS":
                setFill(stave.config.ovrlDynId + config.idRectSuffix, col);
                break;
            case "TIMBRE":
                setFill(stave.config.ovrlTimbreId + config.idRectSuffix, col);
                break;
            default:
                log("setOverlayColour: unknown overlay type: " + overlayType);
        }
    }
    function setFill(rectId, col) {
        u.setElementIdStyleProperty(rectId, { fill: col });
    }
    function setOverlayLine(target, params) {
        if (isNull(params) || isNull(target)) {
            return;
        }
        var stave = state[target];
        var overlayType = params[EVENT_PARAM_OVERLAY_TYPE];
        var posY = params[EVENT_PARAM_OVERLAY_LINE_Y];
        setOverlayLinePosition(stave, overlayType, posY);
    }
    function setOverlayLinePosition(stave, overlayType, posY) {
        if (isNull(stave) || isNull(overlayType) || isNull(posY)) {
            return;
        }
        switch (overlayType) {
            case "POSITION":
            case "SPEED":
            case "PRESSURE":
                break;
            case "PITCH":
                setLineY(stave.config.ovrlPitchId + config.idLineSuffix, posY);
                break;
            case "DYNAMICS":
                setLineY(stave.config.ovrlDynId + config.idLineSuffix, posY);
                break;
            case "TIMBRE":
                setLineY(stave.config.ovrlTimbreId + config.idLineSuffix, posY);
                break;
            default:
                log("setOverlayLinePosition: unknown overlay type: " + overlayType);
        }
    }
    function setLineY(lineId, posY) {
        var line = u.getElement(lineId);
        s.setLineY(line, posY, posY);
    }
    function setOverlayElementInfo(target, params) {
        if (isNull(params) || isNull(target)) {
            return;
        }
        var stave = state[target];
        var overlayType = params[EVENT_PARAM_OVERLAY_TYPE];
        var overlayElement = params[EVENT_PARAM_OVERLAY_ELEMENT];
        var isEnabled = params[EVENT_PARAM_IS_ENABLED];
        var opacity = params[EVENT_PARAM_OPACITY];
        setOverlayElement(stave, overlayType, overlayElement, isEnabled, opacity);
    }
    function setOverlayTextInfo(target, params) {
        if (isNull(params) || isNull(target)) {
            return;
        }
        var stave = state[target];
        var overlayType = params[EVENT_PARAM_OVERLAY_TYPE];
        var isEnabled = params[EVENT_PARAM_IS_ENABLED];
        var l1 = params[EVENT_PARAM_TEXT_L1];
        var l2 = params[EVENT_PARAM_TEXT_L2];
        var l3 = params[EVENT_PARAM_TEXT_L3];
        setOverlayText(stave, overlayType, l1, l2, l3, isEnabled);
    }
    function setOverlayElement(stave, overlayType, overlayElement, isEnabled, opacity) {
        if (isNull(stave) || isNull(overlayType)) {
            return;
        }
        var staveConf = stave.config;
        if (isNull(staveConf)) {
            return;
        }
        logDebug("setOverlayElement: overlayType: " + overlayType);
        switch (overlayType) {
            case "SPEED":
            case "PRESSURE":
            case "POSITION":
                break;
            case "PITCH":
                setPitchOverlay(staveConf, overlayElement, isEnabled, opacity);
                break;
            case "DYNAMICS":
                setDynamicsOverlay(staveConf, overlayElement, isEnabled, opacity);
                break;
            case "TIMBRE":
                setTimbreOverlay(staveConf, overlayElement, isEnabled, opacity);
                break;
            case "PITCH_STAVE":
                setPitchStaveOverlay(staveConf, overlayElement, isEnabled, opacity);
                break;
            default:
                log("setOverlayElement: unknown overlay type: " + overlayType);
        }
    }
    function setOverlayText(stave, overlayType, l1, l2, l3, isEnabled) {
        if (isNull(stave) || isNull(overlayType)) {
            return;
        }
        var staveConf = stave.config;
        if (isNull(staveConf)) {
            return;
        }
        logDebug("setOverlayText: overlayType: " + overlayType);
        switch (overlayType) {
            case "PITCH":
                setPitchOverlayText(staveConf, l1, l2, l3, isEnabled);
                break;            
            default:
                log("setOverlayElement: unknown overlay type: " + overlayType);
        }
    }
    function setTimbreOverlay(staveConf, overlayElement, isEnabled, opacity) {
        if (isNull(overlayElement) || isNull(staveConf)) {
            return;
        }
        switch (overlayElement) {
            case "TIMBRE_BOX":
                setOverlayVisibility(staveConf.ovrlTimbreId + config.idRectSuffix, isEnabled, opacity);
                setOverlayVisibility(staveConf.ovrlTimbreId + config.idOrdSuffix + config.idLineSuffix, isEnabled, opacity);
                setOverlayVisibility(staveConf.ovrlTimbreId, isEnabled, opacity);
                if (!isEnabled) {
                    setOverlayVisibility(staveConf.ovrlTimbreId + config.idLineSuffix, isEnabled, opacity);
                }
                break;
            case "TIMBRE_ORD_LINE":
                setOverlayVisibility(staveConf.ovrlTimbreId + config.idOrdSuffix + config.idLineSuffix, isEnabled, opacity);
                break;
            case "TIMBRE_LINE":
                setOverlayVisibility(staveConf.ovrlTimbreId + config.idLineSuffix, isEnabled, opacity);
                break;
            default:
                log("setTimbreOverlay: unknown overlay element: " + overlayElement);
        }
    }
    function setDynamicsOverlay(staveConf, overlayElement, isEnabled, opacity) {
        if (isNull(overlayElement) || isNull(staveConf)) {
            return;
        }
        switch (overlayElement) {
            case "DYNAMICS_BOX":
                setOverlayVisibility(staveConf.ovrlDynId + config.idRectSuffix, isEnabled, opacity);
                setOverlayVisibility(staveConf.ovrlDynId + config.idOrdSuffix + config.idLineSuffix, isEnabled, opacity);
                setOverlayVisibility(staveConf.ovrlDynId, isEnabled, opacity);
                if (!isEnabled) {
                    setOverlayVisibility(staveConf.ovrlDynId + config.idLineSuffix, isEnabled, opacity);
                }
                break;
            case "DYNAMICS_MID_LINE":
                setOverlayVisibility(staveConf.ovrlDynId + config.idOrdSuffix + config.idLineSuffix, isEnabled, opacity);
                break;
            case "DYNAMICS_LINE":
                setOverlayVisibility(staveConf.ovrlDynId + config.idLineSuffix, isEnabled, opacity);
                break;
            default:
                log("setDynamicsOverlay: unknown overlay element: " + overlayElement);
        }
    }
    function setPitchStaveOverlay(staveConf, overlayElement, isEnabled, opacity) {
        if (isNull(overlayElement) || isNull(staveConf)) {
            return;
        }
        switch (overlayElement) {
            case "PITCH_STAVE_BOX":
                setOverlayVisibility(staveConf.ovrlPitchStaveId + config.idRectSuffix, isEnabled, opacity);
                setOverlayVisibility(staveConf.ovrlPitchStaveId, isEnabled, opacity);
                if (!isEnabled) {
                    setOverlayVisibility(staveConf.ovrlPitchStaveId + config.idLineSuffix, isEnabled, opacity);
                }
                break;
            case "PITCH_STAVE_MID_LINE":
                setOverlayVisibility(staveConf.ovrlPitchStaveId + config.idMidSuffix + config.idLineSuffix, isEnabled, opacity);
                break;
            default:
                log("setPitchOverlay: unknown overlay element: " + overlayElement);
        }
    }
    function showPitchStaveOverlay(staveConf, isEnabled) {
        setPitchStaveOverlay(staveConf, "PITCH_STAVE_BOX", isEnabled, 1.0);
        setPitchStaveOverlay(staveConf, "PITCH_STAVE_MID_LINE", isEnabled, 1.0);
    }
    function setPitchOverlay(staveConf, overlayElement, isEnabled, opacity) {
        if (isNull(overlayElement) || isNull(staveConf)) {
            return;
        }
        switch (overlayElement) {
            case "PITCH_BOX":
                setOverlayVisibility(staveConf.ovrlPitchId + config.idRectSuffix, isEnabled, opacity);
                setOverlayVisibility(staveConf.ovrlPitchId, isEnabled, opacity);
                if (!isEnabled) {
                    setOverlayVisibility(staveConf.ovrlPitchId + config.idLineSuffix, isEnabled, opacity);
                }
                break;
            case "PITCH_LINE":
                setOverlayVisibility(staveConf.ovrlPitchId + config.idLineSuffix, isEnabled, opacity);
                break;
            default:
                log("setPitchOverlay: unknown overlay element: " + overlayElement);
        }
    }
    function setPitchOverlayText(staveConf, l1, l2, l3, isEnabled) {
        if (isNull(staveConf)) {
            return;
        }
        displayInstructions(staveConf.ovrlPitchId, l1, l2, l3, isEnabled); 
    }
    function displayInstructions(textElementId, l1, l2, l3, isEnabled) {
        var textElement = u.getElement(textElementId);
        if(isNull(textElement)) {
            return;
        }

        var spanPrefix = textElementId +  config.idTxtLineSuffix;
        var spanId1 = spanPrefix + "1";
        var spanId2 = spanPrefix + "2";
        var spanId3 = spanPrefix + "3";

        var span1 = u.getChildElement(textElement, u.toCssIdQuery(spanId1));
        if (!isNull(span1)) {
            span1.style.opacity = 0;
            u.setText(span1, l1);
        }
        var span2 = u.getChildElement(textElement, u.toCssIdQuery(spanId2));
        if (!isNull(span2)) {
            span2.style.opacity = 0;
            u.setText(span2, l2);
        }
        var span3 = u.getChildElement(textElement, u.toCssIdQuery(spanId3));
        if (!isNull(span3)) {
            span3.style.opacity = 0;
            u.setText(span3, l3);
        }
        var txtELementId = textElementId +  config.idTxtSuffix;
        if(isEnabled) {
            u.makeVisible(txtELementId);
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
            }     
        } else {
            u.makeInVisible(txtELementId);
        }
    }
    function setOverlayVisibility(ovrlId, isEnabled, opacity) {
        if (isNull(ovrlId)) {
            return;
        }
        if (isEnabled) {
            var op = u.toFloat(opacity);
            if (!u.isNumeric(op)) {
                op = 1.0;
            }
            u.setElementIdStyleProperty(ovrlId, { opacity: op });
            u.makeVisible(ovrlId);
        } else {
            u.makeInVisible(ovrlId);
        }
    }
    function onResetStaves() {
        resetStave(state.topStave);
        resetStave(state.bottomStave);
    }
    function resetStave(stave) {
        if (isNull(stave)) {
            return;
        }
        stave.pageId = DEFAULT_PAGE_ID;
        stave.rndPageId = null;
        stave.filename = DEFAULT_PAGE_IMG_URL;
        stave.beatMap = null;
        stave.timeline = null;
        stave.isActive = true;
        stave.isPlaying = false;
        stave.currentBeat = null;
        resetStaveOnStop(stave);
        resetOverlay(stave);
        showDefaultStavePage(stave);
    }
    function onResetInstrumentSlots() {
        resetInstrumentSlots();
        hideInstrumentSlots();
    }
    function onInstrumentSlots(params) {
        if (isNull(params)) {
            return;
        }
        var csvInstruments = params[EVENT_PARAM_CSV_INSTRUMENTS];
        setInstrumentSlots(csvInstruments);
        showInstrumentSlots();
    }
    function showInstrumentSlots() {
        u.makeVisible(config.idInstControls);
    }
    function hideInstrumentSlots() {
        u.makeInVisible(config.idInstControls);
    }
    function hideTranspositionSlots() {
        u.makeInVisible(config.idTranspoControls);
    }
    function setInstrumentSlots(csvInstruments) {
        if (isNull(csvInstruments)) {
            return;
        }
        var insts = u.csvToArr(csvInstruments);
        if (isNull(insts) || insts.length <= 0) {
            return;
        }       
        for (var i = 0; i < 4; i++) {
            var slotNo = i + 1;
            if (i < insts.length) {
                setActiveInstrumentSlot(insts[i], slotNo);
            } else {
                disableInstrumentSlot(slotNo);
            }
        }
    }
    function resetInstrumentSlots() {
        for (var i = 0; i < 4; i++) {
            var slotNo = i + 1;
            hideInstrumentSlot(slotNo);
        }
    }
    function setActiveInstrumentSlot(instrument, slotNo) {
        if (isNull(instrument) || isNull(slotNo)) {
            return;
        }
        var txtId = config.idInstSlotTxtPrefix + slotNo;
        var btnId = config.idInstSlotBtnPrefix + slotNo;
        var slotId = config.idInstSlotPrefix + slotNo;
        var isThisInst = (instrument === state.part.name);
        u.makeVisible(txtId);
        u.makeVisible(btnId);
        u.makeVisible(slotId);
        u.setElementIdAttributes(slotId, config.instSlotActiveAttrib);
        s.setElementIdText(txtId, instrument.trim());
        u.setElementIdStyleProperty(txtId, config.instSlotTxtActiveStyle);
        if (isThisInst) {
            u.setElementIdStyleProperty(btnId, config.instSlotBtnActiveInstStyle);
        } else {
            u.setElementIdStyleProperty(btnId, config.instSlotBtnActiveStyle);
        }
        var attrs = new InstSlotActiveAttrs(slotNo, instrument);
        u.setElementIdAttributes(btnId, attrs);
    }
    function disableInstrumentSlot(slotNo) {
        var txtId = config.idInstSlotTxtPrefix + slotNo;
        var btnId = config.idInstSlotBtnPrefix + slotNo;
        var slotId = config.idInstSlotPrefix + slotNo;
        u.makeVisible(txtId);
        u.makeVisible(btnId);
        u.makeVisible(slotId);
        u.setElementIdAttributes(slotId, config.instSlotInActiveAttrib);
        s.setElementIdText(txtId, EMPTY);
        u.setElementIdStyleProperty(txtId, config.instSlotTxtInActiveStyle);
        u.setElementIdStyleProperty(btnId, config.instSlotBtnInActiveStyle);
        var attrs = new InstSlotInActiveAttrs();
        u.setElementIdAttributes(btnId, attrs);
    }
    function hideInstrumentSlot(slotNo) {
        var txtId = config.idInstSlotTxtPrefix + slotNo;
        var btnId = config.idInstSlotBtnPrefix + slotNo;
        var slotId = config.idInstSlotPrefix + slotNo;
        u.makeInVisible(txtId);
        u.makeInVisible(btnId);
        u.makeInVisible(slotId);
        var attrs = new InstSlotInActiveAttrs();
        u.setElementIdAttributes(btnId, attrs);
    }
    function setStartMark(target, params) {
        if (isNull(params) || isNull(target)) {
            return;
        }
        var stave = state[target];
        var beatNo = params[EVENT_PARAM_BEAT_NO];
        if (isNull(stave) || isNull(beatNo)) {
            return;
        }
        var beatMap = stave.beatMap;
        if (isNull(beatMap)) {
            return;
        }
        var mapElement = beatMap[beatNo]
        if (isNull(mapElement)) {
            return;
        }
        var startX = mapElement.xStart - 1;
        var startLine = getStaveStartMark(stave);
        s.setLineX(startLine, startX, startX);
        setStaveStartMarkVisiblity(startLine, true);
    }
    function getStaveStartMark(stave) {
        return u.getElement(stave.config.startLineId);
    }
    function setStaveStartMarkVisiblity(startLine, isVisible) {
        if (isVisible) {
            u.makeElementVisible(startLine);
        } else {
            u.makeElementInVisible(startLine);
        }
    }
    function serverBeat(target, params) {
        if (isNull(params) || isNull(target)) {
            return;
        }
        var stave = state[target];
        var beatNo = params[EVENT_PARAM_BEAT_NO];
        setStaveBeat(stave, beatNo);
    }
    function setStaveBeat(stave, beatNo) {
        if (isNull(stave) || isNull(beatNo)) {
            return;
        }
        var currentTime = a.getCurrentTime();
        logDebug("setStaveBeat: stave: " + stave.id + " beat: " + beatNo + " time: " + currentTime);
        setTimelineBeat(stave.timeline, beatNo);
        stave.currentBeat = beatNo;
    }
    function setTimelineBeat(timeline, beatNo) {
        if (isNull(timeline)) {
            return;
        }
        var beatLabel = config.tweenIdPrefix + config.beatIdPrefix + beatNo;
        var labels = timeline.labels;
        if (beatLabel in labels) {
            a.beep();
            timeline.seek(beatLabel);
        } else {
            logDebug("setTimelineBeat: Invalid beat " + beatLabel);
        }
    }
    function activate(target, params) {
        if (isNull(params) || isNull(target)) {
            return;
        }
        var stave = state[target];
        var isActive = params[EVENT_PARAM_IS_ACTIVE];
        var isPlay = params[EVENT_PARAM_IS_PLAY];
        activateStave(stave, isActive, isPlay);
    }
    function activateStave(stave, isActive, isPlay) {
        if (isNull(stave) || isNull(isActive) || isNull(isPlay)) {
            return;
        }
        if (isActive) {
            u.setElementIdStyleProperty(stave.config.maskId, config.activeStaveStyle);
        } else {
            u.setElementIdStyleProperty(stave.config.maskId, config.inactiveStaveStyle);
            var startLine = getStaveStartMark(stave);
            setStaveStartMarkVisiblity(startLine, false);
        }
        if (isPlay) {
            playTimeline(stave.timeline);
        }
    }
    
    function onVote(params) {
        if (isNull(params)) {
            return;
        }
        var voteCount = params[EVENT_PARAM_VOTE_COUNT];
        var voterNo = params[EVENT_PARAM_VOTER_NO];
        updateAudienceMeter(voteCount, voterNo);
    }
    function updateAudienceMeter(voteCount, voterNo) {
        var maxVotes = voterNo;
        if (maxVotes < config.meterMaxVotes) {
            maxVotes = config.meterMaxVotes;
        }
        var defaultWidth = config.meterBoxDefaultWidth;
        var attr = {};
        if(voteCount === 0) {
            attr[config.meterBoxSizeDimension] = defaultWidth;
            u.setElementIdAttributes(config.audienceMeterUpBoxId, attr);
            u.setElementIdAttributes(config.audienceMeterDownBoxId, attr);
        } else if (voteCount > 0) {
            if (voteCount > maxVotes) {
                voteCount = maxVotes;
            }
            var boxSize = Math.floor(u.mapRange(voteCount, 0, maxVotes, 1, config.meterBoxMaxSize));
            attr[config.meterBoxSizeDimension] = boxSize;
            u.setElementIdAttributes(config.audienceMeterUpBoxId, attr);
            attr[config.meterBoxSizeDimension] = 0;
            u.setElementIdAttributes(config.audienceMeterDownBoxId, attr);
        } else if (voteCount < 0) {
            var absCount = Math.abs(voteCount);
            if (absCount > maxVotes) {
                absCount = maxVotes;
            }   
            var boxSize = Math.floor(u.mapRange(absCount, 0, maxVotes, 1, config.meterBoxMaxSize));
            attr[config.meterBoxSizeDimension] = 0;
            u.setElementIdAttributes(config.audienceMeterUpBoxId, attr);
            attr[config.meterBoxSizeDimension] = boxSize;
            u.setElementIdAttributes(config.audienceMeterDownBoxId, attr);
        }
    }
    function onSemaphoreOn(params) {
        if (isNull(params)) {
            return;
        }
        processSemaphore(params.lightNo, params.colourId);
    }
    function onSemaphoreOff(params) {
        if (isNull(params)) {
            return;
        }
        showSemaphore(params.lightNo, CLR_NONE);
    }
    function setStopSemaphore() {
        showSemaphore(4, CLR_NONE);
        showSemaphore(1, CLR_RED);
    }
    function processSemaphore(lightNo, colourId) {
        var colour = getColour(colourId);
        showSemaphore(lightNo, colour);
    }
    function showSemaphore(lightNo, colour) {
        if (isNull(lightNo) || isNull(colour)) {
            return;
        }
        var c = u.toInt(lightNo);
        for (var i = 1; i <= c; i++) {
            var lightId = config.idSemaphorePrefix + i;
            s.setElementIdColour(lightId, colour);
        }
    }
    function getColour(colourId) {
        if (!colourId) {
            colourId = 1;
        }

        var colour;
        switch (colourId) {
            case 4:
                colour = CLR_RED;
                break;
            case 3:
                colour = CLR_ORANGE;
                break;
            case 2:
                colour = CLR_YELLOW;
                break;
            case 1:
            default:
                colour = CLR_GREEN;
        }
        return colour;
    }
    function onStop() {
        stopStaves();
        state.isPlaying = false;
        setStopSemaphore();
        resetStateOnStop();
    }
    function play(target) {
        if (isNull(target)) {
            return;
        }
        var stave = state[target];
        if (isNull(stave)) {
            return;
        }
        var tl = stave.timeline;
        if (isNull(tl)) {
            return;
        }
        playTimeline(tl);
        state.isPlaying = true;
    }
    function playTimeline(timeline) {
        if (isNull(timeline)) {
            logError("startTimeline: invalid timeline");
            return;
        }
        var progress = timeline.progress();
        if (progress > 0 && progress < 1) {
            timeline.resume();
        } else {
            timeline.play(0);
        }
    }
    function stopStaves() {
        stopTimeline(state.topStave.timeline);
        stopTimeline(state.bottomStave.timeline);
        state.bottomStave.isPlaying = false;
        state.topStave.isPlaying = false;
    }
    function stopTimeline(timeline) {
        if (isNull(timeline)) {
            logError("stopTimeline: invalid timeline");
            return;
        }
        timeline.pause();
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
    function logDebug(val) {
        u.logDebug(val);
    }
    // Public members if any??
    return {
        onStateBtn: function () {
            onStateBtnClick();
        },
        onPartSelect: function (part) {
            onPartSelection(part);
        },
        onSectionSelect: function (section) {
            onSectionSelection(section);
        },
        onInstrumentSelect: function (slotNo, instrument) {
            onInstrumentSelection(slotNo, instrument);
        },
        onClientIdSelect: function () {
            onClientIdSelection();
        },
        onTranspoSelect: function (transpo) {
            onTranspoSelection(transpo);
        },
    }
}(zsUtil, zsNet, zsSvg, zsWsAudio, zsMusic, window, document));