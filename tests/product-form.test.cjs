const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

function createForm({ failUpload = false } = {}) {
  const source = fs.readFileSync(path.join(__dirname, '../src/app/(vendor)/product-form.tsx'), 'utf8');
  const javascript = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports = {};
  const hooks = [];
  let hookIndex = 0;
  let savedOptions;
  let replacement;
  const asset = { uri: 'file:///cache/photo.jpg', name: 'photo.jpg', size: 12 };
  class ProductPhotoUploadError extends Error {}
  const element = (type, props) => ({ type, props: props ?? {} });
  const modules = {
    'react/jsx-runtime': { jsx: element, jsxs: element },
    react: {
      useCallback: (callback) => callback,
      useState: (initial) => {
        const index = hookIndex++;
        if (!(index in hooks)) hooks[index] = initial;
        return [hooks[index], (value) => { hooks[index] = typeof value === 'function' ? value(hooks[index]) : value; }];
      },
      useRef: (initial) => {
        const index = hookIndex++;
        if (!(index in hooks)) hooks[index] = { current: initial };
        return hooks[index];
      },
    },
    'expo-document-picker': { getDocumentAsync: async () => ({ canceled: false, assets: [asset] }) },
    'expo-image': { Image: 'Image' },
    'expo-router': { router: { back() {}, replace(value) { replacement = value; } }, useLocalSearchParams: () => ({}) },
    'react-native': { Pressable: 'Pressable', Text: 'Text', View: 'View' },
    '@/components/app-store': { useAppStore: () => ({ refresh: async () => {} }) },
    '@/components/detail-ui': { DetailShell: 'DetailShell' },
    '@/components/form-ui': { FormField: 'FormField' },
    '@/components/market-ui': { PrimaryButton: 'PrimaryButton' },
    '@/hooks/use-focus-api': { useFocusApi: () => ({ data: { categories: [], product: undefined, images: [] }, loading: false }) },
    '@/lib/api': { api: async () => {}, ApiError: class extends Error {}, mediaUrl: (url) => url },
    '@/lib/product-save': { saveProductWithPhoto: async (options) => {
      savedOptions = options;
      if (failUpload) { options.onCreated(42); throw new ProductPhotoUploadError('Connection lost'); }
    }, ProductPhotoUploadError },
    '@/lib/uploads': { uploadForm: () => {}, validateUploadAsset: () => {} },
  };
  vm.runInNewContext(javascript, { exports, require: (name) => {
    if (!(name in modules)) throw new Error(`Unexpected module: ${name}`);
    return modules[name];
  } });
  return {
    asset,
    render() {
      hookIndex = 0;
      const editor = exports.default();
      return editor.type(editor.props);
    },
    savedOptions: () => savedOptions,
    replacement: () => replacement,
  };
}

function find(node, predicate) {
  if (!node || typeof node !== 'object') return undefined;
  if (predicate(node)) return node;
  const children = node.props?.children;
  for (const child of Array.isArray(children) ? children : [children]) {
    const match = find(child, predicate);
    if (match) return match;
  }
}

test('new product form selects, previews, and submits a photo', async () => {
  const form = createForm();
  let tree = form.render();
  const choose = find(tree, (node) => node.type === 'Pressable' && find(node, (child) => child.type === 'Text' && child.props.children === 'Choose product photo'));
  assert.ok(choose, 'New product form must offer photo selection.');
  choose.props.onPress();
  await new Promise(setImmediate);
  tree = form.render();
  assert.ok(find(tree, (node) => node.type === 'Image' && node.props.source === form.asset.uri), 'Selected photo is previewed.');
  for (const [label, value] of [['Product name', 'Tomato'], ['Price (EGP)', '10'], ['Available stock (kg)', '5']]) {
    const field = find(tree, (node) => node.type === 'FormField' && node.props.label === label);
    assert.ok(field, `Missing ${label} field.`);
    field.props.onChangeText(value);
  }
  tree = form.render();
  assert.equal(tree.props.footer.props.disabled, false);
  tree.props.footer.props.onPress();
  await new Promise(setImmediate);
  assert.equal(form.savedOptions().productId, null);
  assert.equal(form.savedOptions().photo, form.asset);
  assert.equal(form.savedOptions().body.name, 'Tomato');
});

test('failed photo upload directs the user to the saved product instead of creating another', async () => {
  const form = createForm({ failUpload: true });
  let tree = form.render();
  for (const [label, value] of [['Product name', 'Tomato'], ['Price (EGP)', '10'], ['Available stock (kg)', '5']]) {
    find(tree, (node) => node.type === 'FormField' && node.props.label === label).props.onChangeText(value);
  }
  tree = form.render();
  tree.props.footer.props.onPress();
  await new Promise(setImmediate);
  tree = form.render();
  assert.equal(tree.props.footer.props.disabled, true);
  const review = find(tree, (node) => node.type === 'Pressable' && find(node, (child) => child.type === 'Text' && child.props.children === 'Review saved product'));
  assert.ok(review);
  review.props.onPress();
  assert.equal(form.replacement().params.id, '42');
});
