import { Response, Request } from "express";

export const serverFns = new Map<
  string,
  (req?: Request, res?: Response) => Promise<any>
>();

export function createServerFn<T extends string, U>(
  fnName: T,
  fn: (req?: Request, res?: Response) => Promise<U>
): (req?: Request, res?: Response) => Promise<U> {
  if (typeof window === "undefined") {
    serverFns.set(fnName, fn);
  }
  return fn;
}

export function getServerFn(
  fnName: string
): ((req?: Request, res?: Response) => Promise<any>) | undefined {
  return serverFns.get(fnName);
}
