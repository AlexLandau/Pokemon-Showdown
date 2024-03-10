#!/bin/bash

node build
# NUM_WORKERS=8 node ./.sim-dist/tools/collect-single-move-stats.js
node ./dist/sim/tools/targeted-stats-collector.js "$@"
