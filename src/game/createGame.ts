import Phaser from "phaser";

type PowerUp = "nitro" | "shield" | "surge" | "mega";

const COLORS = {
  sky: 0x8fc7e8,
  road: 0x2a2b2d,
  roadEdge: 0x4a4b4d,
  lane: 0xf4e6b4,
  shoulder: 0xd2b184,
  bike: 0x0c7b72,
  bikeLight: 0xe8efe9,
  ink: 0x111417,
  nitro: 0x38bdf8,
  shield: 0x7c3aed,
  surge: 0xf97316,
  mega: 0xfacc15,
  traffic: [0xe66b58, 0xe6dfcf, 0x4f7ea0]
} as const;

const POWER_UPS: Record<PowerUp, { label: string; color: number; name: string }> = {
  nitro: { label: "N", color: COLORS.nitro, name: "NITRO" },
  shield: { label: "S", color: COLORS.shield, name: "SHIELD" },
  surge: { label: "×2", color: COLORS.surge, name: "SURGE" },
  mega: { label: "M", color: COLORS.mega, name: "MEGA BOOST" }
};

class AbokiRaceScene extends Phaser.Scene {
  private road!: Phaser.GameObjects.Graphics;
  private rider!: Phaser.GameObjects.Container;
  private riderGlow!: Phaser.GameObjects.Arc;
  private hudMultiplier!: Phaser.GameObjects.Text;
  private hudDistance!: Phaser.GameObjects.Text;
  private hudItem!: Phaser.GameObjects.Text;
  private hudMessage!: Phaser.GameObjects.Text;
  private countdownText!: Phaser.GameObjects.Text;
  private resultGroup?: Phaser.GameObjects.Group;
  private controlGroup?: Phaser.GameObjects.Group;
  private laneMarkers: Phaser.GameObjects.Rectangle[] = [];
  private traffic: Phaser.GameObjects.Container[] = [];
  private items: Phaser.GameObjects.Container[] = [];
  private keyboard?: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys: Record<string, Phaser.Input.Keyboard.Key> = {};
  private touchLeft = false;
  private touchRight = false;
  private touchBrake = false;
  private touchItem = false;
  private lane = 0;
  private roadWidth = 340;
  private roadLeft = 0;
  private roadRight = 0;
  private speed = 0;
  private baseSpeed = 5.4;
  private maxSpeed = 9;
  private steerSpeed = 360;
  private distance = 0;
  private goalDistance = 5000;
  private multiplier = 1;
  private multiplierRate = 0.012;
  private bestMultiplier = 1;
  private elapsed = 0;
  private raceStarted = false;
  private finished = false;
  private countdown = 3;
  private countdownTimer?: Phaser.Time.TimerEvent;
  private activeItem: PowerUp | null = null;
  private boostUntil = 0;
  private surgeUntil = 0;
  private shieldActive = false;
  private invulnerableUntil = 0;
  private itemRespawns = new Map<Phaser.GameObjects.Container, number>();
  private lastMissedTraffic = new Set<Phaser.GameObjects.Container>();
  private lastWidth = 0;
  private lastHeight = 0;

  constructor() {
    super("aboki-race");
  }

