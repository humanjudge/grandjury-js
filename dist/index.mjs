// src/index.ts
var DEFAULT_BASE_URL = "https://grandjury-server.onrender.com";
function generateInferenceId() {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 10);
  return `gj_inf_${ts}_${rand}`;
}
var GrandJury = class {
  constructor(options) {
    this.apiKey = options.apiKey;
    this.projectId = options.projectId;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.timeoutMs = options.timeoutMs ?? 5e3;
  }
  /**
   * Submit one trace. Silent on failure.
   */
  async trace(input) {
    const inferenceId = input.gjInferenceId ?? generateInferenceId();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      const response = await fetch(`${this.baseUrl}/api/v1/traces/ingest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`
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
          metadata: input.metadata
        }),
        signal: controller.signal
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
  observe(fn, options = {}) {
    const opName = options.name ?? fn.name ?? "unknown";
    return async (...args) => {
      const start = Date.now();
      const result = await fn(...args);
      const latencyMs = Date.now() - start;
      const inputStr = args.length === 1 ? String(args[0]) : JSON.stringify(args);
      const outputStr = typeof result === "string" ? result : JSON.stringify(result);
      void this.trace({
        name: opName,
        input: inputStr,
        output: outputStr,
        model: options.model,
        latencyMs,
        metadata: options.metadata
      });
      return result;
    };
  }
};
var index_default = GrandJury;
export {
  GrandJury,
  index_default as default
};
