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

  execute({sessionId, player}: this['payload']): void {
    let input: InputData;

    // dequeue player inputs
    // Get the most current direction from the input queue and update the players
    // TODO: A queue might not be needed here... we could just use the last input.
    while (input = player.inputQueue.shift()) {
      if (!DirectionHelpers.isOppositeDirection(player.direction, input.direction)) {
        player.direction = input.direction;
      }
      player.tick = input.tick;
    }

    // Loop through all the players and update their positions based upon the most recent current direction
    player.tile = DirectionHelpers.GetNextValidTile(player.tile, player.direction);
  }

}