import { Reader } from '../reader';

export class NativeFileReader extends Reader {
  public file: File;

  constructor(file: File) {
    super();
    this.file = file;
    this.size = file.size;
  }

  public open() {
    return Promise.resolve();
  }

  public close() {
    return Promise.resolve();
  }

  public reset() {
    return;
  }

  public read(length: number, position: number) {
    const slice = this.file.slice(position, position + length);
    const fr = new FileReader();

    return new Promise<ArrayBuffer>((resolve, reject) => {
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
