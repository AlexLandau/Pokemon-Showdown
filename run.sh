#!/bin/bash

node build
node ./dist/sim/tools/targeted-stats-collector.js "$@"
