// Game catalog. Each game exports { meta, create, reduce } and has tv.ts and pad.ts with the views (ADR 0006).
import type { GameModule } from './types.ts';
import * as numbers from './numbers/logic.ts';

export const games: Record<string, GameModule> = { numbers };
export const defaultGame = 'numbers';
