import { KuyoCore } from "../core";
import { NextJSKuyoAdapter, ReactComponentType } from "../types";

export class NextjsAdapter implements NextJSKuyoAdapter {
  public name = "nextjs";
  private core: KuyoCore;
  private originalErrorHandler: OnErrorEventHandler | null = null;
  private originalRejectionHandler:
    | ((event: PromiseRejectionEvent) => void)
    | null = null;
  private isWrapped = false;
  private currentPage: string = "";

  constructor(core: KuyoCore) {
    this.core = core;
  }

  /**
   * Setup the adapter.
   * If the adapter is running in the browser, it will setup the browser handlers.
   * If the adapter is running in the server, it will setup the server handlers.
   */
  public setup(): void {
    if (typeof window !== "undefined") {
      this.log("NextjsAdapter setup (browser)");
      this.setupBrowserHandlers();
      this.setupNextJSBrowserPerformance();
    } else {
      this.log("NextjsAdapter setup (server)");
      this.setupNodeHandlers();
      this.setupNextJSServerPerformance();
    }
  }

  public captureException(error: Error, extra?: Record<string, any>): void {
    this.core.captureException(error, {
      ...extra,
      adapter: this.name,
    });
  }

  public captureMessage(
    message: string,
    level: "error" | "warning" | "info" = "info",
    extra?: Record<string, any>
  ): void {
    this.core.captureMessage(message, level, {
      ...extra,
      adapter: this.name,
    });
  }

  public getContext(): Record<string, any> {
    const context: Record<string, any> = {
      runtime: typeof window !== "undefined" ? "browser" : "node",
    };

    if (typeof window !== "undefined") {
      // Browser context
      context.browser = {
        url: window.location.href,
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
      };

      // Next.js specific browser context
      const nextData = (window as any).__NEXT_DATA__;
      if (nextData) {
        context.nextjs = {
          buildId: nextData.buildId,
          page: nextData.page,
          router: nextData.page ? "pages" : "app",
          dev: nextData.dev,
        };
      }

      // Vercel context (client-side env vars)
      context.vercel = {
        env: process.env.NEXT_PUBLIC_VERCEL_ENV,
        region: process.env.NEXT_PUBLIC_VERCEL_REGION,
        deploymentId: process.env.NEXT_PUBLIC_VERCEL_DEPLOYMENT_ID,
      };

      // Performance context
      if (performance && (performance as any).memory) {
        context.performance = {
          memory: {
            used: (performance as any).memory.usedJSHeapSize,
            total: (performance as any).memory.totalJSHeapSize,
            limit: (performance as any).memory.jsHeapSizeLimit,
          },
        };
      }
    } else {
      // Node.js context
      context.node = {
        version: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
      };

      // Next.js version detection
      try {
        const nextPackage = require("next/package.json");
        context.nextjs = {
          version: nextPackage.version,
          runtime: "node",
        };
      } catch {
        // Next.js not available
      }

      // Vercel context (server-side env vars)
      context.vercel = {
        env: process.env.VERCEL_ENV,
        region: process.env.VERCEL_REGION,
        deploymentId: process.env.VERCEL_DEPLOYMENT_ID,
        runtime: process.env.VERCEL_RUNTIME,
      };
    }

    return context;
  }

  /**
   * Wrap the app with the error boundary.
   * @param AppComponent - The app component.
   * @returns The wrapped app component.
   */
  public wrapApp<T extends ReactComponentType>(AppComponent: T): T {
    if (this.isWrapped) {
      this.log("App already wrapped, skipping");
      return AppComponent;
    }

    this.isWrapped = true;
    this.log("Wrapping Next.js app with error boundaries");

    // Create wrapper function that returns JSX
    const WrappedApp = (props: any) => {
      // Try to use React if available, otherwise return original component
      if (typeof window !== "undefined" && (window as any).React) {
        const React = (window as any).React;
        return React.createElement(
          KuyoErrorBoundary,
          { core: this.core },
          React.createElement(AppComponent, props)
        );
      }

      // Fallback: just return the original component
      return AppComponent(props);
    };

    // Preserve component name and static properties
    Object.defineProperty(WrappedApp, "name", {
      value: `withKuyo(${
        AppComponent.displayName || AppComponent.name || "App"
      })`,
    });

    // Copy static methods if any
    Object.assign(WrappedApp, AppComponent);

    return WrappedApp as T;
  }

