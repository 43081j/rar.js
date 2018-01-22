var Rar = (function (exports) {
'use strict';

function __awaiter(thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
}

class Reader {
    constructor() {
        this.size = 0;
    }
    readBlob(length, position, blobType) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!blobType) {
                blobType = 'application/octet-stream';
            }
            const data = this.read(length, position);
            return new Blob([data], { type: blobType });
        });
    }
}

class UriReader extends Reader {
    constructor(uri) {
        super();
        this.uri = uri;
    }
    open() {
        return __awaiter(this, void 0, void 0, function* () {
            return fetch(this.uri, {
                method: 'HEAD'
            }).then((response) => {
                if (!response.ok) {
                    throw new Error('Could not open URI');
                }
                const length = response.headers.get('Content-Length');
                if (length !== null) {
                    this.size = parseInt(length, 10);
                }
            });
        });
    }
    close() {
        return Promise.resolve();
    }
    reset() {
        return;
    }
    read(length, position) {
        return __awaiter(this, void 0, void 0, function* () {
            return fetch(this.uri, {
                method: 'GET',
                headers: {
                    Range: `bytes=${position}-${position + length - 1}`
                }
            }).then((response) => {
                if (!response.ok) {
                    throw new Error('Could not fetch URI');
                }
                return response.arrayBuffer();
            });
        });
    }
}

let fsImport;
if (typeof require === 'function') {
    fsImport = require('fs');
}
class LocalReader extends Reader {
    constructor(path) {
        super();
        this.path = path;
    }
    open() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                fsImport.stat(this.path, (err, stat) => {
                    if (err) {
                        reject(new Error('Could not read file'));
                        return;
                    }
                    this.size = stat.size;
                    resolve();
                });
            });
        });
    }
    close() {
        return Promise.resolve();
    }
    reset() {
        return;
    }
    read(length, position) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                fsImport.open(this.path, 'r', (err, fd) => {
                    if (err) {
                        reject(new Error('Could not open file'));
                        return;
                    }
                    fsImport.read(fd, new Buffer(length), 0, length, position, (readErr, _bytesRead, buffer) => {
                        if (readErr) {
                            reject(new Error('Could not read file'));
                            return;
                        }
                        const ab = new ArrayBuffer(buffer.length);
                        const view = new Uint8Array(ab);
                        for (let i = 0; i < buffer.length; i++) {
                            view[i] = buffer[i];
                        }
                        fsImport.close(fd, (closeErr) => {
                            if (closeErr) {
                                reject(new Error('Could not close file'));
                                return;
                            }
                            resolve(ab);
                        });
                    });
                });
            });
        });
    }
}

class NativeFileReader extends Reader {
    constructor(file) {
        super();
        this.file = file;
        this.size = file.size;
    }
    open() {
        return Promise.resolve();
    }
    close() {
        return Promise.resolve();
    }
    reset() {
        return;
    }
    read(length, position) {
        const slice = this.file.slice(position, position + length);
        const fr = new FileReader();
        return new Promise((resolve, reject) => {
            fr.addEventListener('load', () => {
                resolve(fr.result);
            });
            fr.addEventListener('error', () => {
                reject(new Error('File read failed'));
            });
            fr.readAsArrayBuffer(slice);
        });
    }
}

class RarEntry {
    constructor() {
        this.name = null;
        this.path = null;
        this.size = 0;
        this.sizePacked = 0;
        this.crc = null;
        this.offset = 0;
        this.blockSize = 0;
        this.headerSize = 0;
        this.encrypted = false;
        this.version = null;
        this.time = null;
        this.method = null;
        this.os = null;
        this.partial = false;
        this.continuesFrom = false;
        this.continues = false;
    }
}

(function (RarMethod) {
    RarMethod[RarMethod["STORE"] = 48] = "STORE";
    RarMethod[RarMethod["FASTEST"] = 49] = "FASTEST";
    RarMethod[RarMethod["FAST"] = 50] = "FAST";
    RarMethod[RarMethod["NORMAL"] = 51] = "NORMAL";
    RarMethod[RarMethod["GOOD"] = 52] = "GOOD";
    RarMethod[RarMethod["BEST"] = 53] = "BEST";
})(exports.RarMethod || (exports.RarMethod = {}));

function getString(view, length, offset, raw) {
    offset = offset || 0;
    length = length || (view.byteLength - offset);
    if (length < 0) {
        length += view.byteLength;
    }
    let str = '';
    if (typeof Buffer !== 'undefined') {
        const data = [];
        for (let i = offset; i < (offset + length); i++) {
            data.push(view.getUint8(i));
        }
        return (new Buffer(data)).toString();
    }
    else {
        for (let i = offset; i < (offset + length); i++) {
            str += String.fromCharCode(view.getUint8(i));
        }
        if (raw) {
            return str;
        }
        // TODO: why does this work?
        return decodeURIComponent(window.escape(str));
    }
}

/*
 * rar.js
 * Pure JavaScript implementation of the RAR format
 * 43081j
 * License: MIT, see LICENSE
 */
