export class FloodFillUtility {
  private grid: number[];
  private width: number;

  constructor(grid: number[], width: number) {
      this.grid = grid;
      this.width = width;
  }

  private getIndex(x: number, y: number): number {
      return y * this.width + x;
  }

  private floodFill(x: number, y: number, targetValue: number, fillValue: number): void {
      const index = this.getIndex(x, y);

      if (x < 0 || x >= this.width || y < 0 || y >= this.grid.length / this.width) {
          return;
      }

      // If the current cell is the fill value or the target value, return
      if (this.grid[index] === fillValue || this.grid[index] === targetValue) {
          return;
      }

      this.grid[index] = fillValue;

      this.floodFill(x + 1, y, targetValue, fillValue);
      this.floodFill(x - 1, y, targetValue, fillValue);
      this.floodFill(x, y + 1, targetValue, fillValue);
      this.floodFill(x, y - 1, targetValue, fillValue);
  }

  public fillEnclosedSpaces(targetValue: number): void {
    const height = this.grid.length / this.width;
    const TEMP_FILL = -9999;  // A temporary value unlikely to be in the grid

    // Create a copy of the original grid
    const originalGrid = [...this.grid];

    // Start flood fill from the boundary cells to mark outside areas
    for (let i = 0; i < this.width; i++) {
        this.floodFill(i, 0, targetValue, TEMP_FILL);          // Top boundary
        this.floodFill(i, height - 1, targetValue, TEMP_FILL); // Bottom boundary
    }
    for (let j = 0; j < height; j++) {
        this.floodFill(0, j, targetValue, TEMP_FILL);          // Left boundary
        this.floodFill(this.width - 1, j, targetValue, TEMP_FILL); // Right boundary
    }

    // Restore original values where the cell is not TEMP_FILL, otherwise set to targetValue
    for (let i = 0; i < this.grid.length; i++) {
        if (this.grid[i] === TEMP_FILL) {
            this.grid[i] = originalGrid[i];;
        } else {
            this.grid[i] = targetValue
        }
    }
      // const height = this.grid.length / this.width;
      // const TEMP_FILL = -9999;  // A temporary value unlikely to be in the grid
      // const boundaryOriginalValues: Map<number, number> = new Map();

      // // Store original values of the boundary cells and start flood fill from them
      // for (let i = 0; i < this.width; i++) {
      //     boundaryOriginalValues.set(this.getIndex(i, 0), this.grid[this.getIndex(i, 0)]);
      //     boundaryOriginalValues.set(this.getIndex(i, height - 1), this.grid[this.getIndex(i, height - 1)]);
      //     this.floodFill(i, 0, targetValue, TEMP_FILL);          // Top boundary
      //     this.floodFill(i, height - 1, targetValue, TEMP_FILL); // Bottom boundary
      // }
      // for (let j = 0; j < height; j++) {
      //     boundaryOriginalValues.set(this.getIndex(0, j), this.grid[this.getIndex(0, j)]);
      //     boundaryOriginalValues.set(this.getIndex(this.width - 1, j), this.grid[this.getIndex(this.width - 1, j)]);
      //     this.floodFill(0, j, targetValue, TEMP_FILL);          // Left boundary
      //     this.floodFill(this.width - 1, j, targetValue, TEMP_FILL); // Right boundary
      // }

      // // Any cell that hasn't been marked (and isn't the bounding value) is inside an enclosed area
      // for (let i = 0; i < this.grid.length; i++) {
      //     if (this.grid[i] !== targetValue && this.grid[i] !== TEMP_FILL) {
      //         this.grid[i] = targetValue;
      //     }
      // }

      // Restore the boundary cells to their original values
      // boundaryOriginalValues.forEach((value, key) => {
      //     this.grid[key] = value;
      // });
  }
}