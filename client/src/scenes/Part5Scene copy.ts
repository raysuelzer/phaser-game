import Phaser, { Tweens } from "phaser";
import { Room, Client } from "colyseus.js";
import { BACKEND_URL } from "../backend";
import { CONFIG } from "../../../server/src/CONFIG";
import { MapTileEncoder } from "../../../server/src/encoders/MapTileEncoder";
import { DirectionHelpers } from "../../../server/src/helpers/DirectionHelpers";

import { TileHelpers } from "../helpers/TileHelpers";
import { CONSTANTS } from "../CONSTANTS";

export class Part5Scene extends Phaser.Scene {
  room: Room;
  tilemap: Phaser.Tilemaps.Tilemap;
  tilemapLayer: Phaser.Tilemaps.TilemapLayer;

  currentPlayer: Phaser.GameObjects.Rectangle
  playerEntities: { [sessionId: string]: Phaser.GameObjects.Rectangle; } = {};

  debugFPS: Phaser.GameObjects.Text;

  localRef: Phaser.GameObjects.Rectangle;
  remoteRef: Phaser.GameObjects.Rectangle;

  cursorKeys: Phaser.Types.Input.Keyboard.CursorKeys;

  currentPlayerDirection: number = 4;
  currentPlayerTile: number;

  inputPayload = {
    left: false,
    right: false,
    up: false,
    down: false,
    tick: undefined,
  };

  elapsedTime = 0;
  fixedTimeStep = 500;

  currentTick: number = 0;

  constructor() {
    super({ key: "part5" });
  }

  preload() {
    this.load.image('tiles', 'assets/gridtiles.png');
    this.load.image('ship_0001', 'assets/ship_0001.png');
    this.load.spritesheet('tilesheet', 'assets/gridtiles.png', { frameWidth: 32, frameHeight: 32 });
  }

  async create() {
    this.cursorKeys = this.input.keyboard.createCursorKeys();
    // connect with the room
    await this.connect();
    if (!this.tilemap && !this.tilemapLayer) {
      // const data = this.room.state.encodedData.map(n => 0);
      // console.log(data);
      this.tilemap = this.make.tilemap({
        data: this.makeTiles(new Array<number>(CONFIG.TOTAL_TILES).fill(20)), tileWidth: 32, tileHeight: 32
      });
      const tileset = this.tilemap.addTilesetImage('tiles', 'tiles', 32, 32, 0, 0);
      this.tilemapLayer = this.tilemap.createLayer(0, tileset, 0, 0);
    }

    this.room.state.players.onAdd((player, sessionId) => {
      const coords = TileHelpers.GetXYPointOnWorldFromTileIndex(this.tilemap, player.tile, CONSTANTS.ROWS);
      const entity = this.add.rectangle(coords.x, coords.y, 32, 32, 0x0000ff, 0.5);
      this.playerEntities[sessionId] = entity;

      // is current player
      if (sessionId === this.room.sessionId) {
        this.currentPlayer = entity;

        this.localRef = this.add.rectangle(coords.x, coords.y, 32, 32, 0x00ffff, 0.5);

        this.remoteRef = this.add.rectangle(coords.x, coords.y, 32, 32);
        this.remoteRef.setStrokeStyle(1, 0xff0000);

        player.onChange(() => {
          this.currentPlayerTile = player.tile;
          this.tweens.killTweensOf({ targets: this.currentPlayer });
          const { x, y } = TileHelpers.GetXYPointOnWorldFromTileIndex(this.tilemap, player.tile, CONSTANTS.ROWS);
          this.remoteRef.x = x;
          this.remoteRef.y = y;
        });

      } else {
        // listening for server updates
        player.onChange((_) => {
          console.log(`player ${player.id} is on tile ${player.tile} moving ${player.direction}`);
          //
          // TODO: we're going to LERP the positions during the render loop.
          //
          // entity.setData('serverX', player.x);
          // entity.setData('serverY', player.y);
        });
      }

      // this.room.onStateChange((state) => {
      //   console.log('updating tilemap')
      //   console.log(state.encodedMap.map(n => n).filter(n => n !== 0).map(n => MapTileEncoder.decodeTileState(n)));

      //   this.updateTilemap(state.encodedMap.map(n => n));
      // });

    });


    // remove local reference when entity is removed from the server
    this.room.state.players.onRemove((player, sessionId) => {
      const entity = this.playerEntities[sessionId];
      if (entity) {
        entity.destroy();
        delete this.playerEntities[sessionId]
      }
    });


    this.room.state.onChange((state) => {
      console.log(state);
      this.updateTilemap(this.room.state.encodedMap.map(n => n));
    });

    // this.cameras.main.startFollow(this.ship, true, 0.2, 0.2);
    // this.cameras.main.setZoom(1);
    // this.cameras.main.setBounds(0, 0, 600, 600);
  }

