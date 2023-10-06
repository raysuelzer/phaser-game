import { IGameTileState, Player } from "../rooms/GameRoomState";

export class TileHelper {

  static IsPlayerCapturing(player: Player, tile: IGameTileState) {
    return player.team !== tile.team && tile.capturingPlayer === null;
  }

  static IsCaptureComplete(tile: IGameTileState, player: Player) {
    return player.team === tile.team;
  }

  static IsPlayerCollidingWithCapturingPlayer(tile: IGameTileState, player: Player) {
    // Tile is techinically the tile which the player is moving to, the map has not yet put the player on that tile.
    // This means that we can calculate a collision here before the map is updated with the player at this position.
    // This is a really shit way to calculate a collision probably

    // The only way for a collision to occur is if the tile is currently being captured.
    if (tile.capturingPlayer !== null) {
      return false;
    }

    // The tile is being captured by anyone, including the current player it means there is a collision
    return true;
  }
}