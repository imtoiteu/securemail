import {CoreClient} from '../src/core/CoreClient';

function fakeWebView() {
  const injected: string[] = [];
  return {injected, injectJavaScript: (js: string) => { injected.push(js); }};
}

function lastCall(wv: {injected: string[]}, fn: 'handle' | 'reply') {
  const js = [...wv.injected].reverse().find(s => s.includes(`SecureMailCore.${fn}(`))!;
  return JSON.parse(js.slice(js.indexOf('(') + 1, js.lastIndexOf(')')));
}

test('call posts an envelope into the WebView and resolves on reply', async () => {
  const wv = fakeWebView();
  const client = new CoreClient();
  client.attach(wv as any);

  const promise = client.call('app.getVersion');
  const env = lastCall(wv, 'handle');
  expect(env.method).toBe('app.getVersion');

  await client.onMessage({nativeEvent: {data: JSON.stringify(
    {id: env.id, ok: true, result: {version: '0.1.0'}})}} as any);
  await expect(promise).resolves.toEqual({version: '0.1.0'});
});

test('core-to-app requests are dispatched to registered handlers', async () => {
  const wv = fakeWebView();
  const client = new CoreClient();
  client.attach(wv as any);
  const seen: any[] = [];
  client.setHandlers({'storage.get': async (p: any) => { seen.push(p); return {value: 'stored'}; }});

  await client.onMessage({nativeEvent: {data: JSON.stringify(
    {id: 'r1', method: 'storage.get', params: {id: 'k'}})}} as any);
  expect(seen).toEqual([{id: 'k'}]);
  expect(lastCall(wv, 'reply')).toMatchObject({id: 'r1', ok: true, result: {value: 'stored'}});
});

test('a failing app-side handler replies with an error, not a hang', async () => {
  const wv = fakeWebView();
  const client = new CoreClient();
  client.attach(wv as any);
  client.setHandlers({'storage.set': async () => { throw new Error('ENOSPC'); }});

  await client.onMessage({nativeEvent: {data: JSON.stringify(
    {id: 'r2', method: 'storage.set', params: {}})}} as any);
  expect(lastCall(wv, 'reply')).toMatchObject({id: 'r2', ok: false, error: {message: 'ENOSPC'}});
});

test('onCrash rejects everything in flight with CORE_CRASHED', async () => {
  const client = new CoreClient();
  client.attach(fakeWebView() as any);
  const p = client.call('crypto.decryptMessage', {armored: 'x'});
  client.onCrash();
  await expect(p).rejects.toMatchObject({code: 'CORE_CRASHED'});
});

test('calling before attach fails fast rather than silently queueing', async () => {
  const client = new CoreClient();
  await expect(client.call('app.getVersion')).rejects.toMatchObject({code: 'CORE_NOT_READY'});
});

test('malformed messages from the WebView are ignored, not thrown', async () => {
  const client = new CoreClient();
  client.attach(fakeWebView() as any);
  await expect(client.onMessage({nativeEvent: {data: 'not json'}} as any)).resolves.toBeUndefined();
});

test('payloads with quotes and newlines survive injection intact', async () => {
  const wv = fakeWebView();
  const client = new CoreClient();
  client.attach(wv as any);
  const nasty = `-----BEGIN PGP MESSAGE-----\n"quoted" \\ back slash\n`;
  client.call('crypto.decryptMessage', {armored: nasty});
  expect(lastCall(wv, 'handle').params.armored).toBe(nasty);
});
