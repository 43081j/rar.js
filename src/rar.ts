/*
 * rar.js
 * Pure JavaScript implementation of the RAR format
 * 43081j
 * License: MIT, see LICENSE
 */

import { Reader } from './reader';
import { UriReader } from './reader/uri';
import { LocalReader } from './reader/local';
import { NativeFileReader } from './reader/nativeFile';
import { RarEntry } from './entry';
import { RarMethod } from './method';
import * as util from './util';

export {
  Reader,
  UriReader,
  LocalReader,
  NativeFileReader,
  RarMethod
};

export async function fromFile(file: File) {
  return fromReader(new NativeFileReader(file));
}

export async function fromUri(uri: string) {
  return fromReader(new UriReader(uri));
}

export async function fromLocal(path: string) {
  return fromReader(new LocalReader(path));
}

export async function fromReader(reader: Reader) {
  const result = new RarArchive(reader);
  await result.load();
  return result;
}

export class RarArchive {
  public entries: RarEntry[] = [];

  private _reader: Reader;
  private _loaded: boolean = false;

  public get loaded(): boolean {
    return this._loaded;
  }

  constructor(reader: Reader) {
    this._reader = reader;
  }

  public async load(): Promise<void> {
    if (this.loaded) {
      return;
    }

    await this._reader.open();

    const header = await this._reader.read(14, 0);
    const headerView = new DataView(header);

    if (util.getString(headerView, 7, 0, true) !== '\x52\x61\x72\x21\x1a\x07\x00') {
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
      const piece = await this._reader.read(11, offset);
      const view = new DataView(piece);
      const type = view.getUint8(2);
      const flags = view.getUint16(3, true);
      let size = view.getUint16(5, true);

      if ((flags & 0x8000) !== 0) {
        size += view.getUint32(7, true);
      }

      switch (type) {
        case 0x74:
          const entry = await this.parseEntry(size, offset);
          this.entries.push(entry);
          offset += entry.blockSize;
          break;
        default:
          offset += size;
      }
    }
  }

  public async get(entry: RarEntry): Promise<Blob> {
    if (entry.method !== RarMethod.STORE) {
      throw new Error('Compression is not yet supported');
    }

    const blob = await this._reader.readBlob(entry.blockSize - 1,
      entry.offset + entry.headerSize);

    return blob;
  }

  private parseEntryTime(time: string) {
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

  private parseEntryOS(value: number) {
    if (value < 0 || value > 5) {
      return 'Unknown';
    }
    return ['MS-DOS', 'OS/2', 'Windows', 'Unix', 'Mac', 'BeOS'][value];
  }

  private async parseEntry(size: number, offset: number): Promise<RarEntry> {
    const data = await this._reader.read(size, offset);
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
      entry.path = util.getString(view, nameSize, 40);
    } else {
      entry.path = util.getString(view, nameSize, 32);
    }

    if ((flags & 0x200) !== 0 && entry.path.indexOf('\x00') !== -1) {
      entry.path = entry.path.split('\x00')[1];
    }

    entry.name = entry.path;

    if (entry.name.indexOf('\\') !== -1) {
      entry.name = entry.name.substr(entry.name.lastIndexOf('\\') + 1);
    } else {
      entry.name = entry.name.substr(entry.name.lastIndexOf('/') + 1);
    }

    entry.headerSize = size;
    entry.blockSize = entry.headerSize + entry.sizePacked;

    return entry;
  }
}
