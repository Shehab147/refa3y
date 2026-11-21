const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

function createSaver({ saveResult = { id: 42 }, uploadError = null, invalidFile = false } = {}) {
  const source = fs.readFileSync(path.join(__dirname, '../src/lib/product-save.ts'), 'utf8');
  const javascript = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  const calls = [];
  const form = { fields: [], append(key, value) { this.fields.push([key, value]); } };
  vm.runInNewContext(javascript, {
    exports, Error,
    require: (name) => {
      if (name === '@/lib/api') return { api: async (action, options) => {
        calls.push({ action, options });
        if (action === 'vendor/product/upload' && uploadError) throw uploadError;
        return action === 'vendor/product/save' ? saveResult : null;
      } };
      if (name === '@/lib/uploads') return { uploadForm: () => {
        if (invalidFile) throw new Error('Invalid file.');
        return form;
      } };
      throw new Error(`Unexpected module: ${name}`);
    },
  });
  return { ...exports, calls, form };
}

test('new product is created before its selected photo is uploaded', async () => {
  const { saveProductWithPhoto, calls, form } = createSaver();
  const created = [];
  await saveProductWithPhoto({ productId: null, body: { name: 'Tomato' }, photo: { name: 'photo.jpg' }, onCreated: (id) => created.push(id) });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].action, 'vendor/product/save');
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[1].action, 'vendor/product/upload');
  assert.equal(calls[1].options.form, form);
  assert.equal(form.fields[0][0], 'product_id');
  assert.equal(form.fields[0][1], '42');
  assert.deepEqual(created, [42]);
});

test('upload failure retains the created product ID and is distinguished from save failure', async () => {
  const { saveProductWithPhoto, ProductPhotoUploadError, calls } = createSaver({ uploadError: new Error('Connection lost') });
  let createdId = null;
  await assert.rejects(saveProductWithPhoto({ productId: null, body: {}, photo: { name: 'photo.jpg' }, onCreated: (id) => { createdId = id; } }), ProductPhotoUploadError);
  assert.equal(createdId, 42);
  await saveProductWithPhoto({ productId: createdId, body: { name: 'Edited' }, photo: null, onCreated: () => assert.fail('Must not create a second product') });
  assert.equal(calls[2].options.method, 'PATCH');
  assert.equal(calls[2].options.body.id, 42);
  assert.equal(calls.filter((call) => call.options.method === 'POST' && call.action === 'vendor/product/save').length, 1);
});

test('invalid selected photo is rejected before creating a product', async () => {
  const { saveProductWithPhoto, calls } = createSaver({ invalidFile: true });
  await assert.rejects(saveProductWithPhoto({ productId: null, body: {}, photo: {}, onCreated: () => {} }), /Invalid file/);
  assert.equal(calls.length, 0);
});

test('a missing created product ID is reported and no photo upload is attempted', async () => {
  const { saveProductWithPhoto, calls } = createSaver({ saveResult: null });
  await assert.rejects(saveProductWithPhoto({ productId: null, body: {}, photo: {}, onCreated: () => assert.fail('No valid ID') }), /valid product ID/);
  assert.equal(calls.length, 1);
});

test('new product without a photo only makes the save request', async () => {
  const { saveProductWithPhoto, calls } = createSaver();
  await saveProductWithPhoto({ productId: null, body: {}, photo: null, onCreated: () => {} });
  assert.equal(calls.length, 1);
});
