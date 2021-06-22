var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
///<reference path="libmusicxml.d.ts"/>
//----------------------------------------------------------------------------
// the libMusicXML interface
//----------------------------------------------------------------------------
class libmusicxml {
    initialise() {
        return __awaiter(this, void 0, void 0, function* () {
            var module = MusicXMLModule();
            return new Promise((success, failure) => {
                module['onRuntimeInitialized'] = () => {
                    this.fLibrary = new module.libMusicXMLAdapter();
                    // this.moduleInit (module);
                    success(this);
                };
            });
        });
    }
    //------------------------------------------------------------------------
    // async initialization
    // moduleInit ( module ) {
    // 	this.fLibrary = new module.libMusicXMLAdapter();
    // }
    //------------------------------------------------------------------------
    // libMusicXML interface
    libVersion() { return this.fLibrary.libVersion(); }
    libVersionStr() { return this.fLibrary.libVersionStr(); }
    musicxml2guidoVersion() { return this.fLibrary.musicxml2guidoVersion(); }
    musicxml2guidoVersionStr() { return this.fLibrary.musicxml2guidoVersionStr(); }
    string2guido(xml, genBars) { return this.fLibrary.string2guido(xml, genBars); }
    xmlStringTranspose(xml, interval) { return this.fLibrary.xmlStringTranspose(xml, interval); }
}
///<reference path="../libmusicxml.ts"/>
//----------------------------------------------------------------------------
// Misc. functions
//----------------------------------------------------------------------------
function misc(lib, log) {
    log("Version :");
    log("  libmusicxml version        " + lib.libVersion());
    log("  libmusicxml version str    " + lib.libVersionStr());
    log("  musicxml2guido version     " + lib.musicxml2guidoVersion());
    log("  musicxml2guido version str " + lib.musicxml2guidoVersionStr());
}
function convert(xml, lib, log) {
    log("\nMusicXML -> GMN :");
    log("  string2guido  :");
    log(lib.string2guido(xml, false));
    log("  xmlStringTranspose :");
    log(lib.string2guido(lib.xmlStringTranspose(xml, 7), false));
}
function run(engine, log, xml) {
    misc(engine, log);
    if (xml)
        convert(xml, engine, log);
}
var process;
var module;
if ((typeof process !== 'undefined') && (process.release.name === 'node')) {
    module.exports = run;
}
