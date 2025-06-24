import { FetchTransport } from "./lib/transport";
import { KuyoPerformance } from "./plugins/kuyo-performance";
import {
  KuyoAdapter,
  KuyoConfig,
  KuyoEnvironment,
  KuyoError,
  KuyoSession,
  KuyoTransport,
} from "./types";

export class KuyoCore {
  private config: KuyoConfig;
  private adapter: KuyoAdapter | null = null;
  private session: KuyoSession | null = null;
  private transport: KuyoTransport | null = null;
  private performance: KuyoPerformance | null = null;

  private endpoint: string;

  constructor(config: KuyoConfig) {
    this.config = config;
    this.endpoint = "http://localhost:8000/api";

    this.initSession();

    this.transport = new FetchTransport(this.config, this.endpoint);
    this.log("Kuyo Core initialized");

    this.log("Plugins: " + this.config.plugins.join(", "));
    this.log("Config: " + JSON.stringify(this.config));

    if (this.config.plugins.includes("performance")) {
      this.log("Performance plugin enabled");
      this.performance = new KuyoPerformance();
      this.performance.setup(this);
    }
  }

  public useAdapter(adapter: KuyoAdapter): void {
    if (this.adapter) {
      this.adapter.teardown?.();
    }

    this.adapter = adapter;
    this.adapter.setup();
    this.log(`Adapter registered: ${adapter.name}`);
  }

  public getAdapter(): KuyoAdapter | null {
    return this.adapter;
  }

  public getConfig(): KuyoConfig {
    return { ...this.config };
  }

  /**
   * Get the performance plugin instance
   */
  public getPerformancePlugin(): KuyoPerformance | null {
    return this.performance;
  }

  /**
   * Core method to capture exceptions
   */
  public captureException(error: Error, extra?: Record<string, any>): void {
    const event = this.createEvent({
      message: error.message,
      stack: error.stack,
      level: "error",
      extra,
    });

    this.sendEvent(event);
  }

  /**
   * Core method to capture messages
   */
  public captureMessage(
    message: string,
    level: KuyoError["level"] = "info",
    extra?: Record<string, any>
  ): void {
    const event = this.createEvent({
      message,
      level,
      extra,
    });

    this.sendEvent(event);
  }

  /**
   * Create a standardized error event
   */
  public createEvent(params: Partial<KuyoError>): KuyoError {
    const context = this.adapter?.getContext() || {};

    return {
      id: this.generateId(),
      timestamp: Date.now(),
      platform: this.adapter?.name || "unknown",
      context,
      level: "error",
      session: this.session,
      ...params,
    } as KuyoError;
  }

  /**
   * Send an event through the transport
   */
  public async sendEvent(event: KuyoError): Promise<void> {
    try {
      this.log(`Sending event: ${event.message}`);
      await this.transport?.send(event);
      this.log(`Event sent: ${event.id}`);
    } catch (error) {
      this.log(`Failed to send event: ${error}`, true);
    }
  }

  /**
   * Initialize the session
   */
  private initSession() {
    const currentSession = sessionStorage.getItem("kuyo_session");
    if (currentSession) {
      this.session = JSON.parse(currentSession);
    } else {
      this.session = {
        id: `kuyo_${Date.now().toString(36)}_${Math.random()
          .toString(36)
          .substring(2)}`,
        environment:
          (this.config.environment as KuyoEnvironment) || "production",
        startedAt: Date.now(),
        endedAt: 0,
        duration: 0,
        userAgent: navigator.userAgent,
        ipAddress: "127.0.0.1",
      };
      sessionStorage.setItem("kuyo_session", JSON.stringify(this.session));
    }
  }

  /**
   * Clean the session
   */
  private cleanSession() {
    sessionStorage.removeItem("kuyo_session");
    this.session = null;
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  /**
   * Log a message
   */
  private log(message: string, isError = false): void {
    if (this.config.debug) {
      const logMethod = isError ? console.error : console.log;
      logMethod(`[Kuyo:Core] ${message}`);
    }
  }
}
