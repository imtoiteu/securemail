import {Envelope, Reply} from './envelope';
import {RpcError, toShape} from './errors';

export type Handlers = Record<string, (params: any) => Promise<unknown>>;

export function createRpcServer(initial: Handlers, send: (r: Reply) => void) {
  let handlers = initial;
  return {
    /** The WebView transport registers real handlers only after core.init. */
    replaceHandlers(next: Handlers) { handlers = next; },
    async handle(env: Envelope): Promise<void> {
      const handler = handlers[env.method];
      if (!handler) {
        send({id: env.id, ok: false,
          error: toShape(new RpcError(`unknown method: ${env.method}`, 'UNKNOWN_METHOD'))});
        return;
      }
      try {
        const result = await handler(env.params ?? {});
        send({id: env.id, ok: true, result: result ?? null});
      } catch (err) {
        send({id: env.id, ok: false, error: toShape(err)});
      }
    }
  };
}
