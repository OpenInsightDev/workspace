import { makeBench } from "./benchmarks/verilog-eval/mod.ts";
import { Acp, Sandbox } from "@open-insight/core";
import { Bench, Eval, Event } from "@open-insight/eval";
import { Effect } from "effect";
import { NodeRuntime, NodeServices } from "@effect/platform-node";

const serveEnv = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
  OPENAI_BASE_URL: process.env.OPENAI_BASE_URL!,
  OPENAI_MODEL: process.env.OPENAI_MODEL!,
  DEFAULT_AUTH_REQUEST: JSON.stringify({ methodId: "api-key" }),
  NO_BROWSER: "1",
  INITIAL_AGENT_MODE: "agent-full-access",
  CODEX_CONFIG: JSON.stringify({
    model: process.env.OPENAI_MODEL,
    model_provider: "deepseek",
    model_providers: {
      deepseek: {
        name: "DeepSeek",
        base_url: process.env.OPENAI_BASE_URL,
        wire_api: "responses",
        env_key: "OPENAI_API_KEY",
      },
    },
  }),
};

const main = Effect.gen(function* () {
  const acp = Acp.layerFrom(
    { id: "deepseek", agentId: "codex-acp" },
    { serveEnv },
  );
  const transport = Event.Transport.Console.layer;
  const sandbox = Sandbox.Docker.layerFrom({ ports: [7689] });

  const result = yield* makeBench()
    .pipe(Bench.sample("10%"))
    .pipe(Eval.run({ cacheTaskSnapshot: true }))
    .pipe(Effect.provide(acp))
    .pipe(Effect.provide(sandbox))
    .pipe(Effect.provide(transport));

  return result;
})
  .pipe(Effect.scoped)
  .pipe(Effect.provide(NodeServices.layer));

NodeRuntime.runMain(main);
