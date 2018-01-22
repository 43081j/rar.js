import { assert } from 'chai';
import * as util from '../util';

suite('util', () => {
  suite('getString', () => {
    let view: DataView;

    setup(() => {
      const buffer = new ArrayBuffer(3);
      const data = new Uint8Array(buffer);
      data[0] = 0x72;
      data[1] = 0x61;
      data[2] = 0x72;

      view = new DataView(buffer);
    });

    test('returns a string from a view', () => {
      const result = util.getString(view);
      assert.equal(result, 'rar');
    });

    test('returns a string of given length', () => {
      const result = util.getString(view, 1);
      assert.equal(result, 'r');
    });

    test('returns a string from offset', () => {
      const result = util.getString(view, undefined, 1);
      assert.equal(result, 'ar');
    });

    test('returns a string from an offset, to a length', () => {
      const result = util.getString(view, 1, 1);
      assert.equal(result, 'a');
    });

    test('can return raw string');
  });
});
