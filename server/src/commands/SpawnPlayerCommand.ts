import { Command } from '@colyseus/command';
import { ArraySchema } from '@colyseus/schema';

import { CONFIG } from '../CONFIG';
import { MapTileEncoder } from '../encoders/MapTileEncoder';
import { GameRoom } from '../rooms/GameRoom';
import { IGameTileState, Player } from '../rooms/GameRoomState';
import { UpdateMapFromPlayerPositionCommand } from './UpdateMapFromPlayerPositionCmd';

export class SpawnPlayerCommand extends Command<GameRoom, {
  sessionId: string,
  respawn?: boolean
}> {

  constructor() {
    super();
  }

  execute({ sessionId, respawn }: this['payload']): Command[] {
    const decodedMap = MapTileEncoder.decodeMap(this.state.encodedMap);
    let player: Player;
    if (respawn) {
      player = this.state.players.get(sessionId);
    }

    if (!player) {
      player = new Player();
      player.id = this.getPlayerId(); // Get an unused player id
      player.direction = CONFIG.DIRECTIONS.STOP; // Start off stopped
      player.team = this.getPlayerTeam(); // Get a team for the player
    }

    // Remove player entirely from the map
    decodedMap.forEach((tile, index) => {
      if (tile.player === player.id) {
        tile.player = 0;
      }
      if (tile.capturingPlayer === player.id) {
        tile.capturingPlayer = 0;
      }
    });

    this.state.encodedMap = new ArraySchema<number>(...MapTileEncoder.encodeMap(decodedMap));

    // Assign new blocks
    const tilesIndexes = this.createSpawnBlock(decodedMap); // Get a block of tiles for the player to spawn in
    player.tile = tilesIndexes[4]; // Spawn in the middle of the block;

    // Give this blocks to the player now
    console.log(`Giving player ${player.id} tiles ${tilesIndexes}`)
    tilesIndexes.forEach((tileIndex) => {
      decodedMap[tileIndex].player = player.id;
      decodedMap[tileIndex].team = player.team;
    });

    // TODO: For some reason we need to update the map here, otherwise the decodedMap doesn't get updated.
    this.state.encodedMap = new ArraySchema<number>(...MapTileEncoder.encodeMap(decodedMap));

    this.state.players.set(sessionId, player);

    // Send a command to update the map with the state for this player.
    return [new UpdateMapFromPlayerPositionCommand(decodedMap).setPayload({ sessionId, player })];
  }


  private createSpawnBlock(decodedMap: IGameTileState[]): number[] {
    // Spawn player in the middle of a 3x3 set of tiles
    // The player will be in the middle tile
    // at least 3 tiles must be on the edge of the map.
    // we have 25*25 tiles, so the valid tiles are
    return this.generateRandomEdgeBlock();

  }

  /**
   * Players have ids 1-12. This function returns the next unused player id.
   * It handles cases where players have left the game and their ids are no longer in use.
   * @returns Unused player id
   */
  private getPlayerId() {
    const playerids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12]; // hardcode the ids for now
    const currentPlayerIds = Array.from(this.state.players.values()).map(p => p.id);
    return playerids.filter(id => !currentPlayerIds.includes(id))[0];
  }

  /**
   * Two teams
   */
  private getPlayerTeam() {
    const currentPlayerTeams = Array.from(this.state.players.values()).map(p => p.team);
    // get count of players on each team
    const team1Count = currentPlayerTeams.filter(t => t === 1).length;
    const team2Count = currentPlayerTeams.filter(t => t === 2).length;
    console.log(`Team 1 has ${team1Count} players, Team 2 has ${team2Count} players`);
    // return the team with the least players
    if (team1Count === team2Count) {
      return Math.random() < 0.5 ? 1 : 2;
    }
    return team1Count > team2Count ? 2 : 1;
  }

  /***
   * Returns an array of 6 tile indices that represent a 3x3 block of tiles on the edge of the map
   */
  private generateRandomEdgeBlock() {
    const gridSize = CONFIG.ROWS;
    const blockSize = 3;
    const maxStart = gridSize - blockSize;

    // Randomly choose an edge: 0 = top, 1 = bottom, 2 = left, 3 = right
    const edge = Math.floor(Math.random() * 4);

    let startX = 0;
    let startY = 0;

    switch (edge) {
      case 0: // Top
        startX = Math.floor(Math.random() * (maxStart + 1));
        startY = 0;
        break;
      case 1: // Bottom
        startX = Math.floor(Math.random() * (maxStart + 1));
        startY = maxStart - 1; // Adjusted to ensure 3 rows from the bottom
        break;
      case 2: // Left
        startX = 0;
        startY = Math.floor(Math.random() * (maxStart + 1));
        break;
      case 3: // Right
        startX = maxStart - 1; // Adjusted to ensure 3 columns from the right
        startY = Math.floor(Math.random() * (maxStart + 1));
        break;
    }

    const tileIndices = [];

    for (let y = 0; y < blockSize; y++) {
      for (let x = 0; x < blockSize; x++) {
        const index = (startY + y) * gridSize + (startX + x);
        tileIndices.push(index);
      }
    }

    return tileIndices;
  }
}