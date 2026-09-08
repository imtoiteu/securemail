import React, {createContext, useCallback, useContext, useMemo, useRef, useState} from 'react';
import {View} from 'react-native';
import {WebView} from 'react-native-webview';
import type {Handlers} from '@securemail/bridge';
import {CoreClient} from './CoreClient';

export type PassphraseRequest = {
  keyId: string; userId: string; reason: string; cache: boolean; wrongPassword: boolean;
};

type Ctx = {
  client: CoreClient;
  ready: boolean;
  error: Error | null;
};

const CoreContext = createContext<Ctx | null>(null);

/**
 * Hosts the crypto core in an off-screen WebView.
 *
 * The WebView is 0x0 and non-interactive: it renders nothing, it exists only to
 * give openpgp.js a Chromium runtime with real WebCrypto. Its HTML ships with
 * the app as an asset and carries connect-src 'none', so it cannot reach the
 * network in Phase 1.
 */
export function CoreProvider({
  children, storageHandlers, onPassphraseRequest, manifest, messages
}: {
  children: React.ReactNode;
  storageHandlers: Handlers;
  onPassphraseRequest: (req: PassphraseRequest) => Promise<{password: string; cache: boolean}>;
  manifest: {version: string};
  messages: Record<string, {message: string}>;
}) {
  const client = useMemo(() => new CoreClient(), []);
  const webRef = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const onLoadEnd = useCallback(async () => {
    client.attach(webRef.current as unknown as {injectJavaScript: (js: string) => void});
    client.setHandlers({
      ...storageHandlers,
      'pwd.request': onPassphraseRequest as Handlers[string],
      'log.uiLog': async () => null
    });
    try {
      const probe = await client.call<{ok: boolean; missing: string[]}>('core.probe');
      if (!probe.ok) {
        throw new Error(`This device's WebView is missing: ${probe.missing.join(', ')}`);
      }
      await client.call('core.init', {manifest, messages});
      setReady(true);
    } catch (e) {
      setError(e as Error);
    }
  }, [client, storageHandlers, onPassphraseRequest, manifest, messages]);

  const onGone = useCallback(() => {
    client.onCrash();
    setReady(false);
  }, [client]);

  return (
    <CoreContext.Provider value={{client, ready, error}}>
      <View style={{width: 0, height: 0, opacity: 0}} pointerEvents="none">
        <WebView
          ref={webRef}
          source={require('../../assets/core/core.html')}
          originWhitelist={['file://']}
          javaScriptEnabled
          allowFileAccess
          allowFileAccessFromFileURLs
          onLoadEnd={() => void onLoadEnd()}
          onMessage={e => void client.onMessage(e)}
          onRenderProcessGone={onGone}
          onContentProcessDidTerminate={onGone}
        />
      </View>
      {children}
    </CoreContext.Provider>
  );
}

export function useCore(): Ctx {
  const ctx = useContext(CoreContext);
  if (!ctx) throw new Error('useCore must be used inside CoreProvider');
  return ctx;
}
