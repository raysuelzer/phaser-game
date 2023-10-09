import { Command } from '@colyseus/command';

import { TileHelper } from '../helpers/TileHelper';
import { GameRoom } from '../rooms/GameRoom';
import { IGameTileState, Player } from '../rooms/GameRoomState';
import { FloodFillUtil } from '../helpers/FloodFillUtil';
import { CONFIG } from '../CONFIG';

export class UpdateMapFromPlayerPositionCommand extends Command<GameRoom, {
  sessionId: string,
  player: Player
}> {

  constructor(public decodedMap: IGameTileState[]) {
    super();
  }

  execute({ sessionId, player }: this['payload']) {
    const decodedMap = this.decodedMap;
    // Make sure that the player and the tile exist
    if (!this.checkCanContinue(player)) {
      return;
    }

    // Get the next tile the player is moving to
    // The map is not yet updated with the player at this position.
    // We need to check if the player is colliding with another player that is capturing the same tile.
    // Before we update the map with the player at this position.

    // TODO: Do a better copy
    const proposedTileCopy = JSON.parse(JSON.stringify(decodedMap[player.tile]))


    if (TileHelper.IsPlayerCollidingWithCapturingPlayer(proposedTileCopy, player)) {
      // The player is stopped on the tile they are capturing.
      // I guess, we just do nothing here.
      if (player.direction === 4) {
        return;
      }
      console.log('player is coliding')

      // The player is colliding with themselves and they die
      // all of the tiles they were capturing or captured are now free
      // COMMAND: murkPlayer(playerId: tile.capturingPlayer, assignTilesTo: null)
      if (proposedTileCopy.capturingPlayer === player.id) {
        this.decodedMap.forEach((tile, index) => {
          if (index === player.tile) {
            return;
          }

          if (tile.capturingPlayer === player.id) {
            tile.capturingPlayer = 0;
            tile.capturingTeam = 0;
          }
          if (tile.player === player.id) {
            tile.player = 0;
            tile.team = 0;
          };
        });
        return;
      }


      // The player is colliding with another player. They kill the player who was capturing.
      // and take the tiles that had been captured before to the other player.
      if (proposedTileCopy.capturingPlayer !== player.id) {
        // Loop through all the tiles and update any tiles that the player was capturing
        // or controlled to the player who was not capturing.
        this.decodedMap.forEach((tile) => {
          if (tile.capturingPlayer == 0) {
            return;
          }
          if (tile.player === proposedTileCopy.capturingPlayer) {
            tile.player = player.id;
            tile.team = player.team;
            tile.capturingPlayer = 0;
            tile.capturingTeam = 0;
          }
          if (tile.capturingPlayer === proposedTileCopy.capturingPlayer) {
            tile.capturingPlayer = 0;
            tile.capturingTeam = 0;
          }
        })
      }

      return;
    }


    // The player is on a tile that is controlled by their team.
    // They could also not have been capturing any tiles, but that's fine we can handle that
    // case by checking to see if the player was caputring any other tiles.
    // This means that the player has completed the capture of the tile block.
    if (TileHelper.IsCaptureComplete(proposedTileCopy, player)) {
      if (decodedMap.filter(r => r.capturingPlayer === player.id).length <= 1) {
        return;
      }
      console.log('Capture complete');

      // TODO: This needs to capture the entire tile block,
      // not just the tiles the player was capturing. We need to do math
      // to determine which tiles are within the bounds of all of the tiles the player was capturing.
      // We need to know all the tiles that the team controls.
      // We may to do some ray casting to determine which tiles are part of the block (cluster) of tiles
      decodedMap.forEach((tile) => {
        // For now, just capture the tiles the player was capturing before.
        // and assign to the new team.
        if (tile.capturingPlayer === player.id) {
          tile.team = player.team;
          tile.player = player.id;
          // No one is capturing these tiles anymore
          tile.capturingPlayer = 0;
          tile.capturingTeam = 0;
        }
      });

      const floodFillUtil = new FloodFillUtil(decodedMap.map(t => t.player), CONFIG.ROWS);
      const filledTiles = floodFillUtil.fillEnclosedSpaces(player.id);
      filledTiles.forEach((p, tileIndex) => {
        if (p === player.id) {
          decodedMap[tileIndex].player = player.id;
          decodedMap[tileIndex].team = player.team;
        }
      });
    }

    // The player is not colliding with another player that is capturing the same tile.
    // Check to see if they are capturing the tile.
    // If they are, then we need to update the map with the player capturing this position.
    if (TileHelper.IsPlayerCapturing(player, proposedTileCopy)) {
      decodedMap[player.tile].capturingPlayer = player.id;
      decodedMap[player.tile].capturingTeam = player.team;
      // proposedTileCopy.capturingTeam = player.team;
    }

  }


  private checkCanContinue(player: Player): boolean {
    if (player?.tile === undefined) {
      return false;
    }
    const tile = this.decodedMap[player.tile];
    if (!tile) {
      return false
    }

    return true;
  }

}