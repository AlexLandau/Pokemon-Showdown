import { argv } from "process";
import { runTargetedCollection } from "./pickrandom";

if (argv.length < 4) {
	console.error("Expecting at least two args; examples:");
	console.error("  gen1 singleelim");
	throw new Error();
}

console.log("args are: ", argv);
if (!argv[2].startsWith("gen")) {
	throw new Error("Expected first argument to be a generation, e.g. 'gen1'");
}
const gen = argv[2];
const type = argv[3];

const args = {
	gen: gen,
	type: type,
	extraArgs: argv.slice(4),
};

runTargetedCollection(args);
