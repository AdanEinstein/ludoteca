// Does the table fit the game? (phone menu, before the tap)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tableProblem } from '../table.ts';

test('tableProblem: null when it fits, otherwise says how many controllers are needed and how many are connected', () => {
  const solo = { players: { min: 1, max: 1 } };
  const duo = { players: { min: 2, max: 4 } };
  assert.equal(tableProblem(solo, 1), null);
  assert.equal(tableProblem(duo, 2), null);
  assert.equal(tableProblem(duo, 4), null);
  assert.equal(tableProblem(duo, 1), 'Precisa de 2 controles. Conectados: 1.');
  assert.equal(tableProblem(duo, 5), 'No máximo 4 controles. Conectados: 5.');
  assert.equal(tableProblem(solo, 2), 'No máximo 1 controle. Conectados: 2.');
  assert.equal(tableProblem({ players: { min: 1, max: 4 } }, 0), 'Precisa de 1 controle. Conectados: 0.');
});
