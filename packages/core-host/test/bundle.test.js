const path = require('path');
const {createCore} = require(path.join(__dirname, '..', 'dist', 'core.node.cjs'));

function memoryStorage() {
  const m = new Map();
  return {
    get: async id => m.get(id),
    set: async (id, obj) => void m.set(id, obj),
    remove: async id => void m.delete(id)
  };
}

const boot = () => createCore({
  storage: memoryStorage(),
  requestPassphrase: async () => { throw new Error('not expected'); },
  manifest: {version: '0.1.0'},
  messages: {}
});

test('the bundled core boots and reports its version', async () => {
  const core = await boot();
  const v = await core.call('app.getVersion', {});
  expect(v).toHaveProperty('version');
});

test('the bundled core reaches the real desktop keyring module', async () => {
  const core = await boot();
  const keys = await core.call('keyring.getKeyData', {});
  expect(Array.isArray(keys)).toBe(true);
  expect(keys).toHaveLength(0);
});

test('unknown methods are rejected by the registry', async () => {
  const core = await boot();
  await expect(core.call('nope.missing', {})).rejects.toThrow(/unknown method/i);
});

test('gpgme is inert — no native messaging is attempted', () => {
  const {gpgme} = require(path.join(__dirname, '..', 'dist', 'core.node.cjs'));
  expect(gpgme).toBeNull();
});
