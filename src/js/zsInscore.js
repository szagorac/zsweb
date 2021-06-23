var zscore = (function (u, wsconn, win, doc) {
    "use strict";

    const RUN_MODE = "DEV";

    function ZScoreException(message) {
        this.message = message;
        this.name = 'ZScoreException';
    }

    // ---------  API -----------
    function onLoad() {
        u.log("onLoad: ");
        init();
    }
    function init() {
        if (!u || !wsconn) {
            throw new ZScoreException("Invalid libraries. Required: zsUtil, zsNet, zsSvg and zsAudio");
        }

        u.setRunMode(RUN_MODE);

        u.log("init: ");
        var isTouch = u.isTouchDevice()
        var isSafari = u.isSafari(navigator);
        u.log("init: IsTouch Device: " + isTouch + " isSafari: " + isSafari);

        var connection = new wsconn("ws://localhost:8000/wsoc");

     
    }
    
    // Public members if any??
    return {
        load: function () {
            onLoad();
        },        
    }
}(zsUtil, TWSConnection, window, document));