import {createRpcClient, createRpcServer, RpcError, Envelope, Reply} from '../src';

function loopback(handlers: Record<string, (p: any) => Promise<unknown>>) {
  let client: ReturnType<typeof createRpcClient>;
  const server = createRpcServer(handlers, (reply: Reply) => client.handleReply(reply));
  client = createRpcClient((env: Envelope) => { void server.handle(env); });
  return client;
}

test('resolves a successful call', async () => {
  const c = loopback({'crypto.echo': async (p: any) => ({echoed: p.v})});
  await expect(c.call('crypto.echo', {v: 7})).resolves.toEqual({echoed: 7});
});

test('rejects with the handler error name and code', async () => {
  const c = loopback({'keyring.boom': async () => {
    const e: any = new Error('no private key'); e.name = 'MvError'; e.code = 'NO_PRIVATE_KEY_FOUND';
    throw e;
  }});
  await expect(c.call('keyring.boom')).rejects.toMatchObject({
    name: 'MvError', message: 'no private key', code: 'NO_PRIVATE_KEY_FOUND'
  });
});

test('rejects unknown methods rather than hanging', async () => {
  const c = loopback({});
  await expect(c.call('nope.missing')).rejects.toMatchObject({code: 'UNKNOWN_METHOD'});
});

test('times out and stops tracking the call', async () => {
  const c = createRpcClient(() => {}, {timeoutMs: 20});
  await expect(c.call('crypto.slow')).rejects.toMatchObject({code: 'BRIDGE_TIMEOUT'});
});

test('rejectAll fails every call in flight', async () => {
  const c = createRpcClient(() => {}, {timeoutMs: 5000});
  const p = c.call('crypto.slow');
  c.rejectAll(new RpcError('core host crashed', 'CORE_CRASHED'));
  await expect(p).rejects.toMatchObject({code: 'CORE_CRASHED'});
});

test('concurrent calls correlate to the right replies', async () => {
  const c = loopback({'app.id': async (p: any) =>
    new Promise(res => setTimeout(() => res(p.n), p.n === 1 ? 30 : 1))});
  const [a, b] = await Promise.all([c.call('app.id', {n: 1}), c.call('app.id', {n: 2})]);
  expect([a, b]).toEqual([1, 2]);
});

test('replaceHandlers swaps the handler table', async () => {
  let client: any;
  const server = createRpcServer({}, r => client.handleReply(r));
  client = createRpcClient(e => { void server.handle(e); });
  await expect(client.call('late.method')).rejects.toMatchObject({code: 'UNKNOWN_METHOD'});
  server.replaceHandlers({'late.method': async () => 'ready'});
  await expect(client.call('late.method')).resolves.toBe('ready');
});
