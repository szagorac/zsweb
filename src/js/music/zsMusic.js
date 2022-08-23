var zsMusic = (function (u) {
    "use strict";
    const LOG_ID = "zsMusic: ";

    //constants
    const SEC_IN_MIN = 60;
    const EMPTY = "";
    const FLAT_TXT = "b";
    const SHARP_TXT = "#";
    const FLAT_HTML = "&#9837;";
    const FLAT_UNICODE = "\u266D";
    const SHARP_HTML = "&#9839;";
    const SHARP_UNICODE = "\u266F";
    const TAG_SUPERSCRIPT = "<sup>";
    const TAG_SUPERSCRIPT_CLOSE = "</sup>";
    const NotePitchName = {
        A: "A",
        B: "B",
        C: "C",
        D: "D",
        E: "E",
        F: "F",
        G: "G",
    }
    const PITCH_MOD = {
        THREE_QUARTER_FLAT: -150,
        FLAT: -100,
        QUARTER_FLAT: -50,
        NATURAL: 0,
        QUARTER_SHARP: 50,
        SHARP: 100,
        THREE_QUARTER_SHARP: 150,
    }
    const DURATION_UNIT = {
        _1: 1.0,
        _2: 0.5,
        _4: 0.25,
        _8: 0.125,
        _16: 0.0625,
        _32: 0.03125,
        _64: 0.015625,
        _128: 0.0078125,
    };
    const DURATION = {
        WHOLE: 1 * DURATION_UNIT._1,
        HALF: 1 * DURATION_UNIT._2,
        HALF_DOT: 1.5 * DURATION_UNIT._2,
        QUARTER: 1 * DURATION_UNIT._4,
        QUARTER_DOT: 1.5 * DURATION_UNIT._4,
        EIGHTH: 1 * DURATION_UNIT._8,
        EIGHTH_DOT: 1.5 * DURATION_UNIT._8,
        SIXTEENTH: 1 * DURATION_UNIT._16,
        SIXTEENTH_DOT: 1.5 * DURATION_UNIT._16,
        THIRTY_SECOND: 1 * DURATION_UNIT._32,
        THIRTY_SECOND_DOT: 1.5 * DURATION_UNIT._32,
        SIXTY_FOURTH: 1 * DURATION_UNIT._64,
        SIXTY_FOURTH_DOT: 1.5 * DURATION_UNIT._64,
        HUNDRED_TWENTY_EIGHTH: 1 * DURATION_UNIT._128,
        HUNDRED_TWENTY_EIGHTH_DOT: 1.5 * DURATION_UNIT._128,
        MINIM: 1 * DURATION_UNIT._2,
        MINIM_DOT: 1.5 * DURATION_UNIT._2,
        CROTCHET: 1 * DURATION_UNIT._4,
        CROTCHET_DOT: 1.5 * DURATION_UNIT._4,
        QUAVER: 1 * DURATION_UNIT._8,
        QUAVER_DOT: 1.5 * DURATION_UNIT._8,
        SEMI_QUAVER: 1 * DURATION_UNIT._16,
        SEMI_QUAVER_DOT: 1.5 * DURATION_UNIT._16,
        DEMI_SEMI_QUAVER: 1 * DURATION_UNIT._32,
        DEMI_SEMI_QUAVER_DOT: 1.5 * DURATION_UNIT._32,
        HEMI_DEMI_SEMI_QUAVER: 1 * DURATION_UNIT._64,
        HEMI_DEMI_SEMI_QUAVER_DOT: 1.5 * DURATION_UNIT._64,
        SEMI_HEMI_DEMI_SEMI_QUAVER: 1 * DURATION_UNIT._128,
        SEMI_HEMI_DEMI_SEMI_QUAVER_DOT: 1.5 * DURATION_UNIT._128,
    };

    //##### Class defs
    function ZsMusicException(msg) {
        this.message = msg;
        this.name = "ZsMusicException";
    }
    function ZsTempo(bpm, tempoBeatValue) {
        this.bpm = bpm;
        this.tempoBeat = tempoBeatValue;
    }
    function ZsPitch(pitchName, mod, semiDistance) {
        this.txt = pitchName;
        this.pitchName = pitchName;
        this.mod = mod;
        this.html = pitchName;
        this.modUnicode = EMPTY;
        this.semiDistance = semiDistance;
        switch (mod) {
            case PITCH_MOD.FLAT:
                this.html = pitchName + TAG_SUPERSCRIPT + FLAT_HTML + TAG_SUPERSCRIPT_CLOSE;
                this.modUnicode = FLAT_UNICODE;
                this.txt = pitchName + FLAT_TXT;
                break;
            case PITCH_MOD.SHARP:
                this.html = pitchName + TAG_SUPERSCRIPT + SHARP_HTML + TAG_SUPERSCRIPT_CLOSE;
                this.modUnicode = SHARP_UNICODE;
                this.txt = pitchName + SHARP_TXT;
                break;
        }
    }
    function ZsTransposition(pitch, semiDistance, preferredModifier) {
        this.pitch = pitch;
        this.semiDistance = semiDistance;
        this.preferredModifier = preferredModifier;
    }
    function ZsMusicException(message) {
        this.message = message;
        this.name = 'ZsMusicException';
    }

    // object constants
    const PITCH = {
        AF: new ZsPitch(NotePitchName.A, PITCH_MOD.FLAT, 8),
        A: new ZsPitch(NotePitchName.A, PITCH_MOD.NATURAL, 9),
        AS: new ZsPitch(NotePitchName.A, PITCH_MOD.SHARP, 10),
        BF: new ZsPitch(NotePitchName.B, PITCH_MOD.FLAT, 10),
        B: new ZsPitch(NotePitchName.B, PITCH_MOD.NATURAL, 11),
        BS: new ZsPitch(NotePitchName.B, PITCH_MOD.SHARP, 0),
        CF: new ZsPitch(NotePitchName.C, PITCH_MOD.FLAT, 11),
        C: new ZsPitch(NotePitchName.C, PITCH_MOD.NATURAL, 0),
        CS: new ZsPitch(NotePitchName.C, PITCH_MOD.SHARP, 1),
        DF: new ZsPitch(NotePitchName.D, PITCH_MOD.FLAT, 1),
        D: new ZsPitch(NotePitchName.D, PITCH_MOD.NATURAL, 2),
        DS: new ZsPitch(NotePitchName.D, PITCH_MOD.SHARP, 3),
        EF: new ZsPitch(NotePitchName.E, PITCH_MOD.FLAT, 3),
        E: new ZsPitch(NotePitchName.E, PITCH_MOD.NATURAL, 4),
        ES: new ZsPitch(NotePitchName.E, PITCH_MOD.SHARP, 5),
        FF: new ZsPitch(NotePitchName.F, PITCH_MOD.FLAT, 4),
        F: new ZsPitch(NotePitchName.F, PITCH_MOD.NATURAL, 5),
        FS: new ZsPitch(NotePitchName.F, PITCH_MOD.SHARP, 6),
        GF: new ZsPitch(NotePitchName.G, PITCH_MOD.FLAT, 6),
        G: new ZsPitch(NotePitchName.G, PITCH_MOD.NATURAL, 7),
        GS: new ZsPitch(NotePitchName.G, PITCH_MOD.SHARP, 8),
    };
    const PITCH_SET = [
        [PITCH.C],                    //0
        [PITCH.CS, PITCH.DF],         //1
        [PITCH.D],                    //2
        [PITCH.DS, PITCH.EF],         //3
        [PITCH.E],                    //4
        [PITCH.F],                    //5
        [PITCH.FS, PITCH.GF],         //6
        [PITCH.G],                    //7
        [PITCH.GS, PITCH.AF],         //8
        [PITCH.A],                    //9
        [PITCH.AS, PITCH.BF],         //10
        [PITCH.B],                    //11
    ];
    const TRANSPOSITION = {
        A: new ZsTransposition(PITCH.A, 3, PITCH_MOD.FLAT),
        BF: new ZsTransposition(PITCH.BF, 2, PITCH_MOD.SHARP),
        C: new ZsTransposition(PITCH.C, 0, PITCH_MOD.NATURAL),
        D: new ZsTransposition(PITCH.D, 10, PITCH_MOD.FLAT),
        EF: new ZsTransposition(PITCH.EF, 9, PITCH_MOD.SHARP),
        F: new ZsTransposition(PITCH.F, 7, PITCH_MOD.SHARP),
        G: new ZsTransposition(PITCH.G, 5, PITCH_MOD.FLAT)
    };

    //##### Private functions
    function _initMusic() {
        if (!u) {
            throw new ZsMusicException("Invalid libraries. Required: zsUtil");
        }
    }
    function _getBeatDurationSec(bpm) {
        if (!u.isNumeric(bpm)) {
            return;
        }

        return SEC_IN_MIN / bpm;
    }
    function _getPitch(note) {
        if (u.isNull(note)) {
            return null;
        }

        return PITCH[note];
    }    
    function _getTransposition(note) {
        if (u.isNull(note)) {
            return null;
        }

        return TRANSPOSITION[note];
    }
    function _transpose(pitch, transposition) {
        if (!u.isObjectInstanceOf(ZsPitch, pitch) || !u.isObjectInstanceOf(ZsTransposition, transposition)) {
            return null;
        }
        var pitchSemi = pitch.semiDistance;
        var transpoSemi = transposition.semiDistance;

        var semiIndex = pitchSemi + transpoSemi;
        if (semiIndex > 11) {
            semiIndex -= 12;
        }
        if (semiIndex < 0 || semiIndex > 11) {
            throw new ZsMusicException("_transpose: invalid result semitone index: " + semiIndex);
        }
        var resultArr = PITCH_SET[semiIndex];
        if (resultArr.length == 1) {
            return resultArr[0];
        }
        var preferredMod = transposition.preferredModifier;
        for (var i = 0; i < resultArr.length; i++) {
            var outPitch = resultArr[i];
            if (outPitch.mod === preferredMod) {
                return outPitch;
            }
        }
        var preferredMod = pitch.mod;
        for (var i = 0; i < resultArr.length; i++) {
            var outPitch = resultArr[i];
            if (outPitch.mod === preferredMod) {
                return outPitch;
            }
        }

        return resultArr[0];
    }
    function _getModUnicode(mod) {
        if (isNull(mod)) {
            return EMPTY;
        }
        switch (mod) {
            case PITCH_MOD.FLAT:
                return FLAT_UNICODE;
            case PITCH_MOD.SHARP:
                return SHARP_UNICODE;
        }
        return EMPTY;
    }
    function logError(val) {
        u.logError(val, LOG_ID);
    }
    function log(val) {
        u.log(val, LOG_ID);
    }


    // TEST
    function _test() {
        var pitch = PITCH.G;
        var transpo = TRANSPOSITION.A;
        var out = _transpose(pitch, transpo);
        log("Transpose " + pitch.txt + " to " + transpo.pitch.txt + ": " + out.txt);
        transpo = TRANSPOSITION.BF;
        out = _transpose(pitch, transpo);
        log("Transpose " + pitch.txt + " to " + transpo.pitch.txt + ": " + out.txt);
        transpo = TRANSPOSITION.C;
        out = _transpose(pitch, transpo);
        log("Transpose " + pitch.txt + " to " + transpo.pitch.txt + ": " + out.txt);
        transpo = TRANSPOSITION.D;
        out = _transpose(pitch, transpo);
        log("Transpose " + pitch.txt + " to " + transpo.pitch.txt + ": " + out.txt);
        transpo = TRANSPOSITION.EF;
        out = _transpose(pitch, transpo);
        log("Transpose " + pitch.txt + " to " + transpo.pitch.txt + ": " + out.txt);
        transpo = TRANSPOSITION.F;
        out = _transpose(pitch, transpo);
        log("Transpose " + pitch.txt + " to " + transpo.pitch.txt + ": " + out.txt);
        transpo = TRANSPOSITION.G;
        out = _transpose(pitch, transpo);
        log("Transpose " + pitch.txt + " to " + transpo.pitch.txt + ": " + out.txt);

        pitch = PITCH.EF;
        transpo = TRANSPOSITION.A;
        out = _transpose(pitch, transpo);
        log("Transpose " + pitch.txt + " to " + transpo.pitch.txt + ": " + out.txt);
        transpo = TRANSPOSITION.BF;
        out = _transpose(pitch, transpo);
        log("Transpose " + pitch.txt + " to " + transpo.pitch.txt + ": " + out.txt);
        transpo = TRANSPOSITION.C;
        out = _transpose(pitch, transpo);
        log("Transpose " + pitch.txt + " to " + transpo.pitch.txt + ": " + out.txt);
        transpo = TRANSPOSITION.D;
        out = _transpose(pitch, transpo);
        log("Transpose " + pitch.txt + " to " + transpo.pitch.txt + ": " + out.txt);
        transpo = TRANSPOSITION.EF;
        out = _transpose(pitch, transpo);
        log("Transpose " + pitch.txt + " to " + transpo.pitch.txt + ": " + out.txt);
        transpo = TRANSPOSITION.F;
        out = _transpose(pitch, transpo);
        log("Transpose " + pitch.txt + " to " + transpo.pitch.txt + ": " + out.txt);
        transpo = TRANSPOSITION.G;
        out = _transpose(pitch, transpo);
        log("Transpose " + pitch.txt + " to " + transpo.pitch.txt + ": " + out.txt);
    }

    //##### PUBLIC API
    return {
        FLAT_HTML: FLAT_HTML,
        SHARP_HTML: SHARP_HTML,
        PITCH: PITCH,
        PITCH_MOD: PITCH_MOD,
        TRANSPOSITION: TRANSPOSITION,
        DURATION_UNIT: DURATION_UNIT,
        DURATION: DURATION,
        ZsTempo: ZsTempo,
        init: function () {
            _initMusic();
        },
        getBeatDurationSec: function (bpm) {
            return _getBeatDurationSec(bpm);
        },
        getPitch: function (note) {
            return _getPitch(note);
        },
        getTransposition: function (note) {
            return _getTransposition(note);
        },
        transpose: function (pitch, transposition) {
            return _transpose(pitch, transposition);
        },
        getModUnicode: function (mod) {
            return _getModUnicode(mod);
        },
        test: function () {
            return _test();
        },
    }
}(zsUtil));