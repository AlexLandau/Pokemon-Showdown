'use strict';

const assert = require('./../../assert');
const common = require('./../../common');

let battle;

describe('Struggle [Gen 1]', function () {
	afterEach(function () {
		battle.destroy();
	});

	// This passes, so I'm doing something wrong somewhere else
	it('should fail to hit Ghost-types', function () {
		battle = common.gen(1).createBattle({}, [
			[{species: "Gengar", moves: ['hyperbeam']}],
			[{species: "Gengar", moves: ['hyperbeam']}],
		], true);
		console.log(battle.p1.active[0].hp);
		console.log(battle.p1.active[0].maxhp);
		for (let i = 0; i < 8; i++) {
			battle.makeChoices('move hyperbeam', 'move hyperbeam');
		}
		battle.makeChoices('move struggle', 'move struggle');
		// assert.strictEqual(battle.p2.active[0].item, 'focussash');
		// console.log(Object.keys(battle.p1.active[0]));
		console.log(battle.p1.active[0].hp);
		console.log(battle.p1.active[0].maxhp);
		assert.strictEqual(battle.p1.active[0].hp, battle.p1.active[0].maxhp);
		assert.strictEqual(battle.p2.active[0].hp, battle.p2.active[0].maxhp);

		for (const logline of battle.log) {
			console.log(logline);
		}
	});
});