function fromFile(file) {
    return __awaiter(this, void 0, void 0, function* () {
        return fromReader(new NativeFileReader(file));
    });
}
function fromUri(uri) {
    return __awaiter(this, void 0, void 0, function* () {
        return fromReader(new UriReader(uri));
    });
}
function fromLocal(path) {
    return __awaiter(this, void 0, void 0, function* () {
        return fromReader(new LocalReader(path));
    });
}
function fromReader(reader) {
    return __awaiter(this, void 0, void 0, function* () {
        const result = new RarArchive(reader);
        yield result.load();
        return result;
    });
}
class RarArchive {
    constructor(reader) {
        this.entries = [];
        this._loaded = false;
        this._reader = reader;
    }
    get loaded() {
        return this._loaded;
    }
    load() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.loaded) {
                return;
            }
            yield this._reader.open();
            const header = yield this._reader.read(14, 0);
            const headerView = new DataView(header);
            if (getString(headerView, 7, 0, true) !== '\x52\x61\x72\x21\x1a\x07\x00') {
                throw new Error('Invalid RAR archive');
            }
            const headerType = headerView.getUint8(9);
            const headerFlags = headerView.getUint16(10, true);
            const headerSize = headerView.getUint16(12, true);
            if (headerType !== 0x73) {
                throw new Error('Invalid RAR archive');
            }
            if ((headerFlags & 0x80) !== 0) {
                throw new Error('Encrypted archives are not yet supported');
            }
            if (this._reader.size <= 14) {
                return;
            }
            const maxSize = this._reader.size;
            let offset = headerSize + 7;
            while (offset < maxSize) {
                const piece = yield this._reader.read(11, offset);
                const view = new DataView(piece);
                const type = view.getUint8(2);
                const flags = view.getUint16(3, true);
                let size = view.getUint16(5, true);
                if ((flags & 0x8000) !== 0) {
                    size += view.getUint32(7, true);
                }
                switch (type) {
                    case 0x74:
                        const entry = yield this.parseEntry(size, offset);
                        this.entries.push(entry);
                        offset += entry.blockSize;
                        break;
                    default:
                        offset += size;
                }
            }
        });
    }
    get(entry) {
        return __awaiter(this, void 0, void 0, function* () {
            if (entry.method !== exports.RarMethod.STORE) {
                throw new Error('Compression is not yet supported');
            }
            const blob = yield this._reader.readBlob(entry.blockSize - 1, entry.offset + entry.headerSize);
            return blob;
        });
    }
    parseEntryTime(time) {
        if (time.length < 32) {
            time = (new Array(32 - time.length + 1)).join('0') + time;
        }
        const matches = time.match(/(\d{7})(\d{4})(\d{5})(\d{5})(\d{6})(\d{5})/);
        if (!matches) {
            return new Date();
        }
        const vals = matches.slice(1).map((val) => {
            return parseInt(val, 2);
        });
        return new Date(1980 + vals[0], vals[1] - 1, vals[2], vals[3], vals[4], vals[5]);
    }
    parseEntryOS(value) {
        if (value < 0 || value > 5) {
            return 'Unknown';
        }
        return ['MS-DOS', 'OS/2', 'Windows', 'Unix', 'Mac', 'BeOS'][value];
    }
    parseEntry(size, offset) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = yield this._reader.read(size, offset);
            const view = new DataView(data);
            const flags = view.getUint16(3, true);
            const entry = new RarEntry();
            entry.partial = ((flags & 0x01) !== 0 || (flags & 0x02) !== 0);
            entry.continuesFrom = ((flags & 0x01) !== 0);
            entry.continues = ((flags & 0x02) !== 0);
            entry.offset = offset;
            entry.sizePacked = view.getUint32(7, true);
            entry.size = view.getUint32(11, true);
            entry.crc = view.getUint32(16, true);
            entry.time = this.parseEntryTime(view.getUint32(20, true).toString(2));
            entry.os = this.parseEntryOS(view.getUint8(15));
            entry.version = view.getUint8(24);
            entry.method = view.getUint8(25);
            entry.encrypted = ((flags & 0x04) !== 0);
            const nameSize = view.getUint16(26, true);
            if ((flags & 0x100) !== 0) {
                entry.sizePacked += view.getUint32(32, true) * 0x100000000;
                entry.size += view.getUint32(36, true) * 0x100000000;
                entry.path = getString(view, nameSize, 40);
            }
            else {
                entry.path = getString(view, nameSize, 32);
            }
            if ((flags & 0x200) !== 0 && entry.path.indexOf('\x00') !== -1) {
                entry.path = entry.path.split('\x00')[1];
            }
            entry.name = entry.path;
            if (entry.name.indexOf('\\') !== -1) {
                entry.name = entry.name.substr(entry.name.lastIndexOf('\\') + 1);
            }
            else {
                entry.name = entry.name.substr(entry.name.lastIndexOf('/') + 1);
            }
            entry.headerSize = size;
            entry.blockSize = entry.headerSize + entry.sizePacked;
            return entry;
        });
    }
}

exports.Reader = Reader;
exports.UriReader = UriReader;
exports.LocalReader = LocalReader;
exports.NativeFileReader = NativeFileReader;
exports.fromFile = fromFile;
exports.fromUri = fromUri;
exports.fromLocal = fromLocal;
exports.fromReader = fromReader;
exports.RarArchive = RarArchive;

return exports;

}({}));
