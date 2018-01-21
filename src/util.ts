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

export function getStringUtf16(view: DataView, length?: number, offset?: number, bom?: boolean) {
  offset = offset || 0;
  length = length || (view.byteLength - offset);

  const str = [];
  let littleEndian = false;
  let useBuffer = false;

  if (typeof Buffer !== 'undefined') {
    useBuffer = true;
  }

  if (length < 0) {
    length += view.byteLength;
  }

  if (bom) {
    const bomInt = view.getUint16(offset);

    if (bomInt === 0xFFFE) {
      littleEndian = true;
    }

    offset += 2;
    length -= 2;
  }

  for (let i = offset; i < (offset + length); i += 2) {
    let ch = view.getUint16(i, littleEndian);

    if ((ch >= 0 && ch <= 0xD7FF) || (ch >= 0xE000 && ch <= 0xFFFF)) {
      if (useBuffer) {
        str.push(ch);
      } else {
        str.push(String.fromCharCode(ch));
      }
    } else if (ch >= 0x10000 && ch <= 0x10FFFF) {
      ch -= 0x10000;
      if (useBuffer) {
        str.push(((0xFFC00 & ch) >> 10) + 0xD800);
        str.push((0x3FF & ch) + 0xDC00);
      } else {
        str.push(String.fromCharCode(((0xFFC00 & ch) >> 10) + 0xD800) + String.fromCharCode((0x3FF & ch) + 0xDC00));
      }
    }
  }

  if (useBuffer) {
    return (new Buffer(str)).toString();
  } else {
    // TODO: again why does this work?
    return decodeURIComponent((window as any).escape(str.join('')));
  }
}

export function getSynch(num: number) {
  let out = 0;
  let mask = 0x7f000000;

  while (mask) {
    out >>= 1;
    out |= num & mask;
    mask >>= 8;
  }

  return out;
}

export function getUint8Sync(view: DataView, offset: number) {
  return getSynch(view.getUint8(offset));
}

export function getUint32Sync(view: DataView, offset: number) {
  return getSynch(view.getUint32(offset));
}

export function getUint24(view: DataView, offset: number, littleEndian: boolean) {
  if (littleEndian) {
    return view.getUint8(offset) +
      (view.getUint8(offset + 1) << 8) +
      (view.getUint8(offset + 2) << 16);
  }

  return view.getUint8(offset + 2) +
    (view.getUint8(offset + 1) << 8) +
    (view.getUint8(offset) << 16);
}
