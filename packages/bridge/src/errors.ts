import type {RpcErrorShape} from './envelope';

export class RpcError extends Error {
  code?: string;
  constructor(message: string, code?: string, name = 'RpcError') {
    super(message);
    this.name = name;
    this.code = code;
  }
}

export function toShape(err: unknown): RpcErrorShape {
  const e = err as {name?: string; message?: string; code?: string};
  return {
    name: e?.name ?? 'Error',
    message: e?.message ?? String(err),
    code: e?.code
  };
}

export function fromShape(shape: RpcErrorShape): RpcError {
  return new RpcError(shape.message, shape.code, shape.name);
}
