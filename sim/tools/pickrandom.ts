import { shuffle } from "../../lib/utils";
import { Battle } from "../battle";
import { Dex, ModdedDex } from "../dex";
import * as child_process from "child_process";
import * as fs from "fs";

// TODO: Case to look into: Venusaur with Solarbeam losing to Jigglypuff with Disable

const md: ModdedDex = Dex.mod("gen1");
const pd = md.data.Pokedex;

const gen1PokemonNames = Object.keys(pd).slice(1, 152);
function getAllPokemonNames(gen: GenString): string[] {
	if (gen === "gen1") {
		return gen1PokemonNames;
	} else {
		assertNever(gen);
	}
}

const allPokemonNamesAllGens = Object.keys(pd);

function getRandomInt(min: number, max: number) {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
}

// TODO: Maybe profile to see if this is worth caching
function getLegalMovesFor(pokemonName: string): string[] {
	// console.log("mon is ", pokemonName);
	const learnset = md.data.Learnsets[pokemonName].learnset;
	// console.log("learnset is ", learnset);
	// md.data.Learnsets[pokemonName].learnset;
	const moves: Set<string> = new Set();
	for (const moveName in learnset) {
		if (learnset[moveName].find(moveSource => moveSource.startsWith("1")) != undefined) {
			moves.add(moveName);
		}
	}
	// Check for moves only learnable before evolving, which are not in the learnset
	const prevo = md.toID(md.species.get(pokemonName).prevo);
	if (prevo) {
		for (const prevoMove of getLegalMovesFor(prevo)) {
			moves.add(prevoMove);
		}
	}
	return Array.from(moves).sort();
}

// Next step is to figure out how to pit a couple of Pokemon together in a battle...
const perfectEvs: StatsTable = {hp: 255, atk: 255, def: 255, spe: 255, spa: 255, spd: 255};
// 30 is perfect for gen 1, 31 for later gens
const perfectIvs: StatsTable = {hp: 30, atk: 30, def: 30, spe: 30, spa: 30, spd: 30};


export function getBattleWinner(pokemon1: string, move1: string, pokemon2: string, move2: string): "p1" | "p2" | "dnf" {
	const pset1: PokemonSet = {
		name: pokemon1,
		species: pokemon1,
		item: "",
		ability: "",
		moves: [move1],
		nature: "",
		gender: "",
		evs: perfectEvs,
		ivs: perfectIvs,
		level: 100
	};

	const pset2: PokemonSet = {
		name: pokemon2,
		species: pokemon2,
		item: "",
		ability: "",
		moves: [move2],
		nature: "",
		gender: "",
		evs: perfectEvs,
		ivs: perfectIvs,
		level: 100
	};

	Dex.mod("gen1"); // THIS HAS SIDE EFFECTS, DO NOT REMOVE
	const moddedDex = Dex.forFormat("[Gen 1] Custom Game");
	const battleOptions = {
		formatid: moddedDex.toID("[Gen 1] Custom Game"),
		p1: {name: "p1", team: [pset1]},
		p2: {name: "p2", team: [pset2]},
		strictChoices: true
	};
	const battle = new Battle(battleOptions);

	// console.log(`About to start battle, ${pokemon1}/${move1} vs. ${pokemon2}/${move2}`);
	// battle.start();

	while (!battle.ended) {
		// battle.makeChoices(`move ${move1}`, `move ${move2}`);
		// console.log(`${battle.sides[0].pokemon[0].getHealth().secret} vs. ${battle.sides[1].pokemon[0].getHealth().secret}`);
		battle.makeChoices();
		// battle.choose();
		// console.log(`Turn: ${battle.turn}`);
		if (battle.turn === 200) {
			break;
		}
	}
	// for (const logline of battle.log) {
	// 	console.log(logline);
	// }
	const winner = battle.winner;

	// console.log(`${winner} won after ${battle.turn} turns`);
	// Eventually...
	battle.destroy();
	if (winner === "p1" || winner === "p2") {
		return winner;
	} else if (winner === undefined || winner === "") {
		return "dnf";
	}
	throw new Error(`Unexpected winner value '${winner}'`);
}


