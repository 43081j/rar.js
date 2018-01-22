import { Reader } from '../reader';

export class UriReader extends Reader {
  public uri: string;

  constructor(uri: string) {
    super();
    this.uri = uri;
  }

  public async open() {
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
  }

  public close() {
    return Promise.resolve();
  }

  public reset() {
    return;
  }

  public async read(length: number, position: number) {
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
  }
}
