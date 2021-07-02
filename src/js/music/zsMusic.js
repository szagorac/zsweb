var zsMusic = (function (u) {
    "use strict";

    const SEC_IN_MIN = 60;

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
    
     //##### PUBLIC API
     return {
        NoteUnitDuration: NoteUnitDuration, 
        NoteDuration: NoteDuration, 
        ZsTempo: ZsTempo,
        init: function () {
            _initMusic();
        },
        getBeatDurationSec: function (bpm) {
            return _getBeatDurationSec(bpm);
        },
    }
}(zsUtil));