const NUM_WORKERS_FOR_TARGETED = 8;
function collectTargeted(statsDirectory: string, gen: GenString, combatants: string[], mode: TargetedWorkerMode, sampleSizeToReach: number) {
	if (!fs.existsSync(statsDirectory)) {
		fs.mkdirSync(statsDirectory);
	}
	if (fs.readdirSync(statsDirectory).length < 2) {
		// Make the files pre-emptively, so enumerating movesets is easier for the analyzer
		for (const pokemon of getAllPokemonNames(gen)) {
			for (const move of getLegalMovesFor(pokemon)) {
				makeEmptyFileIfAbsent(statsDirectory, pokemon, move);
			}
		}
	}

	// Divvy up work to workers
	const combatantsToDivvy: string[] = [];
	if (mode === "among") {
		combatantsToDivvy.push(...combatants);
	} else if (mode === "outside") {
		for (const pokemon of getAllPokemonNames(gen)) {
			for (const move of getLegalMovesFor(pokemon)) {
				combatantsToDivvy.push(`${pokemon}_${move}`);
			}
		}
	} else {
		assertNever(mode);
	}
	const partitions = [] as string[][];
	const numWorkers = NUM_WORKERS_FOR_TARGETED;
	for (let i = 0; i < numWorkers; i++) {
		partitions.push([]);
	}
	// TODO: Would be nice to weight these better -- snake draft?
	for (let i = 0; i < combatantsToDivvy.length; i++) {
		const assignedWorker = i % numWorkers;
		partitions[assignedWorker].push(combatantsToDivvy[i]);
	}

	// Start the workers, let them run
	for (let i = 0; i < numWorkers; i++) {
		if (partitions[i].length === 0) {
			continue;
		}
		child_process.execFile("node", ["dist/sim/tools/targeted-run-worker.js",
				// Arguments for targetedRunWorkerMain just below
				statsDirectory,
				gen,
				JSON.stringify(combatants),
				mode,
				`${sampleSizeToReach}`,
				JSON.stringify(partitions[i])],
		{maxBuffer: 50 * 1024 * 1024},
		(error, stdout, stderr) => {
				console.log(`Finished worker process ${i}`);
				if (error) {
					console.log("There was an error: ", error);
					throw error;
				}
			});
	}
}

function collectSpecificMatchups(statsDir: string, gen: GenString, matchupsWithTargets: MatchupWithTarget[]) {
	// TODO: Parallelize
	for (const matchup of matchupsWithTargets) {
		const [left, right, sampleSizeToReach] = matchup;
		const actualLeft = pickLeftmostCombatant(left, right);
		const actualRight = (left === actualLeft) ? right : left;
		const [pokemon, move] = actualLeft.split("_", 2);
		const pi1 = getAllPokemonNames(gen).indexOf(pokemon);
		const mi1 = getLegalMovesFor(pokemon).indexOf(move);
		if (pi1 < 0 || mi1 < 0) {
			throw new Error(`Something's wrong: ${pokemon}, ${move}, ${pi1}, ${mi1}`);
		}
		const [opp_p, opp_m] = actualRight.split("_", 2);
		let opponentPassFilter = (p: string, m: string) => p === opp_p && m === opp_m;
		collectBattleDataForChoice(statsDir, gen, pokemon, move, pi1, mi1, opponentPassFilter, sampleSizeToReach);
	}
}

function pickLeftmostCombatant(combatant1: string, combatant2: string): string {
	const [p1, m1] = combatant1.split("_", 2);
	const [p2, m2] = combatant2.split("_", 2);
	const pi1 = allPokemonNamesAllGens.indexOf(p1);
	const pi2 = allPokemonNamesAllGens.indexOf(p2);
	if (pi1 < pi2) {
		return combatant1;
	}
	if (pi2 < pi1) {
		return combatant2;
	}
	// Pokemon are the same, check the moves
	const moves = getLegalMovesFor(p1);
	const mi1 = moves.indexOf(m1);
	const mi2 = moves.indexOf(m2);
	if (mi1 <= mi2) {
		return combatant1;
	}
	return combatant2;
}

