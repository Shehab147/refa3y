const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

function createUploads(platform) {
  const source = fs.readFileSync(path.join(__dirname, '../src/lib/uploads.ts'), 'utf8');
  const javascript = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  class LocalFile { constructor(uri) { this.uri = uri; } }
  class FormData { constructor() { this.parts = []; } append(...values) { this.parts.push(values); } }
  vm.runInNewContext(javascript, {
    exports, FormData,
    require: (name) => {
      if (name === 'expo-file-system') return { File: LocalFile };
      if (name === 'react-native') return { Platform: { OS: platform } };
      throw new Error(`Unexpected module: ${name}`);
    },
  });
  return exports;
}

test('native form uses an Expo file and includes the product ID', () => {
  const { uploadForm } = createUploads('ios');
  const form = uploadForm({ uri: 'file:///cache/photo.jpg', name: 'photo.jpg', size: 12 }, { product_id: '42' });
  assert.equal(form.parts[0][0], 'product_id');
  assert.equal(form.parts[0][1], '42');
  assert.equal(form.parts[1][0], 'file');
  assert.equal(form.parts[1][1].uri, 'file:///cache/photo.jpg');
  assert.equal(form.parts[1][2], 'photo.jpg');
});

test('web form uses the picker browser file', () => {
  const { uploadForm } = createUploads('web');
  const file = { name: 'document.pdf' };
  const form = uploadForm({ uri: 'blob:example', name: file.name, size: 12, file }, {});
  assert.equal(form.parts[0][1], file);
  assert.throws(() => uploadForm({ uri: 'blob:example', name: file.name }, {}), /unavailable/);
});

test('empty or oversized files are rejected', () => {
  const { uploadForm, MAX_UPLOAD_BYTES } = createUploads('ios');
  for (const size of [0, MAX_UPLOAD_BYTES + 1]) {
    assert.throws(() => uploadForm({ uri: 'file:///image', name: 'photo.jpg', size }, {}), /5 MB/);
  }
  assert.doesNotThrow(() => uploadForm({ uri: 'file:///image', name: 'photo.jpg', size: MAX_UPLOAD_BYTES }, {}));
});