  async connect() {
    // add connection status text
    const connectionStatusText = this.add
      .text(0, 0, "Trying to connect with the server...")
      .setStyle({ color: "#ff0000" })
      .setPadding(4)

    const client = new Client(BACKEND_URL);

    try {
      this.room = await client.joinOrCreate("gameroom", {});

      // connection successful!
      connectionStatusText.destroy();

    } catch (e) {
      // couldn't connect
      connectionStatusText.text = "Could not connect with the server.";
    }

  }

  update(time: number, delta: number): void {
    // skip loop if not connected yet.
    if (!this.currentPlayer) {
      console.log('no player yet');
      return;
    }


    this.elapsedTime += delta;

    const tick = this.currentTick++;
    if (Phaser.Input.Keyboard.JustDown(this.cursorKeys.left)) {
      // Trying to cancel any current tween?
      this.tweens.killTweensOf({ targets: this.currentPlayer });
      this.currentPlayerDirection = CONFIG.DIRECTIONS.LEFT;
      this.room.send(0, {
        direction: CONFIG.DIRECTIONS.LEFT,
        tick
      })
    } else if (Phaser.Input.Keyboard.JustDown(this.cursorKeys.right)) {
      this.currentPlayerDirection = CONFIG.DIRECTIONS.RIGHT;
      this.tweens.killTweensOf({ targets: this.currentPlayer });
      this.room.send(0, {
        direction: CONFIG.DIRECTIONS.RIGHT, tick
      })
    } else if (Phaser.Input.Keyboard.JustDown(this.cursorKeys.up)) {
      this.currentPlayerDirection = CONFIG.DIRECTIONS.UP;
      this.tweens.killTweensOf({ targets: this.currentPlayer });
      this.room.send(0, {
        direction: CONFIG.DIRECTIONS.UP, tick
      })
    } else if (Phaser.Input.Keyboard.JustDown(this.cursorKeys.down)) {
      this.currentPlayerDirection = CONFIG.DIRECTIONS.DOWN;
      this.tweens.killTweensOf({ targets: this.currentPlayer });
      this.room.send(0, {
        direction: CONFIG.DIRECTIONS.DOWN, tick
      })
    } else if (Phaser.Input.Keyboard.JustDown(this.cursorKeys.space)) {
      this.currentPlayerDirection = CONFIG.DIRECTIONS.STOP;
      this.tweens.killTweensOf({ targets: this.currentPlayer });
      this.room.send(0, {
        direction: CONFIG.DIRECTIONS.STOP, tick
      })
    }

    while (this.elapsedTime >= this.fixedTimeStep) {
      this.elapsedTime -= this.fixedTimeStep;
      this.fixedTick(time, this.fixedTimeStep);
    }

    // this.debugFPS.text = `Frame rate: ${this.game.loop.actualFps}`;
  }

