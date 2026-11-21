const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

test('buyer stack only registers routes that exist', () => {
  const root = path.join(__dirname, '../src/app/(buyer)');
  const layout = fs.readFileSync(path.join(root, '_layout.tsx'), 'utf8');
  const names = [...layout.matchAll(/<Stack\.Screen name="([^"]+)"/g)].map((match) => match[1]);
  assert.ok(names.length > 0);
  for (const name of names) {
    const route = path.join(root, name);
    assert.ok(
      fs.existsSync(`${route}.tsx`) || fs.existsSync(path.join(route, '_layout.tsx')) || fs.existsSync(path.join(route, 'index.tsx')),
      `Missing route: ${name}`,
    );
  }
});
