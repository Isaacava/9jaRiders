import Phaser from "phaser";

const COLORS = {
  sky: 0x8fc7e8,
  road: 0x2a2b2d,
  roadEdge: 0x4a4b4d,
  lane: 0xf4e6b4,
  sand: 0xd2b184,
  bike: 0x0c7b72,
  bikeLight: 0xe8efe9,
  traffic: 0xffb84d,
  itemNitro: 0x38bdf8,
  itemShield: 0x7c3aed,
  itemSurge: 0xf97316,
  text: 0xf6f2e9
};

class AbokiPreviewScene extends Phaser.Scene {
  private road!: Phaser.GameObjects.Graphics;
  private rider!: Phaser.GameObjects.Container;
  private laneMarkers: Phaser.GameObjects.Rectangle[] = [];
  private traffic: Phaser.GameObjects.Container[] = [];
  private items: Phaser.GameObjects.Container[] = [];
  private speed = 0.56;
  private distance = 0;
  private multiplier = 1;
  private time = 0;

  constructor() {
    super("aboki-preview");
  }

  create() {
    this.cameras.main.setBackgroundColor(COLORS.sky);
    this.createRoad();
    this.createStreetDetails();
    this.createRider();
    this.createTraffic();
    this.createItems();
  }

  update(_time: number, delta: number) {
    const dt = delta / 16.6667;
    this.time += delta;
    this.distance += this.speed * dt;
    this.multiplier = Math.min(9.99, 1 + this.distance / 720);
    this.moveRoad(dt);
    this.moveTraffic(dt);
    this.moveItems(dt);
    this.animateRider();
  }

  private createRoad() {
    this.road = this.add.graphics();

    this.road.fillStyle(COLORS.sand, 1);
    this.road.fillRect(0, 0, 420, 760);

    this.road.fillStyle(COLORS.road, 1);
    this.road.fillRect(70, 0, 280, 760);

    this.road.fillStyle(COLORS.roadEdge, 1);
    this.road.fillRect(70, 0, 10, 760);
    this.road.fillRect(340, 0, 10, 760);

    this.road.fillStyle(COLORS.lane, 0.9);
    for (let y = -40; y < 800; y += 92) {
      this.road.fillRect(205, y, 10, 52);
    }
  }

  private createStreetDetails() {
    for (const y of [80, 260, 460, 650]) {
      const sign = this.add.rectangle(40, y, 26, 38, 0x335c67);
      sign.setStrokeStyle(2, 0xe8d6b5);
      const pole = this.add.rectangle(40, y + 31, 5, 58, 0x7b6a55);
      pole.setOrigin(0.5, 0);
    }

    for (const y of [140, 380, 600]) {
      const shop = this.add.rectangle(380, y, 52, 78, 0xa76c48);
      shop.setStrokeStyle(3, 0x593a2b);
      const roof = this.add.rectangle(380, y - 46, 62, 16, 0x133f4a);
      roof.setAngle(-2);
    }
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

    this.rider = this.add.container(210, 630, [
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
    const placements = [
      { x: 140, y: 170, color: 0xe66b58 },
      { x: 275, y: 330, color: 0xe6dfcf },
      { x: 125, y: 505, color: 0x4f7ea0 }
    ];

    placements.forEach(({ x, y, color }, index) => {
      const vehicle = this.add.container(x, y);
      const shell = this.add.rectangle(0, 0, 42, 70, color).setOrigin(0.5);
      shell.setStrokeStyle(3, 0x101316);

      const rear = this.add.rectangle(0, 25, 30, 7, 0x7b1f1f);
      const window = this.add.rectangle(0, -14, 28, 20, 0x26343b);
      window.setStrokeStyle(2, 0x101316);

      vehicle.add([shell, rear, window]);
      vehicle.setData("baseY", y);
      vehicle.setData("offset", index * 0.9);
      this.traffic.push(vehicle);
    });
  }

  private createItems() {
    const definitions = [
      { x: 135, y: 250, color: COLORS.itemNitro, label: "N" },
      { x: 285, y: 420, color: COLORS.itemShield, label: "S" },
      { x: 210, y: 95, color: COLORS.itemSurge, label: "×" }
    ];

    definitions.forEach(({ x, y, color, label }) => {
      const item = this.add.container(x, y);
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
      item.setData("phase", y);
      this.items.push(item);
    });
  }

  private moveRoad(dt: number) {
    for (const marker of this.laneMarkers) {
      marker.y += this.speed * dt * 3;
      if (marker.y > 760) marker.y = -40;
    }
  }

  private moveTraffic(dt: number) {
    for (const vehicle of this.traffic) {
      const wobble = Math.sin((this.time / 380) + (vehicle.getData("offset") as number)) * 0.6;
      vehicle.y += this.speed * dt * (2.2 + wobble);
      if (vehicle.y > 820) {
        vehicle.y = -90;
      }
    }
  }

  private moveItems(dt: number) {
    for (const item of this.items) {
      item.y += this.speed * dt * 2.15;
      item.rotation += 0.006 * dt;
      if (item.y > 820) {
        item.y = -80;
      }
    }
  }

  private animateRider() {
    const bob = Math.sin(this.time / 110) * 1.5;
    this.rider.y = 630 + bob;
  }
}

export function createGame(parent: HTMLElement) {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 420,
    height: 760,
    backgroundColor: "#8fc7e8",
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 420,
      height: 760
    },
    scene: AbokiPreviewScene,
    render: {
      antialias: true,
      roundPixels: true
    }
  });
}
