const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../src/lib/orders.ts'), 'utf8');
const javascript = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const orders = {};
vm.runInNewContext(javascript, { exports: orders });

test('vendor status transitions follow the backend order sequence', () => {
  for (const [current, next] of Object.entries({ new: 'confirmed', confirmed: 'preparing', preparing: 'ready', ready: 'out_for_delivery', out_for_delivery: 'delivered' })) {
    assert.equal(orders.nextVendorOrderStatus(current), next);
  }
});

test('terminal and unknown statuses cannot be advanced', () => {
  for (const status of ['delivered', 'cancelled', 'declined', 'unknown', 'toString', 'constructor']) {
    assert.equal(orders.nextVendorOrderStatus(status), undefined);
  }
});
