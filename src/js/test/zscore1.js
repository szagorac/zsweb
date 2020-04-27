var global = this;
var resizeElements = [];

listen("load", window, onLoad);


// ---------  MODEL -----------
function ResizableElement(id, resizePerc) {
    this.id = id;
    this.resizePerc = resizePerc;
}
ResizableElement.prototype.resize = function (winWidth, winHeight) {
    log("ResizableElement.resize()");
}

function ResizableCircle(id, resizePerc) {
    ResizableElement.call(this, id, resizePerc);
}
ResizableCircle.prototype = Object.create(ResizableElement.prototype);
ResizableCircle.prototype.constructor = ResizableCircle;
ResizableCircle.prototype.resize = function (winWidth, winHeight) {
    let crc = getElement(this.id);
    if (isNull(crc)) {
        logError("Can not resize, invalid object id: ", this.id);
        return;
    }
    let minVal = Math.min(winWidth, winHeight);
    let rad = (minVal * (this.resizePerc / 100.0)) / 2.0;
    log("Resizing circle to rad: " + rad);
    crc.setAttribute('r', rad);
}

// ---------  API -----------
function onResize() {
    log("onResize: ");
    resizeCallback();
}
function onLoad() {
    log("onLoad: ");
    let arc = describeArc(762, 762, 55, 0, 45);
    log("Arc " + arc)
    // init();
    // resizeCallback();
    // listen('resize', window, onResize);
}
function init() {
    log("init: ");
    var crc1 = new ResizableCircle('crc1', 90);
    if (!Array.isArray(global.resizeElements)) {
        global.resizeElements = [];
    }
    global.resizeElements.push(crc1);
}
function resizeCallback() {
    log("resizeCallback: ");
    let width = getWindowWidth();
    let height = getWindowHeight();
    log("Window width: " + width + " window height: " + height);
    if (!Array.isArray(global.resizeElements)) {
        log("ResizeElements is not an array");
        return;
    }
    for (i = 0; i < global.resizeElements.length; i++) {
        resize(global.resizeElements[i], width, height);
    }
}
function resize(resizable, width, height) {
    if (!isObject(resizable) || !isObjectInstanceOf(ResizableElement, resizable)) {
        log("Unexpected object class: " + resizable.constructor.name);
        return;
    }
    resizable.resize(width, height);
}
function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
    var angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;

    return {
        x: centerX + (radius * Math.cos(angleInRadians)),
        y: centerY + (radius * Math.sin(angleInRadians))
    };
}
function describeArc(x, y, radius, startAngle, endAngle) {

    var start = polarToCartesian(x, y, radius, endAngle);
    var end = polarToCartesian(x, y, radius, startAngle);

    var largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

    var d = [
        "M", start.x, start.y,
        "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
    ].join(" ");

    return d;
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
function getElement(elementId) {
    if (isNull(elementId)) {
        return;
    }
    return document.getElementById(elementId);
}
function isObjectInstanceOf(type, obj) {
    if (!isObject(obj)) {
        return false;
    }
    return obj instanceof type || obj.constructor.prototype instanceof type;
}
function isObject(obj) {
    return typeof obj === 'object';
}
function isNumeric(num) {
    return !isNaN(num)
}
function isString(num) {
    return typeof a_string === 'string';
}
function isNull(variable) {
    return typeof variable === 'undefined';
}
function isNotNull(variable) {
    return !isNull(variable);
}
function toInt(variable) {
    return parseInt(text, 10);
}
function toFloat(variable) {
    return parseFloat(text);
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
function logError(val) {
    log("ERROR: " + val);
}
function log(val) {
    console.log(val);
}
if (!Array.isArray) {
    Array.isArray = function (arg) {
        return Object.prototype.toString.call(arg) === '[object Array]';
    };
}
