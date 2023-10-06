import { CONFIG } from "../CONFIG";

export class DirectionHelpers {
  static isOppositeDirection(currentDirection: number, newDirection: number): boolean {
    switch (currentDirection) {
      case CONFIG.DIRECTIONS.STOP:
        return false;
      case CONFIG.DIRECTIONS.LEFT:
        return newDirection === CONFIG.DIRECTIONS.RIGHT;
      case CONFIG.DIRECTIONS.RIGHT:
        return newDirection === CONFIG.DIRECTIONS.LEFT;
      case CONFIG.DIRECTIONS.UP:
        return newDirection === CONFIG.DIRECTIONS.DOWN;
      case CONFIG.DIRECTIONS.DOWN:
        return newDirection === CONFIG.DIRECTIONS.UP;
    }
  }

  static GetNextValidTile(currentTile: number, direction: number): number {
    if (currentTile === undefined || direction === undefined || direction === CONFIG.DIRECTIONS.STOP) {
      return currentTile;
    }
    const size = 25; // size of the 2D array

    // Convert tile number to 2D coordinates
    const row = Math.floor(currentTile / size);
    const col = currentTile % size;

    let newRow = row;
    let newCol = col;

    // Adjust coordinates based on direction
    switch (direction) {
      case CONFIG.DIRECTIONS.UP:
        newRow -= 1;
        break;
      case CONFIG.DIRECTIONS.DOWN:
        newRow += 1;
        break;
      case CONFIG.DIRECTIONS.LEFT:
        newCol -= 1;
        break;
      case CONFIG.DIRECTIONS.RIGHT:
        newCol += 1;
        break;
    }

    // Check if the new coordinates are out of bounds
    if (newRow < 0 || newRow >= size || newCol < 0 || newCol >= size) {
      return currentTile; // Return current tile if out of bounds
    }

    // Convert 2D coordinates back to a single tile number
    return newRow * size + newCol;
  }
}


