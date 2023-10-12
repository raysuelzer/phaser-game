import { Dispatcher } from '@colyseus/command';
import { ArraySchema } from '@colyseus/schema';

import { Client, Room } from 'colyseus';

import { SpawnPlayerCommand } from '../commands/SpawnPlayerCommand';
import { UpdateMapFromPlayerPositionCommand } from '../commands/UpdateMapFromPlayerPositionCmd';
import { UpdatePlayerPositionCommand } from '../commands/UpdatePlayerPositionCommand';
import { MapTileEncoder } from '../encoders/MapTileEncoder';
import { GameRoomState } from './GameRoomState';

export class GameRoom extends Room<GameRoomState> {
  dispatcher = new Dispatcher(this);
  fixedTimeStep = 500;

  onCreate(options: any) {
    // this.patchRate = this.fixedTimeStep;
    this.setState(new GameRoomState());

    this.onMessage(0, (client, input) => {
      // handle player input
      const player = this.state.players.get(client.sessionId);

      // Update input
      player.lastInput = input;
    });

    let elapsedTime = 0;
    // Recalculate the map every 100ms
    this.setSimulationInterval((deltaTime) => {
      elapsedTime += deltaTime;

      while (elapsedTime >= this.fixedTimeStep) {
        elapsedTime -= this.fixedTimeStep;
        this.fixedTick(this.fixedTimeStep);
      }
    });
  }

  fixedTick(_timeStep: number) {
    const decodedMap = MapTileEncoder.decodeMap(this.state.encodedMap);
    // Update Player Positions

    this.state.players.forEach((player, sessionId) => {
      // TODO: Kill players with 0 tiles;

      // Position the player on the map, based upon the direction they are moving.
      // Note this does not update the map state, it just updates the players "future" position.
      // We will update the map state after we have updated all the players positions and handle
      // collisions and conflicts
      this.dispatcher.dispatch(new UpdatePlayerPositionCommand(decodedMap), {
        sessionId, player
      });

      // This command will update the map based upon the player position.
      // It also handles collisions between players.
      // It mutates the decodedMap!
      // It also handles murdering the other players by dispatching another command
      this.dispatcher.dispatch(new UpdateMapFromPlayerPositionCommand(decodedMap), {
        sessionId, player
      });
    });

    // Update the encoded map with the new map state.
    // TODO: Diff the map state and only update the tiles that have changed.
    this.state.assign({
      encodedMap: new ArraySchema<number>(...MapTileEncoder.encodeMap(decodedMap))
    })
  }

  onJoin(client: Client, options: any) {
    console.log(client.sessionId, "joined!");
    this.dispatcher.dispatch(new SpawnPlayerCommand(), { sessionId: client.sessionId })
  }

  onLeave(client: Client, consented: boolean) {
    this.state.players.delete(client.sessionId);
  }

  onDispose() {
    console.log("room", this.roomId, "disposing...");
  }

}
export { GameRoomState };

