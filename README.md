rar.js - JavaScript Unrar Utility
===

**rar.js** provides a pure javascript implementation of the rar format, allowing you to extract or manipulate packed data client-side and server-side.

Multiple inputs are supported: AJAX, File API (HTML5) and local disk (NodeJS).

**rar.js** makes use of [dataview-extra](https://github.com/43081j/dataview-extra) and [reader.js](https://github.com/43081j/reader.js).

**This is a very new utility/library, please see the list below for what may be missing.**

**TODO & Potential Features**

* Large file support (currently the entire file will be in memory when `RarArchive.get` is called)
* Decompression support
* Encryption support
* Recognise volumes/split archives
* Parse other entries (e.g. comments)

Example
===

Using **rar.js** is fairly straight forward.

```javascript
var archive = RarArchive(file, function(err) {
	if(err) {
		// An error occurred (not a rar, read error, etc)
		return;
	}
	// Use archive
});
```

In this example, the callback is called when the archive has been opened and validated successfully. If the archive is of an invalid format or cannot be read, an appropriate error will be passed.

Within the callback, `archive.entries` has been populated with the files (note you may use `this.entries` in the callback too).

Each entry is a `RarEntry` instance.

Saving files
===

By using `RarArchive.get(file, callback)`, you can retrieve a `Blob` of a specified file within the archive.

What you do with this `Blob` is upto you. A common thing to do would be to create an object URL using `URL.createObjectURL(Blob)` and redirect the user to it or create an `<a>` element with the `download` attribute (HTML5) set to the file name.

Split Volumes
===

When dealing with entries you have retrieved via `RarArchive.get()`, make sure you check the `RarEntry.partial` boolean.

If this boolean is true, sending/saving the `Blob` will result in a partial file. You must request that the user open the previous or next volume and prepend/append to the `Blob` to be able to retrieve the full file.

To find out if the file is continued in a previous or next volume, see `RarEntry.continues` and `RarEntry.continuesFrom`.

RarArchive
===

* `RarArchive(options, callback)` If options is a string, it is assumed to be a URL. If it is a File instance, it will be treated as such. `callback` will be called when the archive has been validated and is ready.
* `RarArchive.entries` An array of `RarEntry` instances contained within this archive
* `RarArchive.get(RarEntry, callback)` Retrieves the specified `RarEntry` and passed a `Blob` of it to `callback`

When creating an instance of `RarArchive`, the data source is guessed based on data type. If it is a string, it is assumed to be a URL and will be requested over HTTP. If it is a `File` instance, it will be read as one.

In the case that you want to specify the type manually or want to read a local file, you must pass it in the options like so:

```
RarArchive({ type: RarArchive.OPEN_LOCAL, file: 'example/file.txt'}, function() { });
```

You may use the following constants for `type`:

* `RarArchive.OPEN_LOCAL` for local files (NodeJS only)
* `RarArchive.OPEN_URI` for HTTP URIs
* `RarArchive.OPEN_FILE` for File instances

RarEntry Properties
===

* `name` File name
* `path` File path within the archive, including file name
* `size` Size of the unpacked file
* `sizePacked` Size of the packed file
* `crc` CRC of the file
* `offset` Offset within the archive
* `blockSize` Size of this entry within the archive (including headers)
* `headerSize` Size of the header for this entry
* `encrypted` Boolean specifying if the file is password protected or not
* `version` RAR version used
* `time` Date/time string for the file
* `method` Compression method used, will equal one of the method constants
* `os` Operating system used (`Windows`, `MS-DOS`, `OS/2`, `Unix`, `Mac` or `BeOS`)
* `partial` Boolean specifying if the file is partial available due to split volumes. Use `RarEntry.continues` and `RarEntry.continuesFrom`.
* `continuesFrom` Boolean specifying if the file continues from a previous volume
* `continues` Boolean specifying if the file continues into the next volume

The following constants also exist for use with `RarEntry.method`:

* `RarEntry.METHOD_STORE`
* `RarEntry.METHOD_FASTEST`
* `RarEntry.METHOD_FAST`
* `RarEntry.METHOD_NORMAL`
* `RarEntry.METHOD_GOOD`
* `RarEntry.METHOD_BEST`

License
===

MIT
