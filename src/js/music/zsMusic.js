var zsMusic = (function (u) {
    "use strict";

    const SEC_IN_MIN = 60;
    const EMPTY = "";
    const FLAT_HTML = "&#9837;";
    const FLAT_UNICODE = "\u266D";
    const SHARP_HTML = "&#9839;";
    const SHARP_UNICODE = "\u266F";

    const NotePitchName = {
        A: "A",
        B: "B",
        C: "C",
        D: "D",
        E: "E",
        F: "F",
        G: "G",
    }

    const NotePitchModifier = {
        THREE_QUARTER_FLAT: -150,
        FLAT: -100,
        QUARTER_FLAT: -50,
        NATURAL: 0,
        QUARTER_SHARP: 50,
        SHARP: 100,
        THREE_QUARTER_SHARP: 150,
    }

    const NoteUnitDuration = {
        _1: 1.0,
        _2: 0.5,
        _4: 0.25,
        _8: 0.125,
        _16: 0.0625,
        _32: 0.03125,
        _64: 0.015625,
        _128: 0.0078125,
    };

    const NoteDuration = {
        WHOLE: 1 * NoteUnitDuration._1,
        HALF: 1 * NoteUnitDuration._2, 
        HALF_DOT: 1.5 * NoteUnitDuration._2,
        QUARTER: 1 * NoteUnitDuration._4,
        QUARTER_DOT: 1.5 * NoteUnitDuration._4,
        EIGHTH: 1 * NoteUnitDuration._8, 
        EIGHTH_DOT: 1.5 * NoteUnitDuration._8,
        SIXTEENTH: 1 * NoteUnitDuration._16,  
        SIXTEENTH_DOT: 1.5 * NoteUnitDuration._16,
        THIRTY_SECOND: 1 * NoteUnitDuration._32, 
        THIRTY_SECOND_DOT: 1.5 * NoteUnitDuration._32,
        SIXTY_FOURTH: 1 * NoteUnitDuration._64, 
        SIXTY_FOURTH_DOT: 1.5 * NoteUnitDuration._64,
        HUNDRED_TWENTY_EIGHTH: 1 * NoteUnitDuration._128, 
        HUNDRED_TWENTY_EIGHTH_DOT: 1.5 * NoteUnitDuration._128,
        MINIM:  1 * NoteUnitDuration._2,
        MINIM_DOT: 1.5 * NoteUnitDuration._2,
        CROTCHET:  1 * NoteUnitDuration._4,
        CROTCHET_DOT: 1.5 * NoteUnitDuration._4,
        QUAVER: 1 * NoteUnitDuration._8, 
        QUAVER_DOT: 1.5 * NoteUnitDuration._8,
        SEMI_QUAVER:  1 * NoteUnitDuration._16,  
        SEMI_QUAVER_DOT: 1.5 * NoteUnitDuration._16,
        DEMI_SEMI_QUAVER: 1 * NoteUnitDuration._32, 
        DEMI_SEMI_QUAVER_DOT: 1.5 * NoteUnitDuration._32,
        HEMI_DEMI_SEMI_QUAVER: 1 * NoteUnitDuration._64,
        HEMI_DEMI_SEMI_QUAVER_DOT: 1.5 * NoteUnitDuration._64,
        SEMI_HEMI_DEMI_SEMI_QUAVER: 1 * NoteUnitDuration._128,  
        SEMI_HEMI_DEMI_SEMI_QUAVER_DOT: 1.5 * NoteUnitDuration._128,
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

    function ZsNote(pitchName, mod, modHtml, modUnicode) {
        this.pitchName = pitchName;
        this.mod = mod;
        this.modHtml = modHtml;
        this.modUnicode = modUnicode;
    }

    const NOTES = {
        AF : new ZsNote(NotePitchName.A, NotePitchModifier.FLAT, FLAT_HTML, FLAT_UNICODE),
        A : new ZsNote(NotePitchName.A, NotePitchModifier.NATURAL, EMPTY, EMPTY),
        AS : new ZsNote(NotePitchName.A, NotePitchModifier.SHARP, SHARP_HTML, SHARP_UNICODE),
        BF : new ZsNote(NotePitchName.B, NotePitchModifier.FLAT, FLAT_HTML, FLAT_UNICODE),
        B : new ZsNote(NotePitchName.B, NotePitchModifier.NATURAL, EMPTY, EMPTY),
        BS : new ZsNote(NotePitchName.B, NotePitchModifier.SHARP, SHARP_HTML, SHARP_UNICODE),
        CF : new ZsNote(NotePitchName.C, NotePitchModifier.FLAT, FLAT_HTML, FLAT_UNICODE),
        C : new ZsNote(NotePitchName.C, NotePitchModifier.NATURAL, EMPTY, EMPTY),
        CS : new ZsNote(NotePitchName.C, NotePitchModifier.SHARP, SHARP_HTML, SHARP_UNICODE),
        DF : new ZsNote(NotePitchName.D, NotePitchModifier.FLAT, FLAT_HTML, FLAT_UNICODE),
        D : new ZsNote(NotePitchName.D, NotePitchModifier.NATURAL, EMPTY, EMPTY),
        DS : new ZsNote(NotePitchName.D, NotePitchModifier.SHARP, SHARP_HTML, SHARP_UNICODE),
        EF : new ZsNote(NotePitchName.E, NotePitchModifier.FLAT, FLAT_HTML, FLAT_UNICODE),
        E : new ZsNote(NotePitchName.E, NotePitchModifier.NATURAL, EMPTY, EMPTY),
        ES : new ZsNote(NotePitchName.E, NotePitchModifier.SHARP, SHARP_HTML, SHARP_UNICODE),
        FF : new ZsNote(NotePitchName.F, NotePitchModifier.FLAT, FLAT_HTML, FLAT_UNICODE),
        F : new ZsNote(NotePitchName.F, NotePitchModifier.NATURAL, EMPTY, EMPTY),
        FS : new ZsNote(NotePitchName.F, NotePitchModifier.SHARP, SHARP_HTML, SHARP_UNICODE),
        GF : new ZsNote(NotePitchName.G, NotePitchModifier.FLAT, FLAT_HTML, FLAT_UNICODE),
        G : new ZsNote(NotePitchName.G, NotePitchModifier.NATURAL, EMPTY, EMPTY),
        GS : new ZsNote(NotePitchName.G, NotePitchModifier.SHARP, SHARP_HTML, SHARP_UNICODE),
    };
    
    //##### Private functions
    function _initMusic() {
        if (!u) {
            throw new ZsMusicException("Invalid libraries. Required: zsUtil");
        }
    }
    function _getBeatDurationSec(bpm) {
        if(!u.isNumeric(bpm)) {
            return;
        }

        return SEC_IN_MIN/bpm;
    }
    function _getNote(note) {
        if(u.isNull(note)) {
            return null;
        }
        
        return NOTES[note];
    }
    
     //##### PUBLIC API
     return {
        FLAT_HTML: FLAT_HTML,
        SHARP_HTML: SHARP_HTML,
        NoteUnitDuration: NoteUnitDuration, 
        NoteDuration: NoteDuration, 
        ZsTempo: ZsTempo,
        init: function () {
            _initMusic();
        },
        getBeatDurationSec: function (bpm) {
            return _getBeatDurationSec(bpm);
        },
        getNote: function (note) {
            return _getNote(note);
        },        
    }
}(zsUtil));