export function targetedRunWorkerMain(args: string[]) {
	if (args.length !== 6) {
		throw new Error("Expected exactly 6 args to the targeted run (per-thread) worker");
	}
	const statsDirectory = args[0];
	const gen = args[1] as GenString;
	const combatantsOfInterest = new Set<String>(JSON.parse(args[2]) as string[]);
	const mode = validateTargetedWorkerMode(args[3]);
	const sampleSizeToReach = Number.parseInt(args[4]);
	const combatantKeysToTest = JSON.parse(args[5]) as string[];

	for (const combatantKey of combatantKeysToTest) {
		const isOfInterest = combatantsOfInterest.has(combatantKey);
		if (!isOfInterest && mode === "among") {
			// Generally shouldn't happen...
			console.error(`Got assigned non-ingroup combatant ${combatantKey} but the mode is 'among'`);
			continue;
		}
		const [pokemon, move] = combatantKey.split("_", 2);
		const pi1 = allPokemonNamesAllGens.indexOf(pokemon);
		const mi1 = getLegalMovesFor(pokemon).indexOf(move);
		if (pi1 < 0 || mi1 < 0) {
			throw new Error(`Something's wrong: ${pokemon}, ${move}, ${pi1}, ${mi1}`);
		}
		let opponentPassFilter: (p: string, m: string) => boolean;
		if (mode === "among") {
			opponentPassFilter = (p: string, m: string) => combatantsOfInterest.has(`${p}_${m}`);
		} else if (mode === "outside") {
			if (isOfInterest) {
				opponentPassFilter = (_p: string, _m: string) => true;
			} else {
				opponentPassFilter = (p: string, m: string) => combatantsOfInterest.has(`${p}_${m}`);
			}
		} else {
			assertNever(mode);
		}
		collectBattleDataForChoice(statsDirectory, gen, pokemon, move, pi1, mi1, opponentPassFilter, sampleSizeToReach);
	}
}

type TargetedWorkerMode = "among" | "outside";
function validateTargetedWorkerMode(arg: string): TargetedWorkerMode {
	if (arg === "among" || arg === "outside") {
		return arg;
	}
	throw new Error(`Unrecognized mode ${arg}`);
}

function collectBattleDataForChoice(collectedStatsPath: string, gen: GenString, pokemon1: string, move1: string, pi1: number, mi1: number,
		opponentsPassFilter: (p2: string, m2: string) => boolean, targetRuns: number) {
	const allPokemonNames = getAllPokemonNames(gen);
	const winCountsByOpponent = loadExistingWinCountsByOpponent(collectedStatsPath, pokemon1, move1);
	for (let pi2 = pi1; pi2 < allPokemonNames.length; pi2++) {
		const pokemon2 = allPokemonNames[pi2];
		const moves2 = getLegalMovesFor(pokemon2);
		const movesStartingPoint = pi1 === pi2 ? mi1 + 1 : 0;
		let anythingChanged = false;
		for (let mi2 = movesStartingPoint; mi2 < moves2.length; mi2++) {
			const move2 = moves2[mi2];

			if (!opponentsPassFilter(pokemon2, move2)) {
				continue;
			}

			const oppId = pokemon2 + "_" + move2;

			const winCounts: WinCounts = oppId in winCountsByOpponent ? winCountsByOpponent[oppId] : {p1: 0, p2: 0, dnf: 0};
			const alreadyRunCount = winCounts.p1 + winCounts.p2 + winCounts.dnf;
			if (alreadyRunCount >= targetRuns) {
				continue;
			}
			anythingChanged = true;
			console.log(`${pokemon1} with ${move1} vs. ${pokemon2} with ${move2}`);

			for (let i = alreadyRunCount; i < targetRuns; i++) {
				const winner = getBattleWinner(pokemon1, move1, pokemon2, move2);
				if (winner != undefined) {
					winCounts[winner as "p1" | "p2"]++;
				}
			}
			console.log(`Win counts: ${JSON.stringify(winCounts)}`);
			winCountsByOpponent[oppId] = winCounts;
		}
		// console.log(`So far: ${JSON.stringify(winCountsByOpponent)}`);
		if (anythingChanged) {
			console.log("Saving...");
			writeToFile(collectedStatsPath, pokemon1, move1, winCountsByOpponent);
		}
	}
}

type WinCounts = { p1: number, p2: number, dnf: number };
type WinCountsByOpp = { [opponent: string]: WinCounts };

function loadExistingWinCountsByOpponent(collectedStatsPath: string, pokemon: string, move: string): WinCountsByOpp {
	const path = `${collectedStatsPath}/${pokemon}_${move}`;
	if (!fs.existsSync(path)) {
		return {};
	}
	const fileText = fs.readFileSync(path, { encoding: "utf8" });
	const wcbo: WinCountsByOpp = {};
	for (const line of fileText.split("\n")) {
		const lineParts = line.split(" ");
		if (lineParts.length === 4) {
			const oppCombatant = lineParts[0];
			const p1 = parseInt(lineParts[1]);
			const p2 = parseInt(lineParts[2]);
			const dnf = parseInt(lineParts[3]);

			wcbo[oppCombatant] = { p1, p2, dnf };
		} else if (lineParts.length > 1) {
			console.log("Invalid line in file " + path);
		}
	}
	return wcbo;
}

