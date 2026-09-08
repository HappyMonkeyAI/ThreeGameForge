import type { GameAdapter } from '../packages/adapters/src/index.ts';
import type { NetworkCommand } from '../packages/networking/src/index.ts';

export type EchoesAdapterState = {
  mode: 'turn-based';
  turn: number;
  pendingActions: NetworkCommand[];
};

export type MrpgAdapterState = {
  mode: 'real-time';
  tick: number;
  pendingInputs: NetworkCommand[];
};

/** Contract fixture for Echoes; the game repository remains authoritative for turn rules. */
export const echoesAdapter: GameAdapter<EchoesAdapterState> = {
  id: 'echoes-of-aion',
  initialState: { mode: 'turn-based', turn: 0, pendingActions: [] },
  update: (state) => state,
  submitCommand: (state, command) => ({ ...state, pendingActions: [...state.pendingActions, command] }),
};

/** Contract fixture for MRPG Realms; the game repository remains authoritative for simulation. */
export const mrpgAdapter: GameAdapter<MrpgAdapterState> = {
  id: 'mrpg-realms',
  initialState: { mode: 'real-time', tick: 0, pendingInputs: [] },
  update: (state) => ({ ...state, tick: state.tick + 1 }),
  submitCommand: (state, command) => ({ ...state, pendingInputs: [...state.pendingInputs, command] }),
};
