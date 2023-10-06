
import Phaser from "phaser";
import { Room, Client } from "colyseus.js";
import { BACKEND_URL } from "../backend";
import { CONFIG } from "../../../server/src/CONFIG";

export class Part5Scene extends Phaser.Scene {
  room: Room;

  currentPlayer: Phaser.GameObjects.Sprite; //Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
  playerEntities: { [sessionId: string]: Phaser.GameObjects.Sprite } = {};

  debugFPS: Phaser.GameObjects.Text;

  localRef: Phaser.GameObjects.Rectangle;
  remoteRef: Phaser.GameObjects.Rectangle;

  cursorKeys: Phaser.Types.Input.Keyboard.CursorKeys;

  inputPayload = {
    left: false,
    right: false,
    up: false,
    down: false,
    tick: undefined,
  };

  elapsedTime = 0;
  fixedTimeStep = 5000;

  currentTick: number = 0;

  constructor() {
    super({ key: "part5" });
  }

  preload() {
    this.load.image('tiles', 'assets/gridtiles.png');
    this.load.spritesheet('tilesheet', 'assets/gridtiles.png', { frameWidth: 32, frameHeight: 32 });
  }

  async create() {
    this.cursorKeys = this.input.keyboard.createCursorKeys();
    this.debugFPS = this.add.text(4, 4, "", { color: "#ff0000", });

    // connect with the room
    await this.connect();

    this.load;

    this.room.onStateChange((state) => {
      console.log(this.room.name, "has new state:", state);
    });



    this.room.state.players.onAdd((player, sessionId) => {
      const entity = this.add.sprite(16, 16, 'tilesheet', 2);
      this.playerEntities[sessionId] = entity;

      const data = this.makeTiles(this.room.state.encodedMap.map(n => n))
      const tilemap = this.make.tilemap({ data: data, tileWidth: 32, tileHeight: 32 });
      const tileset = tilemap.addTilesetImage('tiles', 'tiles', 32, 32, 0, 0);
      const layer = tilemap.createLayer(0, tileset, 0, 0);

      // is current player
      if (sessionId === this.room.sessionId) {
        this.currentPlayer = entity;

        this.localRef = this.add.rectangle(0, 0, 32, 32);
        this.localRef.setStrokeStyle(1, 0x00ff00);

        this.remoteRef = this.add.rectangle(0, 0, 32, 32);
        this.remoteRef.setStrokeStyle(1, 0xff0000);

        player.onChange(() => {
          console.log('player.onChange', player);
          this.remoteRef.x = player.x;
          this.remoteRef.y = player.y;
        });

      } else {
        // listening for server updates
        player.onChange((_) => {
          console.log('player.onChange', _);
          //
          // we're going to LERP the positions during the render loop.
          //
          entity.setData('serverX', player.x);
          entity.setData('serverY', player.y);
        });
      }

    });

    // remove local reference when entity is removed from the server
    this.room.state.players.onRemove((player, sessionId) => {
      const entity = this.playerEntities[sessionId];
      if (entity) {
        entity.destroy();
        delete this.playerEntities[sessionId]
      }
    });

    // this.cameras.main.startFollow(this.ship, true, 0.2, 0.2);
    // this.cameras.main.setZoom(1);
    this.cameras.main.setBounds(0, 0, 600, 600);
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
      console.log('justdown');
      this.room.send(0, {
        direction: CONFIG.DIRECTIONS.LEFT,
        tick
      })
    } else if (Phaser.Input.Keyboard.JustDown(this.cursorKeys.right)) {
      console.log('justdown');

      this.room.send(0, {
        direction: CONFIG.DIRECTIONS.RIGHT, tick
      })
    } else if (Phaser.Input.Keyboard.JustDown(this.cursorKeys.up)) {
      this.room.send(0, {
        direction: CONFIG.DIRECTIONS.UP, tick
      })
    } else if (Phaser.Input.Keyboard.JustDown(this.cursorKeys.down)) {
      this.room.send(0, {
        direction: CONFIG.DIRECTIONS.DOWN, tick
      })
    } else if (Phaser.Input.Keyboard.JustDown(this.cursorKeys.space)) {
      this.room.send(0, {
        direction: CONFIG.DIRECTIONS.STOP, tick
      })
    }



    while (this.elapsedTime >= this.fixedTimeStep) {
      this.elapsedTime -= this.fixedTimeStep;
      this.fixedTick(time, this.fixedTimeStep);
    }

    this.debugFPS.text = `Frame rate: ${this.game.loop.actualFps}`;
  }

  makeTiles(encodedMap: number[]): number[][] {
    // Split array into chunks of 10
    const chunkedArray = [];
    for (let i = 0; i < encodedMap.length; i += 25) {
      chunkedArray.push(encodedMap.slice(i, i + 25));
    }
    return chunkedArray;
  }

  fixedTick(time, delta) {
    this.currentTick++;

    // const currentPlayerRemote = this.room.state.players.get(this.room.sessionId);
    // const ticksBehind = this.currentTick - currentPlayerRemote.tick;
    // console.log({ ticksBehind });

    // const velocity = 2;
    // this.inputPayload.left = this.cursorKeys.left.isDown;
    // this.inputPayload.right = this.cursorKeys.right.isDown;
    // this.inputPayload.up = this.cursorKeys.up.isDown;
    // this.inputPayload.down = this.cursorKeys.down.isDown;
    // this.inputPayload.tick = this.currentTick;
    this.room.send(0, this.cursorKeys.down.isDown);

    // if (this.inputPayload.left) {
    //     this.currentPlayer.x -= velocity;

    // } else if (this.inputPayload.right) {
    //     this.currentPlayer.x += velocity;
    // }

    // if (this.inputPayload.up) {
    //     this.currentPlayer.y -= velocity;

    // } else if (this.inputPayload.down) {
    //     this.currentPlayer.y += velocity;
    // }

    this.localRef.x = this.currentPlayer.x;
    this.localRef.y = this.currentPlayer.y;

    for (let sessionId in this.playerEntities) {
      // interpolate all player entities
      // (except the current player)
      if (sessionId === this.room.sessionId) {
        continue;
      }

      const entity = this.playerEntities[sessionId];
      const { serverX, serverY } = entity.data.values;

      entity.x = Phaser.Math.Linear(entity.x, serverX, 0.2);
      entity.y = Phaser.Math.Linear(entity.y, serverY, 0.2);
    }

  }

}