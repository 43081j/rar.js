import * as fs from 'fs';
import { Reader } from '../reader';

let fsImport: typeof fs;

if (typeof require === 'function') {
  fsImport = require('fs');
}

export class LocalReader extends Reader {
  public path: string;

  constructor(path: string) {
    super();
    this.path = path;
  }

  public async open() {
    return new Promise<void>((resolve, reject) => {
      fsImport.stat(this.path, (err, stat) => {
        if (err) {
          reject(new Error('Could not read file'));
          return;
        }

        this.size = stat.size;
        resolve();
      });
    });
  }

  public close() {
    return Promise.resolve();
  }

  public reset() {
    return;
  }

  public async read(length: number, position: number) {
    return new Promise<ArrayBuffer>((resolve, reject) => {
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
  }
}
