console.log("Kuyo SDK loaded");
import { NextjsAdapter } from "./adapters/nextjs";
import { KuyoCore } from "./core";
import { KuyoAdapters, KuyoConfig, ReactComponentType } from "./types";

let globalCore: KuyoCore | null = null;

export function init(config: KuyoConfig) {
  globalCore = new KuyoCore(config);

  const adapter = getAdapter(config.adapter);

  globalCore.useAdapter(adapter);
}

function getAdapter(adapter: KuyoAdapters) {
  if (!globalCore) {
    throw new Error("Kuyo core not initialized");
  }

  switch (adapter) {
    case "nextjs":
      return new NextjsAdapter(globalCore);
    default:
      throw new Error(`Unsupported adapter: ${adapter}`);
  }
}

/**
 * Get the NextJS adapter instance
 */
function getNextJSAdapter(): NextjsAdapter | null {
  if (!globalCore) {
    console.warn("[Kuyo] SDK not initialized. Call init() first.");
    return null;
  }
  const adapter = globalCore.getAdapter();
  if (!adapter || adapter.name !== "nextjs") {
    console.warn(
      "[Kuyo] Next.js adapter not found. Make sure to call init() first."
    );
    return null;
  }
  return adapter as NextjsAdapter;
}

/**
 * Wrap a Next.js page component with error tracking
 */
export function withKuyoPage<T extends ReactComponentType>(
  PageComponent: T
): T {
  const adapter = getNextJSAdapter();
  if (!adapter) return PageComponent;
  return adapter.wrapPage(PageComponent) as T;
}

/**
 * Wrap a Next.js API route handler with error tracking
 */
export function withKuyoAPI<T extends (...args: any[]) => any>(handler: T): T {
  const adapter = getNextJSAdapter();
  if (!adapter) return handler;
  return adapter.wrapApiRoute(handler);
}

/**
 * Wrap a Next.js app component with error tracking
 */
export function withKuyo<T extends ReactComponentType>(AppComponent: T): T {
  const adapter = getNextJSAdapter();
  if (!adapter) return AppComponent;
  return adapter.wrapApp(AppComponent) as T;
}
