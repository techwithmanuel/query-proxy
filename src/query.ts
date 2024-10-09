import { serverFns } from "./fn";

// Type for the server function names (keys of the Map)
type ServerFnName = keyof typeof serverFns extends string ? string : never;

// Type for the return type of the server functions
type ServerFnReturnType<T extends ServerFnName> = ReturnType<
  (typeof serverFns)["get"]
> extends Promise<infer R>
  ? R
  : never;

// HTTP method type
type HttpMethod =
  | "GET"
  | "POST"
  | "PATCH"
  | "DELETE"
  | "PUT"
  | "OPTIONS"
  | "HEAD";

interface FetchOptions extends Omit<RequestInit, "method" | "body"> {}

// To ensure only one of `data` or `formData` is used
type BodyOptions = {
  data?: Record<string, unknown>;
  formData?: FormData;
};

// Ensure `data` and `formData` cannot be used together
type ExclusiveBodyOptions =
  | (BodyOptions & { data?: never; formData?: FormData })
  | (BodyOptions & { data?: Record<string, unknown>; formData?: never });

type RequestInterceptor = (
  options: FetchOptions & { headers?: Record<string, string> }
) => FetchOptions;

class Query {
  private baseUrl: string;

  constructor(baseUrl: string = "/api/serverFn") {
    this.baseUrl = baseUrl;
  }

  // Helper function to execute fetch
  protected async fetchFromServer<T extends ServerFnName>(
    fnName: T,
    method: HttpMethod,
    options?: FetchOptions & ExclusiveBodyOptions
  ): Promise<ServerFnReturnType<T>> {
    const url = `${this.baseUrl}/${String(fnName)}`; // Convert fnName to string explicitly to avoid symbol issues

    // Merge method with fetch options
    const fetchOptions: FetchOptions & { body?: BodyInit; method: HttpMethod } =
      {
        ...options,
        method, // Explicitly specify method
      };

    // Add body for non-GET/HEAD methods
    if (method !== "GET" && method !== "HEAD") {
      if (options?.data) {
        fetchOptions.body = JSON.stringify({ ...options.data });
        fetchOptions.headers = {
          ...fetchOptions.headers,
          "Content-Type": "application/json",
        };
      } else if (options?.formData) {
        fetchOptions.body = options.formData;
      }
    }

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }

    return (await response.json()) as ServerFnReturnType<T>;
  }

  // HTTP methods
  get<T extends ServerFnName>(fnName: T, options?: FetchOptions) {
    return this.fetchFromServer(fnName, "GET", options);
  }

  post<T extends ServerFnName>(
    fnName: T,
    options?: FetchOptions & ExclusiveBodyOptions
  ) {
    return this.fetchFromServer(fnName, "POST", options);
  }

  patch<T extends ServerFnName>(
    fnName: T,
    options?: FetchOptions & ExclusiveBodyOptions
  ) {
    return this.fetchFromServer(fnName, "PATCH", options);
  }

  delete<T extends ServerFnName>(
    fnName: T,
    options?: FetchOptions & ExclusiveBodyOptions
  ) {
    return this.fetchFromServer(fnName, "DELETE", options);
  }

  put<T extends ServerFnName>(
    fnName: T,
    options?: FetchOptions & ExclusiveBodyOptions
  ) {
    return this.fetchFromServer(fnName, "PUT", options);
  }

  read<T extends ServerFnName>(fnName: T, options?: FetchOptions) {
    return this.fetchFromServer(fnName, "GET", options);
  }

  update<T extends ServerFnName>(
    fnName: T,
    options?: FetchOptions & ExclusiveBodyOptions
  ) {
    return this.fetchFromServer(fnName, "PATCH", options);
  }

  options<T extends ServerFnName>(fnName: T, options?: FetchOptions) {
    return this.fetchFromServer(fnName, "OPTIONS", options);
  }

  head<T extends ServerFnName>(fnName: T, options?: FetchOptions) {
    return this.fetchFromServer(fnName, "HEAD", options);
  }
}

class QueryInstance extends Query {
  private requestInterceptors: RequestInterceptor[] = [];

  addRequestInterceptor(interceptor: RequestInterceptor) {
    this.requestInterceptors.push(interceptor);
  }

  // Override fetchFromServer to apply request interceptors
  protected async fetchFromServer<T extends ServerFnName>(
    fnName: T,
    method: HttpMethod,
    options?: FetchOptions & ExclusiveBodyOptions
  ): Promise<ServerFnReturnType<T>> {
    let modifiedOptions = { ...options };

    // Apply each interceptor to modify the request
    for (const interceptor of this.requestInterceptors) {
      modifiedOptions = interceptor(modifiedOptions);
    }

    return super.fetchFromServer(fnName, method, modifiedOptions);
  }
}

export { Query, QueryInstance };
