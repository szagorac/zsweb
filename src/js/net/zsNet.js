var zsNet = (function (u, win) {
    "use strict";

    //static members
    const RUN_MODE = 'debug';
    const LOG_ID = "zsNet: ";
    const GET_SERVER_STATE = "GET_SERVER_STATE";
    const EVENT_PARAM_LAST_STATE_UPDATE_TIME = "lsut";
    const EVENT_PARAM_ID =  "ev";
    const EVENT_PARAM_CREATED_TIME =  "evt";
    const EVENT_PARAM_SEND_TIME =  "t";
    const GET = "GET";
    const POST = "POST";
    const COMMA = ",";
    const HEADER_REQUESTED_WITH = "X-Requested-With";
    const HEADER_VAL_XML_HTTP_REQUEST = "XMLHttpRequest";
    const HEADER_CONTENT_TYPE = "Content-Type";
    const HEADER_VAL_FORM_URL_ENCODED = "application/x-www-form-urlencoded";
    const ERROR = "ERROR";
    const OK = "OK";
    const STATE = "STATE";
    const STATE_DELTA = "STATE_DELTA";
    const SSE = "sse";
    const WEBSOCKET = "ws";
    const POLL = "poll";
    const HTTP_URL_PREFIX = "http:";
    const HTTPS_URL_PREFIX = "https:";
    const HTTP_URL_DSLASH = "//";
    const WS_URL_PREFIX = "ws:";
    const WSS_URL_PREFIX =  "wss:";
    const OPEN = "OPEN";
    const CLOSED = "CLOSED";

    //HTTP
    var _appUrlHttp = "/htp";
    var _webQueue = null;
    var _lastStateUpdateTime = 0;
    var isAjaxAsync = true;
    var _stateEventCallback = null;
    var _connectionCallback = null;
    
    //SSE
    var _appUrlSse = "/sse";
    var _sseSource = null;

    //WebSockets
    var _appUrlWebsockets = "/wsoc";
    var _webSocket = null;
    var _isWsOpened = false;
    var _reconnectTimeMultiplierMs = 10;
    var _reconnectMaxTimeMs = 5000;
    var _reconnectAttmpts = 0;
    var _isInReconnectMode = false;

    //Poll
    var _pollInterval = 500;
    var _nextPollScheduledTime = 0;
    var _lastPollTime = 0;
    var _isPollState = false;

    var _isReady = false;
    var _connPref = [];
    var _connectionStates = {};
    var _currentConnection = null;

    //Class defs
    function ZsNetException(msg) {
        this.message = msg;
        this.name = "ZsNetException";
    }
    function ZsConnectionState(name, isSupported, isUsing) {
        this.name = name;
        this.isSupported = isSupported;
        this.isUsing = isUsing;
    }
    //Class defs END

    //Private functions
    function _init(connectionPref, sseUrl, websocketsUrl, httpUrl, serverStateCallback, connectionCallback) {
        if (!u) {
            throw new ZsNetException("Invalid libraries. Required: zsUtil");
        }
        if (!u.isString(httpUrl)) {
            logError("_init: Invalid http url: " + httpUrl);
            _isReady = false;
            return;
        }
        if (isNull(serverStateCallback) || !u.isFunction(serverStateCallback)) {
            logError("_init: Invalid HTTP STATE callback function");
            _isReady = false;
            return;
        }

        u.setRunMode(RUN_MODE);

        _appUrlHttp = httpUrl;
        _webQueue = u.createQueue();
        _stateEventCallback = serverStateCallback;
        _connectionCallback = connectionCallback;
        
        var isSseSupported = !!win.EventSource;
        var isWebsocketsSupported = 'WebSocket' in win || 'MozWebSocket' in win;

        _connectionStates[WEBSOCKET] = new ZsConnectionState(WEBSOCKET, isWebsocketsSupported, false);
        _connectionStates[SSE] = new ZsConnectionState(SSE, isSseSupported, false);
        _connectionStates[POLL] = new ZsConnectionState(POLL, true, false);

        if (u.isArray(connectionPref)) {
            _connPref = connectionPref;
        } else if (u.isString(connectionPref)) {
            _connPref = connectionPref.split(COMMA);
        }

        for (var i = 0; i < _connPref.length; i++) {
            var cp = _connPref[i];
            if (!_connectionStates.hasOwnProperty(cp)) {
                logError("_init: invalid connection preference: " + cp);
                continue;
            }

            var connState = _connectionStates[cp];
            if (!connState.isSupported) {
                log("_init: connection: " + cp + " is not supported");
                continue;
            }
            var isInit = false;
            switch (cp) {
                case SSE:
                    isInit = _initSse(sseUrl, connState);
                    break;
                case WEBSOCKET:
                    isInit = _initWebsockets(websocketsUrl, connState);
                    break;
                case POLL:
                    isInit = _initPoll(connState);
                    break;
                default:
                    logError("_init: invalid connection preference: " + cp);
            }
            if (isInit) {
                if(connState.isUsing) {
                    _currentConnection = connState;
                }
                break;
            }
        }

        if (!isInit) {
            logError("_init: unable to initialise connection: ");
            _isReady = false;
            return;
        }

        _isReady = true;
    }

    //SSE 
    function _initSse(url, connState) {
        if (!win.EventSource) {
            logError("_initSse: SSE is not supported");
            _isReady = false;
            return false;
        }
        if (!u.isString(url)) {
            logError("_initSse: Invalid Sse url: " + url);
            _isReady = false;
            return false;
        }

        try {
            _appUrlSse = url;
            _sseSource = new EventSource(_appUrlSse);

            _sseSource.addEventListener('message', function (e) {
                if(isNull(event) || isNull(event.data)) {
                    return;
                }
                var jsonVal = u.parseJson(event.data);
                _processServerResponse(jsonVal, SSE);
            }, false);

            _sseSource.addEventListener('open', function (e) {
                _processConnectionState(OPEN, SSE);
            }, false);

            _sseSource.addEventListener('error', function (e) {
                if (e.readyState == EventSource.CLOSED) {
                    _processConnectionState(CLOSED, SSE);
                }
            }, false);
        } catch (error) {
            u.logException(error, "_initSse: Failed to initialise SSE");
            _isReady = false;
            return false;
        }

        connState.isUsing = true;
        log("_initSse: Initialised SSE OK");
        return true;
    }
    //SSE END

    //WEBSOCKETS 
    function _initWebsockets(url, connState) {
        if (!('WebSocket' in win || 'MozWebSocket' in win)) {
            logError("_initWebsockets: WebSockets are not supported");
            _isReady = false;
            return false;
        }
        if (!u.isString(url)) {
            logError("_initWebsockets: Invalid WebSockets url: " + url);
            _isReady = false;
            return false;
        }

        try {
            _appUrlWebsockets = _constuctWsUrl(url);
            _webSocket = _connectWs(_appUrlWebsockets);
        } catch (error) {
            u.logException(error, "_initWebsockets: failed to initialise WebSockets");
            _isReady = false;
            _webSocket = null;
            _isWsOpened = false;            
            return false;
        }

        connState.isUsing = true;        
        log("_initWebsockets: WebSockets Initialised OK");
        return true;
    }
    function _closeConnection(connType) { 
        if(isNull(connType)) {
            connType = _getConnectionType();
        }
        switch(connType) {
            case WEBSOCKET:
                // var callback = function(){};
                _closeWs();
                break;
            case SSE:                
            default:
                logError("Unsupported connection type: " + connType);
        }
    }    
    function _isConnected(connType) { 
        if(!_isReady) {
            return false;
        }
        if(isNull(connType)) {
            connType = _getConnectionType();
        }
        switch(connType) {
            case WEBSOCKET:
                return _isWsOpen();
            case SSE:                
            default:
                logError("_isConnected: Unsupported connection type: " + connType);
        }
    }
    function _reconnect(connType, isRetry) { 
        if(!_isReady) {
            log("_reconnect: net lib not initialised, ignoring call.");
        }
        if(isNull(connType)) {
            connType = _getConnectionType();
        }
        switch(connType) {
            case WEBSOCKET:
                if(_isInReconnectMode) {
                    log("_reconnect: already in reconnect mode, ignoring call.");
                    break;
                }
                _reconnectWs(isRetry);
                break;
            case SSE:                
            default:
                logError("_reconnect: Unsupported connection type: " + connType);
        }
    }
    function _getConnectionType() { 
        var conn = _getConnection();
        if(isNull(conn)) {
            logError("_getConnectionType: Can not find active connection");
            return null;
        }
        return conn.name;
    }
    function _getConnection() { 
        var conn = _currentConnection;
        if(isNull(conn)) {
            conn = _getUsedConnectionState();
        }
        return conn;
    }
    function _getUsedConnectionState() { 
        for (var key in _connectionStates) {
            if (_connectionStates.hasOwnProperty(key)) {
                var conn = _connectionStates[key];
                if(conn.isUsing) {
                    return conn;
                }
            }                  
        }
        return null;
    }
    function _reconnectWs(isRetry) { 
        log("_reconnectWs: attempting to reconnect Websocket ...");
        if(!_isReady) {
            log("_reconnect: net lib not initialised, ignoring call.");
        }
        if(isNull(_appUrlWebsockets)) {
            logError("_reconnectWs: invalid Websocket URL");
            return;
        }
        if(_isWsOpen()) {                            
            log("_reconnectWs: Websocket connection is open. ignoring reconnect");
            return;
        }
        try {            
            _isInReconnectMode = true;
            if(!_isWsConnecting()) {
                _webSocket = _connectWs(_appUrlWebsockets);            
            }
        } catch (error) {
            u.logException(error, "_reconnectWs: failed to reconnect WebSocket");
            _webSocket = null;
            _isWsOpened = false;
            return false;
        } finally {
            if(isRetry) {
                _retryConnect(isRetry);
            }
        }
    }
    function _retryConnect(isRetry) {
        _reconnectAttmpts++;
        var timeout = _getReconnectionTimeout();        
        log("_reconnectWs: scheduling reconnect in: " + timeout + " ms");
        setTimeout(function() {
            _reconnectWs(isRetry);
        }, timeout);

    }
    function _getReconnectionTimeout() {
        var timeout = _reconnectTimeMultiplierMs;
        if(_reconnectAttmpts > 1) {
            timeout =  _reconnectTimeMultiplierMs * Math.pow(2, _reconnectAttmpts); 
        }        
        if(timeout > _reconnectMaxTimeMs) {
            timeout = _reconnectMaxTimeMs;
        }
        return timeout;
    }
    function _reconnectOnCloseCallback() { 
        u.log("_reconnectOnCloseCallback: WebSocket closed");
        _isWsOpened = false;
        _webSocket = null;
        _reconnectWs(true);
    }
    function _closeWs(onCloseCallback) { 
        if(isNull(_webSocket)) {
            if(!isNull(onCloseCallback)) {
                onCloseCallback();
            }
            return;
        }
        if(!isNull(onCloseCallback)) {
            _webSocket.onclose = onCloseCallback;
        }
        
        _webSocket.close();
    }
    function _connectWs(url) { 
        if(_isWsOpened || _isWsAlive()) {
            u.log("_connectWs: connection is already opened, ignoring connect call...");
            return;
        }

        var webSocket = new WebSocket(url);

        webSocket.onmessage = function (event) {
            if(isNull(event) || isNull(event.data)) {
                return;
            }
            var jsonVal = u.parseJson(event.data);
            _processServerResponse(jsonVal, WEBSOCKET);                    
        };
        webSocket.onopen = function () {
            _isWsOpened = true;
            _reconnectAttmpts = 0;
            _isInReconnectMode = false;
            _processConnectionState(OPEN, WEBSOCKET);
        };
        webSocket.onerror = function (error) {
            _processConnectionState(ERROR, WEBSOCKET);
        };
        webSocket.onclose = function (error) {
            _isWsOpened = false;
            _webSocket = null;
            _processConnectionState(CLOSED, WEBSOCKET);
        };
        return webSocket;
    }
    function _isPushEvent(event) { 
        return isNull(event.data);
    }
    function _constuctWsUrl(url) {        
        if(u.contains(url, WS_URL_PREFIX) || u.contains(url, WSS_URL_PREFIX)) {
            return url;
        }

        var loc = win.location;
        var out;

        if (loc.protocol === HTTPS_URL_PREFIX) {
            out = WSS_URL_PREFIX;
        } else {
            out = WS_URL_PREFIX;
        }
        out += HTTP_URL_DSLASH + loc.host;
        out += url;
        return out;
    }
    //WEBSOCKETS END

    //Poll
    function _initPoll(connState) {
        _isPollState = true;
        try {
            _schedulePollState();
        } catch (error) {
            u.logException(error, "Poll: Could not schedule poll state");
            _isReady = false;
            return false;
        }
        connState.isUsing = true;
        log("_initSse: Initialised POLL OK");
        return true;
    }
    function _schedulePollState() {
        var now = Date.now();
        var nextPollTime = now + _pollInterval;

        if (now < _nextPollScheduledTime) {
            log("Poll already scheduled, skipping poll. now: " + now + " scheduledPoll: " + _nextPollScheduledTime);
            return;
        }

        log("Scheduling next poll at: " + nextPollTime);
        setTimeout(function () {
            _pollState();
        }, _pollInterval);
        _nextPollScheduledTime = nextPollTime;
    }
    function _pollState() {
        _getServerState();
        _lastPollTime = Date.now();
    }
    //Poll END

    // HTTP
    function _getServerState() {
        var event = _createEvent(GET_SERVER_STATE);
        if (_isPollState) {
            event.addParam(EVENT_PARAM_LAST_STATE_UPDATE_TIME, _lastStateUpdateTime);
            event.addParam(POLL, true);
        }
        _webQueue.add(event);
        _sendEvents();
    }
    function _createEvent(id) {
        if (!u.isString(id)) {
            logError("_createEvent: invalid event id: " + id);
            return;
        }
        return u.createEvent(id, Date.now());
    }
    function _sendEvents() {
        if (isNull(_webQueue) || _webQueue.size() <= 0) {
            return;
        }

        var event = _webQueue.remove();
        var toResend = [];
        while (u.isNotNull(event)) {
            if(_currentConnection.name === WEBSOCKET) {
                var isSent = sendWsEvent(event);
                if(!isSent) {
                    toResend.push(event);
                }

            } else {
                sendHttpEvent(event);
            }           
            event = _webQueue.remove();
        }

        for (var i = 0; i < toResend.length; i++) {
            _webQueue.add(toResend[i]);
        }

        if(toResend.length > 0) {        
            setTimeout(function () {
                _sendEvents();
            }, _pollInterval);
        }
    }
    function sendWsEvent(event) {
        if(isNull(_webSocket) || isNull(event)) {
            logError("sendWsEvent: Invalid Websocket or event");
            return false;
        }

        if(!_isWsOpened || _isWsDead()) {
            logError("sendWsEvent: Websocket is not oppened");
            _processConnectionState(CLOSED, WEBSOCKET);
            return false;
        }

        event.addParam(EVENT_PARAM_ID, event.id);
        event.addParam(EVENT_PARAM_CREATED_TIME, event.time);
        var props = event.propertyBag;
        for (var prop in props) {
            if (props.hasOwnProperty(prop)) {
                event.addParam(prop, props[prop]);
            }
        }

        var d = new Date();
        event.addParam(EVENT_PARAM_SEND_TIME, d.getTime());        

        var out = JSON.stringify(event);
        _webSocket.send(out);
        return true;
    }
    function sendHttpEvent(event) {
        log("sendHttpEvent: " + event.id + " event.time: " + event.time);
        var url = _appUrlHttp;
        url = u.appendUrlParam(url, EVENT_PARAM_ID, event.id);
        url = u.appendUrlParam(url, EVENT_PARAM_CREATED_TIME, event.time);

        var props = event.propertyBag;
        for (var prop in props) {
            if (props.hasOwnProperty(prop)) {
                url = u.appendUrlParam(url, prop, props[prop]);
            }
        }

        _ajaxGet(url, _handleAjaxGetResponse);
    }
    function _sendEvent(eventId, params) {
        var event = _createEvent(eventId);
        if (u.isObject(params)) {
            for (var prop in params) {
                if (params.hasOwnProperty(prop)) {
                    event.addParam(prop, params[prop]);
                }
            }
        }
        _webQueue.add(event);
        _sendEvents();
    }
    function _ajaxGet(url, handler) {
        if (isNull(url)) {
            logError("ajaxGet: Invalid params");
            return;
        }
        var xhr = new XMLHttpRequest();
        xhr.onload = function (event) {
            log('ajaxGet:onload: status: ' + xhr.status);
            if (!isNull(handler)) {
                handler.call(xhr)
            }
        };
        xhr.onreadystatechange = function () {
            log('ajaxGet:onreadystatechange: readyState: ' + _toAjaxReadyStateName(xhr.readyState));
        };

        var outUrl = u.uniquify(url)
        log('ajaxGet: url len: ' + outUrl.length + " url: " + outUrl);
        xhr.open(GET, outUrl, isAjaxAsync);
        xhr.setRequestHeader(HEADER_REQUESTED_WITH, HEADER_VAL_XML_HTTP_REQUEST);
        xhr.send();
    }
    function _ajaxPost(url, dataObj, handler) {
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
            log('ajaxPost:onreadystatechange: readyState: ' + _toAjaxReadyStateName(xhr.readyState));
        };
        xhr.open(POST, url, isAjaxAsync);
        xhr.setRequestHeader(HEADER_REQUESTED_WITH, HEADER_VAL_XML_HTTP_REQUEST);
        xhr.setRequestHeader(HEADER_CONTENT_TYPE, HEADER_VAL_FORM_URL_ENCODED);
        xhr.send(u.encodeUrlParams(dataObj));
    }
    function _toAjaxReadyStateName(state) {
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
    function _handleAjaxGetResponse() {
        log("handleAjaxGetResponse: ");
        if (!u.isObjectInstanceOf(XMLHttpRequest, this)) {
            return;
        }
        var responseURL = this.responseURL;
        var response = this.responseText;
        var jsonVal = u.parseJson(response);
        var status = this.status;
        // log("handleAjaxGetResponse: responseURL: " + responseURL + " status: " + status);
        _processServerResponse(jsonVal, POLL);        
    }
    function _processServerResponse(jsonResponse, source) {
        if (isNull(jsonResponse)) {
            logError("_processResponse: invalid json reponse");
            return;
        }

        var bag = jsonResponse.dataBag;
        var sendTime = bag.t;
        var message = bag.msg;
        var type = bag.type;
        var isDeltaUpdate = false;
        if (isNull(type)) {
            logError("_processResponse: invalid response type");
            return;
        }
        if (_isPollState) {
            _schedulePollState();
        }
        try {
            switch (type) {
                case ERROR:
                    logError("_processResponse: time: " + sendTime + " type: " + type + " source: " + source + " message: " + message);
                    _processError(message);
                    break;
                case OK:
                    u.logDebug("_processResponse: time: " + sendTime + " type: " + type + " source: " + source + " message: " + message);
                    _processOkResponse(message)
                    break;
                case STATE_DELTA:                    
                    isDeltaUpdate = true;
                case STATE:
                    var state = bag.st;
                    // log("handleAjaxGetResponse: time: " + t + " type: " + type + " state: " + st);
                    u.logDebug("_processResponse: time: " + sendTime + " type: " + type + " source: " + source);
                    _lastStateUpdateTime = sendTime;
                    _processStateResponse(state, isDeltaUpdate);
                    break;
                default:
                    logError("Unknown server response type: " + type);    
            }
        } catch (error) {
            logError("_processResponse: failed to process type: " + type + " message: " + message);
        }
    }
    function _processError(error) {
        logError("processError: Received ERROR: " + error);
    }
    function _processOkResponse(message) {
        u.logDebug("processOkResponse: Received message: " + message);
    }
    function _processConnectionState(connState, connType) {
        switch (connState) {
            case OPEN:
                if (isNull(_connectionCallback)) {
                    log(connType + " connection open"); 
                } else {
                    _connectionCallback(connState, connType);
                }
                break;
            case CLOSED:            
                if (isNull(_connectionCallback)) {
                    log(connType + " connection closed"); 
                } else {
                    _connectionCallback(connState, connType);
                }
                break;
            case ERROR:
                if (isNull(_connectionCallback)) {
                    logError(connType + " connection error"); 
                } else {
                    _connectionCallback(connState, connType);
                }
                break;
            default:
                logError("Unknown Connection State: " + connState + " for type: " + connType);
        }
    }
    function _isWsDead() {
        if(isNull(_webSocket)) {
            return true;
        }
        var state = _webSocket.readyState;
        return state === WebSocket.CLOSED || state === WebSocket.CLOSING;
    }
    function _isWsAlive() {
        if(isNull(_webSocket)) {
            return false;
        }
        var state = _webSocket.readyState;
        return state === WebSocket.OPEN || state === WebSocket.CONNECTING;
    }
    function _isWsConnecting() {
        if(isNull(_webSocket)) {
            return false;
        }
        var state = _webSocket.readyState;
        return state === WebSocket.CONNECTING;
    }   
    function _isWsOpen() {
        if(isNull(_webSocket)) {
            return false;
        }
        var state = _webSocket.readyState;
        return state === WebSocket.OPEN;
    }    
    function _processStateResponse(serverState, isDeltaUpdate) {
        if (isNull(serverState)) {
            return;
        }
        if (isNull(_stateEventCallback)) {
            logError("_processStateResponse: invalid state event callback, can not process server state");
            return;
        }
        var out = u.parseJson(serverState);   
        if(isDeltaUpdate && !isNull(out.delta) ) {
            out = out.delta;
        }     
        _stateEventCallback(out, isDeltaUpdate);
    }
    function _handleAjaxPostResponse() {
        log("handleAjaxPostResponse: ");
        if (u.isObjectInstanceOf(XMLHttpRequest, this)) {
            var responseURL = this.responseURL;
            var response = this.responseText;
            var jsonVal = u.parseJson(response);
            var status = this.status;
            log("handleAjaxPostResponse: responseURL: " + responseURL + " status: " + status + " response: " + response);
        }
    }
    // HTTP END

    function logError(val) {
        u.logError(val, LOG_ID);
    }
    function log(val) {
        u.log(val, LOG_ID);
    }
    function isNull(val) {
        return u.isNull(val);
    }

    // PUBLIC API
    return {
        SSE: SSE,
        WEBSOCKET: WEBSOCKET,
        POLL: POLL,
        OPEN: OPEN,
        CLOSED: CLOSED,
        ERROR: ERROR,
        init: function (connectionPref, sseUrl, websocketsUrl, httpUrl, serverStateCallback, connectionCallback) {
            _init(connectionPref, sseUrl, websocketsUrl, httpUrl, serverStateCallback, connectionCallback);
        },
        useSse: function (url, sseEventCallback) {
            _useSse(url, sseEventCallback);
        },
        setHttpUrl: function (url) {
            if (!u.isString(url)) {
                return;
            }
            _appUrlHttp = url;
        },
        sendEvent: function (eventId, params) {
            _sendEvent(eventId, params);
        },
        getServerState: function () {
            _getServerState();
        },
        reconnect: function (connType, isRetry) {
            _reconnect(connType, isRetry);
        },
        closeConnection: function (connType) {
            _closeConnection(connType);
        },
        isConnected: function (connType) {
            return _isConnected(connType);
        }
    }
}(zsUtil, window));