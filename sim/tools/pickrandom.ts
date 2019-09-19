import { Dex, ModdedDex } from "../dex";

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
for (let i = 0; i < 10; i++) {
	const p = pickRandomPokemon();
	const m = pickRandomMove(p);
	console.log(`Chose ${p} with ${m}`);
}