function makeEmptyFileIfAbsent(collectedStatsPath: string, pokemon: string, move: string) {
	if (!fs.existsSync(collectedStatsPath)) {
		fs.mkdirSync(collectedStatsPath);
	}
	const path = `${collectedStatsPath}/${pokemon}_${move}`;
	if (!fs.existsSync(path)) {
		fs.writeFileSync(path, "");
	}
}

function writeToFile(collectedStatsPath: string, pokemon: string, move: string, winCountsByOpponent: WinCountsByOpp) {
	if (!fs.existsSync(collectedStatsPath)) {
		fs.mkdirSync(collectedStatsPath);
	}
	const path = `${collectedStatsPath}/${pokemon}_${move}`;
	const contentLines: string[] = [];
	for (const opponent in winCountsByOpponent) {
		const winCounts = winCountsByOpponent[opponent];
		const line = `${opponent} ${winCounts.p1} ${winCounts.p2} ${winCounts.dnf}`;
		contentLines.push(line);
	}
	const contentText = contentLines.join("\n");
	fs.writeFileSync(path, contentText);
}

export interface TargetedCollectorArgs {
	gen: number;
	type: string;
	extraArgs: string[];
}

export type MatchupWithTarget = [left: string, right: string, target: number];

export type GenString = "gen1";

export function runTargetedCollection(args: TargetedCollectorArgs) {
	const gen: GenString | undefined = (args.gen === 1) ? "gen1" : undefined;
	if (gen === undefined) {
		throw new Error(`Generation ${args.gen} not supported`);
	}

	if (args.type === "single_elim") {
		if (args.extraArgs.length !== 0) {
			throw new Error(`Expected zero extra args when using single_elim`);
		}
		const winner = getSingleElimTournamentWinner(gen);
		console.log(`winner: ${winner[0]}_${winner[1]}`);
	} else if (args.type === "collect_stats") {
		if (args.extraArgs.length !== 4) {
			throw new Error(`Expected four extra args when using collect_stats`);
		}
		const statsDir = args.extraArgs[0];
		const combatants = JSON.parse(args.extraArgs[1]) as string[];
		const mode = validateTargetedWorkerMode(args.extraArgs[2]);
		const sampleSizeToReach = Number.parseInt(args.extraArgs[3]);

		collectTargeted(statsDir, gen, combatants, mode, sampleSizeToReach);
	} else if (args.type === "specific_matchups") {
		if (args.extraArgs.length !== 2) {
			throw new Error(`Expected two extra args when using collect_stats`);
		}
		const statsDir = args.extraArgs[0];
		const matchupsWithTargets = JSON.parse(args.extraArgs[1]) as MatchupWithTarget[];

		collectSpecificMatchups(statsDir, gen, matchupsWithTargets);
	} else {
		throw new Error(`Unexpected type ${args.type}`);
	}
}

function assertNever(input: never): never {
	throw new Error(`Expected to never get here, but input was ${input}`);
}

function getSingleElimTournamentWinner(gen: GenString): Combatant {
	const allCombatants = listAllCombatants(gen);
	let curRound = [...allCombatants];
	shuffle(curRound);
	while (curRound.length > 1) {
		console.log(`Running a round of single-elimination with ${curRound.length} left...`);
		const nextRound = [] as Combatant[];
		for (let i = 0; i + 1 < curRound.length; i += 2) {
			const left = curRound[i];
			const right = curRound[i + 1];
			if (curRound.length <= 8) {
				console.log(`About to start battle, ${left[0]}/${left[1]} vs. ${right[0]}/${right[1]}`);
			}
			const winner = getBattleWinner(left[0], left[1], right[0], right[1]);
			if (winner === "p1") {
				nextRound.push(left);
			} else if (winner === "p2") {
				nextRound.push(right);
			} else {
				// Pick one at random to advance
				if (Math.random() < 0.5) {
					nextRound.push(left);
				} else {
					nextRound.push(right);
				}
			}
		}
		if (curRound.length % 2 === 1) {
			nextRound.push(curRound[curRound.length - 1]);
		}
		curRound = nextRound;
	}
	console.log(`Winner of the single-elimination tournament was ${curRound[0][0]} with ${curRound[0][1]}`);
	return curRound[0];
}

type Combatant = [pokemon: string, move: string];
function listAllCombatants(gen: GenString): Combatant[] {
	const result: Combatant[] = [];
	for (const pokemon of getAllPokemonNames(gen)) {
		for (const move of getLegalMovesFor(pokemon)) {
			result.push([pokemon, move]);
		}
	}
	return result;
}
