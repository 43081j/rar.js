/*
 * rar.js
 * Pure JavaScript implementation of the RAR format
 * 43081j
 * License: MIT, see LICENSE
 */
(function() {
	'use strict';
	/*
	 * Reader.js
	 */
	var Reader = function(type) {
		this.type = type || Reader.OPEN_URI;
		this.size = null;
		this.file = null;
	};

	Reader.OPEN_FILE = 1;
	Reader.OPEN_URI = 2;
	Reader.OPEN_LOCAL = 3;

	if(typeof require === 'function') {
		var fs = require('fs');
	}

	Reader.prototype.open = function(file, callback) {
		this.file = file;
		var self = this;
		switch(this.type) {
			case Reader.OPEN_LOCAL:
				fs.stat(this.file, function(err, stat) {
					if(err) {
						return callback(err);
					}
					self.size = stat.size;
					fs.open(self.file, 'r', function(err, fd) {
						if(err) {
							return callback(err);
						}
						self.fd = fd;
						callback();
					});
				});
			break;
			case Reader.OPEN_FILE:
				this.size = this.file.size;
				callback();
			break;
			default:
				this.ajax(
					{
						uri: this.file,
						type: 'HEAD',
					},
					function(err, resp, xhr) {
						if(err) {
							return callback(err);
						}
						self.size = parseInt(xhr.getResponseHeader('Content-Length'));
						callback();
					}
				);
			break;
		}
	};

	Reader.prototype.close = function() {
		if(this.type === Reader.OPEN_LOCAL) {
			fs.close(this.fd);
		}
	};

	Reader.prototype.read = function(length, position, callback) {
		if(this.type === Reader.OPEN_LOCAL) {
			this.readLocal(length, position, callback);
		} else if(this.type === Reader.OPEN_FILE) {
			this.readFile(length, position, callback);
		} else {
			this.readUri(length, position, callback);
		}
	};

	Reader.prototype.readBlob = function(length, position, type, callback) {
		if(typeof type === 'function') {
			callback = type;
			type = 'application/octet-stream';
		}
		this.read(length, position, function(err, data) {
			if(err) {
				callback(err);
				return;
			}
			callback(null, new Blob([data], {type: type}));
		});
	};

	/*
	 * Local reader
	 */
	Reader.prototype.readLocal = function(length, position, callback) {
		var buffer = new Buffer(length);
		fs.read(this.fd, buffer, 0, length, position, function(err, bytesRead, buffer) {
			if(err) {
				return callback(err);
			}
			var ab = new ArrayBuffer(buffer.length),
				view = new Uint8Array(ab);
			for(var i = 0; i < buffer.length; i++) {
				view[i] = buffer[i];
			}
			callback(null, ab);
		});
	};

	/*
	 * URL reader
	 */
	Reader.prototype.ajax = function(opts, callback) {
		var options = {
			type: 'GET',
			uri: null,
			responseType: 'text'
		};
		if(typeof opts === 'string') {
			opts = {uri: opts};
		}
		for(var k in opts) {
			options[k] = opts[k];
		}
		var xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function() {
			if(xhr.readyState !== 4) return;
			if(xhr.status !== 200 && xhr.status !== 206) {
				return callback('Received non-200/206 response (' + xhr.status + ')');
			}
			callback(null, xhr.response, xhr);
		};
		xhr.responseType = options.responseType;
		xhr.open(options.type, options.uri, true);
		if(options.range) {
			options.range = [].concat(options.range);
			if(options.range.length === 2) {
				xhr.setRequestHeader('Range', 'bytes=' + options.range[0] + '-' + options.range[1]);
			} else {
				xhr.setRequestHeader('Range', 'bytes=' + options.range[0]);
			}
		}
		xhr.send();
	};

	Reader.prototype.readUri = function(length, position, callback) {
		this.ajax(
			{
				uri: this.file,
				type: 'GET',
				responseType: 'arraybuffer',
				range: [position, position+length-1]
			},
			function(err, buffer) {
				if(err) {
					return callback(err);
				}
				return callback(null, buffer);
			}
		);
	};

	/*
	 * File API reader
	 */
	Reader.prototype.readFile = function(length, position, callback) {
		var slice = this.file.slice(position, position+length),
			fr = new FileReader();
		fr.onload = function(e) {
			callback(null, e.target.result);
		};
		fr.onerror = function(e) {
			callback('File read failed');
		};
		fr.readAsArrayBuffer(slice);
	};

	/*
	 * DataView
	 */
	DataView.prototype.getString = function(length, offset, raw) {
		offset = offset || 0;
		length = length || (this.byteLength - offset);
		if(length < 0) {
			length += this.byteLength;
		}
		var str = '';
		if(typeof Buffer !== 'undefined') {
			var data = [];
			for(var i = offset; i < (offset + length); i++) {
				data.push(this.getUint8(i));
			}
			return (new Buffer(data)).toString();
		} else {
			for(var i = offset; i < (offset + length); i++) {
				str += String.fromCharCode(this.getUint8(i));
			}
			if(raw) {
				return str;
			}
			return decodeURIComponent(escape(str));
		}
	};

	DataView.prototype.getStringUtf16 = function(length, offset, bom) {
		offset = offset || 0;
		length = length || (this.byteLength - offset);
		var littleEndian = false,
			str = '',
			useBuffer = false;
		if(typeof Buffer !== 'undefined') {
			str = [];
			useBuffer = true;
		}
		if(length < 0) {
			length += this.byteLength;
		}
		if(bom) {
			var bomInt = this.getUint16(offset);
			if(bomInt === 0xFFFE) {
				littleEndian = true;
			}
			offset += 2;
			length -= 2;
		}
		for(var i = offset; i < (offset + length); i += 2) {
			var ch = this.getUint16(i, littleEndian);
			if((ch >= 0 && ch <= 0xD7FF) || (ch >= 0xE000 && ch <= 0xFFFF)) {
				if(useBuffer) {
					str.push(ch);
				} else {
					str += String.fromCharCode(ch);
				}
			} else if(ch >= 0x10000 && ch <= 0x10FFFF) {
				ch -= 0x10000;
				if(useBuffer) {
					str.push(((0xFFC00 & ch) >> 10) + 0xD800);
					str.push((0x3FF & ch) + 0xDC00);
				} else {
					str += String.fromCharCode(((0xFFC00 & ch) >> 10) + 0xD800) + String.fromCharCode((0x3FF & ch) + 0xDC00);
				}
			}
		}
		if(useBuffer) {
			return (new Buffer(str)).toString();
		} else {
			return decodeURIComponent(escape(str));
		}
	};

	DataView.prototype.getSynch = function(num) {
		var out = 0,
			mask = 0x7f000000;
		while(mask) {
			out >>= 1;
			out |= num & mask;
			mask >>= 8;
		}
		return out;
	};

	DataView.prototype.getUint8Synch = function(offset) {
		return this.getSynch(this.getUint8(offset));
	};

	DataView.prototype.getUint32Synch = function(offset) {
		return this.getSynch(this.getUint32(offset));
	};

	/*
	 * Not really an int as such, but named for consistency
	 */
	DataView.prototype.getUint24 = function(offset, littleEndian) {
		if(littleEndian) {
			return this.getUint8(offset) + (this.getUint8(offset + 1) << 8) + (this.getUint8(offset + 2) << 16);
		}
		return this.getUint8(offset + 2) + (this.getUint8(offset + 1) << 8) + (this.getUint8(offset) << 16);
	};

	/*
	 * Rar Entry
	 */
	var RarEntry = function() {
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
	};

	RarEntry.METHOD_STORE = 0x30;
	RarEntry.METHOD_FASTEST = 0x31;
	RarEntry.METHOD_FAST = 0x32;
	RarEntry.METHOD_NORMAL = 0x33;
	RarEntry.METHOD_GOOD = 0x34;
	RarEntry.METHOD_BEST = 0x35;

	/*
	 * Rar Archive
	 */
	var RarArchive = function() {
		if(!(this instanceof RarArchive)) {
			return new RarArchive(arguments[0], arguments[1]);
		}
		/*
		 * Init
		 */
		this.options = {
			type: RarArchive.OPEN_URI,
		};
		var opts = arguments[0];
		if(typeof opts === 'string') {
			opts = {file: opts, type: RarArchive.OPEN_URI};
		} else if(typeof window !== 'undefined' && window.File && opts instanceof window.File) {
			opts = {file: opts, type: RarArchive.OPEN_FILE};
		}
		for(var k in opts) {
			this.options[k] = opts[k];
		}

		if(!this.options.file) {
			if(arguments[1]) arguments[1].call(this, 'No file was set');
			return;
		}

		if(this.options.type === RarArchive.OPEN_FILE) {
			if(typeof window === 'undefined' || !window.File || !window.FileReader || typeof ArrayBuffer === 'undefined') {
				if(arguments[1]) arguments[1].call(this, 'Browser does not have support for the File API and/or ArrayBuffers');
			}
		} else if(this.options.type === RarArchive.OPEN_LOCAL) {
			if(typeof require !== 'function') {
				if(arguments[1]) arguments[1].call(this, 'Local paths may not be read within a browser');
				return;
			}
		} else {
		}
		/*
		 * File
		 */
		this.file = this.options.file;
		this.rd = new Reader(this.options.type);
		/*
		 * Items
		 */
		this.entries = [];
		/*
		 * Validity
		 */
		this.valid = false;
		this.validate(arguments[1]);
	};

	/*
	 * File signature
	 */
	RarArchive.prototype.validate = function(callback) {
		var self = this;
		this.rd.open(this.file, function(err) {
			if(err) {
				if(callback) callback.call(self, err);
				return;
			}
			self.rd.read(14, 0, function(err, data) {
				if(err) {
					if(callback) callback.call(self, err);
					return;
				}
				var view = new DataView(data);
				if(view.getString(7, 0, true) !== '\x52\x61\x72\x21\x1a\x07\x00') {
					if(callback) callback.call(self, 'Invalid RAR archive');
					return;
				}
				var crc = view.getUint16(7, true),
					type = view.getUint8(9),
					flags = view.getUint16(10, true),
					size = view.getUint16(12, true);
				if(type !== 0x73) {
					if(callback) callback.call(self, 'Invalid RAR archive');
					return;
				}
				if((flags & 0x80) !== 0) {
					if(callback) callback.call(self, 'Encrypted RAR archives are not yet supported');
					return;
				}
				/*if((flags & 0x100) === 0) {
					if(callback) callback.call(self, 'First volume must be selected');
					return;
				}*/
				self.valid = true;
				self.readHeaders(size + 7, callback);
			});
		});
	};

	/*
	 * Entry parsing
	 */
	RarArchive.prototype.parseEntry = function(offset, callback) {
		var self = this;
		this.rd.read(11, offset, function(err, data) {
			if(err) {
				if(callback) callback.call(self, err);
				return;
			}
			var view = new DataView(data),
				flags = view.getUint16(3, true),
				size = view.getUint16(5, true);
			self.rd.read(size, offset, function(err, data) {
				var view = new DataView(data);
				var entry = new RarEntry;
				entry.partial = ((flags & 0x01) !== 0 || (flags & 0x02) !== 0);
				entry.continuesFrom = ((flags & 0x01) !== 0);
				entry.continues = ((flags & 0x02) !== 0);
				entry.offset = offset;
				entry.sizePacked = view.getUint32(7, true);
				entry.size = view.getUint32(11, true);
				entry.crc = view.getUint32(16, true);
				entry.time = (function() {
					var time = view.getUint32(20, true).toString(2);
					if(time.length < 32) {
						time = (new Array(32 - time.length + 1)).join('0') + time;
					}
					time = time.match(/(\d{7})(\d{4})(\d{5})(\d{5})(\d{6})(\d{5})/).slice(1).map(function(val) {
						return parseInt(val, 2);
					});
					return new Date(1980 + time[0], time[1] - 1, time[2], time[3], time[4], time[5]);
				})();
				entry.os = (function() {
					var os = view.getUint8(15);
					switch(os) {
						case 0: return 'MS-DOS';
						case 1: return 'OS/2';
						case 2: return 'Windows';
						case 3: return 'Unix';
						case 4: return 'Mac';
						case 5: return 'BeOS';
					}
				})();
				entry.version = view.getUint8(24);
				entry.method = view.getUint8(25);
				entry.encrypted = ((flags & 0x04) !== 0);
				var nameSize = view.getUint16(26, true);
				if((flags & 0x100) !== 0) {
					entry.sizePacked += view.getUint32(32, true) * 0x100000000;
					entry.size += view.getUint32(36, true) * 0x100000000;
					entry.path = view.getString(nameSize, 40);
				} else {
					entry.path = view.getString(nameSize, 32);
				}
				if((flags & 0x200) !== 0 && entry.path.indexOf('\x00') !== -1) {
					entry.path = entry.path.split('\x00')[1];
				}
				entry.name = entry.path;
				if(entry.name.indexOf('\\') !== -1) {
					entry.name = entry.name.substr(entry.name.lastIndexOf('\\') + 1);
				} else {
					entry.name = entry.name.substr(entry.name.lastIndexOf('/') + 1);
				}
				entry.headerSize = size;
				entry.blockSize = entry.headerSize + entry.sizePacked;
				if(callback) callback.call(self, null, entry);
			});
		});
	};

	/*
	 * Read headers
	 */
	RarArchive.prototype.readHeaders = function(offset, callback) {
		var self = this;
		var cb = function(err, data) {
			if(err) {
				if(callback) callback.call(self, err);
				return;
			}
			var view = new DataView(data),
				crc = view.getUint16(0, true),
				type = view.getUint8(2),
				flags = view.getUint16(3, true),
				size = view.getUint16(5, true);
			if((flags & 0x8000) !== 0) {
				size += view.getUint32(7, true);
			}
			switch(type) {
				case 0x74:
					self.parseEntry(offset, function(err, entry) {
						if(err) {
							if(callback) callback.call(self, 'Read error occurred while reading entry');
							return;
						}
						self.entries.push(entry);
						offset += entry.blockSize;
						if(offset >= self.rd.size) {
							if(callback) callback.call(self, null);
							return;
						}
						self.rd.read(11, offset, cb);
					});
				break;
				default:
					offset += size;
					if(offset >= self.rd.size) {
						if(callback) callback.call(self, null);
						return;
					}
					self.rd.read(11, offset, cb);
				break;
			}
		};
		if(this.rd.size <= 14) {
			if(callback) callback.call(self, null, this.entries);
			return;
		}
		this.rd.read(11, offset, cb);
	};

	/*
	 * Get a file
	 */
	RarArchive.prototype.get = function(entry, callback) {
		if(!this.valid) {
			if(callback) callback.call(this, 'Invalid RAR archive');
			return;
		}
		if(!(entry instanceof RarEntry)) {
			if(callback) callback.call(this, 'Invalid RAR entry, must be an instance of RarEntry');
			return;
		}
		if(entry.method !== RarEntry.METHOD_STORE) {
			if(callback) callback.call(this, 'Compression is not yet supported');
			return;
		}
		this.rd.readBlob(entry.blockSize - 1, entry.offset + entry.headerSize, function(err, data) {
			if(err) {
				if(callback) callback.call(self, err);
				return;
			}
			if(callback) callback.call(self, null, data);
		});
	};

	RarArchive.OPEN_FILE = Reader.OPEN_FILE;
	RarArchive.OPEN_URI = Reader.OPEN_URI;
	RarArchive.OPEN_LOCAL = Reader.OPEN_LOCAL;

	if(typeof module !== 'undefined' && module.exports) {
		module.exports = RarArchive;
	} else {
		if(typeof define === 'function' && define.amd) {
			define('rar', [], function() {
				return RarArchive;
			});
		} else {
			window.RarArchive = RarArchive;
		}
	}
})();
