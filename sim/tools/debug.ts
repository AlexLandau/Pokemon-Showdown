import { getBattleWinner, getLegalMovesFor, runTargetedCollection } from "./pickrandom";

// for (let i = 0; i < 10; i++) {
// 	const winner = getBattleWinner("mew", "hiddenpower$ice", "mew", "hiddenpower$water", "gen2_no_items");
// 	console.log("winner: " + winner);
// }

// runTargetedCollection({
// 	// gen: "gen1",
// 	gen: "gen2_no_items",
// 	type: "single_elim",
// 	extraArgs: []
// });

console.log(getLegalMovesFor("smeargle", "gen2_no_items"));

