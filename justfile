default:
    #! /bin/sh
    uv sync &
    deno i &
    wait
    echo "init done"

benchmark id:
    #! /bin/sh
    git submodule update --init --recursive benchmarks/{{ id }}
    echo "benchmark {{ id }} initialized"

harness id:
    #! /bin/sh
    git submodule update --init --recursive harnesses/{{ id }}
    echo "harness {{ id }} initialized"

run:
    #! /bin/sh
    deno run -A main.ts