  /**
   * Wrap Next.js pages to catch page-level errors
   */
  public wrapPage<T extends ReactComponentType>(PageComponent: T): T {
    const WrappedPage = (props: any) => {
      const startTime = performance.now();
      const performancePlugin = this.core.getPerformancePlugin();

      // Simple page wrapper without complex React dependencies
      try {
        const result = PageComponent(props);

        // Track page render performance
        if (performancePlugin) {
          const duration = performance.now() - startTime;
          console.log("[Kuyo:NextJS] Page render:", {
            page: PageComponent.name || "unknown",
            duration: Math.round(duration),
            timestamp: Date.now(),
          });
        }

        return result;
      } catch (error) {
        const duration = performance.now() - startTime;
        this.core.captureException(error as Error, {
          source: "page-component",
          page: PageComponent.name || "unknown",
          renderDuration: Math.round(duration),
        });
        throw error;
      }
    };

    Object.defineProperty(WrappedPage, "name", {
      value: `withKuyo(${
        PageComponent.displayName || PageComponent.name || "Page"
      })`,
    });

    // Copy static methods (getStaticProps, getServerSideProps, etc.)
    Object.assign(WrappedPage, PageComponent);

    return WrappedPage as T;
  }

  /**
   * Wrap API routes to catch server-side errors
   */
  public wrapApiRoute<T extends (...args: any[]) => any>(handler: T): T {
    const wrappedHandler = async (...args: any[]) => {
      const startTime = Date.now();
      const performancePlugin = this.core.getPerformancePlugin();
      const request = args[0];
      const response = args[1];

      try {
        const result = await handler(...args);

        // Track API route performance
        if (performancePlugin) {
          const duration = Date.now() - startTime;
          console.log("[Kuyo:NextJS] API route:", {
            route: request?.url || "unknown",
            method: request?.method || "unknown",
            duration: Math.round(duration),
            statusCode: response?.statusCode || 200,
            timestamp: Date.now(),
          });
        }

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        this.core.captureException(error as Error, {
          source: "api-route",
          route: request?.url || "unknown",
          method: request?.method || "unknown",
          duration: Math.round(duration),
        });
        throw error; // Re-throw to maintain original behavior
      }
    };

    Object.defineProperty(wrappedHandler, "name", {
      value: `withKuyo(${handler.name || "handler"})`,
    });

    return wrappedHandler as T;
  }

  /**
   * Setup the node handlers.
   */
  private setupNodeHandlers(): void {
    process.on("uncaughtException", this.handleNodeError.bind(this));
    process.on("unhandledRejection", this.handleNodeRejection.bind(this));

    this.log("Node.js error handlers setup");
  }

  /**
   * Handle the node error.
   * @param error - The error.
   */
  private handleNodeError(error: Error): void {
    this.core.captureException(error, {
      source: "uncaughtException",
      pid: process.pid,
    });
  }

  /**
   * Handle the node rejection.
   * @param reason - The reason.
   */
  private handleNodeRejection(reason: any): void {
    const error =
      reason instanceof Error
        ? reason
        : new Error(`Unhandled Promise Rejection: ${reason}`);

    this.core.captureException(error, {
      source: "unhandledRejection",
      pid: process.pid,
      reason,
    });
  }

  /**
   * Setup the browser handlers.
   */
  private setupBrowserHandlers(): void {
    this.originalErrorHandler = window.onerror;
    this.originalRejectionHandler = window.onunhandledrejection;

    window.addEventListener("error", this.handleError.bind(this));
    window.addEventListener(
      "unhandledrejection",
      this.handleRejection.bind(this)
    );

    this.log("Browser handlers setup");
  }

  /**
   * Handle the error event.
   * @param event - The error event.
   */
  private handleError(event: globalThis.ErrorEvent): void {
    this.log(`Error event captured: ${event.message}`);

    this.core.captureException(new Error(event.message), {
      source: "window.error",
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });

    // Call original handler if exists
    if (this.originalErrorHandler) {
      this.originalErrorHandler.call(
        window,
        event.message,
        event.filename,
        event.lineno,
        event.colno,
        event.error
      );
    }
  }