  updateTilemap(encodedData) {
    // if (!this.tilemap && !this.tilemapLayer) {
    //   this.tilemap = this.make.tilemap({
    //     data:
    //       encodedData.map(n => 0)
    //     , tileWidth: 32, tileHeight: 32
    //   });
    //   const tileset = this.tilemap.addTilesetImage('tiles', 'tiles', 32, 32, 0, 0);
    //   this.tilemapLayer = this.tilemap.createLayer(0, tileset, 0, 0);
    // }
    const gridSize = 25; // Since it's a 25x25 grid

    for (let i = 0; i < encodedData.length; i++) {
      const x = i % gridSize;
      const y = Math.floor(i / gridSize);
      const newValue = encodedData[i];
      const tileSpriteIndex = TileHelpers.GetTileSpriteIndex(newValue);

      this.tilemap.putTileAt(tileSpriteIndex, x, y, true, this.tilemapLayer);
    }
  }

  makeTiles(encodedMap: number[]): number[][] {
    const decoded = MapTileEncoder.decodeMap(encodedMap).map(n => n.capturingPlayer || 0);
    // Split array into chunks of 10
    const chunkedArray = [];
    for (let i = 0; i < decoded.length; i += 25) {
      chunkedArray.push(decoded.slice(i, i + 25));
    }
    return chunkedArray;
  }

  tweenPlayerMovement() {
    const nextValidTile = DirectionHelpers.GetNextValidTile(this.currentPlayerTile, this.currentPlayerDirection);
    if (nextValidTile === this.currentPlayerTile) { return; }
    const nextValidTileWorldPosition = TileHelpers.GetXYPointOnWorldFromTileIndex(this.tilemap, nextValidTile, CONFIG.ROWS)
    let { x: destinationX, y: destinationY } = nextValidTileWorldPosition;

    if (this.currentPlayerDirection !== CONFIG.DIRECTIONS.STOP) {
      switch (this.currentPlayerDirection) {
        case CONFIG.DIRECTIONS.LEFT:
          destinationX -= 32;
          break;
        case CONFIG.DIRECTIONS.RIGHT:
          destinationX += 32;
          break;
        case CONFIG.DIRECTIONS.UP:
          destinationY -= 32;
          break;
        case CONFIG.DIRECTIONS.DOWN:
          destinationY += 32;
          break;
        case CONFIG.DIRECTIONS.STOP:
          break;
    }

    this.tweens.add({
      targets: [this.currentPlayer],
      x: destinationX,
      y: destinationY,
      duration: 500, // Duration in milliseconds. Adjust as needed.
      ease: 'Linear' // Linear interpolation for constant speed.
    });
  }


  }

  fixedTick(time, delta) {
    this.currentTick++;

    this.tweenPlayerMovement();

    // const currentPlayerRemote = this.room.state.players.get(this.room.sessionId);
    // const ticksBehind = this.currentTick - currentPlayerRemote.tick;
    // console.log({ ticksBehind });




    // this.inputPayload.left = this.cursorKeys.left.isDown;
    // this.inputPayload.right = this.cursorKeys.right.isDown;
    // this.inputPayload.up = this.cursorKeys.up.isDown;
    // this.inputPayload.down = this.cursorKeys.down.isDown;
    // this.inputPayload.tick = this.currentTick;
    // this.room.send(0, this.cursorKeys.down.isDown);

    // if (this.inputPayload.left) {
    //     this.currentPlayer.x -= velocity;

    // } else if (this.inputPayload.right) {
    //     this.currentPlayer.x += velocity;
    // }

    // if (this.inputPayload.up) {
    //     this.currentPlayer.y -= velocity;

    // } else if (this.inputPayload.down) {
    //     this.currentPlayer.y += velocity;
    // // }

    // this.localRef.x = this.currentPlayer.x;
    // this.localRef.y = this.currentPlayer.y;

    // for (let sessionId in this.playerEntities) {
    //   // interpolate all player entities
    //   // (except the current player)
    //   if (sessionId === this.room.sessionId) {
    //     continue;
    //   }

    //   const entity = this.playerEntities[sessionId];
    //   const { serverX, serverY } = entity.data.values;

    //   entity.x = Phaser.Math.Linear(entity.x, serverX, 0.2);
    //   entity.y = Phaser.Math.Linear(entity.y, serverY, 0.2);
    // }

  }

}