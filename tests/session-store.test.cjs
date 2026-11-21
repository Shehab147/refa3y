const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

function createStore() {
  const source = fs.readFileSync(path.join(__dirname, '../src/components/app-store.tsx'), 'utf8');
  const javascript = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports = {};
  const hooks = [];
  let hookIndex = 0;
  let effect;
  let timer;
  let resolveProfile;
  let token = 'example.signature';
  const profile = new Promise((resolve) => { resolveProfile = resolve; });
  const react = {
    createContext: () => ({ Provider: 'Provider' }),
    useContext: () => null,
    useCallback: (callback) => callback,
    useMemo: (callback) => callback(),
    useEffect: (callback) => { effect = callback; },
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
  };
  class ApiError extends Error {}
  const api = async (action) => {
    if (action === 'profile/get') return profile;
    if (action === 'catalog/products') return { items: [] };
    if (action === 'cart/get') return { note: null, items: [] };
    return [];
  };
  const modules = {
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }) },
    react,
    '@/lib/api': { api, ApiError, mediaUrl: (url) => url, setToken: async (value) => { token = value; } },
    '@/lib/session': {
      isRejectedToken: () => false,
      restoreSession: async (loadAccount, loadPublic) => {
        if (token) await loadAccount();
        await loadPublic();
        return { sessionError: null, error: null, invalidSession: false, needsVendorOnboarding: false };
      },
    },
  };
  vm.runInNewContext(javascript, {
    exports,
    require: (name) => {
      if (!(name in modules)) throw new Error(`Unexpected module: ${name}`);
      return modules[name];
    },
    setTimeout: (callback) => { timer = callback; return 1; },
    clearTimeout: () => {},
  });
  return {
    render() { hookIndex = 0; return exports.AppStoreProvider({ children: null }).props.value; },
    start() { effect(); timer(); },
    resolveProfile,
    token: () => token,
  };
}

test('a late profile response cannot sign the user back in after sign-out', async () => {
  const store = createStore();
  store.render();
  store.start();
  await new Promise(setImmediate);
  await store.render().signOut();
  assert.equal(store.token(), null);
  store.resolveProfile({ id: 1, role: 'buyer', full_name: 'Test', phone: '123', email: null });
  await new Promise(setImmediate);
  const state = store.render();
  assert.equal(state.user, null);
  assert.equal(state.ready, true);
  assert.equal(state.loading, false);
});
