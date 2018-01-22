// tslint:disable:max-classes-per-file
import { assert } from 'chai';
import { UriReader } from '../../reader/uri';
import * as sinon from 'sinon';

const abToString = (buf: ArrayBuffer) => {
  return String.fromCharCode.apply(null, new Uint8Array(buf));
};

class MockHeaders {
  private _headers: {[k: string]: string};

  constructor(obj: {[k: string]: string}) {
    this._headers = obj;
  }

  public get(k: string) {
    return this._headers[k];
  }
}

class MockResponse {
  public status: number;
  public body: string;
  public headers: MockHeaders;

  public get ok() {
    return this.status < 400;
  }

  constructor(status: number, body: string, headers: {[k: string]: string}) {
    this.status = status;
    this.headers = new MockHeaders(headers);
    this.body = body;
  }

  public arrayBuffer() {
    const buffer = new ArrayBuffer(this.body.length);
    const view = new Uint8Array(buffer);
    for (let i = 0, len = this.body.length; i < len; i++) {
      view[i] = this.body.charCodeAt(i);
    }
    return buffer;
  }
}

suite('UriReader', () => {
  let reader: UriReader;
  let fetch: sinon.SinonStub;

  setup(() => {
    fetch = (global as any).fetch = sinon.stub();
    reader = new UriReader('/test');
  });

  test('can open uri', async () => {
    fetch.resolves(new MockResponse(200, '', {
      'Content-Length': '3'
    }));

    await reader.open();
    assert.equal(reader.size, 3);
  });

  test('throws when uri cannot be opened', async () => {
    fetch.resolves(new MockResponse(500, '', {
      'Content-Length': '0'
    }));

    try {
      await reader.open();
      throw new Error('test failed');
    } catch (e) {
      assert.equal(e.message, 'Could not open URI');
    }
  });

  test('can read a uri', async () => {
    fetch.resolves(new MockResponse(200, '', {
      'Content-Length': '3'
    }));

    await reader.open();

    assert.isTrue(fetch.calledWithExactly('/test', {
      method: 'HEAD'
    }));

    fetch.resolves(new MockResponse(206, 'R', {
      'Content-Length': '1',
      'Accept-Ranges': 'bytes',
      'Content-Range': 'bytes 0-0'
    }));

    let result = abToString(await reader.read(1, 0));

    assert.isTrue(fetch.calledWithExactly('/test', {
      method: 'GET',
      headers: {
        Range: 'bytes=0-0'
      }
    }));
    assert.equal(result, 'R');

    fetch.resolves(new MockResponse(206, 'AR', {
      'Content-Length': '2',
      'Accept-Ranges': 'bytes',
      'Content-Range': 'bytes 1-2'
    }));

    result = abToString(await reader.read(2, 1));
    assert.isTrue(fetch.calledWithExactly('/test', {
      method: 'GET',
      headers: {
        Range: 'bytes=1-2'
      }
    }));
    assert.equal(result, 'AR');
  });
});
