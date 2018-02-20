export function getString(view: DataView, length?: number, offset?: number, raw?: boolean) {
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
  } else {
    for (let i = offset; i < (offset + length); i++) {
      str += String.fromCharCode(view.getUint8(i));
    }

    if (raw) {
      return str;
    }

    // TODO: why does this work?
    return decodeURIComponent((window as any).escape(str));
  }
}
