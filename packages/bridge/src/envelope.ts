export type Envelope = {id: string; method: string; params?: unknown};

export type RpcErrorShape = {name: string; message: string; code?: string};

export type Reply =
  | {id: string; ok: true; result: unknown}
  | {id: string; ok: false; error: RpcErrorShape};

let counter = 0;
export function nextId(): string {
  counter += 1;
  return `${Date.now().toString(36)}-${counter.toString(36)}`;
}
