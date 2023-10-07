import { MapSchema, Schema, ArraySchema, type } from '@colyseus/schema';
import { CONFIG } from '../CONFIG';

export interface InputData {
  direction: number; // 0 = up, 1 = right, 2 = down, 3 = left, 4 = none
  tick: number;
}

export class Player extends Schema {
  @type("uint8") id: number;
  @type("uint16") tile: number;
  @type("number") tick: number;
  @type("uint8") direction: number;
  @type("uint8") team: number;

  lastInput: InputData;
}

export class GameRoomState extends Schema {
  @type("uint16") totalTiles: number = CONFIG.TOTAL_TILES;
  @type("uint8") rows: number = CONFIG.ROWS;
  @type(["int32"]) encodedMap = new ArraySchema<number>(...new Array<number>(CONFIG.TOTAL_TILES).fill(0))
  @type({ map: Player }) players = new MapSchema<Player>();
}

export interface IGameTileState {
  team: number;
  player: number;
  capturingPlayer: number;
  capturingTeam: number;
}
