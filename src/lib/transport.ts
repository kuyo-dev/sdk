import { KuyoConfig, KuyoError, KuyoTransport } from "../types";

interface PerformanceMetric {
  type: string;
  name: string;
  value: number;
  unit?: string;
  timestamp: number;
  context?: Record<string, any>;
}

interface PerformanceBatch {
  sessionId: string;
  userId?: string;
  environment: "development" | "production";
  platform: "browser" | "nodejs";
  adapter?: string;
  metrics: PerformanceMetric[];
}

export class FetchTransport implements KuyoTransport {
  private metricsBuffer: Map<string, PerformanceMetric[]> = new Map();
  private batchSize = 50;
  private batchTimeout = 30000; // 30 seconds
  private batchTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(private config: KuyoConfig, private endpoint: string) {}

  /**
   * Send an event to the Kuyo API
   * @param event - The event to send
   */
  async send(event: KuyoError): Promise<void> {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.config.apiKey,
        "User-Agent": `Kuyo-SDK/${event.platform}`,
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }

  /**
   * Send performance metrics (batched)
   * @param sessionId - The session ID
   * @param platform - The platform (browser/nodejs)
   * @param metric - The performance metric
   */
  async sendPerformanceMetric(
    sessionId: string,
    platform: "browser" | "nodejs",
    metric: PerformanceMetric
  ): Promise<void> {
    const bufferKey = `${sessionId}-${platform}`;

    // Add metric to buffer
    if (!this.metricsBuffer.has(bufferKey)) {
      this.metricsBuffer.set(bufferKey, []);
    }

    const metrics = this.metricsBuffer.get(bufferKey)!;
    metrics.push(metric);

    // Check if we should flush immediately
    if (metrics.length >= this.batchSize) {
      await this.flushMetrics(bufferKey);
    } else {
      // Schedule flush if not already scheduled
      if (!this.batchTimers.has(bufferKey)) {
        const timer = setTimeout(async () => {
          await this.flushMetrics(bufferKey);
          this.batchTimers.delete(bufferKey);
        }, this.batchTimeout);

        this.batchTimers.set(bufferKey, timer);
      }
    }
  }

  /**
   * Send performance metrics batch (called by performance plugin)
   * @param batch - The performance batch data
   */
  async sendPerformanceBatch(batch: {
    sessionId: string;
    platform: "browser" | "nodejs";
    metrics: any[];
  }): Promise<void> {
    try {
      const response = await fetch(`${this.endpoint}/performance/batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.config.apiKey,
          "User-Agent": `Kuyo-SDK/${batch.platform}`,
        },
        body: JSON.stringify({
          sessionId: batch.sessionId,
          environment: this.config.environment,
          platform: batch.platform,
          adapter: this.config.adapter,
          metrics: batch.metrics,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (this.config.debug) {
        console.log(
          `[Kuyo:Transport] Sent ${batch.metrics.length} performance metrics for ${batch.sessionId}`
        );
      }
    } catch (error) {
      if (this.config.debug) {
        console.error(
          `[Kuyo:Transport] Failed to send performance batch:`,
          error
        );
      }
      throw error;
    }
  }

  /**
   * Flush metrics for a specific session/platform
   */
  private async flushMetrics(bufferKey: string): Promise<void> {
    const metrics = this.metricsBuffer.get(bufferKey);
    if (!metrics || metrics.length === 0) return;

    const [sessionId, platform] = bufferKey.split("-");

    const batch: PerformanceBatch = {
      sessionId,
      environment: this.config.environment,
      platform: platform as "browser" | "nodejs",
      adapter: this.config.adapter,
      metrics: [...metrics], // Copy the array
    };

    try {
      const response = await fetch(`${this.endpoint}/performance/batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.config.apiKey,
          "User-Agent": `Kuyo-SDK/${platform}`,
        },
        body: JSON.stringify(batch),
      });

      if (response.ok) {
        // Clear the buffer on success
        this.metricsBuffer.set(bufferKey, []);

        if (this.config.debug) {
          console.log(
            `[Kuyo:Transport] Sent ${metrics.length} performance metrics for ${bufferKey}`
          );
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      if (this.config.debug) {
        console.error(
          `[Kuyo:Transport] Failed to send performance metrics:`,
          error
        );
      }
      // Keep metrics in buffer for retry (you might want to implement retry logic)
    }
  }

  /**
   * Send a critical performance metric immediately
   */
  async sendCriticalMetric(
    sessionId: string,
    platform: "browser" | "nodejs",
    metric: PerformanceMetric
  ): Promise<void> {
    try {
      const response = await fetch(`${this.endpoint}/performance/metric`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.config.apiKey,
          "User-Agent": `Kuyo-SDK/${platform}`,
        },
        body: JSON.stringify({
          ...metric,
          sessionId,
          environment: this.config.environment,
          platform,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (this.config.debug) {
        console.log(`[Kuyo:Transport] Sent critical metric: ${metric.name}`);
      }
    } catch (error) {
      if (this.config.debug) {
        console.error(
          `[Kuyo:Transport] Failed to send critical metric:`,
          error
        );
      }
    }
  }

  /**
   * Force flush all buffered metrics
   */
  async flushAllMetrics(): Promise<void> {
    const bufferKeys = Array.from(this.metricsBuffer.keys());

    for (const bufferKey of bufferKeys) {
      await this.flushMetrics(bufferKey);
    }
  }

  /**
   * Cleanup timers and buffers
   */
  destroy(): void {
    // Clear all timers
    for (const timer of this.batchTimers.values()) {
      clearTimeout(timer);
    }
    this.batchTimers.clear();

    // Clear buffers
    this.metricsBuffer.clear();
  }
}
