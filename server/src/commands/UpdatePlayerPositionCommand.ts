import { Command } from "@colyseus/command";
import { GameRoom } from "../rooms/GameRoom";
import { IGameTileState, InputData, Player } from "../rooms/GameRoomState";
import { DirectionHelpers } from "../helpers/DirectionHelpers";

export class UpdatePlayerPositionCommand extends Command<GameRoom, {
  sessionId: string,
  player: Player
}> {

  constructor(private decodedMap: IGameTileState[]) {
    super();
  }

  execute({ sessionId, player }: this['payload']): void {
    const input: InputData = player?.lastInput;
    if (!input) {
      return;
    }

    if (!DirectionHelpers.isOppositeDirection(player.direction, input.direction)) {
      player.direction = input.direction;
    }

    player.tick = input.tick;
    // Loop through all the players and update their positions based upon the most recent current direction
    player.tile = DirectionHelpers.GetNextValidTile(player.tile, player.direction);
  }

}