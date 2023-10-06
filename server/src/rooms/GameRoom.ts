import { Room, Client } from "colyseus";
import { MapSchema, Schema, ArraySchema, type } from '@colyseus/schema';

import { InputData, GameRoomState, Player, IGameTileState } from "./GameRoomState";
import { CONFIG } from "../CONFIG";
import { MapTileEncoder } from "../encoders/MapTileEncoder";
import { DirectionHelpers } from "../helpers/DirectionHelpers";
import { Dispatcher } from "@colyseus/command";
import { UpdatePlayerPositionCommand } from "../commands/UpdatePlayerPositionCommand";
import { UpdateMapFromPlayerPositionCommand } from "../commands/UpdateMapFromPlayerPositionCmd";


export class GameRoom extends Room<GameRoomState> {
  dispatcher = new Dispatcher(this);
  fixedTimeStep = 5000;

  onCreate(options: any) {
    this.setState(new GameRoomState());

    this.onMessage(0, (client, input) => {
      console.log('input received', client, input);
      // handle player input
      const player = this.state.players.get(client.sessionId);

      // enqueue input to user input buffer.
      player.inputQueue.push(input);
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
    this.state.assign({
      encodedMap: new ArraySchema<number>(...MapTileEncoder.encodeMap(decodedMap))
    })
  }

  updateMap(decodedMap: IGameTileState[], player: Player) {
    // Current state of tile player is on.
    if (player?.tile === undefined) {
      console.log(`player.tile is undefined ${player.tile}`)
      return;
    }

    const tile = decodedMap[player.tile];
    if (!tile) {
      return
    }
    tile.player = 1;

    if (tile === undefined) {
      console.log(`tile is undefined ${player.tile}`);
      return decodedMap;
    }

    // 1) Check for collisions with other caputring players. Figure out which player dies.
    //    i.e. If two players are trying to capture the same tile one of them dies.
    //    I think the logic here would be that if the other is not currently on that tile they are capturing, then they die.
    //  Example: Player 1 is capturing tiles 4,5,6,7 and Player 1 is currently on tile 7. Player 2 runs into tile 6, player 1 dies.

    // 2) Player is capturing another team's tile and no one else capturing it.
    if (player.team !== tile.team && tile.capturingPlayer === null) {
      tile.capturingPlayer = player.id;
      tile.capturingTeam = player.team;
    }

    // 3) Succesful capture of a tile block.

    // Player is on a tile that is controlled by their team
    // this will complete the capture of the tile block
    if (player.team === tile.team) {
      // TODO: This needs to capture the entire tile block,
      // not just the tiles the player was capturing. We need to do math
      // to determine which tiles are part of the block.
      decodedMap.forEach((tile) => {
        if (tile.capturingPlayer === player.id) {
          tile.team = player.team;
          tile.player = player.id;
          // Now occupied and available for capture
          tile.capturingPlayer = null;
          tile.capturingTeam = null;
        }
      });
    }
  }



  onJoin(client: Client, options: any) {
    console.log(client.sessionId, "joined!");

    const player = new Player();
    player.id = this.state.players.size + 1
    player.tile = 1;
    player.direction = CONFIG.DIRECTIONS.STOP;
    player.team = 1;

    this.state.players.set(client.sessionId, player);
    this.updateMap(MapTileEncoder.decodeMap(this.state.encodedMap), player);
  }

  onLeave(client: Client, consented: boolean) {
    this.state.players.delete(client.sessionId);
  }

  onDispose() {
    console.log("room", this.roomId, "disposing...");
  }

}
export { GameRoomState };

