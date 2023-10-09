import { MapTileEncoder } from "../../../server/src/encoders/MapTileEncoder";

export class TileHelpers {

  static GetXYPointOnWorldFromTileIndex(tileMap: Phaser.Tilemaps.Tilemap, tileIndex: number, mapWidth: number): { x: number, y: number } {
    const { x, y } = TileHelpers.GetTileXYCoordinates(tileIndex, mapWidth);
    return TileHelpers.GetTileCenter(tileMap, x, y);
  }

  static GetTileXYCoordinates(index: number, mapWidth: number): { x: number, y: number } {
    const x = index % mapWidth;
    const y = Math.floor(index / mapWidth);
    return { x, y };
  }

  /**
  * Get the center coordinates of a tile.
  *
  * @param {Phaser.Tilemaps.Tilemap} tilemap - The tilemap.
  * @param {number} tileX - The x index of the tile.
  * @param {number} tileY - The y index of the tile.
  * @returns {Phaser.Math.Vector2} - The center coordinates.
  */
  static GetTileCenter(tilemap, tileX, tileY): { x: number, y: number } {
    const tileWidth = tilemap.tileWidth;
    const tileHeight = tilemap.tileHeight;

    const centerX = (tileX + 0.5) * tileWidth;
    const centerY = (tileY + 0.5) * tileHeight;

    return { x: centerX, y: centerY };

    return { x: centerX, y: centerY };
  }

  static GetTeamCapturedTileSpriteIndex(team: number): number {
    //28
    if (team === 1) {
      return 28;
    }

    if (team === 2) {
      return 67;
    }
  }

  static GetTileSpriteIndex(encodedTileData: number): number {
    // 0 = empty
    if (encodedTileData === 0) {
      return 0;
    }

    const data = MapTileEncoder.decodeTileState(encodedTileData);
    if (data.capturingTeam) {
      return TileHelpers.GetTeamCapturedTileSpriteIndex(data.capturingTeam) + data.capturingPlayer;
    }

    if (data.team) {
      return TileHelpers.GetTeamCapturedTileSpriteIndex(data.team);
    }

    return 0;
  }
}