export type KuyoConfig = {
  apiKey: string;
  environment: KuyoEnvironment;
  debug: boolean;
  vercel: VercelConfig;
  adapter: KuyoAdapters;
  plugins: KuyoPlugin[];
};

export type KuyoPlugin = "performance" | "breadcrumbs";

export type KuyoEnvironment = "development" | "production";

export type KuyoAdapters = "nextjs";

export type VercelConfig = {
  env?: string;
  publicVercelURL?: string;
  productionURL?: string;
  gitProvider?: string;
  commitRef?: string;
  commitSha?: string;
  commitMessage?: string;
  commitAuthor?: string;
};

export type KuyoError = {
  id: string;
  timestamp: number;
  message: string;
  stack?: string;
  level: "error" | "warning" | "info";
  platform: KuyoPlatform;
  context: Record<string, any>;
  extra?: Record<string, any>;
  session: KuyoSession;
};

export type KuyoSession = {
  id: string;
  environment: KuyoEnvironment;
  startedAt: number;
  endedAt: number;
  duration: number;
  userAgent: string;
  ipAddress: string;
};

export type KuyoPlatform =
  | "nextjs"
  | "vue"
  | "react"
  | "node"
  | "browser"
  | "svelte";

export interface KuyoTransport {
  send(event: KuyoError): Promise<void>;
}

export interface KuyoAdapter {
  readonly name: string;
  setup(): void;
  teardown?(): void;
  getContext(): Record<string, any>;
  captureException(error: Error, extra?: Record<string, any>): void;
  captureMessage(
    message: string,
    level?: KuyoError["level"],
    extra?: Record<string, any>
  ): void;
}

export type ReactComponentType<P = any> = {
  (props: P): any;
  displayName?: string;
  name?: string;
};

export interface ReactKuyoAdapter extends KuyoAdapter {
  wrapApp<T extends ReactComponentType>(AppComponent: T): T;
  wrapPage<T extends ReactComponentType>(PageComponent: T): T;
}

export interface APIKuyoAdapter extends KuyoAdapter {
  wrapApiRoute<T extends (...args: any[]) => any>(handler: T): T;
}

export interface NextJSKuyoAdapter extends ReactKuyoAdapter, APIKuyoAdapter {
  // Performance monitoring methods
  trackWebVitals?(): void;
  trackPageTransitions?(): void;
  measurePageLoad?(): void;
  measureCustomMetric?(
    name: string,
    value: number,
    extra?: Record<string, any>
  ): void;
}
