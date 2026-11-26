// Does the table fit a game? Used by the phone menu to explain, before the tap, why a game cannot start (the server still checks, ADR 0012).
import type { CatalogGame } from '../server/protocol.ts';

const controls = (n: number): string => `${n} ${n === 1 ? 'controle' : 'controles'}`;

/** `null` when `seated` controllers can start the game; otherwise a short reason in Portuguese (UI text, ADR 0008). */
export function tableProblem({ players }: Pick<CatalogGame, 'players'>, seated: number): string | null {
  if (seated < players.min) return `Precisa de ${controls(players.min)}. Conectados: ${seated}.`;
  if (seated > players.max) return `No máximo ${controls(players.max)}. Conectados: ${seated}.`;
  return null;
}
