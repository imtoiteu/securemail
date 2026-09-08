import {
  createRpcClient, createRpcServer, RpcError,
  type Envelope, type Reply, type Handlers
} from '@securemail/bridge';

type WebViewLike = {injectJavaScript: (js: string) => void};

/**
 * Native side of the bridge to the hidden WebView that hosts the crypto core.
 *
 * Two directions share one channel: calls we make into the core (app -> core)
 * and requests the core makes of us, such as storage and passphrase prompts
 * (core -> app). A message carrying `method` is an inbound request; one
 * carrying `ok` is a reply to something we sent.
 */
export class CoreClient {
  private webView: WebViewLike | null = null;
  private rpc = createRpcClient(env => this.post(env), {timeoutMs: 120_000});
  private server = createRpcServer({}, reply => this.postReply(reply));

  attach(webView: WebViewLike) { this.webView = webView; }

  detach() { this.webView = null; }

  setHandlers(handlers: Handlers) { this.server.replaceHandlers(handlers); }

  call<T>(method: string, params?: unknown): Promise<T> {
    return this.rpc.call<T>(method, params);
  }

  /** The WebView process died or reloaded; nothing in flight can still land. */
  onCrash() {
    this.rpc.rejectAll(new RpcError('core host crashed or reloaded', 'CORE_CRASHED'));
  }

  async onMessage(event: {nativeEvent: {data: string}}): Promise<void> {
    let msg: unknown;
    try {
      msg = JSON.parse(event.nativeEvent.data);
    } catch {
      return; // never let a malformed frame take down the bridge
    }
    const m = msg as Partial<Envelope> & Partial<Reply>;
    if (typeof m?.method === 'string') {
      await this.server.handle(m as Envelope);
      return;
    }
    if (typeof m?.ok === 'boolean') this.rpc.handleReply(m as Reply);
  }

  private post(env: Envelope) {
    this.inject('handle', env);
  }

  private postReply(reply: Reply) {
    if (!this.webView) return; // core is gone; it cannot want the reply either
    this.inject('reply', reply);
  }

  private inject(fn: 'handle' | 'reply', payload: unknown) {
    if (!this.webView) {
      throw new RpcError('core host not attached', 'CORE_NOT_READY');
    }
    // JSON.stringify escapes quotes, backslashes and newlines, so armored PGP
    // blocks survive being embedded in an injected statement.
    this.webView.injectJavaScript(
      `window.SecureMailCore.${fn}(${JSON.stringify(payload)});true;`
    );
  }
}
