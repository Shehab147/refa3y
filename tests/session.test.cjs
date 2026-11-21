const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

class ApiError extends Error {
  constructor(message, status, errors) { super(message); this.status = status; this.errors = errors; }
}

function createSession({ token = 'example.signature', readError = null } = {}) {
  const source = fs.readFileSync(path.join(__dirname, '../src/lib/session.ts'), 'utf8');
  const javascript = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  const writes = [];
  vm.runInNewContext(javascript, {
    exports,
    require: (name) => {
      if (name === '@/lib/api') return {
        ApiError,
        getToken: async () => { if (readError) throw readError; return token; },
        setToken: async (value) => { writes.push(value); token = value; },
      };
      throw new Error(`Unexpected module: ${name}`);
    },
  });
  return { ...exports, writes };
}

test('a saved session restores even if public marketplace loading fails', async () => {
  const { restoreSession, writes } = createSession();
  let restored = false;
  const result = await restoreSession(async () => { restored = true; }, async () => { throw new ApiError('Catalog unavailable.', 503); });
  assert.equal(restored, true);
  assert.equal(result.sessionError, null);
  assert.equal(result.error, 'Catalog unavailable.');
  assert.equal(writes.length, 0);
});

test('offline and missing-header errors preserve the saved token for retry', async () => {
  for (const error of [new ApiError('Could not reach the server.', 0), new ApiError('Authentication is required.', 401), new ApiError('Authentication is required.', 401, { authorization: 'missing_or_malformed' })]) {
    const { restoreSession, writes } = createSession();
    const result = await restoreSession(async () => { throw error; }, async () => {});
    assert.equal(result.sessionError, error.message);
    assert.equal(writes.length, 0);
    assert.equal(result.invalidSession, false);
  }
});

test('explicitly expired or invalid tokens are cleared', async () => {
  for (const error of [new ApiError('Authentication token has expired.', 401), new ApiError('Invalid authentication token.', 401), new ApiError('Session ended.', 401, { authorization: 'expired_token' })]) {
    const { restoreSession, writes } = createSession();
    const result = await restoreSession(async () => { throw error; }, async () => {});
    assert.equal(result.invalidSession, true);
    assert.equal(result.sessionError, null);
    assert.deepEqual(writes, [null]);
  }
});

test('a stale restoration cannot clear a newer session', async () => {
  const { restoreSession, writes } = createSession();
  const result = await restoreSession(async () => { throw new ApiError('Invalid authentication token.', 401); }, async () => {}, () => false);
  assert.equal(result.invalidSession, false);
  assert.equal(writes.length, 0);
});

test('vendor without a farm is returned to onboarding', async () => {
  const { restoreSession, writes } = createSession();
  const result = await restoreSession(async () => { throw new ApiError('No farm is associated with this account.', 403); }, async () => {});
  assert.equal(result.needsVendorOnboarding, true);
  assert.equal(result.sessionError, null);
  assert.equal(writes.length, 0);
});

test('no saved session skips account loading and storage errors are visible', async () => {
  const absent = createSession({ token: null });
  let called = false;
  const result = await absent.restoreSession(async () => { called = true; }, async () => {});
  assert.equal(called, false);
  assert.equal(result.sessionError, null);
  const unavailable = createSession({ readError: new Error('Storage unavailable') });
  const failed = await unavailable.restoreSession(async () => {}, async () => {});
  assert.equal(failed.sessionError, 'Unable to restore your saved session.');
});
