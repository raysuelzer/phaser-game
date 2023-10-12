import { Command } from '@colyseus/command';

import { GameRoom } from '../rooms/GameRoom';
import { SpawnPlayerCommand } from './SpawnPlayerCommand';
import { MapTileEncoder } from '../encoders/MapTileEncoder';
import { ArraySchema } from '@colyseus/schema';


export class PlayerKilledCommand extends Command<GameRoom, {
  playerId: number
}> {

  constructor() {
    super();
  }

  execute({ playerId }: this['payload']) {
   const [sessionId, player] = Array.from(this.state.players.entries()).find(([sessionId, player]) => {
      return player.id === playerId;
   });

    if (!player) {
      console.log(`Player ${playerId} not found`);
      return;
    }

    player.tile = -1;
    player.direction = 4;

    const decodedMap = MapTileEncoder.decodeMap(this.state.encodedMap);
    decodedMap.forEach((tile, index) => {
      if (tile.player === player.id) {
        tile.player = 0;
        tile.team = 0;
      }
      if (tile.capturingPlayer === player.id) {
        tile.capturingPlayer = 0;
        tile.capturingTeam = 0;
      }
    });

    // We may not need to do this.
    this.state.encodedMap = new ArraySchema<number>(...MapTileEncoder.encodeMap(decodedMap));

    this.state.players.set(sessionId, player);
    // Respawn with delay.
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([new SpawnPlayerCommand().setPayload({ sessionId, respawn: true })]);
      }, 3000);
    });
  }
}