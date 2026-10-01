import Phaser from "phaser";

const COLORS = {
  sky: 0x8fc7e8,
  road: 0x2a2b2d,
  roadEdge: 0x4a4b4d,
  lane: 0xf4e6b4,
  sand: 0xd2b184,
  bike: 0x0c7b72,
  bikeLight: 0xe8efe9,
  itemNitro: 0x38bdf8,
  itemShield: 0x7c3aed,
  itemSurge: 0xf97316
};

class AbokiPreviewScene extends Phaser.Scene {
  private road!: Phaser.GameObjects.Graphics;
  private rider!: Phaser.GameObjects.Container;
  private laneMarkers: Phaser.GameObjects.Rectangle[] = [];
  private traffic: Phaser.GameObjects.Container[] = [];
  private items: Phaser.GameObjects.Container[] = [];
  private roadWidth = 340;
  private roadLeft = 0;
  private roadRight = 0;
  private speed = 0.56;
  private distance = 0;
  private multiplier = 1;
  private time = 0;
  private lastWidth = 0;
  private lastHeight = 0;

  constructor() {
    super("aboki-preview");
  }

  create() {
    this.cameras.main.setBackgroundColor(COLORS.sky);
    this.buildRoad();
    this.createRider();
    this.createTraffic();
    this.createItems();

    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.handleResize({
      width: this.scale.width,
      height: this.scale.height
    } as Phaser.Structs.Size);
  }

  shutdown() {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
  }

  update(_time: number, delta: number) {
    const dt = delta / 16.6667;
    this.time += delta;
    this.distance += this.speed * dt;
    this.multiplier = Math.min(99.99, 1 + this.distance / 720);

    this.moveRoad(dt);
    this.moveTraffic(dt);
    this.moveItems(dt);
    this.animateRider();
  }

  private handleResize(size: Phaser.Structs.Size) {
    const width = Math.max(1, size.width);
    const height = Math.max(1, size.height);

    if (width === this.lastWidth && height === this.lastHeight) return;

    this.lastWidth = width;
    this.lastHeight = height;

    this.layoutScene(width, height);
  }

  private layoutScene(width: number, height: number) {
    this.roadWidth = Math.min(width * 0.64, height * 0.7, 430);
    this.roadLeft = (width - this.roadWidth) / 2;
    this.roadRight = this.roadLeft + this.roadWidth;

    this.road.clear();
    this.road.fillStyle(COLORS.sand, 1);
    this.road.fillRect(0, 0, width, height);

    this.road.fillStyle(COLORS.road, 1);
    this.road.fillRect(this.roadLeft, 0, this.roadWidth, height);

    this.road.fillStyle(COLORS.roadEdge, 1);
    this.road.fillRect(this.roadLeft, 0, 8, height);
    this.road.fillRect(this.roadRight - 8, 0, 8, height);

    const laneX = this.roadLeft + this.roadWidth / 2;
    const markerHeight = Math.max(34, Math.min(70, height * 0.09));
    const markerWidth = Math.max(7, Math.min(11, width * 0.012));

    if (this.laneMarkers.length === 0) {
      for (let y = -markerHeight; y < height + markerHeight; y += markerHeight * 1.75) {
        const marker = this.add.rectangle(laneX, y, markerWidth, markerHeight, COLORS.lane);
        marker.setAlpha(0.88);
        this.laneMarkers.push(marker);
      }
    }

    for (const marker of this.laneMarkers) {
      marker.x = laneX;
      marker.width = markerWidth;
      marker.height = markerHeight;
    }

    if (this.rider) {
      this.rider.x = laneX;
      this.rider.y = height * 0.82;
      this.rider.setScale(Math.max(0.75, Math.min(1.2, width / 420)));
    }

    const trafficPositions = [
      { lane: 0.25, progress: 0.23 },
      { lane: 0.72, progress: 0.45 },
      { lane: 0.36, progress: 0.68 }
    ];

    this.traffic.forEach((vehicle, index) => {
      const setup = trafficPositions[index];
      vehicle.x = this.roadLeft + this.roadWidth * setup.lane;
      vehicle.y = height * setup.progress;
      vehicle.setData("baseY", vehicle.y);
    });

    const itemPositions = [
      { lane: 0.25, progress: 0.38 },
      { lane: 0.72, progress: 0.58 },
      { lane: 0.5, progress: 0.16 }
    ];

    this.items.forEach((item, index) => {
      const setup = itemPositions[index];
      item.x = this.roadLeft + this.roadWidth * setup.lane;
      item.y = height * setup.progress;
    });
  }

