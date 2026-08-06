import { makeBench } from "./benchmarks/cvdp_benchmark/mod.ts";
import { Acp, Sandbox } from "@open-insight/core";
import { Bench, env, envify, Eval, Event } from "@open-insight/eval";
import { Effect } from "effect";
import { NodeRuntime, NodeServices } from "@effect/platform-node";

const openAiApiKey = env("OPENAI_API_KEY");
const openAiBaseUrl = env("OPENAI_BASE_URL");
const openAiModel = env("OPENAI_MODEL");
const serveEnv = envify({
  OPENAI_API_KEY: openAiApiKey,
  OPENAI_BASE_URL: openAiBaseUrl,
  OPENAI_MODEL: openAiModel,
  DEFAULT_AUTH_REQUEST: { methodId: "api-key" },
  NO_BROWSER: "1",
  INITIAL_AGENT_MODE: "agent-full-access",
  CODEX_CONFIG: {
    model: openAiModel,
    model_provider: "deepseek",
    model_providers: {
      deepseek: {
        name: "DeepSeek",
        base_url: openAiBaseUrl,
        wire_api: "responses",
        env_key: "OPENAI_API_KEY",
      },
    },
  },
});

// Which problems to run: every task in the dataset that does not require
// commercial (closed-source EDA) tooling. The benchmark pulls the latest
// dataset version (`v1.1.0`) from Hugging Face and filters to the
// `no_commercial` splits.
const dataset = process.env.CVDP_DATASET;
// Fraction of the (no-commercial) benchmark to actually run, e.g. "10%" or "100%".
const sample = (process.env.CVDP_SAMPLE ?? "10%") as `${number}%`;
// Parallelism: number of task snapshots prepared and trails run at once.
// Keep modest — each trail runs a Docker sandbox plus a local ACP agent, so
// the default 32x over-subscribes a 32GB laptop and crashed the run.
const concurrency = Number(process.env.CVDP_CONCURRENCY ?? "4");

const main = Effect.gen(function* () {
  const acp = Acp.layerFrom(
    { id: "deepseek", agentId: "codex-acp" },
    { serveEnv },
  );
  const transport = Event.Transport.Console.layer;
  const sandbox = Sandbox.Docker.layerFrom({ ports: [7689] });

  const result = yield* makeBench({
    ...(dataset ? { dataset } : {}),
    noCommercial: true,
  })
    .pipe(Bench.sample(sample))
    .pipe(
      Eval.run({
        cacheTaskSnapshot: true,
        trailConcurrency: 8,
        trailCount: 1,
      }),
    )
    .pipe(Effect.provide(acp))
    .pipe(Effect.provide(sandbox))
    .pipe(Effect.provide(transport));

  console.log(result);
  for (const [taskId, taskResult] of Object.entries(result.tasks)) {
    for (const trail of taskResult.trails) {
      console.log(
        `TASK ${taskId}: grade=${JSON.stringify(trail.grade)} usage=${
          JSON.stringify(trail.usage)
        }`,
      );
    }
  }

  return result;
})
  .pipe(Effect.scoped)
  .pipe(Effect.provide(NodeServices.layer));

NodeRuntime.runMain(main);
