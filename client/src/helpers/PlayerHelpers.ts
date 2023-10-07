export class PlayerHelpers {

  static getPlayerColor(player: number): number {
    const playerIndex = player - 1;
    const colors = [
      0xFF0000, // Red
      0x00FF00, // Green
      0x0000FF, // Blue
      0xFFFF00, // Yellow
      0x00FFFF, // Cyan
      0xFF00FF, // Magenta
      0xFFA500, // Orange
      0x800080, // Purple
      0xA52A2A, // Brown
      0xFFC0CB, // Pink
      0x008080, // Teal
      0x808000  // Olive
  ];


    return colors[playerIndex];

  }


}