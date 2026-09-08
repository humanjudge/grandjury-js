/**
 * @humanjudge/grandjury-js — JavaScript/TypeScript SDK for the GrandJury human evaluation platform.
 *
 * Quickstart:
 *   import GrandJury from "@humanjudge/grandjury-js";
 *
 *   const gj = new GrandJury(); // reads GRANDJURY_API_KEY from env automatically
 *
 *   await gj.trace({
 *     name: "cover_letter_generation",
 *     input: prompt,
 *     output: response,
 *     model: "gpt-4o",
 *     latencyMs: 1230,
 *   });
 *
 *   // Wrap a function
 *   const wrappedFn = gj.observe(myLlmCall, { name: "my_llm_call" });
 *
 * Design: Silent failure — errors are logged to console.error only.
 * The SDK never throws; your app must never crash because of GrandJury.
 * If no API key is configured, all methods are no-ops.
 */

const DEFAULT_BASE_URL = "https://grandjury-server.onrender.com";

export interface GrandJuryOptions {
  /** API key. Defaults to GRANDJURY_API_KEY environment variable. */
  apiKey?: string;
  baseUrl?: string;
  timeoutMs?: number;
}

export interface TraceInput {
  name?: string;
  input?: string;
  output?: string;
  model?: string;
  latencyMs?: number;
  promptTokens?: number;
  completionTokens?: number;
  metadata?: Record<string, unknown>;
  gjInferenceId?: string;
}

export interface TraceResult {
  gjInferenceId: string;
  success: boolean;
}

function generateInferenceId(): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 10);
  return `gj_inf_${ts}_${rand}`;
}

export class GrandJury {
  private readonly apiKey: string | undefined;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(options: GrandJuryOptions = {}) {
    // Resolve API key: explicit option → env var → undefined (no-op mode)
    this.apiKey =
      options.apiKey ??
      (typeof process !== "undefined" ? process.env.GRANDJURY_API_KEY : undefined);
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.timeoutMs = options.timeoutMs ?? 5000;

    if (!this.apiKey) {
      console.warn("[grandjury] No API key found — SDK is in no-op mode. Set GRANDJURY_API_KEY to enable.");
    }
  }

  /**
   * Submit one trace. Silent on failure. No-op if no API key is configured.
   */
  async trace(input: TraceInput): Promise<TraceResult> {
    const inferenceId = input.gjInferenceId ?? generateInferenceId();

    if (!this.apiKey) {
      return { gjInferenceId: inferenceId, success: false };
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(`${this.baseUrl}/api/v1/traces/ingest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          gj_inference_id: inferenceId,
          name: input.name,
          input: input.input,
          output: input.output,
          model: input.model,
          latency_ms: input.latencyMs,
          prompt_tokens: input.promptTokens,
          completion_tokens: input.completionTokens,
          metadata: input.metadata,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        console.error(`[grandjury] trace submit failed: HTTP ${response.status}`);
        return { gjInferenceId: inferenceId, success: false };
      }

      return { gjInferenceId: inferenceId, success: true };
    } catch (err) {
      console.error("[grandjury] trace submit error (silent):", err);
      return { gjInferenceId: inferenceId, success: false };
    }
  }

  /**
   * Wrap an async function. Captures input (first arg), output, and latency.
   * Submits a trace on every call. Silent on failure.
   *
   * Usage:
   *   const trackedFn = gj.observe(myFn, { name: "my_op", model: "gpt-4o" });
   */
  observe<T extends unknown[], R>(
    fn: (...args: T) => Promise<R>,
    options: { name?: string; model?: string; metadata?: Record<string, unknown> } = {},
  ): (...args: T) => Promise<R> {
    const opName = options.name ?? fn.name ?? "unknown";

    return async (...args: T): Promise<R> => {
      const start = Date.now();
      const result = await fn(...args);
      const latencyMs = Date.now() - start;

      const inputStr = args.length === 1 ? String(args[0]) : JSON.stringify(args);
      const outputStr = typeof result === "string" ? result : JSON.stringify(result);

      // Fire-and-forget; don't await so it never blocks caller
      void this.trace({
        name: opName,
        input: inputStr,
        output: outputStr,
        model: options.model,
        latencyMs,
        metadata: options.metadata,
      });

      return result;
    };
  }
}

export default GrandJury;
