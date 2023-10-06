import { IGameTileState } from "../rooms/GameRoomState";

export class MapTileEncoder {
  static decodeMap(encodedMap: number[]): IGameTileState[] {
    const map: IGameTileState[] = [];

    for (let i = 0; i < encodedMap.length; i++) {
      map.push(MapTileEncoder.decodeTileState(encodedMap[i]));
    }

    return map;
  }

  // TODO: This is a very expensive operation, we should only update the tiles that have changed.
  static encodeMap(decodedMap: IGameTileState[]): number[] {
    const encodedMap: number[] = [];

    for (let i = 0; i < decodedMap.length; i++) {
      encodedMap.push(MapTileEncoder.encodeTileState(decodedMap[i]));
    }

    return encodedMap;
  }

  static encodeTileState({ team, player, capturingPlayer, capturingTeam }:
    IGameTileState): number {
    return (team << 18) |
      (player << 10) |
      (capturingTeam << 8) |
      capturingPlayer;
  }

  static decodeTileState(encodedValue: number): IGameTileState {
    return {
      team: (encodedValue >> 18) & 3,
      player: (encodedValue >> 10) & 255,
      capturingTeam: (encodedValue >> 8) & 3,
      capturingPlayer: encodedValue & 255
    };
  }
}