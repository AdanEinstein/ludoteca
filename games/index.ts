// Game catalog (ADR 0006, 0012). A game is a folder `games/<id>/` registered here with one line.
import type { GameModule } from './types.ts';
import * as numbers from './numbers/logic.ts';

export const games: Record<string, GameModule> = { numbers };

/** Theme id -> name shown in the menu (Portuguese). Order here is the order in the menu. */
export const themes: Record<string, string> = { kids: 'Crianças', board: 'Tabuleiro' };
