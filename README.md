# rar.js - JavaScript Unrar Utility

**rar.js** provides a pure javascript implementation of the rar format, allowing you to extract or manipulate packed data client-side and server-side.

Multiple inputs are supported: AJAX, File API (HTML5) and local disk (NodeJS).

## Example

Using **rar.js** is fairly straight forward.

```javascript
Rar.fromLocal('myfile.rar').then((archive) => {
  // Use archive here
  console.log(archive.entries);
});

Rar.fromUri('/test.rar').then((archive) => {
  // Use archive here
});

Rar.fromFile(input.files[0]).then((archive) => {
  // Use archive here
});
```

## Unsupported features (TODO)

* Large file support (currently the entire file will be in memory when `RarArchive.get` is called)
* Decompression support
* Encryption support
* Recognise volumes/split archives
* Parse other entries (e.g. comments)

## Saving files

By using `RarArchive#get(file)`, you can retrieve a `Blob` of a specified file within the archive.

```javascript
const file = archive.get(archive.entries[0]);
const url = URL.createObjectURL(file);
// Do something with url here
// like creating an <a> tag with the download attribute set
```

### Split Volumes

When dealing with entries you have retrieved via `RarArchive.get()`, make sure you check the `RarEntry.partial` boolean.

If this boolean is true, sending/saving the `Blob` will result in a partial file. You must request that the user open the previous or next volume and prepend/append to the `Blob` to be able to retrieve the full file.

To find out if the file is continued in a previous or next volume, see `RarEntry.continues` and `RarEntry.continuesFrom`.

## RarArchive

* `Rar.fromFile(file)` where `file` is a HTML5 `File` instance
* `Rar.fromLocal(path)` where `path` is a string of a local filesystem path
* `Rar.fromUri(uri)` where `uri` is a string of a URI

All three of these entrypoints return a `Promise` which resolves to a `RarArchive`.

* `RarArchive#entries` An array of `RarEntry` instances contained within this archive
* `RarArchive#get(RarEntry)` Retrieves the specified `RarEntry` resolves a promise with a `Blob`

## RarEntry Properties

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

* `Rar.RarMethod.STORE`
* `Rar.RarMethod.FASTEST`
* `Rar.RarMethod.FAST`
* `Rar.RarMethod.NORMAL`
* `Rar.RarMethod.GOOD`
* `Rar.RarMethod.BEST`

## License

MIT
