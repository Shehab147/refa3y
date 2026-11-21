const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

function createClient({ platform = 'ios', status = 200, rawBody, storage } = {}) {
  const source = fs.readFileSync(path.join(__dirname, '../src/lib/api.ts'), 'utf8');
  const javascript = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  const requests = [];
  const warnings = [];
  const errors = [];
  const fetchMock = async (url, options) => {
    requests.push({ url, options });
    return {
      ok: status < 400,
      status,
      headers: { get: () => 'application/json' },
      text: async () => rawBody ?? JSON.stringify({ status, message: status === 401 ? 'Authentication is required.' : 'OK', data: null }),
    };
  };
  let storedToken = null;
  const secureStore = storage ?? {
    getItemAsync: async () => storedToken,
    setItemAsync: async (_key, value) => { storedToken = value; },
    deleteItemAsync: async () => { storedToken = null; },
  };
  vm.runInNewContext(javascript, {
    exports,
    require: (name) => {
      if (name === 'expo-secure-store') return secureStore;
      if (name === 'expo/fetch') return { fetch: fetchMock };
      if (name === 'react-native') return { Platform: { OS: platform } };
      throw new Error(`Unexpected module: ${name}`);
    },
    process: { env: {} },
    URLSearchParams,
    __DEV__: true,
    console: { warn: (...args) => warnings.push(args), error: (...args) => errors.push(args) },
    fetch: fetchMock,
  });

  return { client: exports, requests, warnings, errors };
}

for (const platform of ['ios', 'android']) {
  test(`${platform} session survives a client restart and is removed by sign-out`, async () => {
    let token = null;
    const storage = {
      getItemAsync: async () => token,
      setItemAsync: async (_key, value) => { token = value; },
      deleteItemAsync: async () => { token = null; },
    };
    const first = createClient({ platform, storage }).client;
    await first.setToken('example.signature');
    const reopened = createClient({ platform, storage }).client;
    assert.equal(await reopened.getToken(), 'example.signature');
    await reopened.setToken(null);
    assert.equal(await createClient({ platform, storage }).client.getToken(), null);
  });
}

test('secure-storage writes run in order even when an earlier write is delayed', async () => {
  let token = null;
  let release;
  const waiting = new Promise((resolve) => { release = resolve; });
  const storage = {
    getItemAsync: async () => token,
    setItemAsync: async (_key, value) => { await waiting; token = value; },
    deleteItemAsync: async () => { token = null; },
  };
  const { client } = createClient({ storage });
  const login = client.setToken('example.signature');
  const logout = client.setToken(null);
  release();
  await Promise.all([login, logout]);
  assert.equal(await client.getToken(), null);
});

test('multipart requests preserve the form and bearer token without setting a content type', async () => {
  const { client, requests } = createClient();
  await client.setToken('example.signature');
  const form = { selectedFile: true };
  await client.api('documents/upload', { method: 'POST', form });
  assert.equal(requests[0].options.body, form);
  assert.equal(requests[0].options.headers.Authorization, 'Bearer example.signature');
  assert.equal(requests[0].options.headers['Content-Type'], undefined);
});

test('local product image URLs resolve against the API, while external URLs remain unchanged', () => {
  const { client } = createClient();
  assert.equal(client.mediaUrl('?action=media%2Fproduct&key=abc'), 'https://refa3y.cc/api/proc.php?action=media%2Fproduct&key=abc');
  assert.equal(client.mediaUrl('https://cdn.example/image.jpg'), 'https://cdn.example/image.jpg');
});

test('authenticated requests send the saved bearer token', async () => {
  const { client, requests } = createClient();
  await client.setToken('example.signature');
  await client.api('orders/list');
  assert.equal(requests[0].options.headers.Authorization, 'Bearer example.signature');
});

test('unauthenticated requests do not send a saved token', async () => {
  const { client, requests } = createClient();
  await client.setToken('example.signature');
  await client.api('auth/login', { method: 'POST', authenticated: false });
  assert.equal(requests[0].options.headers.Authorization, undefined);
});

test('401 diagnostics report token presence without logging its value', async () => {
  const { client, warnings } = createClient({ status: 401 });
  await client.setToken('example.signature');
  await assert.rejects(client.api('orders/list'), { status: 401 });
  assert.equal(warnings[0][1].authorizationSent, true);
  assert.equal(JSON.stringify(warnings).includes('example.signature'), false);
});

test('401 diagnostics distinguish a missing token', async () => {
  const { client, warnings } = createClient({ platform: 'web', status: 401 });
  await assert.rejects(client.api('orders/list'), { status: 401 });
  assert.equal(warnings[0][1].authorizationSent, false);
});

test('invalid responses do not log sensitive response bodies', async () => {
  const { client, errors } = createClient({ rawBody: 'bank account 1234567890' });
  await assert.rejects(client.api('payouts/account/save', { method: 'POST' }));
  assert.equal(JSON.stringify(errors).includes('1234567890'), false);
  assert.equal(errors[0][1].responseLength, 'bank account 1234567890'.length);
});
