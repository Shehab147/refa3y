const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

function loadScreen(file, store, router = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const javascript = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports = {};
  const element = (type, props) => ({ type, props: props ?? {} });
  const modules = {
    'react/jsx-runtime': { jsx: element, jsxs: element },
    react: { useState: (initial) => [initial, () => {}] },
    'expo-router': { Redirect: 'Redirect', router },
    'react-native': { Pressable: 'Pressable', Text: 'Text', View: 'View' },
    '@/components/app-store': { useAppStore: () => store },
    '@/components/market-ui': { PrimaryButton: 'PrimaryButton', ListRow: 'ListRow', RoundButton: 'RoundButton', Screen: 'Screen', StatusPill: 'StatusPill' },
  };
  vm.runInNewContext(javascript, { exports, require: (name) => {
    if (!(name in modules)) throw new Error(`Unexpected module: ${name}`);
    return modules[name];
  } });
  return exports.default;
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

test('entry waits for restoration and routes restored accounts by role', () => {
  const store = { ready: false, loading: false, user: null, sessionError: null, needsVendorOnboarding: false };
  const Entry = loadScreen('src/app/index.tsx', store);
  assert.equal(Entry().type, 'View');
  store.ready = true; store.loading = true;
  assert.equal(Entry().type, 'View');
  store.loading = false;
  assert.equal(Entry().props.href, '/(auth)');
  store.user = { role: 'buyer' };
  assert.equal(Entry().props.href, '/(buyer)/(tabs)');
  store.user = { role: 'vendor' };
  assert.equal(Entry().props.href, '/(vendor)/(tabs)');
  store.needsVendorOnboarding = true;
  assert.equal(Entry().props.href, '/(auth)/vendor-onboarding');
});

test('failed restoration displays retry rather than redirecting to sign-in', () => {
  let retries = 0;
  const store = { ready: true, loading: false, user: null, sessionError: 'Could not reach the server.', refresh: () => { retries++; } };
  const Entry = loadScreen('src/app/index.tsx', store);
  const screen = Entry();
  assert.equal(screen.type, 'View');
  assert.ok(find(screen, (node) => node.type === 'Text' && node.props.children === store.sessionError));
  find(screen, (node) => node.type === 'PrimaryButton').props.onPress();
  assert.equal(retries, 1);
});

test('buyer sign-out clears the session before navigating to authentication', async () => {
  const actions = [];
  const store = { addresses: [], savedProducts: [], payments: [], buyerProfile: { name: 'Test' }, signOut: async () => { actions.push('signOut'); } };
  const Profile = loadScreen('src/app/(buyer)/(tabs)/profile/index.tsx', store, { replace: (href) => actions.push(href), push() {} });
  const button = find(Profile(), (node) => node.type === 'Pressable' && find(node, (child) => child.type === 'Text' && child.props.children === 'Sign out'));
  assert.ok(button);
  button.props.onPress();
  await new Promise(setImmediate);
  assert.deepEqual(actions, ['signOut', '/(auth)']);
});

test('buyer sign-out does not navigate if secure storage deletion fails', async () => {
  const actions = [];
  const store = { addresses: [], savedProducts: [], payments: [], buyerProfile: { name: 'Test' }, signOut: async () => { throw new Error('Storage unavailable'); } };
  const Profile = loadScreen('src/app/(buyer)/(tabs)/profile/index.tsx', store, { replace: (href) => actions.push(href), push() {} });
  find(Profile(), (node) => node.type === 'Pressable' && find(node, (child) => child.type === 'Text' && child.props.children === 'Sign out')).props.onPress();
  await new Promise(setImmediate);
  assert.equal(actions.length, 0);
});
