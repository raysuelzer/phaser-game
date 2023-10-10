
import { Client, Room } from 'colyseus.js';
import Phaser from 'phaser';

import { CONFIG } from '../../../server/src/CONFIG';
import { MapTileEncoder } from '../../../server/src/encoders/MapTileEncoder';
import { BACKEND_URL } from '../backend';
import { CONSTANTS } from '../CONSTANTS';
import { PlayerHelpers } from '../helpers/PlayerHelpers';
import { TileHelpers } from '../helpers/TileHelpers';

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
    this.load.spritesheet('tilesheet', 'assets/gridtiles.png', { frameWidth: CONFIG.TILE_SIZE, frameHeight: CONFIG.TILE_SIZE });
  }


  async create() {
    this.cursorKeys = this.input.keyboard.createCursorKeys();
    // connect with the room
    await this.connect();
    if (!this.tilemap && !this.tilemapLayer) {
      this.tilemap = this.make.tilemap({
        data: this.makeTiles(new Array<number>(CONFIG.TOTAL_TILES).fill(20)), tileWidth: CONFIG.TILE_SIZE, tileHeight: CONFIG.TILE_SIZE
      });
      const tileset = this.tilemap.addTilesetImage('tiles', 'tiles', CONFIG.TILE_SIZE, CONFIG.TILE_SIZE, 0, 0);
      this.tilemapLayer = this.tilemap.createLayer(0, tileset, 0, 0);
    }

    this.room.state.players.onAdd((player, sessionId) => {
      const coords = TileHelpers.GetXYPointOnWorldFromTileIndex(this.tilemap, player.tile, CONSTANTS.ROWS);
      const entity = this.add.rectangle(coords.x, coords.y, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE, PlayerHelpers.getPlayerColor(player.id), 0.5);
      this.playerEntities[sessionId] = entity;

      // is current player
      if (sessionId === this.room.sessionId) {
        this.currentPlayer = entity;

        // this.localRef = this.add.rectangle(coords.x, coords.y, 32, 32, 0x00ffff, 0.5);

        this.remoteRef = this.add.rectangle(coords.x, coords.y, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
        this.remoteRef.setStrokeStyle(1, 0xff0000);

        player.onChange(() => {
          this.currentPlayerTile = player.tile;
          const { x, y } = TileHelpers.GetXYPointOnWorldFromTileIndex(this.tilemap, player.tile, CONSTANTS.ROWS);
          this.remoteRef.x = x;
          this.remoteRef.y = y;
        });

        this.startCameraFollow()

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
      Object.keys(this.playerEntities).forEach((sessionId) => {
        const entity = this.playerEntities[sessionId];
        const player = this.room.state.players.get(sessionId);
        if (player) {
          const coords = TileHelpers.GetXYPointOnWorldFromTileIndex(this.tilemap, player.tile, CONSTANTS.ROWS);
          entity.x = coords.x;
          entity.y = coords.y;
        }
        if (player.tile === -1) {
          // Hide the entity
          entity.setVisible(false);
        }
      });

      this.updateTilemap(this.room.state.encodedMap.map(n => n));
    });
  }

  startCameraFollow() {
    // Set the camera zoom level
    this.cameras.main.setZoom(2);

    // Start following the player
    this.cameras.main.startFollow(this.currentPlayer, true, 0.2, 0.2);

    // Set the bounds of the camera to the grid size
    this.cameras.main.setBounds(0, 0, 800, 800);

    // Optionally, set a deadzone (let's say 50 pixels from the edge)
    // The size of the deadzone would be (800/2 - 50*2) = 400-100 = 300.
    // Remember that the deadzone values are halved because of the zoom level.
    this.cameras.main.setDeadzone(300, 300);
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
      return;
    }


    this.elapsedTime += delta;

    const tick = this.currentTick++;
    if (Phaser.Input.Keyboard.JustDown(this.cursorKeys.left)) {
      // Trying to cancel any current tween?
      this.currentPlayerDirection = CONFIG.DIRECTIONS.LEFT;
      this.room.send(0, {
        direction: CONFIG.DIRECTIONS.LEFT,
        tick
      })
    } else if (Phaser.Input.Keyboard.JustDown(this.cursorKeys.right)) {
      this.currentPlayerDirection = CONFIG.DIRECTIONS.RIGHT;
      this.room.send(0, {
        direction: CONFIG.DIRECTIONS.RIGHT, tick
      })
    } else if (Phaser.Input.Keyboard.JustDown(this.cursorKeys.up)) {
      this.currentPlayerDirection = CONFIG.DIRECTIONS.UP;
      this.room.send(0, {
        direction: CONFIG.DIRECTIONS.UP, tick
      })
    } else if (Phaser.Input.Keyboard.JustDown(this.cursorKeys.down)) {
      this.currentPlayerDirection = CONFIG.DIRECTIONS.DOWN;
      this.room.send(0, {
        direction: CONFIG.DIRECTIONS.DOWN, tick
      })
    } else if (Phaser.Input.Keyboard.JustDown(this.cursorKeys.space)) {
      this.currentPlayerDirection = CONFIG.DIRECTIONS.STOP;
      this.room.send(0, {
        direction: CONFIG.DIRECTIONS.STOP, tick
      })
    }

    while (this.elapsedTime >= this.fixedTimeStep) {
      this.elapsedTime -= this.fixedTimeStep;
      this.fixedTick(time, this.fixedTimeStep);
    }
  }

  updateTilemap(encodedData) {
    const gridSize = CONSTANTS.ROWS;

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
    // this.tweens.killTweensOf({ targets: this.currentPlayer });
    // const nextValidTile = DirectionHelpers.GetNextValidTile(this.currentPlayerTile, this.currentPlayerDirection);
    // if (nextValidTile === this.currentPlayerTile) { return; }
    // const nextValidTileWorldPosition = TileHelpers.GetXYPointOnWorldFromTileIndex(this.tilemap, nextValidTile, CONFIG.ROWS)
    // let { x: destinationX, y: destinationY } = nextValidTileWorldPosition;

    // this.tweens.add({
    //   targets: [this.currentPlayer],
    //   x: destinationX,
    //   y: destinationY,
    //   duration: 500, // Duration in milliseconds. Adjust as needed.
    //   ease: 'Linear' // Linear interpolation for constant speed.
    // });
  }

  fixedTick(time, delta) {
    this.currentTick++;

    this.tweenPlayerMovement();
  }

}