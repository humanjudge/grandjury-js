/**
 * @grandjury/sdk — TypeScript SDK for the GrandJury human evaluation platform.
 *
 * Quickstart:
 *   import GrandJury from "@grandjury/sdk";
 *
 *   const gj = new GrandJury({ apiKey: "gj_sk_live_…", projectId: "<uuid>" });
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
 */
interface GrandJuryOptions {
    apiKey: string;
    projectId: string;
    baseUrl?: string;
    timeoutMs?: number;
}
interface TraceInput {
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
interface TraceResult {
    gjInferenceId: string;
    success: boolean;
}
declare class GrandJury {
    private readonly apiKey;
    private readonly projectId;
    private readonly baseUrl;
    private readonly timeoutMs;
    constructor(options: GrandJuryOptions);
    /**
     * Submit one trace. Silent on failure.
     */
    trace(input: TraceInput): Promise<TraceResult>;
    /**
     * Wrap an async function. Captures input (first arg), output, and latency.
     * Submits a trace on every call. Silent on failure.
     *
     * Usage:
     *   const trackedFn = gj.observe(myFn, { name: "my_op", model: "gpt-4o" });
     */
    observe<T extends unknown[], R>(fn: (...args: T) => Promise<R>, options?: {
        name?: string;
        model?: string;
        metadata?: Record<string, unknown>;
    }): (...args: T) => Promise<R>;
}

export { GrandJury, type GrandJuryOptions, type TraceInput, type TraceResult, GrandJury as default };
