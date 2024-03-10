import { argv } from "process";
import { targetedRunWorkerMain } from "./pickrandom";

targetedRunWorkerMain(argv.slice(2));
