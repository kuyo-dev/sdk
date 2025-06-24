export class KuyoPerformance {
  private name = "performance";
  private pageLoadStartTime: number | null = null;
  private isInitialized = false;
  private nodeMetricsInterval: NodeJS.Timeout | null = null;
  private startTime: number = Date.now();

  // Batch metrics collection
  private metricsBuffer: Map<string, any[]> = new Map();
  private batchInterval: NodeJS.Timeout | null = null;
  private sessionId: string | null = null;
  private core: any = null;

  constructor() {}

  private log(message: string, isError = false): void {
    if (this.core.config.debug) {
      const logMethod = isError ? console.error : console.log;
      logMethod(`[Kuyo:Performance] ${message}`);
    } else {
      console.log(`[Kuyo:Performance] ${message}`);
    }
  }

  /**
   * Initialize the performance plugin
   */
  public setup(core?: any): void {
    this.log("[Kuyo:Performance] Setting up performance plugin");
    if (this.isInitialized) {
      return;
    }

    this.core = core;
    this.sessionId = this.getSessionId();

    // Check if we're in browser or Node.js environment
    if (typeof window !== "undefined") {
      this.log("[Kuyo:Performance] Browser environment detected");
      this.trackBrowserEnv();
    } else {
      this.log("[Kuyo:Performance] Node.js environment detected");
      this.trackNodeEnv();
    }

    // Start batch sending
    this.startBatchSending();

    this.isInitialized = true;
  }

  /**
   * Get session ID from core or generate one
   */
  private getSessionId(): string {
    if (this.core?.session?.id) {
      return this.core.session.id;
    }

    // Fallback to generating a session ID
    return `kuyo_${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .substring(2)}`;
  }

  /**
   * Start batch sending every 5 minutes
   */
  private startBatchSending(): void {
    this.log("[Kuyo:Performance] Starting batch sending");
    // Send batches every 5 minutes
    this.batchInterval = setInterval(() => {
      this.log("[Kuyo:Performance] Flushing all metrics");
      this.flushAllMetrics();
    }, 5 * 60 * 1000); // 5 minutes

    // Also flush on page unload
    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", () => {
        this.flushAllMetrics();
      });
    }
  }

  /**
   * Add metric to buffer
   */
  private addMetric(metric: any): void {
    const platform = typeof window !== "undefined" ? "browser" : "nodejs";
    const bufferKey = `${this.sessionId}-${platform}`;

    if (!this.metricsBuffer.has(bufferKey)) {
      this.metricsBuffer.set(bufferKey, []);
    }

    const metrics = this.metricsBuffer.get(bufferKey)!;
    metrics.push({
      ...metric,
      timestamp: Date.now(),
    });
  }

  /**
   * Flush all buffered metrics
   */
  private async flushAllMetrics(): Promise<void> {
    if (!this.core?.transport) return;

    for (const [bufferKey, metrics] of this.metricsBuffer.entries()) {
      if (metrics.length === 0) continue;

      const [sessionId, platform] = bufferKey.split("-");

      try {
        // Send batch to transport
        await this.core.transport.sendPerformanceBatch({
          sessionId,
          platform: platform as "browser" | "nodejs",
          metrics: [...metrics], // Copy the array
        });

        // Clear the buffer on success
        this.metricsBuffer.set(bufferKey, []);

        if (this.core?.config?.debug) {
          console.log(
            `[Kuyo:Performance] Sent ${metrics.length} metrics for ${bufferKey}`
          );
        }
      } catch (error) {
        if (this.core?.config?.debug) {
          console.error(`[Kuyo:Performance] Failed to send metrics:`, error);
        }
        // Keep metrics in buffer for retry
      }
    }
  }

  /**
   * Track performance in browser environment
   */
  private trackBrowserEnv(): void {
    this.setupPageLoadTracking();
    this.setupWebVitalsTracking();
    this.setupMemoryTracking();
    this.setupNetworkTracking();
    this.setupUserInteractionTracking();
    this.setupResourceTimingTracking();
    this.setupLongTaskTracking();
  }

  /**
   * Track performance in Node.js environment
   */
  private trackNodeEnv(): void {
    this.log("[Kuyo:Performance] Node.js environment detected");

    // Start monitoring Node.js performance metrics
    this.startNodeMetricsMonitoring();

    // Track process events
    this.trackProcessEvents();
  }

  /**
   * Start monitoring Node.js performance metrics
   */
  private startNodeMetricsMonitoring(): void {
    // Monitor metrics every 30 seconds
    this.nodeMetricsInterval = setInterval(() => {
      this.collectNodeMetrics();
    }, 30000);

    // Initial metrics collection
    this.collectNodeMetrics();
  }

  /**
   * Collect Node.js performance metrics
   */
  private collectNodeMetrics(): void {
    const metrics = {
      timestamp: Date.now(),
      uptime: process.uptime(),
      memory: this.getMemoryUsage(),
      cpu: this.getCPUUsage(),
      eventLoop: this.getEventLoopLag(),
      process: this.getProcessMetrics(),
      system: this.getSystemMetrics(),
    };

    // Add to buffer instead of just logging
    this.addMetric({
      type: "node_metrics",
      name: "system_metrics",
      value: 0, // Placeholder, we'll use context for detailed data
      context: metrics,
    });

    if (this.core?.config?.debug) {
      this.log(
        "[Kuyo:Performance] Node.js metrics: " + JSON.stringify(metrics)
      );
    }
  }

  /**
   * Get memory usage metrics
   */
  private getMemoryUsage(): Record<string, number> {
    const memUsage = process.memoryUsage();

    return {
      rss: Math.round(memUsage.rss / 1024 / 1024), // MB
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
      external: Math.round(memUsage.external / 1024 / 1024), // MB
      arrayBuffers: Math.round(
        (memUsage as any).arrayBuffers / 1024 / 1024 || 0
      ), // MB
    };
  }

  /**
   * Get CPU usage metrics
   */
  private getCPUUsage(): Record<string, number> {
    const cpuUsage = process.cpuUsage();

    return {
      user: Math.round(cpuUsage.user / 1000), // milliseconds
      system: Math.round(cpuUsage.system / 1000), // milliseconds
    };
  }

  /**
   * Get event loop lag metrics
   */
  private getEventLoopLag(): Record<string, number> {
    const start = process.hrtime.bigint();

    // For now, return a simple measurement
    // In a real implementation, you might want to use a more sophisticated approach
    return {
      lag: 0, // Placeholder - would need async measurement in practice
      timestamp: Date.now(),
    };
  }

  /**
   * Get process metrics
   */
  private getProcessMetrics(): Record<string, any> {
    return {
      pid: process.pid,
      version: process.version,
      platform: process.platform,
      arch: process.arch,
      nodeEnv: process.env.NODE_ENV || "development",
      startTime: this.startTime,
      uptime: process.uptime(),
    };
  }

  /**
   * Get system metrics
   */
  private getSystemMetrics(): Record<string, any> {
    return {
      cwd: process.cwd(),
      title: process.title,
      argv: process.argv.slice(0, 2), // Just executable and script name
      execPath: process.execPath,
    };
  }

  /**
   * Track process events
   */
  private trackProcessEvents(): void {
    // Track process exit
    process.on("exit", (code) => {
      this.addMetric({
        type: "process_event",
        name: "exit",
        value: code,
        context: { code },
      });

      if (this.core?.config?.debug) {
        this.log(`[Kuyo:Performance] Process exiting with code: ${code}`);
      }

      this.teardown();
    });

    // Track uncaught exceptions
    process.on("uncaughtException", (error) => {
      this.addMetric({
        type: "process_event",
        name: "uncaught_exception",
        value: 1,
        context: { message: error.message, stack: error.stack },
      });

      if (this.core?.config?.debug) {
        this.log("[Kuyo:Performance] Uncaught exception: " + error.message);
      }
    });

    // Track unhandled promise rejections
    process.on("unhandledRejection", (reason, promise) => {
      this.addMetric({
        type: "process_event",
        name: "unhandled_rejection",
        value: 1,
        context: { reason: String(reason) },
      });

      if (this.core?.config?.debug) {
        this.log("[Kuyo:Performance] Unhandled promise rejection: " + reason);
      }
    });

    // Track warning events
    process.on("warning", (warning) => {
      this.addMetric({
        type: "process_event",
        name: "warning",
        value: 1,
        context: { message: warning.message },
      });

      if (this.core?.config?.debug) {
        this.log("[Kuyo:Performance] Process warning: " + warning.message);
      }
    });
  }

  /**
   * Setup page load tracking
   */
  private setupPageLoadTracking(): void {
    // Track initial page load
    if (document.readyState === "loading") {
      // Page is still loading, wait for DOMContentLoaded
      document.addEventListener("DOMContentLoaded", () => {
        this.onPageLoad();
      });
    } else {
      // Page is already loaded
      this.onPageLoad();
    }

    // Track navigation performance (for SPA)
    if (typeof window !== "undefined" && "performance" in window) {
      this.pageLoadStartTime = performance.now();
    }
  }

  /**
   * Handle page load completion
   */
  private onPageLoad(): void {
    if (typeof window === "undefined" || !("performance" in window)) {
      return;
    }

    const loadTime = performance.now() - (this.pageLoadStartTime || 0);

    // Get navigation timing data if available
    const navigation = performance.getEntriesByType(
      "navigation"
    )[0] as PerformanceNavigationTiming;

    const pageLoadData = {
      loadTime,
      url: window.location.href,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      ...(navigation && {
        domContentLoaded:
          navigation.domContentLoadedEventEnd -
          navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: this.getFirstPaint(),
        firstContentfulPaint: this.getFirstContentfulPaint(),
      }),
    };

    // Add to buffer
    this.addMetric({
      type: "page_load",
      name: "load_time",
      value: loadTime,
      unit: "ms",
      context: pageLoadData,
    });

    // Log the page load data
    if (this.core?.config?.debug) {
      console.log(
        `[Kuyo:Performance] Page loaded in ${loadTime.toFixed(2)}ms`,
        pageLoadData
      );
    }

    // Reset for next navigation
    this.pageLoadStartTime = performance.now();
  }

  /**
   * Setup Web Vitals tracking
   */
  private setupWebVitalsTracking(): void {
    if (typeof window === "undefined" || !("performance" in window)) {
      return;
    }

    // Track Largest Contentful Paint (LCP)
    this.trackLCP();

    // Track First Input Delay (FID)
    this.trackFID();

    // Track Cumulative Layout Shift (CLS)
    this.trackCLS();

    // Track First Contentful Paint (FCP)
    this.trackFCP();
  }

  /**
   * Track Largest Contentful Paint
   */
  private trackLCP(): void {
    if (!("PerformanceObserver" in window)) return;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1] as any;

      this.addMetric({
        type: "web_vitals",
        name: "lcp",
        value: lastEntry.startTime,
        unit: "ms",
        context: {
          element: lastEntry.element?.tagName,
          url: lastEntry.url,
        },
      });

      if (this.core?.config?.debug) {
        console.log("[Kuyo:Performance] LCP:", {
          value: lastEntry.startTime,
          element: lastEntry.element?.tagName,
          url: lastEntry.url,
          timestamp: Date.now(),
        });
      }
    });

    observer.observe({ entryTypes: ["largest-contentful-paint"] });
  }

  /**
   * Track First Input Delay
   */
  private trackFID(): void {
    if (!("PerformanceObserver" in window)) return;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        const fidEntry = entry as any;
        const value = fidEntry.processingStart - fidEntry.startTime;

        this.addMetric({
          type: "web_vitals",
          name: "fid",
          value,
          unit: "ms",
        });

        if (this.core?.config?.debug) {
          console.log("[Kuyo:Performance] FID:", {
            value,
            timestamp: Date.now(),
          });
        }
      });
    });

    observer.observe({ entryTypes: ["first-input"] });
  }

  /**
   * Track Cumulative Layout Shift
   */
  private trackCLS(): void {
    if (!("PerformanceObserver" in window)) return;

    let clsValue = 0;
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      });

      this.addMetric({
        type: "web_vitals",
        name: "cls",
        value: clsValue,
        unit: "score",
      });

      if (this.core?.config?.debug) {
        console.log("[Kuyo:Performance] CLS:", {
          value: clsValue,
          timestamp: Date.now(),
        });
      }
    });

    observer.observe({ entryTypes: ["layout-shift"] });
  }

  /**
   * Track First Contentful Paint
   */
  private trackFCP(): void {
    if (!("PerformanceObserver" in window)) return;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        this.addMetric({
          type: "web_vitals",
          name: "fcp",
          value: entry.startTime,
          unit: "ms",
        });

        if (this.core?.config?.debug) {
          console.log("[Kuyo:Performance] FCP:", {
            value: entry.startTime,
            timestamp: Date.now(),
          });
        }
      });
    });

    observer.observe({ entryTypes: ["first-contentful-paint"] });
  }

  /**
   * Setup memory tracking
   */
  private setupMemoryTracking(): void {
    if (typeof window === "undefined" || !("performance" in window)) {
      return;
    }

    // Track memory usage if available
    if ((performance as any).memory) {
      setInterval(() => {
        const memory = (performance as any).memory;
        const memoryData = {
          used: Math.round(memory.usedJSHeapSize / 1024 / 1024), // MB
          total: Math.round(memory.totalJSHeapSize / 1024 / 1024), // MB
          limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024), // MB
          timestamp: Date.now(),
        };

        this.addMetric({
          type: "memory",
          name: "heap_used",
          value: memoryData.used,
          unit: "mb",
          context: memoryData,
        });

        if (this.core?.config?.debug) {
          console.log("[Kuyo:Performance] Memory:", memoryData);
        }
      }, 10000); // Every 10 seconds
    }
  }

  /**
   * Setup network performance tracking
   */
  private setupNetworkTracking(): void {
    if (typeof window === "undefined" || !("navigator" in window)) {
      return;
    }

    // Track connection information
    if ("connection" in navigator) {
      const connection = (navigator as any).connection;
      const networkData = {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData,
        timestamp: Date.now(),
      };

      this.addMetric({
        type: "network",
        name: "connection_info",
        value: connection.downlink || 0,
        unit: "mbps",
        context: networkData,
      });

      if (this.core?.config?.debug) {
        console.log("[Kuyo:Performance] Network:", networkData);
      }

      // Listen for connection changes
      connection.addEventListener("change", () => {
        const changeData = {
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt,
          timestamp: Date.now(),
        };

        this.addMetric({
          type: "network",
          name: "connection_change",
          value: connection.downlink || 0,
          unit: "mbps",
          context: changeData,
        });

        if (this.core?.config?.debug) {
          console.log("[Kuyo:Performance] Network changed:", changeData);
        }
      });
    }
  }

  /**
   * Setup user interaction tracking
   */
  private setupUserInteractionTracking(): void {
    if (typeof window === "undefined") {
      return;
    }

    // Track user interactions
    const events = ["click", "scroll", "keydown", "mousemove"];
    let interactionCount = 0;

    events.forEach((eventType) => {
      window.addEventListener(
        eventType,
        () => {
          interactionCount++;

          if (interactionCount % 10 === 0) {
            // Log every 10 interactions
            this.addMetric({
              type: "user_interaction",
              name: eventType,
              value: interactionCount,
              unit: "count",
              context: { eventType, count: interactionCount },
            });

            if (this.core?.config?.debug) {
              console.log("[Kuyo:Performance] User Interactions:", {
                count: interactionCount,
                eventType,
                timestamp: Date.now(),
              });
            }
          }
        },
        { passive: true }
      );
    });
  }

  /**
   * Setup resource timing tracking
   */
  private setupResourceTimingTracking(): void {
    if (typeof window === "undefined" || !("performance" in window)) {
      return;
    }

    // Track resource loading performance
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.entryType === "resource") {
          const resourceEntry = entry as PerformanceResourceTiming;

          this.addMetric({
            type: "resource_timing",
            name: "load_duration",
            value: resourceEntry.duration,
            unit: "ms",
            context: {
              name: resourceEntry.name,
              transferSize: resourceEntry.transferSize,
              initiatorType: resourceEntry.initiatorType,
            },
          });

          if (this.core?.config?.debug) {
            console.log("[Kuyo:Performance] Resource:", {
              name: resourceEntry.name,
              duration: resourceEntry.duration,
              transferSize: resourceEntry.transferSize,
              initiatorType: resourceEntry.initiatorType,
              timestamp: Date.now(),
            });
          }
        }
      });
    });

    observer.observe({ entryTypes: ["resource"] });
  }

  /**
   * Setup long task tracking
   */
  private setupLongTaskTracking(): void {
    if (typeof window === "undefined" || !("PerformanceObserver" in window)) {
      return;
    }

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        this.addMetric({
          type: "long_task",
          name: "duration",
          value: entry.duration,
          unit: "ms",
          context: {
            startTime: entry.startTime,
          },
        });

        if (this.core?.config?.debug) {
          console.log("[Kuyo:Performance] Long Task:", {
            duration: entry.duration,
            startTime: entry.startTime,
            timestamp: Date.now(),
          });
        }
      });
    });

    observer.observe({ entryTypes: ["longtask"] });
  }

  /**
   * Get First Paint timing
   */
  private getFirstPaint(): number | null {
    if (typeof window === "undefined" || !("performance" in window)) {
      return null;
    }

    const paintEntries = performance.getEntriesByType("paint");
    const firstPaint = paintEntries.find(
      (entry) => entry.name === "first-paint"
    );

    return firstPaint ? firstPaint.startTime : null;
  }

  /**
   * Get First Contentful Paint timing
   */
  private getFirstContentfulPaint(): number | null {
    if (typeof window === "undefined" || !("performance" in window)) {
      return null;
    }

    const paintEntries = performance.getEntriesByType("paint");
    const firstContentfulPaint = paintEntries.find(
      (entry) => entry.name === "first-contentful-paint"
    );

    return firstContentfulPaint ? firstContentfulPaint.startTime : null;
  }

  /**
   * Get plugin name
   */
  public getName(): string {
    return this.name;
  }

  /**
   * Teardown the performance plugin
   */
  public teardown(): void {
    this.isInitialized = false;
    this.pageLoadStartTime = null;

    // Clear Node.js metrics interval
    if (this.nodeMetricsInterval) {
      clearInterval(this.nodeMetricsInterval);
      this.nodeMetricsInterval = null;
    }

    // Clear batch interval
    if (this.batchInterval) {
      clearInterval(this.batchInterval);
      this.batchInterval = null;
    }

    // Flush any remaining metrics
    this.flushAllMetrics();
  }
}
