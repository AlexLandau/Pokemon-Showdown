import { getBattleWinner, runTargetedCollection } from "./pickrandom";


// const winner = getBattleWinner("gengar", "hyperbeam", "gengar", "hyperbeam", "gen1");
runTargetedCollection({
	// gen: "gen1",
	gen: "gen2_no_items",
	type: "single_elim",
	extraArgs: []
});

// console.log("winner: " + winner);
