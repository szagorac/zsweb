var zsSvg = (function (u, doc) {
    "use strict";

    //static members
    const LOG_ID = "zsSvg: ";
    const CIRCLE_PREFIX = "c";
    const LINE_PREFIX = "l";
    const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
    const BLANK = " ";
    const ZERO = "0";
    const ONE = "1";

    const SVG_ID = "id";
    const SVG_ID_GROUP = "g";
    const SVG_ID_CIRCLE = "circle";
    const SVG_ID_LINE = "line";
    const SVG_ID_PATH = "path";
    const SVG_ID_TEXT = "text";
    const SVG_ID_TEXT_PATH = "textPath";
    const SVG_ID_TSPAN = "tspan";
    const SVG_ID_RECT = "rect";

    const SVG_TRANSFORM = "transform";
    const SVG_TRANSFORM_ROTATE_PRE = "rotate(";
    const SVG_TRANSFORM_CLOSE = ")";

    const SVG_PARAM_CX = "cx";
    const SVG_PARAM_CY = "cy";
    const SVG_PARAM_R = "r";
    const SVG_PARAM_X1 = "x1";
    const SVG_PARAM_Y1 = "y1";
    const SVG_PARAM_X2 = "x2";
    const SVG_PARAM_Y2 = "y2";

    const SVG_PATH_ABS_M = "M";
    const SVG_PATH_ABS_A = "A";
    const SVG_PATH_ABS_L = "L";


    //Class defs
    function ZsSvgException(msg) {
        this.message = msg;
        this.name = "ZsSvgException";
    }

    // ----- SvgArc
    function SvgArc(startX, startY, rX, rY, xAxisRotation, largeArcFlag, sweepFlag, endX, endY) {
        this.startX = startX;
        this.startY = startY;
        this.rX = rX;
        this.rY = rY;
        this.xAxisRotation = xAxisRotation;
        this.largeArcFlag = largeArcFlag;
        this.sweepFlag = sweepFlag;
        this.endX = endX;
        this.endY = endY;
    }
    // ----- SvgArc END

    //Private functions
    function _initSvg() {
        if (!u || !doc) {
            throw new ZsAudioException("Invalid libraries, or document. Required: zsUtil");
        }

    }

    function _createSvgElement(id, elementName) {
        var elem = doc.createElementNS(SVG_NAMESPACE, elementName);
        elem.setAttribute(SVG_ID, id);
        return elem;
    }
    function _createGroupElement(id) {
        return _createSvgElement(id, SVG_ID_GROUP);
    }
    function _createCircleElement(id) {
        return _createSvgElement(id, SVG_ID_CIRCLE);
    }
    function _createLineElement(id) {
        return _createSvgElement(id, SVG_ID_LINE);
    }
    function _createPathElement(id) {
        return _createSvgElement(id, SVG_ID_PATH);
    }
    function _createTextElement(id) {
        return _createSvgElement(id, SVG_ID_TEXT);
    }
    function _createTextPathElement(id) {
        return _createSvgElement(id, SVG_ID_TEXT_PATH);
    }
    function _createTextPathElement(id) {
        return _createSvgElement(id, SVG_ID_TEXT_PATH);
    }
    function _createTspanElement(id) {
        return _createSvgElement(id, SVG_ID_TSPAN);
    }
    function _createRectangleElement(id) {
        return _createSvgElement(id, SVG_ID_RECT);
    }
    function _createSvgArc(startX, startY, rX, rY, xAxisRotation, largeArcFlag, sweepFlag, endX, endY) {
        return new SvgArc(startX, startY, rX, rY, xAxisRotation, largeArcFlag, sweepFlag, endX, endY);
    }
    function _createSvgCircle(cX, cY, r, id) {
        var circleId = CIRCLE_PREFIX + u.toStr(id);
        var circleElement = _createCircleElement(circleId);

        circleElement.setAttribute(SVG_PARAM_CX, cX);
        circleElement.setAttribute(SVG_PARAM_CY, cY);
        circleElement.setAttribute(SVG_PARAM_R, r);
        return circleElement;

    }
    function _rotateElement(element, angle, originX, originY) {
        if (u.isNull(element) || !u.isNumeric(angle)) {
            logError("_rotateElement: invalid inputs");
            return;
        }

        var transform = SVG_TRANSFORM_ROTATE_PRE + angle;
        if(u.isNumeric(originX) && u.isNumeric(originY)) {
            transform += BLANK + originX + BLANK + originY;
        }
        transform += SVG_TRANSFORM_CLOSE;

        element.setAttribute(SVG_TRANSFORM, transform);
    }
    function _createSvgLine(startX, startY, endX, endY, angle, id) {
        var lineId = LINE_PREFIX + u.toStr(id);

        var lineElement = _createLineElement(lineId);

        lineElement.setAttribute(SVG_PARAM_X1, startX);
        lineElement.setAttribute(SVG_PARAM_Y1, startY);
        lineElement.setAttribute(SVG_PARAM_X2, endX);
        lineElement.setAttribute(SVG_PARAM_Y2, endY);

        if (u.isNumeric(angle) && angle !== 0) {
            _rotateElement(lineElement, angle, startX, startY);
        }

        return lineElement;
    }
    function _createArc(x, y, radius, startAngle, endAngle) {
        var start = u.polarToCartesian(x, y, radius, endAngle);
        var end = u.polarToCartesian(x, y, radius, startAngle);
        var largeArcFlag = ((endAngle - startAngle) <= 180) ? ZERO : ONE;

        return _createSvgArc(start.x, start.y, radius, radius, 0, largeArcFlag, 0, end.x, end.y);
    }
    function _createLinePath(startX, startY, endX, endY) {
        if (!u.isNumeric(startX) || !u.isNumeric(startY) || !u.isNumeric(endX) || !u.isNumeric(endY)) {
            logError("_createLinePath: Unexpected inputs");
            return;
        }
        var d = [
            SVG_PATH_ABS_M, startX, startY,
            SVG_PATH_ABS_L, endX, endY,
        ].join(" ");
        return d;
    }
    function _createArcPath(arc) {
        if (!u.isObjectInstanceOf(SvgArc, arc)) {
            logError("_createArcPath: Unexpected object type, expected SvgArc, Obj: ");
            u.logObj(arc);
            return;
        }
        var d = [
            SVG_PATH_ABS_M, arc.startX, arc.startY,
            SVG_PATH_ABS_A, arc.rX, arc.rY, arc.xAxisRotation, arc.largeArcFlag, arc.sweepFlag, arc.endX, arc.endY,
        ].join(" ");
        return d;
    }
    function _createPieTilePath(cX, cY, arc) {
        if (!u.isObjectInstanceOf(SvgArc, arc)) {
            logError("_createPieTilePath:Unexpected object type, expected SvfgArc, Obj: ");
            u.logObj(arc);
            return;
        }
        var d = [
            SVG_PATH_ABS_M, cX, cY,
            SVG_PATH_ABS_L, arc.startX, arc.startY,
            SVG_PATH_ABS_A, arc.rX, arc.rY, arc.xAxisRotation, arc.largeArcFlag, arc.sweepFlag, arc.endX, arc.endY, "z"
        ].join(" ");

        return d;
    }
    function _createTorusTilePath(arc, previousArc) {
        if (!u.isObjectInstanceOf(SvgArc, arc) || !u.isObjectInstanceOf(SvgArc, previousArc)) {
            logError("createTorusTileSvg: Unexpected object type, expected SvfgArc, Obj: ");
            u.logObj(arc);
            return;
        }
        var iArc = _invertArc(arc);
        var d = [
            SVG_PATH_ABS_M, previousArc.startX, previousArc.startY,
            SVG_PATH_ABS_A, previousArc.rX, previousArc.rY, previousArc.xAxisRotation, previousArc.largeArcFlag,
            previousArc.sweepFlag, previousArc.endX, previousArc.endY,
            SVG_PATH_ABS_L, iArc.startX, iArc.startY,
            SVG_PATH_ABS_A, iArc.rX, iArc.rY, iArc.xAxisRotation, iArc.largeArcFlag, iArc.sweepFlag, iArc.endX, iArc.endY, "z"
        ].join(" ");

        return d;
    }
    function _invertArc(arc) {
        // Inverts direction of the arc
        if (!u.isObjectInstanceOf(SvgArc, arc)) {
            logError("invertArc: Unexpected object type, expected SvfgArc, Obj: ");
            u.logObj(arc);
            return;
        }

        var startX = arc.endX;
        var startY = arc.endY;
        var rX = arc.rX;
        var rY = arc.rY;
        var xAxisRotation = arc.xAxisRotation;
        var largeArcFlag = arc.largeArcFlag;
        var sweepFlag = 1 - arc.sweepFlag;
        var endX = arc.startX;
        var endY = arc.startY;

        return _createSvgArc(startX, startY, rX, rY, xAxisRotation, largeArcFlag, sweepFlag, endX, endY);
    }

    function logError(val) {
        u.logError(val, LOG_ID);
    }
    function log(val) {
        u.log(val, LOG_ID);
    }

    // PUBLIC API
    return {
        SvgArc: SvgArc,
        init: function () {
            _initSvg();
        },
        createGroupElement: function (id) {
            return _createGroupElement(id);
        },
        createCircleElement: function (id) {
            return _createCircleElement(id);
        },
        createLineElement: function (id) {
            return _createLineElement(id);
        },
        createPathElement: function (id) {
            return _createPathElement(id);
        },
        createTextElement: function (id) {
            return _createTextElement(id);
        },
        createTextPathElement: function (id) {
            return _createTextPathElement(id);
        },
        createTspanElement: function (id) {
            return _createTspanElement(id);
        },
        createRectangleElement: function (id) {
            return _createRectangleElement(id);
        },
        createSvgCircle: function (cX, cY, r, id) {
            return _createSvgCircle(cX, cY, r, id);
        },
        createSvgLine: function (startX, startY, endX, endY, angle, id) {
            return _createSvgLine(startX, startY, endX, endY, angle, id);
        },
        createArc: function (x, y, radius, startAngle, endAngle) {
            return _createArc(x, y, radius, startAngle, endAngle);
        },
        createLinePath: function (startX, startY, endX, endY) {
            return _createLinePath(startX, startY, endX, endY);
        },
        createArcPath: function (arc) {
            return _createArcPath(arc);
        },
        createPieTilePath: function (cX, cY, arc) {
            return _createPieTilePath(cX, cY, arc);
        },
        createTorusTilePath: function (arc, previousArc) {
            return _createTorusTilePath(arc, previousArc);
        },
        invertArc: function (arc) {
            return _invertArc(arc);
        },
        rotateElement: function (element, angle, originX, originY) {
            return _rotateElement(element, angle, originX, originY);
        },

    }
}(zsUtil, document));