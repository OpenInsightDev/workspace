import { makeBench } from "verilog-eval";
import { Config, Effect } from "effect";
import { Harness, Sandbox } from "@open-insight/eval";
import { makeOpenAi } from "@open-insight/agent";
import { Eval } from "@open-insight/eval/internal";
import { NodeRuntime, NodeServices } from "@effect/platform-node";

const main = Effect.fn(function* () {
  const bench = yield* makeBench();

  const sandbox = yield* Sandbox.Docker.make({});
  const agent = yield* makeOpenAi({
    apiKey: Config.string("OPENAI_API_KEY"),
    baseUrl: Config.string("OPENAI_BASE_URL"),
    dotenvPath: ".env",
    model: "deepseek-v4-flash",
  });

  const harness = yield* Harness.make({ id: "deepseek", agent, sandbox });

  const result = yield* Eval.run({
    bench,
    harness,
  });

  console.log(result);
});

NodeRuntime.runMain(
  main().pipe(
    Effect.scoped,
    Effect.provide(NodeServices.layer),
  ),
);
