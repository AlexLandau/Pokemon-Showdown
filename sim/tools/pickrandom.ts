import { Dex, ModdedDex } from "../dex";
import { Battle } from "../battle";

// const Dex = require('../../.sim-dist/dex').Dex;
// Dex.includeModData();

const md: ModdedDex = Dex.mod("gen1");
const pd = md.data.Pokedex;
// console.log("pd keys: " + Object.keys(pd));
// console.log("bulba: " + Object.keys(pd.bulbasaur));
// console.log("bulba: " + JSON.stringify(pd.mewtwo));
// console.log("bulba learnset: " + JSON.stringify(md.data.Learnsets.bulbasaur));
// console.log("pd 1: " + Object.keys(pd[1]));
// console.log("bulba: " + Object.keys(pd.bulbasaur));
// Dex.forFormat("gen1customgame");

const somePokemonNames = Object.keys(pd).slice(1, 152);

// console.log(JSON.stringify(somePokemonNames));
// console.log(somePokemonNames.length);

function getRandomInt(min: number, max: number) {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
}

function pickRandomPokemon(): string {
	const pokemonIndex = getRandomInt(0, 151);
	const pokemonName = somePokemonNames[pokemonIndex];
	return pokemonName;
}

function pickRandomMove(pokemonName: string): string {
	const learnset = md.data.Learnsets[pokemonName].learnset;
	const eligibleMoves = Object.keys(learnset).filter(moveName => learnset[moveName].find(moveSource => moveSource.startsWith("1")) != undefined);
	const randomMove = eligibleMoves[getRandomInt(0, eligibleMoves.length)];
	return randomMove;
}

// const pokemonIndex = getRandomInt(0, 151);
// const pokemonName = somePokemonNames[pokemonIndex];
// console.log(`Chose #${pokemonIndex + 1} ${pokemonName}`);
// console.log("pd info: " + JSON.stringify(pd[pokemonName]));
// console.log("learnset: " + JSON.stringify(md.data.Learnsets[pokemonName].learnset));
// const learnset = md.data.Learnsets[pokemonName].learnset;
// const eligibleMoves = Object.keys(learnset).filter(moveName => learnset[moveName].find(moveSource => moveSource.startsWith("1")) != undefined);
// console.log("eligible moves: " + JSON.stringify(eligibleMoves));
// const randomMove = eligibleMoves[getRandomInt(0, eligibleMoves.length)];
// console.log("Randomly chosen move: " + randomMove);

// for (let i = 0; i < 10; i++) {
// 	const p = pickRandomPokemon();
// 	const m = pickRandomMove(p);
// 	console.log(`Chose ${p} with ${m}`);
// }

// Next step is to figure out how to pit a couple of Pokemon together in a battle...
const perfectEvs: StatsTable = {hp: 255, atk: 255, def: 255, spe: 255, spa: 255, spd: 255};
const perfectIvs: StatsTable = {hp: 31, atk: 31, def: 31, spe: 31, spa: 31, spd: 31};

function getBattleWinner(pset1: PokemonSet, pset2: PokemonSet): string | undefined {

	const battle = new Battle({
		formatid: Dex.getId("gen1custombattle"),
		p1: {name: "P1", team: [pset1]},
		p2: {name: "P2", team: [pset2]},
		strictChoices: true
	});

	battle.start();
	while (!battle.ended) {
		// battle.makeChoices(`move ${move1}`, `move ${move2}`);
		// console.log(`${battle.sides[0].pokemon[0].getHealth().secret} vs. ${battle.sides[1].pokemon[0].getHealth().secret}`);
		battle.makeChoices();
		// battle.choose();
		// console.log(`Turn: ${battle.turn}`);
		if (battle.turn === 1000) {
			break;
		}
	}
	const winner = battle.winner;

	console.log(`${winner} won after ${battle.turn} turns`);
	// Eventually...
	battle.destroy();
	return winner;
}

// Case to look into: Venusaur with Solarbeam losing to Jigglypuff with Disable
function runRandomBattle() {
	const p1 = pickRandomPokemon();
	const move1 = pickRandomMove(p1);
	const popt1: PokemonSet = {
		name: p1,
		species: p1,
		item: "",
		ability: "",
		moves: [move1],
		nature: "",
		gender: "",
		evs: perfectEvs,
		ivs: perfectIvs,
		level: 100
	};
	const p2 = pickRandomPokemon();
	const move2 = pickRandomMove(p2);
	const popt2: PokemonSet = {
		name: p2,
		species: p2,
		item: "",
		ability: "",
		moves: [move2],
		nature: "",
		gender: "",
		evs: perfectEvs,
		ivs: perfectIvs,
		level: 100
	};

	console.log(`${p1} with ${move1} (PP ${Dex.getMove(move1).pp}) vs. ${p2} with ${move2} (PP ${Dex.getMove(move2).pp})`);

	const winCounts = {p1: 0, p2: 0};
	for (let i = 0; i < 10; i++) {
		const winner = getBattleWinner(popt1, popt2);
		// console.log(`Winner: ${winner}`);
		if (winner != undefined) {
			winCounts[winner as "p1" | "p2"]++;
		}
	}
	console.log(`Win counts: ${JSON.stringify(winCounts)}`);

}

for (let i = 0; i < 10; i++) {
	runRandomBattle();
}
