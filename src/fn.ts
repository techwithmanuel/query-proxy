export const serverFns = new Map<string, () => Promise<any>>();

export function createServerFn<T extends string, U>(
  fnName: T,
  fn: () => Promise<U>
): () => Promise<U> {
  if (typeof window === "undefined") {
    serverFns.set(fnName, fn);
  }

  return fn;
}

export function getServerFn(fnName: string): (() => Promise<any>) | undefined {
  return serverFns.get(fnName);
}
