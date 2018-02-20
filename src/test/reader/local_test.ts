import { assert } from 'chai';
import { LocalReader } from '../../reader/local';
import * as path from 'path';

const testFile = path.join(__dirname, '../../../src/test/static/nothing.txt');
const fakeFile = path.join(__dirname, '../../../src/test/static/doesnt_exist');
const abToString = (buf: ArrayBuffer) => {
  return String.fromCharCode.apply(null, new Uint8Array(buf));
};

suite('LocalReader', () => {
  let reader: LocalReader;

  setup(() => {
    reader = new LocalReader(testFile);
  });

  test('can open files', async () => {
    await reader.open();
    assert.equal(reader.size, 14);
  });

  test('throws when file cannot be opened', async () => {
    reader = new LocalReader(fakeFile);
    try {
      await reader.open();
      throw new Error('test failed');
    } catch (e) {
      assert.equal(e.message, 'Could not read file');
    }
  });

  test('can read files', async () => {
    await reader.open();

    let result = abToString(await reader.read(1, 0));
    assert.equal(result, 'I');

    result = abToString(await reader.read(9, 5));
    assert.equal(result, 'SOMETHING');
  });
});