  /**
   * Handle the rejection event.
   * @param event - The rejection event.
   */
  private handleRejection(event: globalThis.PromiseRejectionEvent): void {
    const error =
      event.reason instanceof Error
        ? event.reason
        : new Error(`Unhandled Promise Rejection: ${event.reason}`);

    this.core.captureException(error, {
      source: "unhandledRejection",
      reason: event.reason,
    });

    // Call original handler if exists
    if (this.originalRejectionHandler) {
      this.originalRejectionHandler.call(window, event);
    }
  }

  /**
   * Setup NextJS-specific browser performance tracking
   */
  private setupNextJSBrowserPerformance(): void {
    const performancePlugin = this.core.getPerformancePlugin();
    if (!performancePlugin) return;

    // Track NextJS page transitions
    this.setupPageTransitionTracking();

    // Track NextJS-specific metrics
    this.trackNextJSBrowserMetrics();
  }

  /**
   * Setup NextJS-specific server performance tracking
   */
  private setupNextJSServerPerformance(): void {
    const performancePlugin = this.core.getPerformancePlugin();
    if (!performancePlugin) return;

    // Track server-side rendering performance
    this.trackNextJSServerMetrics();
  }

  /**
   * Setup page transition tracking for SPA
   */
  private setupPageTransitionTracking(): void {
    if (typeof window === "undefined") return;

    // Track route changes in NextJS
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = (...args) => {
      const startTime = performance.now();
      originalPushState.apply(history, args);

      setTimeout(() => {
        const duration = performance.now() - startTime;
        console.log("[Kuyo:NextJS] Page transition (pushState):", {
          duration: Math.round(duration),
          url: window.location.href,
          timestamp: Date.now(),
        });
      }, 0);
    };

    history.replaceState = (...args) => {
      const startTime = performance.now();
      originalReplaceState.apply(history, args);

      setTimeout(() => {
        const duration = performance.now() - startTime;
        console.log("[Kuyo:NextJS] Page transition (replaceState):", {
          duration: Math.round(duration),
          url: window.location.href,
          timestamp: Date.now(),
        });
      }, 0);
    };

    // Track popstate events
    window.addEventListener("popstate", () => {
      console.log("[Kuyo:NextJS] Page transition (popstate):", {
        url: window.location.href,
        timestamp: Date.now(),
      });
    });
  }

  /**
   * Track NextJS-specific browser metrics
   */
  private trackNextJSBrowserMetrics(): void {
    if (typeof window === "undefined") return;

    // Track NextJS build info
    const nextData = (window as any).__NEXT_DATA__;
    if (nextData) {
      console.log("[Kuyo:NextJS] Build info:", {
        buildId: nextData.buildId,
        page: nextData.page,
        router: nextData.page ? "pages" : "app",
        dev: nextData.dev,
        timestamp: Date.now(),
      });
    }

    // Track NextJS performance marks if available
    if (performance && performance.getEntriesByType) {
      const marks = performance.getEntriesByType("mark");
      marks.forEach((mark) => {
        if (mark.name.includes("nextjs") || mark.name.includes("next")) {
          console.log("[Kuyo:NextJS] Performance mark:", {
            name: mark.name,
            startTime: mark.startTime,
            timestamp: Date.now(),
          });
        }
      });
    }
  }

  /**
   * Track NextJS-specific server metrics
   */
  private trackNextJSServerMetrics(): void {
    // Track NextJS version and server info
    try {
      const nextPackage = require("next/package.json");
      console.log("[Kuyo:NextJS] Server info:", {
        version: nextPackage.version,
        runtime: "node",
        timestamp: Date.now(),
      });
    } catch {
      // Next.js not available
    }
  }

  /**
   * Log a message.
   * @param message - The message to log.
   */
  private log(message: string): void {
    const config = this.core.getConfig();
    if (config.debug) {
      console.log(`[Kuyo:NextJS] ${message}`);
    }
  }
}

/**
 * The error boundary component.
 * @param props - The props.
 * @returns The error boundary component.
 */
function KuyoErrorBoundary(props: { core: KuyoCore; children: any }) {
  // This will be created using React.createElement when React is available
  // The actual error boundary logic is handled by React itself
  return props.children;
}
