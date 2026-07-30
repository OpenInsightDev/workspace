import { makeBench } from "verilog-eval";
import { Effect } from "effect";

const main = Effect.fn(function* () {
  const bench = yield* makeBench();
});