  private buildRoad() {
    this.road = this.add.graphics();
  }

  private createRider() {
    const body = this.add.rectangle(0, 0, 34, 50, COLORS.bike).setOrigin(0.5);
    body.setStrokeStyle(3, 0x111417);

    const seat = this.add.rectangle(0, -1, 20, 23, 0x16191c);
    const helmet = this.add.circle(0, -28, 11, COLORS.bikeLight);
    helmet.setStrokeStyle(3, 0x111417);

    const front = this.add.rectangle(0, -20, 4, 12, 0xf6c453);
    const rear = this.add.rectangle(0, 20, 4, 8, 0xd95f4e);

    const wheelA = this.add.ellipse(-10, 25, 8, 18, 0x111417);
    const wheelB = this.add.ellipse(10, 25, 8, 18, 0x111417);

    this.rider = this.add.container(0, 0, [
      wheelA,
      wheelB,
      body,
      seat,
      helmet,
      front,
      rear
    ]);
  }

  private createTraffic() {
    const colors = [0xe66b58, 0xe6dfcf, 0x4f7ea0];

    colors.forEach((color, index) => {
      const vehicle = this.add.container(0, 0);
      const shell = this.add.rectangle(0, 0, 42, 70, color).setOrigin(0.5);
      shell.setStrokeStyle(3, 0x101316);

      const rear = this.add.rectangle(0, 25, 30, 7, 0x7b1f1f);
      const window = this.add.rectangle(0, -14, 28, 20, 0x26343b);
      window.setStrokeStyle(2, 0x101316);

      vehicle.add([shell, rear, window]);
      vehicle.setData("offset", index * 0.9);
      this.traffic.push(vehicle);
    });
  }

  private createItems() {
    const definitions = [
      { color: COLORS.itemNitro, label: "N" },
      { color: COLORS.itemShield, label: "S" },
      { color: COLORS.itemSurge, label: "×" }
    ];

    definitions.forEach(({ color, label }) => {
      const item = this.add.container(0, 0);
      const glow = this.add.circle(0, 0, 19, color, 0.15);
      const ring = this.add.circle(0, 0, 12, color, 0.9);
      ring.setStrokeStyle(2, 0xf9f1dc);
      const text = this.add.text(0, 0, label, {
        color: "#111417",
        fontFamily: "Arial",
        fontSize: "12px",
        fontStyle: "bold"
      }).setOrigin(0.5);

      item.add([glow, ring, text]);
      this.items.push(item);
    });
  }

  private moveRoad(dt: number) {
    const height = this.scale.height;
    for (const marker of this.laneMarkers) {
      marker.y += this.speed * dt * Math.max(2.4, height / 210);

      if (marker.y > height + 60) {
        marker.y = -60;
      }
    }
  }

  private moveTraffic(dt: number) {
    const height = this.scale.height;

    for (const vehicle of this.traffic) {
      const wobble = Math.sin((this.time / 380) + (vehicle.getData("offset") as number)) * 0.6;
      vehicle.y += this.speed * dt * (2.2 + wobble) * Math.max(0.75, height / 760);

      if (vehicle.y > height + 90) {
        vehicle.y = -100;
      }
    }
  }

  private moveItems(dt: number) {
    const height = this.scale.height;

    for (const item of this.items) {
      item.y += this.speed * dt * 2.15 * Math.max(0.75, height / 760);
      item.rotation += 0.006 * dt;

      if (item.y > height + 80) {
        item.y = -90;
      }
    }
  }

  private animateRider() {
    const bob = Math.sin(this.time / 110) * 1.5;
    this.rider.y += bob * 0.02;
  }
}

export function createGame(parent: HTMLElement) {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#8fc7e8",
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: parent.clientWidth || 960,
      height: parent.clientHeight || 540
    },
    scene: AbokiPreviewScene,
    render: {
      antialias: true,
      roundPixels: true
    }
  });
}
