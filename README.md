# @grandjury/sdk

JavaScript/TypeScript SDK for the GrandJury human evaluation platform.

## Install

```bash
npm install @grandjury/sdk
# or
yarn add @grandjury/sdk
```

## Quickstart

```typescript
import GrandJury from "@grandjury/sdk";

const gj = new GrandJury({
  apiKey: "gj_sk_live_…",   // from your project dashboard
  projectId: "<uuid>",
});

// Submit a trace after any LLM call
await gj.trace({
  name: "cover_letter_generation",
  input: userPrompt,
  output: llmResponse,
  model: "gpt-4o",
  latencyMs: 1230,
});
```

## Wrap a function

```typescript
const trackedGenerateLetter = gj.observe(generateLetter, {
  name: "generate_letter",
  model: "gpt-4o",
});

// Usage is identical — trace submitted automatically
const letter = await trackedGenerateLetter(prompt);
```

## Notes

- **Silent failure**: errors are logged to `console.error` only. Your app never crashes.
- `gjInferenceId` is generated automatically (`gj_inf_{ts}_{rand}`).
- Works in Node.js 18+ (uses native `fetch`).
- No runtime dependencies.
