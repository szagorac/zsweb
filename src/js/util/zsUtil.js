var zsUtil = (function (console, win, doc) {
    "use strict";

    // ----- Static members
    const ERROR = "### ERROR: ";
    const ERROR_TXT = "I'm sorry Dave, I'm afraid I can't do that.";
    const EMPTY = "";
    const SPACE = " ";
    const COMMA = ",";
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
    const BUTTON = "button";
    const SPAN = "span";
    const MARKUP_PREFIX = "</";
    const T_URL_PARAM = "t=";
    const THAU = 1000;
    const STYLE_VISIBLE = { "visibility": "visible" };
    const STYLE_INVISIBLE = { "visibility": "hidden" };
    const _RUN_MODE = {
        DEV: 'dev',
        PROD: 'prod',
        DEBUG: 'debug',
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
    if (!Array.prototype.includes) {
        Array.prototype.includes = function (search) {
            return !!~this.indexOf(search);
        }
    }
    if (!Array.prototype.indexOf) {
        Array.prototype.indexOf = (function (Object, max, min) {
            return function indexOf(member, fromIndex) {
                if (this === null || this === undefined) throw TypeError("Array.prototype.indexOf called on null or undefined");

                var that = Object(this), Len = that.length >>> 0, i = min(fromIndex | 0, Len);
                if (i < 0) i = max(0, Len + i); else if (i >= Len) return -1;

                if (member === void 0) {
                    for (; i !== Len; ++i) if (that[i] === void 0 && i in that) return i; // undefined
                } else if (member !== member) {
                    for (; i !== Len; ++i) if (that[i] !== that[i]) return i; // NaN
                } else for (; i !== Len; ++i) if (that[i] === member) return i; // all else

                return -1; // if the value was not found, then return -1
            };
        });
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
        // _log("RampLinear.getValue: param " + this.paramName + " new Value: " + newVal + " time: " + now);
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
        var sinVal = _sineOscillator(timeDiff, this.freq, this.amplitude);
        var newVal = this.startValue + sinVal;
        // _log("RampSin.getValue: param " + this.paramName + " new Value: " + newVal + " time: " + now);
        return newVal;
    }
    // ----- RampSin END
    // ----- GsapRampLinear
    function GsapRampLinear(parentObj, propName, startValue, endValue, onUpdateCallback, onCompleteCallback) {
        this.currentValue = startValue;
        this.parentObj = parentObj;
        this.propName = propName;
        this.startValue = startValue;
        this.endValue = endValue;
        this.onUpdateCallback = onUpdateCallback;
        this.onCompleteCallback = onCompleteCallback;
    }
    GsapRampLinear.prototype.onUpdate = function (grl) {
        grl.parentObj[grl.propName] = grl.currentValue;
        if (_isFunction(grl.onUpdateCallback)) {
            grl.onUpdateCallback(grl);
        }
    }
    GsapRampLinear.prototype.onComplete = function (grl) {
        if (_isFunction(grl.onCompleteCallback)) {
            grl.onCompleteCallback(grl);
        }
    }
    // ----- GsapRampLinear END
    // ----- Oscillator 
    function Oscillator(type, freq) {
        this.type = type;
        this.freq = freq;
        this.freqMod = null;
    }
    Oscillator.prototype.compute = function (time) {
        //oscillator functions return value 0 -> 1 in time domain (seconds)
        if (_isNull(time) || !_isNumeric(time)) {
            _logError("Oscillator.computeValue invalid time: " + time);
            return;
        }
        var frequency = this.freq;
        if (!_isNull(this.freqMod)) {
            frequency += this.freqMod;
        }
        switch (this.type) {
            case 'SAWTOOTH':
                return _sawtooth(time, frequency);
            case 'SINE':
                return _cosine(time, frequency);
            case 'SQUARE':
                return _square(time, frequency);
            case 'TRIANGLE':
                return _triangle(time, frequency);
            case 'UP':
                return _sawtooth(time, frequency);
            case 'DOWN':
                return _sawtoothInverted(time, frequency);
            case 'RANDOM':
                return _random();
            default:
                _logError("Oscillator.computeValue  invalid Oscillator type: " + this.type);
        }
        return null;
    }
    Oscillator.prototype.setFrequency = function (value) {
        if (!_isNumeric(value)) {
            return;
        }
        this.freq = value;
    }
    Oscillator.prototype.setFrequencyMod = function (mod) {
        if (!_isNumeric(mod)) {
            return;
        }
        this.freqMod = mod;
    }
    // ----- Oscillator END
    // ----- ParamOscillator 
    function ParamOscillator(name, startTime, minValue, maxValue, oscillatorType, frequency) {
        this.name = name;
        this.startTime = startTime;
        this.minValue = minValue;
        this.maxValue = maxValue;
        this.oscillator = new Oscillator(oscillatorType, frequency);
        this.freqLFO = null;
        this.minValLFO = null;
        this.maxValLFO = null;
    }
    ParamOscillator.prototype.getValue = function (now) {
        if (!_isNumeric(now)) {
            _logError("ParamOscillator.getValue: invalid input params: now: " + now);
            return this.minValue;
        }
        if (now < this.startTime) {
            return this.minValue;
        }
        var timeDelta = now - this.startTime;
        var oscValue = this.oscillator.compute(timeDelta);
        if (_isNull(oscValue)) {
            oscValue = 0.0;
        }
        if (!_isNull(this.freqLFO)) {
            var freqMod = this.freqLFO.getValue(now);
            if (!_isNull(freqMod)) {
                this.oscillator.setFrequencyMod(freqMod);
            }
        }
        var min = this.minValue;
        if (!_isNull(this.minValLFO)) {
            var minMod = this.minValLFO.getValue(now);
            if (!_isNull(minMod)) {
                min += minMod;
            }
        }
        var max = this.maxValue;
        if (!_isNull(this.maxValLFO)) {
            var maxMod = this.maxValLFO.getValue(now);
            if (!_isNull(maxMod)) {
                max += maxMod;
            }
        }

        var out = _mapRange(oscValue, 0.0, 1.0, min, max);
        // _log("ParamOscillator.getValue: calculated val: " + out + " oscType: " + this.oscillator.type + " timeDelta: " + timeDelta + " oscValue: " + oscValue + " minValue: " + this.minValue + " maxValue: " + this.maxValue + " now: " + now);
        return out;
    }
    ParamOscillator.prototype.setStartTime = function (startTime) {
        this.startTime = startTime;
        if (!_isNull(this.freqLFO)) {
            this.freqLFO.setStartTime(startTime);
        }
        if (!_isNull(this.minValLFO)) {
            this.minValLFO.setStartTime(startTime);
        }
        if (!_isNull(this.maxValLFO)) {
            this.maxValLFO.setStartTime(startTime);
        }
    }
    ParamOscillator.prototype.setFrequencyLFO = function (lfo) {
        if (!_isObjectInstanceOf(ParamOscillator, lfo)) {
            return;
        }
        this.freqLFO = lfo;
    }
    ParamOscillator.prototype.setMinValueLFO = function (lfo) {
        if (!_isObjectInstanceOf(ParamOscillator, lfo)) {
            return;
        }
        this.minValLFO = lfo;
    }
    ParamOscillator.prototype.setMaxValueLFO = function (lfo) {
        if (!_isObjectInstanceOf(ParamOscillator, lfo)) {
            return;
        }
        this.maxValLFO = lfo;
    }
    // ----- ParamOscillator END
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
            _log(ERROR + val, null, true);
        } else {
            _log(ERROR + id + val, null, true);
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
    function _logDebug(val) {
        if (_mode !== _RUN_MODE.DEBUG) {
            return;
        }
        _log(val);
    }
    function _log(val, id, isError) {
        switch (_mode) {
            case _RUN_MODE.PROD:
                if (!isError) {
                    return;
                }
                break;
            case _RUN_MODE.DEBUG:
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
    function _removeElement(elementId) {
        var elm = _getElement(elementId);
        if (_isNull(elm)) {
            return;
        }
        elm.remove();
    }
    function _removeChildren(parentId) {
        var elm = _getElement(parentId);
        _removeElementChildren(elm);
    }
    function _removeElementChildren(elm) {
        if (_isNull(elm)) {
            return;
        }
        while (elm.firstChild) {
            elm.removeChild(elm.firstChild);
        }
    }
    function _clone(elm, elmId) {
        if (_isNull(elm) || _isNull(elmId)) {
            logError("_cloneAndAddElement: invalid element");
            return;
        }
        var out = elm.cloneNode();
        out.id = elmId;
        return out;
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
    function _setElementIdAttributes(elementId, attrAssocArr) {
        var element = _getElement(elementId);
        _setElementAttributes(element, attrAssocArr);
    }
    function _setElementAttributes(element, attrAssocArr) {
        if (_isNull(element) || _isNull(attrAssocArr)) {
            _logError("_setElementAttributes: invalid inputs");
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
    function _setElementIdStyleProperty(elementId, attrAssocArr) {
        _setElementStyleProperty(_getElement(elementId), attrAssocArr)
    }
    function _setElementStyleProperty(element, attrAssocArr) {
        if (_isNull(element) || _isNull(attrAssocArr)) {
            _logError("_setElementStyleProperty: invalid inputs");
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
    function _replaceEmptySpaces(strVal, strReplaceWith) {
        if (!_isString(strVal) || !_isString(strReplaceWith)) {
            return strVal;
        }
        return strVal.replace(/ /g, strReplaceWith);
    }
    function _replacePropValue(asocArr, prop, strToReplace, strReplaceWith) {
        var nv = _replace(asocArr[prop], strToReplace, strReplaceWith);
        asocArr[prop] = nv;
    }
    function _getTestDiv() {
        if (_isNull(_testDiv)) {
            _testDiv = _createDiv();
        }
        return _testDiv;
    }
    function _createButton(attrs) {
        return _createElement(BUTTON, attrs);
    }
    function _createDiv(attrs) {
        return _createElement(DIV, attrs);
    }
    function _createElement(type, attrs) {
        if (_isNull(type)) {
            return null;
        }
        var el = doc.createElement(type);
        if (_isNotNull(attrs)) {
            _setElementAttributes(el, attrs);
        }
        return el;
    }
    function _makeElementVisible(element) {
        _setElementVisibility(element, true);
    }
    function _makeElementInVisible(element) {
        _setElementVisibility(element, false);
    }
    function _makeVisible(elementId) {
        _setElementIdVisibility(elementId, true);
    }
    function _makeInVisible(elementId) {
        _setElementIdVisibility(elementId, false);
    }
    function _setElementIdVisibility(elementId, isVisible) {
        var element = _getElement(elementId);
        _setElementVisibility(element, isVisible);
    }
    function _setElementVisibility(element, isVisible) {
        if (_isNull(element)) {
            return;;
        }
        var attrs = STYLE_INVISIBLE;
        if (isVisible) {
            attrs = STYLE_VISIBLE;
        }
        _setElementStyleProperty(element, attrs);
    }
    function _setText(element, txt) {
        if (_isNull(element) || !_isString(txt)) {
            return;;
        }
        element.textContent = txt;
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
    function _sineOscillator(time, frequency = 1, amplitude = 1, phase = 0, offset = 0) {
        return Math.sin(time * frequency * Math.PI * 2 + phase * Math.PI * 2) * amplitude + offset;
    }
    //----  Oscillator functions return value 0 -> 1 in time domain [0,1]
    function _sawtooth(time, freq) {
        var p = 1.0 / freq;
        return ((2.0 * (time % p) / p - 1.0) + 1.0) / 2.0;
    }
    function _sawtoothInverted(time, freq) {
        var p = 1.0 / freq;
        return Math.abs(((2.0 * (time % p) / p - 1.0) - 1.0) / 2.0);
    }
    function _cosine(time, freq) {
        return Math.abs(1.0 - (Math.cos(2.0 * Math.PI * time * freq) + 1.0) / 2.0);
    }
    function _square(time, freq) {
        var out = _cosine(time, freq);
        return (out < 0.5) ? 0.0 : 1.0;
    }
    function _triangle(time, freq) {
        var p = 1.0 / freq;
        return 1.0 - Math.abs(2.0 * (time % p) / p - 1.0);
    }
    function _random() {
        return Math.random();
    }
    function _modColour(col, amt) {
        var usePound = false;
        if (col[0] == "#") {
            col = col.slice(1);
            usePound = true;
        }
        var num = parseInt(col, 16);
        var r = (num >> 16) + amt;
        r = _validateCol(r);
        var b = ((num >> 8) & 0x00FF) + amt;
        b = _validateCol(b);
        var g = (num & 0x0000FF) + amt;
        g = _validateCol(g);
        return (usePound ? "#" : "") + (g | (b << 8) | (r << 16)).toString(16);
    }
    function _validateCol(col) {
        if (col > 255) {
            return 255;
        } else if (col < 0) {
            return 0;
        }
        return col;
    }
    function _arrSortedNonZeroElem(arr) {
        var out = [];
        if (!_isArray(arr)) {
            return out;
        }
        for (var i = 0; i < arr.length; i++) {
            var value = arr[i];
            if (value !== 0) {
                out.push(value);
            }
        }
        out.sort(function (a, b) { return b - a });
        return out;
    }
    function _arrShallowClone(arr) {
        var out = [];
        if (!_isArray(arr)) {
            return out;
        }
        return arr.slice(0);
    }
    function _arrSortStrings(arr) {
        if (!_isArray(arr)) {
            return arr;
        }
        arr.sort(function (a, b) { return ('' + a).localeCompare(b); })
        return arr;
    }
    function _arrSortNumericAscending(arr) {
        if (!_isArray(arr)) {
            return arr;
        }
        arr.sort(function (a, b) { return a - b })
        return arr;
    }
    function _arrSortNumericDescending(arr) {
        if (!_isArray(arr)) {
            return arr;
        }
        arr.sort(function (a, b) { return b - a })
        return arr;
    }
    function _arrEquals(a, b) {
        if (a === b) return true;
        if (a == null || b == null) return false;
        if (a.length !== b.length) return false;
        if (a.length === 0) return true;

        var as = _arrShallowClone(a);
        var bs = _arrShallowClone(b);
        if (_isString(a[0])) {
            as = _arrSortStrings(as);
            bs = _arrSortStrings(bs);
        } else if (_isNumeric(a[0])) {
            as = _arrSortNumericAscending(as);
            bs = _arrSortNumericAscending(bs);
        }

        for (var i = 0; i < as.length; ++i) {
            if (as[i] !== bs[i]) return false;
        }
        return true;
    }
    function _arrContains(arr, elm) {
        if (!_isArray(arr)) {
            return false;
        }
        return arr.includes(elm);
    }
    function _arrMinMax(arr) {
        if (!_isArray(arr) || arr.length < 1) {
            return new Point(0, 0);
        }

        var min = arr[0], max = arr[0];
        for (var i = 1; i < arr.length; i++) {
            var value = arr[i];
            min = (value < min) ? value : min;
            max = (value > max) ? value : max;
        }
        return new Point(min, max);
    }
    function _setConfig(config, paramsToSet) {
        if (!_isObject(config) || !_isObject(paramsToSet)) {
            _logError("_setConfig: Invalid config");
            return;
        }
        for (var prop in paramsToSet) {
            if (paramsToSet.hasOwnProperty(prop) && _hasNestedObjectKey(config, prop)) {
                var value = paramsToSet[prop];
                _log("_setConfig: " + prop + ": " + value);
                var current = _getNestedObjectValue(config, prop);
                if (current === value) {
                    _log("_setConfig: value for param " + prop + " is identical to previous, ignoring...");
                    continue;
                }
                _setNestedObjectValue(config, prop, value);
            }
        }
    }
    function _runGsapRampLinear(parentObj, propName, startValue, endValue, dur, onUpdateCallback, onCompleteCallback) {
        if (!_isObject(parentObj) || !_isString(propName) || _isNull(endValue) || _isNull(dur)) {
            _logError("_runGsapRampLinear: invalid input params");
            return;
        }

        var gRumpLinear = new GsapRampLinear(parentObj, propName, startValue, endValue, onUpdateCallback, onCompleteCallback);
        gsap.to(gRumpLinear, {
            currentValue: endValue,
            duration: dur,
            onComplete: gRumpLinear.onComplete,
            onCompleteParams: [gRumpLinear],
            onUpdate: gRumpLinear.onUpdate,
            onUpdateParams: [gRumpLinear],
        });
    }
    function _interpolateLinear(v1, v2, decMid) {
        return v1 * (1 - decMid) + v2 * decMid;
    }
    function _csvToArr(csvStr) {
        if (!csvStr) {
            return [];
        }
        return csvStr.split(COMMA);
    }
    function _getPageName() {
        var path = win.location.pathname;
        return path.split("/").pop();
    }
    function _loadPage(url) {
        if (_isNull(url)) {
            return;
        }
        win.location.href = url;
    }
    function _generateRandomId() {
        const uint32 = win.crypto.getRandomValues(new Uint32Array(1))[0];
        return uint32.toString(16);
    }
    function _storeLocalParam(key, value) {
        if (_isNull(key)) {
            return;
        }
        if (!_isLocalStorageSupported()) {
            _setCookieParam(key, value);
            return;
        }
        try {
            localStorage.setItem(key, value);
            return;
        } catch (err) {
            _logException(err, "setLocalStorageParam key: " + key + " value: " + value);
            _setCookieParam(key, value);
        }
    }
    function _getLocalParam(key) {
        if (_isNull(key)) {
            return null;
        }
        if (!_isLocalStorageSupported()) {
            return _getCookieParam(key);
        }
        var out = localStorage.getItem(key);
        if(_isNull(out)) {
            out = _getCookieParam(key);
        }
        return out;
    }
    function _removeLocalParam(key) {
        if (_isNull(key)) {
            return;
        }
        if (!_isLocalStorageSupported()) {
            _expireCookieParam(key);
            return;
        }
        localStorage.removeItem(key);
    }
    function _isLocalStorageSupported() {
        try {
            return 'localStorage' in win && win['localStorage'] !== null;
        } catch (e) {
            return false;
        }
    }
    function _setCookieParam(key, value, days) {
        var expires = "";
        if (!_isNull(days)) {
            var date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = "; expires=" + date.toUTCString();
        }
        document.cookie = key + "=" + (value || "") + expires + "; path=/";
    }
    function _getCookieParam(key) {
        if (_isNull(key)) {
            return null;
        }
        var nameEQ = key + "=";
        var ca = document.cookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    }
    function _expireCookieParam(key) {
        if (_isNull(key)) {
            return;
        }
        _setCookieParam(key, "", -1);
    }
    function _toBoolean(val) {
        return (val === 'true') ? true : (val === 'false' ? false : val);        
    }
    function _capitalizeFirstLetter(value) {
        if(!_isString(value) || value.length < 1) {
            return value;
        }
        return value.charAt(0).toUpperCase() + value.slice(1);
    }

    // PUBLIC API
    return {
        runModeEnum: _RUN_MODE,
        runMode: _mode,
        RampLinear: RampLinear,
        RampSin: RampSin,
        GsapRampLinear: GsapRampLinear,
        Point: Point,
        Oscillator: Oscillator,
        ParamOscillator: ParamOscillator,
        capitalizeFirstLetter: function (value) {
            return _capitalizeFirstLetter(value);
        },
        storeLocalParam: function (key, value) {
            _storeLocalParam(key, value);
        },
        getLocalParam: function (key) {
            return _getLocalParam(key);
        },
        removeLocalParam: function (key) {
            return _removeLocalParam(key);
        },
        generateRandomId: function () {
            return _generateRandomId();
        },
        loadPage: function (url) {
            _loadPage(url);
        },
        getPageName: function () {
            return _getPageName();
        },
        interpolateLinear: function (val1, val2, decimalMid) {
            return _interpolateLinear(val1, val2, decimalMid);
        },
        arrMinMax: function (arr) {
            return _arrMinMax(arr);
        },
        arrSortedNonZeroElem: function (arr) {
            return _arrSortedNonZeroElem(arr);
        },
        arrSortStrings: function (arr) {
            return _arrSortStrings(arr);
        },
        arrEquals: function (arr1, arr2) {
            return _arrEquals(arr1, arr2);
        },
        arrContains: function (arr, elm) {
            return _arrContains(arr, elm);
        },
        createButton: function (attrs) {
            return _createButton(attrs);
        },
        createDiv: function (attrs) {
            return _createDiv(attrs);
        },
        createElement: function (type, attrs) {
            return _createElement(type, attrs);
        },
        makeVisible: function (elementId) {
            _makeVisible(elementId);
        },
        makeInVisible: function (elementId) {
            _makeInVisible(elementId);
        },
        makeElementVisible: function (element) {
            _makeElementVisible(element);
        },
        makeElementInVisible: function (element) {
            _makeElementInVisible(element);
        },
        setText: function (element, txt) {
            _setText(element, txt);
        },
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
        createGsapRampLinear: function (parentObj, propName, startValue, endValue) {
            return new GsapRampLinear(parentObj, propName, startValue, endValue);
        },
        runGsapRampLinear: function (parentObj, propName, startValue, endValue, duration, onUpdateCallback, onCompleteCallback) {
            _runGsapRampLinear(parentObj, propName, startValue, endValue, duration, onUpdateCallback, onCompleteCallback);
        },
        wrapInSpanElement: function (str, spanId) {
            return _wrapInSpanElement(str, spanId);
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
        replacePropValue: function (asocArr, prop, strToReplace, strReplaceWith) {
            _replacePropValue(asocArr, prop, strToReplace, strReplaceWith);
        },
        replaceEmptySpaces: function (strVal, strReplaceWith) {
            _replaceEmptySpaces(strVal, strReplaceWith);
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
        setElementIdAttributes: function (elementId, attrAssocArr) {
            _setElementIdAttributes(elementId, attrAssocArr);
        },
        setElementStyleProperty: function (element, attrAssocArr) {
            _setElementStyleProperty(element, attrAssocArr);
        },
        setElementIdStyleProperty: function (elementId, attrAssocArr) {
            _setElementIdStyleProperty(elementId, attrAssocArr);
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
        removeElement: function (elementId) {
            _removeElement(elementId);
        },
        removeChildren: function (parentId) {
            _removeChildren(parentId);
        },
        removeElementChildren: function (parent) {
            _removeElementChildren(parent);
        },
        cloneElement: function (elm, elmId) {
            return _clone(elm, elmId);
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
            _sineOscillator(time, frequency, amplitude, phase, offset);
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
        randomArrayElement: function (arr) {
            return arr[Math.floor(Math.random() * arr.length)];
        },
        round: function (val, decimalPlaces) {
            return _round(val, decimalPlaces);
        },
        msecToSec: function (msec) {
            return _msecToSec(msec);
        },
        secToMsec: function (sec) {
            return _secToMsec(sec);
        },
        setConfig: function (config, params) {
            return _setConfig(config, params);
        },
        toCssIdQuery: function (id) {
            if (!_isString(id)) {
                return id;
            }
            return HASH + id;
        },
        csvToArr: function (csvStr) {
            return _csvToArr(csvStr);
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
        toBoolean: function (val) {
            return _toBoolean(val);
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
        isEmptyArray: function (arr) {
            return _isArray(arr) && !arr.length;
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
        logDebug: function (val) {
            _logDebug(val);
        },
        log: function (val, id) {
            _log(val, id);
        },
    }
}(console, window, document));