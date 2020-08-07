var zsUtil = (function (console, win, doc) {
    "use strict";

    // ----- Static members
    const ERROR = "### ERROR: ";
    const ERROR_TXT = "I'm sorry Dave, I'm afraid I can't do that.";
    const EMPTY = "";
    const SPACE = " ";
    const SEMICOL = ";";
    const QMARK = "?";
    const AMP = "&";
    const HASH = "#";
    const EQUALS = "=";
    const FUNCTION = "function";
    const OBJECT = "object";
    const STRING = "string";
    const UNDEFINED = "undefined";
    const OBJ_ARRAY = '[object Array]';
    const ON = "on";
    const DIV = "div";
    const SPAN = "span";
    const MARKUP_PREFIX = "</";
    const T_URL_PARAM = "t=";
    const THAU = 1000;
    const _RUN_MODE = {
        DEV: 'dev',
        PROD: 'prod',
    }

    // ----- private vars
    var _mode = _RUN_MODE.DEV;
    var _testDiv = null;

    // ----- Polyfills
    if (!Array.isArray) {
        Array.isArray = function (arg) {
            return Object.prototype.toString.call(arg) === OBJ_ARRAY;
        };
    }
    if (!String.prototype.splice) {
        /**
         * {JSDoc}
         * The splice() method changes the content of a string by removing a range of
         * characters and/or adding new characters.
         * @this {String}
         * @param {number} start Index at which to start changing the string.
         * @param {number} delCount An integer indicating the number of old chars to remove.
         * @param {string} newSubStr The String that is spliced in.
         * @return {string} A new string with the spliced substring.
         */
        String.prototype.splice = function (start, delCount, newSubStr) {
            return this.slice(0, start) + newSubStr + this.slice(start + Math.abs(delCount));
        };
    }
    if (!String.prototype.endsWith) {
        String.prototype.endsWith = function (search, this_len) {
            if (this_len === undefined || this_len > this.length) {
                this_len = this.length;
            }
            return this.substring(this_len - search.length, this_len) === search;
        };
    }
    if (!String.prototype.startsWith) {
        Object.defineProperty(String.prototype, 'startsWith', {
            value: function (search, rawPos) {
                var pos = rawPos > 0 ? rawPos | 0 : 0;
                return this.substring(pos, pos + search.length) === search;
            }
        });
    }
    if (!Date.now) {
        Date.now = function now() {
            return new Date().getTime();
        };
    }

    // ----- Class defs -----------------------
    function ZsException(msg) {
        this.message = msg;
        this.name = 'ZsException';
    }
    // ----- Queue
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
    // ----- Queue END
    // ----- Point
    function Point(x, y) {
        this.x = x;
        this.y = y;
    }
    // ----- Point END
    // ----- Event
    function Event(id, time) {
        this.id = id;
        this.time = time;
        this.propertyBag = {};
    }
    Event.prototype.addParam = function (name, value) {
        if (_isNull(name)) {
            _logError("Event addParam: invalid name")
            return;
        }
        this.propertyBag[name] = value;
    };
    // ----- Event END
    // ----- Envelope
    //Levels: attack(0 -> 1),  decay(1 -> dl), sustain(dl, dl),  release(dl -> 0);
    function Envelope(attackTime, decayTime, sustainLevel, sustainTime, releaseTime) {
        this.at = attackTime;
        this.dt = decayTime;
        this.st = sustainTime;
        this.rt = releaseTime;
        this.sl = sustainLevel;
    }
    Envelope.prototype.applyTo = function (buffer, node, playTime, durationSec) {
        if (!buffer) {
            _logError("Grain.applyTo: Invalid buffer");
            return;
        }
        if (!node) {
            _logError("Grain.applyTo: Invalid gain node");
            return;
        }
        if (!playTime) {
            playTime = audioCtx.currentTime;
        }
        if (!durationSec) {
            durationSec = buffer.duration;
        }
        durationSec = _round(durationSec, 5);

        var attack = this.at * durationSec;
        var decay = this.dt * durationSec;
        var sustain = this.st * durationSec;
        var release = this.rt * durationSec;
        if (attack < 0) {
            attack = 0;
        }
        if (decay < 0) {
            decay = 0;
        }
        if (sustain < 0) {
            sustain = 0;
        }
        if (release < 0) {
            release = 0;
        }

        var sustainLevel = this.sl;
        if (sustainLevel < 0) {
            sustainLevel = 0;
        } else if (sustainLevel > 1) {
            sustainLevel = 1;
        }

        var totalDuration = attack + decay + sustain + release;
        totalDuration = _round(totalDuration, 5);
        if (totalDuration > durationSec) {
            _logError("Invalid total duration: " + totalDuration + " longer than required: " + durationSec);
            var diff = totalDuration - durationSec;
            if (sustain > diff) {
                sustain -= diff;
            } else if (release > diff) {
                release -= diff;
            } else if (attack > diff) {
                attack -= diff;
            }
        }

        var t0 = playTime;
        node.gain.setValueAtTime(0, t0);
        var t1 = t0 + attack;
        node.gain.linearRampToValueAtTime(1, t1);
        var t2 = t1 + decay;
        node.gain.linearRampToValueAtTime(sustainLevel, t2);
        var t3 = t2 + sustain;
        node.gain.setValueAtTime(sustainLevel, t3);
        var t4 = t3 + release;
        node.gain.linearRampToValueAtTime(0.001, t4); // avoid 0 for clicks
    }
    // ----- Envelope END
    // ----- RampLinear
    function RampLinear(configParamName, rampEndValue, rampDurationMs, now, currentValue) {
        this.paramName = configParamName;
        this.endValue = rampEndValue;
        this.durationMs = rampDurationMs;
        this.startTimeSec = now;
        this.startValue = currentValue;
        this.durationSec = null;
        this.endTimeSec = null;
        this.isValid = false;
        this.isFinished = false;
        this.isScheduleReminder = false;
        this.init();
    }
    RampLinear.prototype.init = function () {
        if (!_isString(this.paramName) || !_isNumeric(this.endValue) || !_isNumeric(this.startValue) || !_isNumeric(this.durationMs) || !_isNumeric(this.startTimeSec)) {
            _logError("RampLinear.init: invalid ramp init values");
            this.isValid = false;
            return;
        }

        this.durationSec = _msecToSec(this.durationMs);
        this.endTimeSec = this.startTimeSec + this.durationSec;
        this.isValid = true;
    }
    RampLinear.prototype.getValue = function (now) {
        if (!this.isValid) {
            this.isFinished = true;
            _logError("RampLinear.getValue: invalid ramp object");
            return null;
        }
        if (this.isFinished) {
            _log("RampLinear.getValue: action is finished, will not update");
            return null;
        }
        if (!_isNumeric(now)) {
            _logError("RampLinear.getValue: invalid input param: now: " + now);
            return null;
        }

        if (now < this.startTimeSec) {
            return null;
        }

        if (now > this.endTimeSec) {
            _log("RampLinear.getValue: finished: " + this.paramName + " returning Value: " + this.endValue);
            this.isFinished = true;
            return this.endValue;
        }

        var newVal = _mapRange(now, this.startTimeSec, this.endTimeSec, this.startValue, this.endValue);
        _log("RampLinear.getValue: param " + this.paramName + " new Value: " + newVal + " time: " + now);
        return newVal;
    }
    // ----- RampLinear END
    // ----- RampSin
    function RampSin(configParamName, rampAmplitude, rampFrequency, rampDurationMs, now, currentValue) {
        this.paramName = configParamName;
        this.amplitude = rampAmplitude;
        this.freq = rampFrequency;
        this.durationMs = rampDurationMs;
        this.startTimeSec = now;
        this.startValue = currentValue;
        this.durationSec = null;
        this.endTimeSec = null;
        this.reminderSec = null;
        this.isValid = false;
        this.isFinished = false;
        this.isScheduleReminder = false;
        this.init();
    }
    RampSin.prototype.init = function () {
        if (!_isString(this.paramName) || !_isNumeric(this.durationMs) || !_isNumeric(this.startTimeSec) || !_isNumeric(this.startValue)) {
            _logError("RampSin.init: invalid ramp init values");
            this.isValid = false;
            return;
        }

        if (!_isNumeric(this.amplitude)) {
            this.amplitude = 1.0;
        }
        if (this.amplitude < 0.0) {
            this.amplitude = 0.0;
        }

        if (!_isNumeric(this.freq)) {
            this.freq = 1.0;
        }
        if (this.freq <= 0.0) {
            this.freq = 1.0;
        }

        this.durationSec = _msecToSec(this.durationMs);
        this.endTimeSec = this.startTimeSec + this.durationSec;

        var wholeSec = Math.floor(this.durationSec);
        var reminder = this.durationSec % wholeSec;
        if (reminder > 0) {
            this.reminderSec = reminder;
            this.durationSec = wholeSec;
        }

        this.isValid = true;
    }
    RampSin.prototype.getValue = function (now) {
        if (!this.isValid) {
            this.isFinished = true;
            _logError("RampSin.getValue: invalid ramp object");
            return null;
        }
        if (this.isFinished) {
            _log("RampSin.getValue: action is finished, will not update");
            return null;
        }
        if (!_isNumeric(now)) {
            _logError("RampSin.getValue: invalid input params: now: " + now);
            return null;
        }

        if (now < this.startTimeSec) {
            return null;
        }

        this.isScheduleReminder = false;
        if (now > this.endTimeSec) {
            _log("RampSin.getValue: finished: " + this.paramName);
            this.isFinished = true;
            if (_isNumeric(this.reminderSec)) {
                this.isScheduleReminder = true;
            }
            return null;
        }

        var timeDiff = now - this.startTimeSec;
        var sinVal = _oscillator(timeDiff, this.freq, this.amplitude);
        var newVal = this.startValue + sinVal;

        _log("RampSin.getValue: param " + this.paramName + " new Value: " + newVal + " time: " + now);
        return newVal;
    }
    // ----- RampSin END
    // ----- Class defs END

    // ----- private functions
    function _setRunMode(rMode) {
        if (!_isString(rMode)) {
            return;
        }

        var m = rMode.toUpperCase();

        if (_RUN_MODE.hasOwnProperty(m)) {
            _mode = _RUN_MODE[m];
        } else {
            console.log("ERROR setRunMode: ignoring invalid Run Mode: " + rMode);
            return;
        }

        _log("Run Mode set to : " + rMode);
    }
    function _logError(val, id) {
        if (_isNull(id)) {
            _log(ERROR + val);
        } else {
            _log(ERROR + id + val);
        }
    }
    function _logObj(obj) {
        switch (_mode) {
            case _RUN_MODE.PROD:
                return;
            case _RUN_MODE.DEV:
                break;
        }
        console.log(obj);
    }
    function _log(val, id) {
        switch (_mode) {
            case _RUN_MODE.PROD:
                return;
            case _RUN_MODE.DEV:
                break;
        }

        if (_isNull(id)) {
            console.log(val);
        } else {
            console.log(id + val);
        }
    }
    function _logException(e, txt) {
        var out = ERROR;
        if (_isNotNull(e.name)) {
            out += (" name: " + e.name + SEMICOL);
        }
        if (_isNotNull(e.message)) {
            out += (" msg: " + e.message + SEMICOL);
        }
        if (_isNotNull(e.stack)) {
            out += (" stack: " + e.stack + SEMICOL);
        }
        if (_isNull(txt)) {
            _log(ERROR_TXT + EMPTY + out);
        } else {
            _log(out);
        }
    }
    function _isUndefined(val) {
        return typeof val == UNDEFINED;
    }
    function _isNull(val) {
        return _isUndefined(val) || val === null;
    }
    function _isNotNull(val) {
        return !_isNull(val);
    }
    function _isNumeric(num) {
        if (_isNull(num)) {
            return false;
        }
        return !isNaN(num);
    }
    function _isString(val) {
        return typeof val === STRING;
    }
    function _isObject(obj) {
        return typeof obj === OBJECT;
    }
    function _isArray(val) {
        return Array.isArray(val);
    }
    function _isFunction(objFunc) {
        return typeof objFunc === FUNCTION;
    }
    function _isObjectInstanceOf(type, obj) {
        if (!_isObject(obj)) {
            return false;
        }
        return obj instanceof type || obj.constructor.prototype instanceof type;
    }
    function _listen(evnt, elem, func) {
        try {
            if (elem.addEventListener) {  // W3C DOM
                elem.addEventListener(evnt, func, false);
            } else if (elem.attachEvent) { // IE DOM
                var r = elem.attachEvent(ON + evnt, func);
                return r;
            } else {
                _log(ERROR_TXT);
            }
        } catch (err) {
            _log(ERROR_TXT + " error: " + err.name + ", " + err.message);
        }
    }
    function _round(val, decimalPlaces) {
        if (!_isNumeric(val) || !_isNumeric(decimalPlaces)) {
            return val;
        }
        return parseFloat(val.toFixed(decimalPlaces));
    }
    function _msecToSec(msec) {
        return msec / THAU;
    }
    function _secToMsec(sec) {
        return sec * THAU;
    }
    function _mapRange(value, minVal, maxVal, minValNew, maxValNew) {
        if ((maxVal - minVal) === 0) {
            return minValNew;
        }
        return minValNew + (maxValNew - minValNew) * (value - minVal) / (maxVal - minVal);
    }
    function _getElement(elementId) {
        if (_isNull(elementId)) {
            return null;
        }
        return doc.getElementById(elementId);
    }
    function _getChildElement(parent, query) {
        if (!_isObject(parent) || !_isString(query)) {
            return null;
        }
        return parent.querySelector(query);
    }
    function _addChildToParent(parent, child) {
        if (_isNull(parent)) {
            _logError("addChild: Can not find parrent: " + parentId);
            return;
        }
        parent.appendChild(child);
    }
    function _addFirstChildToParent(parent, child) {
        if (_isNull(parent)) {
            _logError("addChild: Can not find parrent: " + parentId);
            return;
        }

        if (_isNull(parent.childNodes) || parent.childNodes.length <= 0) {
            _addChildToParent(parent, child);
            return;
        }

        parent.insertBefore(child, parent.childNodes[0]);
    }
    function _addChildToParentId(parentId, child) {
        var parent = _getElement(parentId);
        _addChildToParent(parent, child);
    }
    function _initArray(elNo1, initValue) {
        var a1 = [];
        for (var i = 0; i < elNo1; ++i) {
            var val = initValue;
            if (!_isNull(initValue) && _isObject(initValue)) {
                val = _cloneObj(initValue);
            }
            a1.push(val);
        }
        return a1;
    }
    function _init2DArray(elNo1, elNo2, initValue) {
        var a1 = [];
        for (var i = 0; i < elNo1; ++i) {
            var a2 = [];
            for (var j = 0; j < elNo2; ++j) {
                var val = initValue;
                if (!_isNull(initValue) && _isObject(initValue)) {
                    val = _cloneObj(initValue);
                }
                a2.push(val);
            }
            a1.push(a2);
        }
        return a1;
    }
    function _cloneObj(obj) {
        if (!_isObject(obj)) {
            return null;
        }
        return JSON.parse(JSON.stringify(obj));
    }
    function _isTouchDevice() {
        var prefixes = ' -webkit- -moz- -o- -ms- '.split(' ');

        var mq = function (query) {
            return win.matchMedia(query).matches;
        }

        if (('ontouchstart' in win) || win.DocumentTouch && doc instanceof DocumentTouch) {
            return true;
        }

        // include the 'heartz' as a way to have a non matching MQ to help terminate the join
        // https://git.io/vznFH
        var query = ['(', prefixes.join('touch-enabled),('), 'heartz', ')'].join('');
        return mq(query);
    }
    function _isSafari(navigator) {
        return navigator.userAgent.indexOf('Safari') != -1 && navigator.userAgent.indexOf('Chrome') == -1;
    }
    function _setElementAttributes(element, attrAssocArr) {
        if (_isNull(element) || _isNull(attrAssocArr)) {
            _logError("setElementAttributes: invalid inputs");
            return;
        }
        for (var key in attrAssocArr) {
            if (attrAssocArr.hasOwnProperty(key)) {
                var k = key;
                var v = attrAssocArr[key];
                if (_isNotNull(k) && _isNotNull(v)) {
                    element.setAttribute(k, v);
                }
            }
        }
    }
    function _setElementStyleProperty(element, attrAssocArr) {
        if (_isNull(element) || _isNull(attrAssocArr)) {
            _logError("setElementAttributes: invalid inputs");
            return;
        }
        for (var key in attrAssocArr) {
            if (attrAssocArr.hasOwnProperty(key)) {
                var k = key;
                var v = attrAssocArr[key];
                if (_isNotNull(k) && _isNotNull(v)) {
                    element.style.setProperty(k, v);
                }
            }
        }
    }
    function _polarToCartesian(centerX, centerY, radius, angleInDegrees) {
        var angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;

        return {
            x: centerX + (radius * Math.cos(angleInRadians)),
            y: centerY + (radius * Math.sin(angleInRadians))
        };
    }
    function _getWindowWidth() {
        return win.innerWidth
            || doc.documentElement.clientWidth
            || doc.body.clientWidth;
    }
    function _getWindowHeight() {
        return win.innerHeight
            || doc.documentElement.clientHeight
            || doc.body.clientHeight;
    }
    function _startsWith(strVal, startStr) {
        if (!_isString(strVal) || !_isString(startStr)) {
            return false;
        }
        return strVal.startsWith(startStr);
    }
    function _contains(str, substr) {
        return str.indexOf(substr) !== -1;
    }
    function _replace(strVal, strToReplace, strReplaceWith) {
        if (!_isString(strVal) || !_isString(strToReplace) || !_isString(strReplaceWith)) {
            return strVal;
        }
        return strVal.replace(strToReplace, strReplaceWith);
    }
    function _getTestDiv() {
        if (_isNull(_testDiv)) {
            _testDiv = doc.createElement(DIV);
        }
        return _testDiv;
    }
    function _removeMarkup(line) {
        if (!_contains(line, MARKUP_PREFIX)) {
            return line;
        }

        var div = _getTestDiv();
        div.innerHTML = "";
        div.innerHTML = line;
        var out = div.textContent || div.innerText || line;
        return out;
    }
    function _encodeUrlParams(object) {
        var encodedString = EMPTY;
        if (!_isObject(object)) {
            return encodedString;
        }
        for (var prop in object) {
            if (object.hasOwnProperty(prop)) {
                if (encodedString.length > 0) {
                    encodedString += AMP;
                }
                var param = object[prop]
                if (_isObject(param) || _isArray(param)) {
                    var s = JSON.stringify(param)
                    encodedString += encodeURI(prop + EQUALS + s);
                } else {
                    encodedString += encodeURI(prop + EQUALS + param);
                }
            }
        }
        return encodedString;
    }
    function _addSuffixIfNotThere(str, suffix) {
        if (!_isString(str) || !_isString(suffix)) {
            _logError("addSuffixIfNotThere: invalid inputs");
            return str;
        }
        if (str.endsWith(suffix)) {
            return str;
        }
        return str + suffix;
    }
    function _wrapInSpanElement(str, spanId) {
        if (!_isString(str) || !_isString(spanId)) {
            _logError("wrapInSpanElement: invalid inputs");
            return null;
        }
        var div = _getTestDiv();
        div.innerHTML = str;

        var span = null;

        var spans = div.getElementsByTagName(SPAN);
        var isSpanned = true;
        if (_isNull(spans) || spans.length === 0) {
            isSpanned = false;
        }

        if (isSpanned) {
            var span = spans[0];
        } else {
            span = doc.createElement(SPAN);
            span.innerHTML = str;
        }

        span.id = spanId;
        return span.outerHTML;
    }
    function _parseJson(val) {
        try {
            return JSON.parse(val);
        } catch (e) {
            return null;
        }
    }
    function _appendUrlParam(url, name, value) {
        var delimiter = QMARK;
        if (_contains(url, delimiter)) {
            delimiter = AMP;
        }
        var toAdd = delimiter + name + EQUALS + value;
        return url + encodeURI(toAdd);
    }
    function _uniquifyUrl(url) {
        var delimiter = QMARK;
        if (_contains(url, delimiter)) {
            delimiter = AMP;
        }
        var d = new Date();
        return url + delimiter + T_URL_PARAM + d.getTime();
    }
    function _throwException(msg) {
        throw new ZsException(msg);
    }
    function _getNestedObjectValue(parentObj, nestedKey) {
        return nestedKey.split(".").reduce(function (o, x) {
            return (typeof o == "undefined" || o === null) ? o : o[x];
        }, parentObj);
    }
    function _hasNestedObjectKey(parentObj, nestedKey) {
        return nestedKey.split(".").every(function (x) {
            if (typeof parentObj != "object" || parentObj === null || !x in parentObj)
                return false;
            parentObj = parentObj[x];
            return true;
        });
    }
    function _setNestedObjectValue(parentObj, path, value) {
        var schema = parentObj;
        var pList = path.split('.');
        var len = pList.length;
        for (var i = 0; i < len - 1; i++) {
            var elem = pList[i];
            if (!schema[elem]) schema[elem] = {}
            schema = schema[elem];
        }
        schema[pList[len - 1]] = value;
    }
    function _oscillator(time, frequency = 1, amplitude = 1, phase = 0, offset = 0) {
        return Math.sin(time * frequency * Math.PI * 2 + phase * Math.PI * 2) * amplitude + offset;
    }
    function _modColour(col, amt) {  
        var usePound = false;      
        if (col[0] == "#") {
            col = col.slice(1);
            usePound = true;
        }     
        var num = parseInt(col,16);     
        var r = (num >> 16) + amt;
        r = _validateCol(r);
        var b = ((num >> 8) & 0x00FF) + amt;     
        b = _validateCol(b);
        var g = (num & 0x0000FF) + amt;
        g = _validateCol(g);
        return (usePound?"#":"") + (g | (b << 8) | (r << 16)).toString(16);      
    }
    function _validateCol(col) {  
        if (col > 255) {
            return 255;
        } else if (col < 0) {
            return 0;
        }
        return col;
    }

    // PUBLIC API
    return {
        runModeEnum: _RUN_MODE,
        runMode: _mode,
        RampLinear: RampLinear,
        RampSin: RampSin,
        Point: Point,
        modColour: function (col, amt) {
            return _modColour(col, amt);
        },
        cloneObj: function (obj) {
            return _cloneObj(obj);
        },
        addSuffixIfNotThere: function (str, suffix) {
            return _addSuffixIfNotThere(str, suffix);
        },
        createQueue: function () {
            return new Queue();
        },
        createPoint: function (x, y) {
            return new Point(x, y);
        },
        createEvent: function (id, time) {
            return new Event(id, time);
        },
        createEnvelope: function (attackTime, decayTime, sustainLevel, sustainTime, releaseTime) {
            return new Envelope(attackTime, decayTime, sustainLevel, sustainTime, releaseTime);
        },
        createRampLinear: function (configParamName, rampEndValue, rampDurationMs, now, currentValue) {
            return new RampLinear(configParamName, rampEndValue, rampDurationMs, now, currentValue);
        },
        createRampSin: function (configParamName, rampAmplitude, rampFrequency, rampDurationMs, now, currentValue) {
            return new RampSin(configParamName, rampAmplitude, rampFrequency, rampDurationMs, now, currentValue);
        },
        wrapInSpanElement: function (str, spanId) {
            return  _wrapInSpanElement(str, spanId);
        },
        setRunMode: function (rMode) {
            _setRunMode(rMode);
        },
        throwException: function (msg) {
            _throwException(msg);
        },
        contains: function (str, substr) {
            return _contains(str, substr);
        },
        containsSpace: function (str) {
            return _contains(str, SPACE);
        },
        startsWith: function (strVal, startStr) {
            return _startsWith(strVal, startStr);
        },
        replace: function (strVal, strToReplace, strReplaceWith) {
            return _replace(strVal, strToReplace, strReplaceWith);
        },
        removeMarkup: function (line) {
            return _removeMarkup(line);
        },
        encodeUrlParams: function (object) {
            return _encodeUrlParams(object);
        },
        parseJson: function (val) {
            return _parseJson(val);
        },
        appendUrlParam: function (url, name, value) {
            return _appendUrlParam(url, name, value);
        },
        uniquify: function (url) {
            return _uniquifyUrl(url);
        },
        getWindowWidth: function () {
            return _getWindowWidth();
        },
        getWindowHeight: function () {
            return _getWindowHeight();
        },
        polarToCartesian: function (centerX, centerY, radius, angleInDegrees) {
            return _polarToCartesian(centerX, centerY, radius, angleInDegrees);
        },
        setElementAttributes: function (element, attrAssocArr) {
            _setElementAttributes(element, attrAssocArr);
        },
        setElementStyleProperty: function (element, attrAssocArr) {
            _setElementStyleProperty(element, attrAssocArr);
        },
        addChildToParent: function (parent, child) {
            _addChildToParent(parent, child);
        },
        addFirstChildToParent: function (parent, child) {
            _addFirstChildToParent(parent, child);
        },
        addChildToParentId: function (parentId, child) {
            _addChildToParentId(parentId, child);
        },
        getElement: function (elementId) {
            return _getElement(elementId);
        },
        getChildElement: function (parent, query) {
            return _getChildElement(parent, query);
        },
        initArray: function (elNo1, initValue) {
            return _initArray(elNo1, initValue);
        },
        init2DArray: function (elNo1, elNo2, initValue) {
            return _init2DArray(elNo1, elNo2, initValue);
        },
        isObjectInstanceOf: function (type, obj) {
            return _isObjectInstanceOf(type, obj);
        },
        isTouchDevice: function () {
            return _isTouchDevice();
        },
        isSafari: function (navigator) {
            return _isSafari(navigator);
        },
        listen: function (evnt, elem, func) {
            _listen(evnt, elem, func);
        },
        getNestedObjectValue: function (parentObj, nestedKey) {
            return _getNestedObjectValue(parentObj, nestedKey);
        },
        hasNestedObjectKey: function (parentObj, nestedKey) {
            return _hasNestedObjectKey(parentObj, nestedKey);
        },
        setNestedObjectValue: function (parentObj, path, value) {
            _setNestedObjectValue(parentObj, path, value);
        },
        oscillator: function (atime, frequency, amplitude, phase, offset) {
            _oscillator(time, frequency, amplitude, phase, offset);
        },
        mapRange: function (value, minVal, maxVal, minValNew, maxValNew) {
            return _mapRange(value, minVal, maxVal, minValNew, maxValNew);
        },
        getRandomFromRange: function (min, max) {
            return Math.random() * (max - min) + min;
        },
        getRandomIntFromRange: function (min, max) {
            min = Math.ceil(min);
            max = Math.floor(max);
            return Math.floor(Math.random() * (max - min + 1)) + min;
        },
        randomIntFromInterval: function (min, max) { // min and max included 
            return Math.floor(Math.random() * (max - min + 1) + min);
        },
        randomFloatFromInterval: function (min, max) { // min and max included 
            return Math.random() * (max - min) + min;
        },
        round: function (val, decimalPlaces) {
            return _round(val, decimalPlaces);
        },
        msecToSec: function (msec) {
            return _msecToSec(msec);
        },
        secToMsec: function secToMsec(sec) {
            return _secToMsec(sec);
        },
        toCssIdQuery: function (id) {
            if (!_isString(id)) {
                return id;
            }
            return HASH + id;
        },
        toStr: function (val) {
            return String(val);
        },
        toFloat: function (val) {
            if (_isNull(val)) {
                return null;
            }
            return parseFloat(val);
        },
        toInt: function (val) {
            if (_isNull(val)) {
                return null;
            }
            return parseInt(val, 10);
        },
        isNumeric: function (num) {
            return _isNumeric(num);
        },
        isString: function (val) {
            return _isString(val);
        },
        isObject: function (obj) {
            return _isObject(obj);
        },
        isArray: function (val) {
            return _isArray(val);
        },
        isFunction: function (objFunc) {
            return _isFunction(objFunc);
        },
        isEmptyString: function (val) {
            return _isString(val) && val === EMPTY;
        },
        isNull: function (val) {
            return _isNull(val);
        },
        isUndefined: function (val) {
            return _isUndefined(val);
        },
        isNotNull: function (val) {
            return _isNotNull(val);
        },
        logException: function (e, txt) {
            _logException(e, txt);
        },
        logError: function (val, id) {
            _logError(val, id);
        },
        logObj: function (obj) {
            _logObj(obj);
        },
        log: function (val, id) {
            _log(val, id);
        },
    }
}(console, window, document));