import {Envelope, Reply, nextId} from './envelope';
import {RpcError, fromShape} from './errors';

type Pending = {resolve: (v: any) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout>};

export function createRpcClient(send: (e: Envelope) => void, opts: {timeoutMs?: number} = {}) {
  const defaultTimeout = opts.timeoutMs ?? 30_000;
  const pending = new Map<string, Pending>();

  function settle(id: string): Pending | undefined {
    const p = pending.get(id);
    if (p) { clearTimeout(p.timer); pending.delete(id); }
    return p;
  }

  return {
    call<T>(method: string, params?: unknown, timeoutMs = defaultTimeout): Promise<T> {
      const id = nextId();
      return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new RpcError(`${method} timed out after ${timeoutMs}ms`, 'BRIDGE_TIMEOUT'));
        }, timeoutMs);
        pending.set(id, {resolve, reject, timer});
        try {
          send({id, method, params});
        } catch (e) {
          settle(id);
          reject(e as Error);
        }
      });
    },
    handleReply(reply: Reply) {
      const p = settle(reply.id);
      if (!p) return; // late or duplicate reply
      if (reply.ok) p.resolve(reply.result);
      else p.reject(fromShape(reply.error));
    },
    rejectAll(reason: Error) {
      for (const id of Array.from(pending.keys())) settle(id)?.reject(reason);
    }
  };
}
