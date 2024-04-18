#!/bin/bash

node build
node ./dist/sim/tools/debug.js "$@"
