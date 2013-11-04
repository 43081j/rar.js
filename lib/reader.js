/*
 * Reader.js
 * A unified reader interface for AJAX, local and File API access
 * 43081j
 * License: MIT, see LICENSE
 */
(function() {
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
			callback(null, new Blob(data, {type: type}));
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

	if(typeof module !== 'undefined' && module.exports) {
		module.exports = Reader;
	} else {
		if(typeof define === 'function' && define.amd) {
			define('reader', [], function() {
				return Reader;
			});
		} else {
			window.Reader = Reader;
		}
	}
})();