  create() {
    this.input.addPointer(2);
    this.keyboard = this.input.keyboard?.createCursorKeys();
    this.keys.space = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE) as Phaser.Input.Keyboard.Key;
    this.keys.e = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.E) as Phaser.Input.Keyboard.Key;
    this.keys.a = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.A) as Phaser.Input.Keyboard.Key;
    this.keys.d = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.D) as Phaser.Input.Keyboard.Key;
    this.keys.s = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.S) as Phaser.Input.Keyboard.Key;

    this.cameras.main.setBackgroundColor(COLORS.sky);
    this.createRoad();
    this.createRider();
    this.createTraffic();
    this.createItems();
    this.createHud();
    this.createTouchControls();

    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.handleResize({ width: this.scale.width, height: this.scale.height });

    this.startCountdown();
  }

  shutdown() {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.countdownTimer?.remove(false);
  }

  update(_time: number, delta: number) {
    const dt = delta / 1000;
    this.elapsed += delta;

    if (!this.raceStarted || this.finished) {
      this.animateRider();
      return;
    }

    const steering = this.getSteering();
    const braking = this.getBraking();

    if (this.keys.e?.isDown || this.keys.space?.isDown) {
      this.activateItem();
    }

    this.updatePlayer(dt, steering, braking);
    this.updateWorld(dt);
    this.updateItems(dt);
    this.updateTraffic(dt);
    this.updateMultiplier(dt);
    this.checkPickup();
    this.checkTrafficCollisions();
    this.updateHud();

    if (this.distance >= this.goalDistance) {
      this.finishRace();
    }
  }

  private startCountdown() {
    this.countdown = 3;
    this.countdownText.setText("3");
    this.countdownText.setVisible(true);

    this.countdownTimer = this.time.addEvent({
      delay: 800,
      repeat: 3,
      callback: () => {
        this.countdown -= 1;

        if (this.countdown > 0) {
          this.countdownText.setText(String(this.countdown));
        } else {
          this.countdownText.setText("GO!");
          this.raceStarted = true;
          this.speed = this.baseSpeed;

          this.time.delayedCall(650, () => {
            if (!this.finished) this.countdownText.setVisible(false);
          });
        }
      }
    });
  }

  private getSteering() {
    const left =
      this.touchLeft ||
      Boolean(this.keyboard?.left?.isDown) ||
      Boolean(this.keys.a?.isDown);
    const right =
      this.touchRight ||
      Boolean(this.keyboard?.right?.isDown) ||
      Boolean(this.keys.d?.isDown);

    return (right ? 1 : 0) - (left ? 1 : 0);
  }

  private getBraking() {
    return (
      this.touchBrake ||
      Boolean(this.keyboard?.down?.isDown) ||
      Boolean(this.keys.s?.isDown)
    );
  }

  private updatePlayer(dt: number, steering: number, braking: boolean) {
    const targetBaseSpeed = braking ? this.baseSpeed * 0.55 : this.baseSpeed;
    let targetSpeed = targetBaseSpeed;

    if (this.isBoosting()) {
      targetSpeed = this.activeItem === "mega" ? 10.8 : 9.4;
    }

    this.speed = Phaser.Math.Linear(this.speed, targetSpeed, Math.min(1, dt * 4));
    this.rider.x += steering * this.steerSpeed * dt;

    const minX = this.roadLeft + 42;
    const maxX = this.roadRight - 42;
    this.rider.x = Phaser.Math.Clamp(this.rider.x, minX, maxX);

    const lean = steering * 7;
    this.rider.angle = Phaser.Math.Linear(this.rider.angle, lean, Math.min(1, dt * 8));
  }

  private updateWorld(dt: number) {
    const roadSpeed = this.speed * dt * 58;
    const height = this.scale.height;

    for (const marker of this.laneMarkers) {
      marker.y += roadSpeed;

      if (marker.y > height + 60) marker.y = -60;
    }

    for (const vehicle of this.traffic) {
      vehicle.y += roadSpeed * (vehicle.getData("trafficSpeed") as number);

      if (vehicle.y > height + 90) {
        this.respawnTraffic(vehicle);
      }
    }

    this.distance += this.speed * dt * 9;
  }

  private updateTraffic(_dt: number) {
    for (const vehicle of this.traffic) {
      if (this.lastMissedTraffic.has(vehicle)) continue;

      if (vehicle.y > this.rider.y + 28) {
        const horizontalGap = Math.abs(vehicle.x - this.rider.x);

        if (horizontalGap < 72 && horizontalGap > 40) {
          this.lastMissedTraffic.add(vehicle);
          this.multiplier = Math.min(99.99, this.multiplier + 0.18);
          this.showMessage("NEAR MISS +0.18×");
        }
      }
    }
  }

  private updateItems(dt: number) {
    const height = this.scale.height;
    const roadSpeed = this.speed * dt * 52;

    for (const item of this.items) {
      const respawnAt = this.itemRespawns.get(item);

      if (respawnAt) {
        if (performance.now() >= respawnAt) {
          this.itemRespawns.delete(item);
          item.setVisible(true);
        } else {
          continue;
        }
      }

      item.y += roadSpeed;
      item.rotation += dt * 1.5;

      if (item.y > height + 80) {
        item.y = -90 - Phaser.Math.Between(0, 220);
      }
    }
  }

  private updateMultiplier(dt: number) {
    const rate = performance.now() < this.surgeUntil
      ? this.multiplierRate * 2.25
      : this.multiplierRate;

    this.multiplier = Math.min(99.99, this.multiplier + rate * dt * this.speed);
    this.bestMultiplier = Math.max(this.bestMultiplier, this.multiplier);
  }

  private checkPickup() {
    if (this.activeItem) return;

    for (const item of this.items) {
      if (!item.visible) continue;

      const distance = Phaser.Math.Distance.Between(
        this.rider.x,
        this.rider.y,
        item.x,
        item.y
      );

      if (distance < 48) {
        const type = item.getData("type") as PowerUp;
        this.activeItem = type;
        item.setVisible(false);
        this.itemRespawns.set(item, performance.now() + 6500);
        this.hudItem.setText(`ITEM: ${POWER_UPS[type].name} · PRESS E / BOOST`);
        this.showMessage(`${POWER_UPS[type].name} COLLECTED`);
        break;
      }
    }
  }

  private checkTrafficCollisions() {
    if (performance.now() < this.invulnerableUntil) return;

    for (const vehicle of this.traffic) {
      const closeX = Math.abs(vehicle.x - this.rider.x) < 43;
      const closeY = Math.abs(vehicle.y - this.rider.y) < 56;

      if (!closeX || !closeY) continue;

      if (this.shieldActive) {
        this.shieldActive = false;
        this.invulnerableUntil = performance.now() + 900;
        this.showMessage("SHIELD SAVED YOU");
        this.flashRider(POWER_UPS.shield.color);
        this.respawnTraffic(vehicle);
        return;
      }

      this.multiplier = Math.max(1, this.multiplier * 0.62);
      this.speed = Math.max(2.2, this.speed * 0.55);
      this.invulnerableUntil = performance.now() + 1300;
      this.showMessage("CRASH! MULTIPLIER DAMAGED");
      this.flashRider(0xe66b58);
      this.respawnTraffic(vehicle);
      return;
    }
  }

  private activateItem() {
    if (!this.activeItem || !this.raceStarted || this.finished) return;

    const item = this.activeItem;
    this.activeItem = null;
    this.hudItem.setText("ITEM: —");

    switch (item) {
      case "nitro":
        this.boostUntil = performance.now() + 2200;
        this.multiplier = Math.min(99.99, this.multiplier + 0.35);
        this.showMessage("NITRO!");
        break;
      case "mega":
        this.boostUntil = performance.now() + 3200;
        this.multiplier = Math.min(99.99, this.multiplier + 0.7);
        this.showMessage("MEGA BOOST!");
        break;
      case "shield":
        this.shieldActive = true;
        this.showMessage("SHIELD READY");
        break;
      case "surge":
        this.surgeUntil = performance.now() + 5000;
        this.multiplier = Math.min(99.99, this.multiplier + 0.55);
        this.showMessage("2× MULTIPLIER SURGE");
        break;
    }
  }

  private isBoosting() {
    if (performance.now() >= this.boostUntil) return false;
    return true;
  }

  private finishRace() {
    this.finished = true;
    this.speed = 0;
    this.countdownText.setVisible(false);
    this.hudMessage.setVisible(false);

    const result = this.add.container(this.scale.width / 2, this.scale.height / 2);
    const panel = this.add.rectangle(0, 0, Math.min(this.scale.width - 36, 520), 250, COLORS.ink, 0.95);
    panel.setStrokeStyle(3, 0xf5eddd);

    const title = this.add.text(0, -82, "🏁 RACE COMPLETE", {
      color: "#f5eddd",
      fontFamily: "Arial",
      fontSize: "28px",
      fontStyle: "bold"
    }).setOrigin(0.5);

    const score = this.add.text(0, -25, `${this.bestMultiplier.toFixed(2)}×`, {
      color: "#ffd166",
      fontFamily: "Arial",
      fontSize: "48px",
      fontStyle: "bold"
    }).setOrigin(0.5);

    const detail = this.add.text(0, 22, "BEST MULTIPLIER", {
      color: "#d7d0c2",
      fontFamily: "Arial",
      fontSize: "13px",
      fontStyle: "bold"
    }).setOrigin(0.5);

    const subtitle = this.add.text(0, 58, "SOLO RACE FOUNDATION · MULTIPLAYER NEXT", {
      color: "#ffffff",
      fontFamily: "Arial",
      fontSize: "11px",
      fontStyle: "bold"
    }).setOrigin(0.5);

    const restart = this.add.text(0, 96, "TAP TO RIDE AGAIN", {
      color: "#111417",
      backgroundColor: "#f28c28",
      padding: { x: 18, y: 11 },
      fontFamily: "Arial",
      fontSize: "13px",
      fontStyle: "bold"
    }).setOrigin(0.5);

    restart.setInteractive({ useHandCursor: true });
    restart.on("pointerdown", () => {
      this.scene.restart();
    });

    result.add([panel, title, score, detail, subtitle, restart]);
  }

  private createRoad() {
    this.road = this.add.graphics();
  }

  private createRider() {
    const body = this.add.rectangle(0, 0, 34, 50, COLORS.bike).setOrigin(0.5);
    body.setStrokeStyle(3, COLORS.ink);

    const seat = this.add.rectangle(0, -1, 20, 23, 0x16191c);
    const helmet = this.add.circle(0, -28, 11, COLORS.bikeLight);
    helmet.setStrokeStyle(3, COLORS.ink);

    const front = this.add.rectangle(0, -20, 4, 12, 0xf6c453);
    const rear = this.add.rectangle(0, 20, 4, 8, 0xd95f4e);
    const wheelA = this.add.ellipse(-10, 25, 8, 18, COLORS.ink);
    const wheelB = this.add.ellipse(10, 25, 8, 18, COLORS.ink);

    this.riderGlow = this.add.circle(0, 0, 0, COLORS.shield);
    this.riderGlow.setVisible(false);

    this.rider = this.add.container(0, 0, [
      this.riderGlow,
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
    const colors = COLORS.traffic;

    colors.forEach((color, index) => {
      const vehicle = this.add.container(0, 0);
      const shell = this.add.rectangle(0, 0, 42, 70, color).setOrigin(0.5);
      shell.setStrokeStyle(3, COLORS.ink);

      const rear = this.add.rectangle(0, 25, 30, 7, 0x7b1f1f);
      const window = this.add.rectangle(0, -14, 28, 20, 0x26343b);
      window.setStrokeStyle(2, COLORS.ink);

      vehicle.add([shell, rear, window]);
      vehicle.setData("offset", index * 0.9);
      vehicle.setData("trafficSpeed", 0.65 + index * 0.08);
      this.traffic.push(vehicle);
    });
  }

  private createItems() {
    const types: PowerUp[] = ["nitro", "shield", "surge", "mega"];

    types.forEach((type) => {
      const item = this.add.container(0, 0);
      const definition = POWER_UPS[type];

      const glow = this.add.circle(0, 0, 21, definition.color, 0.15);
      const ring = this.add.circle(0, 0, 13, definition.color, 0.92);
      ring.setStrokeStyle(2, 0xf9f1dc);

      const text = this.add.text(0, 0, definition.label, {
        color: "#111417",
        fontFamily: "Arial",
        fontSize: type === "surge" ? "10px" : "12px",
        fontStyle: "bold"
      }).setOrigin(0.5);

      item.add([glow, ring, text]);
      item.setData("type", type);
      this.items.push(item);
    });
  }

  private createHud() {
    this.hudMultiplier = this.add.text(18, 16, "1.00×", {
      color: "#ffd166",
      fontFamily: "Arial",
      fontSize: "26px",
      fontStyle: "bold",
      stroke: "#111417",
      strokeThickness: 5
    });

    this.hudDistance = this.add.text(18, 51, "0 / 5 KM", {
      color: "#fffaf0",
      fontFamily: "Arial",
      fontSize: "11px",
      fontStyle: "bold",
      stroke: "#111417",
      strokeThickness: 3
    });

    this.hudItem = this.add.text(this.scale.width - 18, 18, "ITEM: —", {
      color: "#fffaf0",
      backgroundColor: "#111417",
      padding: { x: 8, y: 7 },
      fontFamily: "Arial",
      fontSize: "10px",
      fontStyle: "bold"
    }).setOrigin(1, 0);

    this.hudMessage = this.add.text(this.scale.width / 2, 92, "", {
      color: "#fffaf0",
      backgroundColor: "#111417",
      padding: { x: 12, y: 8 },
      fontFamily: "Arial",
      fontSize: "12px",
      fontStyle: "bold"
    }).setOrigin(0.5).setVisible(false);

    this.countdownText = this.add.text(this.scale.width / 2, this.scale.height / 2, "3", {
      color: "#ffffff",
      fontFamily: "Arial",
      fontSize: "76px",
      fontStyle: "bold",
      stroke: "#111417",
      strokeThickness: 10
    }).setOrigin(0.5);
  }

  private createTouchControls() {
    this.controlGroup = this.add.group();

    const makeButton = (
      x: number,
      y: number,
      width: number,
      height: number,
      label: string,
      onDown: () => void,
      onUp: () => void
    ) => {
      const button = this.add.rectangle(x, y, width, height, COLORS.ink, 0.78)
        .setStrokeStyle(2, 0xf5eddd)
        .setInteractive({ useHandCursor: true });

      const text = this.add.text(x, y, label, {
        color: "#ffffff",
        fontFamily: "Arial",
        fontSize: Math.max(11, Math.round(width / 8)),
        fontStyle: "bold"
      }).setOrigin(0.5);

      button.on("pointerdown", onDown);
      button.on("pointerup", onUp);
      button.on("pointerout", onUp);
      button.on("pointerupoutside", onUp);

      this.controlGroup?.addMultiple([button, text]);
    };

    makeButton(0, 0, 62, 52, "◀", () => { this.touchLeft = true; }, () => { this.touchLeft = false; });
    makeButton(0, 0, 62, 52, "▶", () => { this.touchRight = true; }, () => { this.touchRight = false; });
    makeButton(0, 0, 76, 52, "BRAKE", () => { this.touchBrake = true; }, () => { this.touchBrake = false; });
    makeButton(0, 0, 92, 52, "BOOST", () => { this.touchItem = true; this.activateItem(); }, () => { this.touchItem = false; });
  }

  private updateTouchControlLayout() {
    if (!this.controlGroup) return;

    const width = this.scale.width;
    const height = this.scale.height;
    const isLandscape = width > height;
    const controls = this.controlGroup.getChildren();

    const buttons = controls.filter(
      (child): child is Phaser.GameObjects.Rectangle =>
        child instanceof Phaser.GameObjects.Rectangle
    );

    const texts = controls.filter(
      (child): child is Phaser.GameObjects.Text =>
        child instanceof Phaser.GameObjects.Text
    );

    const positions = isLandscape
      ? [
          { x: 66, y: height - 56 },
          { x: 136, y: height - 56 },
          { x: width - 158, y: height - 56 },
          { x: width - 55, y: height - 56 }
        ]
      : [
          { x: 48, y: height - 64 },
          { x: 118, y: height - 64 },
          { x: width - 116, y: height - 64 },
          { x: width - 48, y: height - 130 }
        ];

    buttons.forEach((button, index) => {
      const pos = positions[index];
      button.setPosition(pos.x, pos.y);
      button.setAlpha(0.72);
    });

    texts.forEach((text, index) => {
      const pos = positions[index];
      text.setPosition(pos.x, pos.y);
    });
  }

  private handleResize(size: { width: number; height: number }) {
    const width = Math.max(1, size.width);
    const height = Math.max(1, size.height);

    if (width === this.lastWidth && height === this.lastHeight) return;

    this.lastWidth = width;
    this.lastHeight = height;

    this.roadWidth = Math.min(width * 0.64, height * 0.72, 430);
    this.roadLeft = (width - this.roadWidth) / 2;
    this.roadRight = this.roadLeft + this.roadWidth;

    this.road.clear();
    this.road.fillStyle(COLORS.shoulder, 1);
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

    this.rider.x = laneX;
    this.rider.y = height * 0.82;
    this.rider.setScale(Math.max(0.78, Math.min(1.18, Math.min(width / 420, height / 760))));

    const trafficPositions = [
      { lane: 0.25, progress: 0.22 },
      { lane: 0.72, progress: 0.43 },
      { lane: 0.36, progress: 0.67 }
    ];

    this.traffic.forEach((vehicle, index) => {
      const setup = trafficPositions[index];
      vehicle.x = this.roadLeft + this.roadWidth * setup.lane;
      vehicle.y = height * setup.progress;
    });

    const itemPositions = [
      { lane: 0.25, progress: 0.35 },
      { lane: 0.72, progress: 0.57 },
      { lane: 0.5, progress: 0.14 },
      { lane: 0.5, progress: 0.76 }
    ];

    this.items.forEach((item, index) => {
      const setup = itemPositions[index];
      item.x = this.roadLeft + this.roadWidth * setup.lane;
      item.y = height * setup.progress;
    });

    this.hudItem.setPosition(width - 18, 18);
    this.hudMessage.setPosition(width / 2, 92);
    this.countdownText.setPosition(width / 2, height / 2);
    this.updateTouchControlLayout();
  }

  private animateRider() {
    const bob = Math.sin(this.elapsed / 110) * 1.2;
    this.rider.y = this.scale.height * 0.82 + bob;

    if (this.riderGlow.visible) {
      this.riderGlow.scale = 1 + Math.sin(this.elapsed / 100) * 0.08;
    }
  }

  private updateHud() {
    this.hudMultiplier.setText(`${this.multiplier.toFixed(2)}×`);
    this.hudDistance.setText(`${Math.min(5, this.distance / 1000).toFixed(2)} / 5 KM`);
    this.riderGlow.setVisible(this.shieldActive);

    if (this.activeItem) {
      this.hudItem.setText(`ITEM: ${POWER_UPS[this.activeItem].name} · E / BOOST`);
    } else {
      this.hudItem.setText("ITEM: —");
    }

    const surgeLabel = performance.now() < this.surgeUntil ? " · 2× ACTIVE" : "";
    this.hudMessage.setText(`x${this.multiplier.toFixed(1)}${surgeLabel}`);
  }

  private showMessage(message: string) {
    this.hudMessage.setText(message);
    this.hudMessage.setVisible(true);

    this.time.delayedCall(850, () => {
      if (!this.finished) this.hudMessage.setVisible(false);
    });
  }

  private flashRider(color: number) {
    const previous = this.riderGlow.fillColor;
    this.riderGlow.setFillStyle(color, 0.22).setVisible(true);

    this.time.delayedCall(320, () => {
      if (!this.shieldActive) {
        this.riderGlow.setFillStyle(previous, 0.12).setVisible(false);
      }
    });
  }

  private respawnTraffic(vehicle: Phaser.GameObjects.Container) {
    vehicle.y = -100 - Phaser.Math.Between(0, 240);
    const lanes = [0.25, 0.5, 0.72];
    const lane = Phaser.Utils.Array.GetRandom(lanes);
    vehicle.x = this.roadLeft + this.roadWidth * lane;
    this.lastMissedTraffic.delete(vehicle);
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
    scene: AbokiRaceScene,
    render: {
      antialias: true,
      roundPixels: true
    }
  });
}
