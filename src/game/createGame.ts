import Phaser from "phaser";
import { getSharedRealtimeClient, RealtimeClient, type RealtimeState } from "./multiplayer";
import { getBike, getRider, getDifficulty, type BikeDefinition, type RiderDefinition } from "./loadout";
import { getReadyAssetPath } from "./assetManifest";

type PowerUp = "nitro" | "shield" | "surge" | "mega";

type AIDifficulty = "easy" | "normal" | "hard";

type AIRider = {
  id: number;
  name: string;
  lane: number;
  laneTarget: number;
  laneCooldown: number;
  speed: number;
  baseSpeed: number;
  skill: number;
  aggression: number;
  distance: number;
  container: Phaser.GameObjects.Container;
  heldItem: PowerUp | null;
  itemCooldown: number;
  boostUntil: number;
  shieldUntil: number;
  mistakeUntil: number;
  finished: boolean;
};

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
  private boostFx!: Phaser.GameObjects.Container;
  private hudMultiplier!: Phaser.GameObjects.Text;
  private hudDistance!: Phaser.GameObjects.Text;
  private hudItem!: Phaser.GameObjects.Text;
  private hudMessage!: Phaser.GameObjects.Text;
  private countdownText!: Phaser.GameObjects.Text;
  private resultGroup?: Phaser.GameObjects.Group;
  private controlGroup?: Phaser.GameObjects.Group;
  private laneMarkers: Phaser.GameObjects.Rectangle[] = [];
  private scenery: Phaser.GameObjects.Container[] = [];
  private routeBackdrop?: Phaser.GameObjects.Image;
  private routeSkyline?: Phaser.GameObjects.Image;
  private roadTexture?: Phaser.GameObjects.Image;
  private traffic: Phaser.GameObjects.Container[] = [];
  private items: Phaser.GameObjects.Container[] = [];
  private aiRiders: AIRider[] = [];
  private aiDifficulty: AIDifficulty = "normal";
  private hudPosition!: Phaser.GameObjects.Text;
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
  private mode: "solo" | "multiplayer" = "solo";
  private networkRoomId = "";
  private networkPlayerId = "";
  private realtime?: RealtimeClient;
  private networkState?: RealtimeState;
  private lastNetworkInputAt = 0;
  private remoteRiders = new Map<string, Phaser.GameObjects.Container>();
  private selectedBike!: BikeDefinition;
  private selectedRider!: RiderDefinition;
  private playerVisual!: Phaser.GameObjects.Container;
  private visualState: "idle" | "lean" | "brake" | "nitro" | "pickup" | "crash" | "airborne" | "finish" = "idle";
  private visualStateStarted = 0;
  private visualStateUntil = 0;
  private visualCrashDirection = 1;
  private boostPower = 9.4;

  constructor() {
    super("aboki-race");
  }

  preload() {
    this.load.image("route-sky", getReadyAssetPath("AR-ROUTE-LAGOS-SKY"));
    this.load.image("hero-bike-rear3q", getReadyAssetPath("AR-01-REAR3Q"));
    this.load.image("hero-rider-rear", getReadyAssetPath("AR-05-REAR"));
    this.load.image("route-skyline", getReadyAssetPath("AR-ROUTE-SKYLINE"));
    this.load.image("road-texture", getReadyAssetPath("AR-30"));
    this.load.image("traffic-danfo", getReadyAssetPath("AR-21-DANFO"));
    this.load.image("traffic-keke", getReadyAssetPath("AR-23-KEKE"));
    this.load.image("traffic-sedan", getReadyAssetPath("AR-24-SEDAN"));
    this.load.image("route-shop", getReadyAssetPath("AR-36-SHOP"));
    this.load.image("route-palm", getReadyAssetPath("AR-42-PALM"));
    this.load.image("route-barrier", getReadyAssetPath("AR-44-BARRIER"));
    this.load.image("route-sign", getReadyAssetPath("AR-40-SIGN"));
    this.load.image("route-market", getReadyAssetPath("AR-41-MARKET"));
    this.load.image("route-pole", getReadyAssetPath("AR-43-POLE"));
    this.load.image("route-fuel", getReadyAssetPath("AR-45-FUEL"));
    this.load.image("route-workshop", getReadyAssetPath("AR-46-WORKSHOP"));
    this.load.image("route-danfo-stop", getReadyAssetPath("AR-47-DANFO-STOP"));
    this.load.image("route-billboard", getReadyAssetPath("AR-48-BILLBOARD"));
    this.load.image("route-drainage", getReadyAssetPath("AR-49-DRAINAGE"));
    this.load.image("route-wall", getReadyAssetPath("AR-50-WALL"));
    this.load.image("traffic-minibus", getReadyAssetPath("AR-22-MINIBUS"));
    this.load.image("traffic-suv", getReadyAssetPath("AR-25"));
    this.load.image("traffic-van", getReadyAssetPath("AR-26"));
    this.load.image("powerup-nitro", getReadyAssetPath("AR-49"));
    this.load.image("powerup-shield", getReadyAssetPath("AR-50"));
    this.load.image("powerup-surge", getReadyAssetPath("AR-51"));
    this.load.image("powerup-mega", getReadyAssetPath("AR-52"));
    this.load.image("bike-starter", getReadyAssetPath("AR-01"));
    this.load.image("bike-speed", getReadyAssetPath("AR-02"));
    this.load.image("bike-heavy", getReadyAssetPath("AR-03"));
    this.load.image("bike-elite", getReadyAssetPath("AR-04"));
    this.load.image("bike-legendary", getReadyAssetPath("AR-05-BIKE"));
    this.load.image("rider-main", getReadyAssetPath("AR-05"));
    this.load.image("rider-ada", getReadyAssetPath("AR-06"));
    this.load.image("rider-kobby", getReadyAssetPath("AR-07"));
    this.load.image("rider-tobi", getReadyAssetPath("AR-08"));
    this.load.image("rider-cpu-01", getReadyAssetPath("AR-09"));
    this.load.image("rider-cpu-02", getReadyAssetPath("AR-10"));
    this.load.image("rider-cpu-03", getReadyAssetPath("AR-11"));
    this.load.image("rider-cpu-04", getReadyAssetPath("AR-12"));
    this.load.image("rider-cpu-05", getReadyAssetPath("AR-13"));
    this.load.image("rider-cpu-06", getReadyAssetPath("AR-14"));
    this.load.image("rider-cpu-07", getReadyAssetPath("AR-15"));
  }

  create() {
    this.input.addPointer(2);
    this.keyboard = this.input.keyboard?.createCursorKeys();
    this.keys.space = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE) as Phaser.Input.Keyboard.Key;
    this.keys.e = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.E) as Phaser.Input.Keyboard.Key;
    this.keys.a = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.A) as Phaser.Input.Keyboard.Key;
    this.keys.d = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.D) as Phaser.Input.Keyboard.Key;
    this.keys.s = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.S) as Phaser.Input.Keyboard.Key;

    const query = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    this.mode = query?.get("mode") === "multiplayer" ? "multiplayer" : "solo";
    this.networkRoomId = query?.get("room") ?? "";
    this.networkPlayerId = query?.get("player") ?? "";
    const storedBike = typeof window !== "undefined" ? window.localStorage.getItem("aboki:bike") : null;
    const storedRider = typeof window !== "undefined" ? window.localStorage.getItem("aboki:rider") : null;
    const requestedDifficulty = query?.get("difficulty");
    const storedDifficulty = typeof window !== "undefined" ? window.localStorage.getItem("aboki:difficulty") : null;

    this.selectedBike = getBike(storedBike);
    this.selectedRider = getRider(storedRider);
    this.aiDifficulty = getDifficulty(requestedDifficulty ?? storedDifficulty);
    this.baseSpeed = 5.4 * (this.selectedBike.acceleration / 7.2);
    this.maxSpeed = 9 * (this.selectedBike.topSpeed / 9.1);
    this.steerSpeed = 300 + this.selectedBike.handling * 20;

    this.cameras.main.setBackgroundColor(COLORS.sky);
    this.createRoad();
    this.createEnvironment();
    this.createRider();
    this.createAIRiders();
    this.createTraffic();
    this.createItems();
    this.createHud();
    this.createTouchControls();

    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.handleResize({ width: this.scale.width, height: this.scale.height });

    if (this.mode === "multiplayer") {
      this.setupMultiplayer();
    } else {
      this.startCountdown();
    }
  }

  shutdown() {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.countdownTimer?.remove(false);
    this.realtime?.disconnect();
  }

  update(_time: number, delta: number) {
    const dt = delta / 1000;
    this.elapsed += delta;

    if (this.mode === "multiplayer") {
      this.updateMultiplayer(dt);
    }

    if (!this.raceStarted || this.finished) {
      this.animateRider();
      return;
    }

    const steering = this.getSteering();
    const braking = this.getBraking();

    if (this.mode === "solo" && (this.keys.e?.isDown || this.keys.space?.isDown)) {
      this.activateItem();
    }

    this.updatePlayer(dt, steering, braking);
    this.animateRiderMotion(steering, braking);
    this.updateWorld(dt);
    this.updateItems(dt);
    this.updateTraffic(dt);

    this.boostFx.setVisible(this.isBoosting());
    this.boostFx.scale = 0.92 + Math.sin(this.elapsed / 70) * 0.08;

    if (this.mode === "solo") {
      this.updateAIOpponents(dt);
      this.checkAIPickups();
      this.updateMultiplier(dt);
      this.checkPickup();
      this.checkTrafficCollisions();
      this.updateRacePosition();
    } else {
      this.syncLocalPlayerFromServer();
      this.syncRemoteRiders();
      this.sendNetworkInput(steering, braking);
    }
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
      targetSpeed = this.boostPower;
    }

    this.speed = Phaser.Math.Linear(this.speed, targetSpeed, Math.min(1, dt * 4));
    this.rider.x += steering * this.steerSpeed * dt;

    const minX = this.roadLeft + 42;
    const maxX = this.roadRight - 42;
    this.rider.x = Phaser.Math.Clamp(this.rider.x, minX, maxX);

    const lean = steering * 7;
    this.rider.angle = Phaser.Math.Linear(this.rider.angle, 0, Math.min(1, dt * 10));
    if (Math.abs(steering) > 0) {
      this.setVisualState("lean", 120);
    } else if (braking) {
      this.setVisualState("brake", 140);
    } else if (performance.now() >= this.visualStateUntil) {
      this.setVisualState("idle", 120);
    }
  }

  private updateWorld(dt: number) {
    const roadSpeed = this.speed * dt * 58;
    const width = this.scale.width;
    const height = this.scale.height;

    for (const marker of this.laneMarkers) {
      marker.y += roadSpeed;

      if (marker.y > height + 60) marker.y = -60;
    }

    for (const prop of this.scenery) {
      prop.y += roadSpeed * 0.84;

      if (prop.y > height + 140) {
        prop.y = -160 - Phaser.Math.Between(0, 260);
        const side = (prop.getData("side") as number) || 1;
        prop.x = side < 0
          ? Phaser.Math.Between(12, Math.max(24, this.roadLeft - 24))
          : Phaser.Math.Between(Math.min(width - 24, this.roadRight + 24), width - 12);
      }
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
        this.triggerRiderAnimation("crash", 520);
        this.respawnTraffic(vehicle);
        return;
      }

      this.multiplier = Math.max(1, this.multiplier * 0.62);
      this.speed = Math.max(2.2, this.speed * 0.55);
      this.invulnerableUntil = performance.now() + 1300;
      this.showMessage("CRASH! MULTIPLIER DAMAGED");
      this.flashRider(0xe66b58);
      this.triggerRiderAnimation("crash", 520);
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
        this.triggerRiderAnimation("nitro", 2400);
        this.boostPower = Math.min(this.maxSpeed + 2.1, 9.4);
        this.boostUntil = performance.now() + 2200;
        this.multiplier = Math.min(99.99, this.multiplier + 0.35);
        this.showMessage("NITRO!");
        break;
      case "mega":
        this.triggerRiderAnimation("nitro", 3400);
        this.boostPower = Math.min(this.maxSpeed + 2.8, 10.8);
        this.boostUntil = performance.now() + 3200;
        this.multiplier = Math.min(99.99, this.multiplier + 0.7);
        this.showMessage("MEGA BOOST!");
        break;
      case "shield":
        this.triggerRiderAnimation("pickup", 480);
        this.shieldActive = true;
        this.showMessage("SHIELD READY");
        break;
      case "surge":
        this.triggerRiderAnimation("pickup", 480);
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
    this.setVisualState("finish", 0);
    this.playFinishPulse();

    this.speed = 0;
    const finishingPosition = this.getRacePosition();
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

    const totalRacers = this.mode === "multiplayer"
      ? (this.networkState?.players.length ?? 1)
      : this.aiRiders.length + 1;
    const modeLabel = this.mode === "multiplayer" ? "MULTIPLAYER" : "VS COMPUTER";
    const subtitle = this.add.text(0, 58, "POSITION " + finishingPosition + "/" + totalRacers + " · " + modeLabel, {
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

  private createEnvironment() {
    const width = this.scale.width || 960;
    const height = this.scale.height || 540;

    if (this.textures.exists("route-sky")) {
      this.routeBackdrop = this.add.image(width / 2, height / 2, "route-sky");
      this.routeBackdrop.setDepth(-25);
      this.routeBackdrop.setDisplaySize(width, height);
    }
    if (this.textures.exists("route-skyline")) {
      this.routeSkyline = this.add.image(width / 2, height * 0.39, "route-skyline");
      this.routeSkyline.setDepth(-22);
      this.routeSkyline.setDisplaySize(width, Math.max(150, height * 0.52));
      this.routeSkyline.setAlpha(0.9);
    }

    if (this.textures.exists("road-texture")) {
      this.roadTexture = this.add.image(width / 2, height / 2, "road-texture");
      this.roadTexture.setDepth(-1);
      this.roadTexture.setAlpha(0.82);
      this.roadTexture.setDisplaySize(this.roadWidth, height);
    }


    const horizon = this.add.rectangle(width / 2, height * 0.28, width, height * 0.58, 0x9fcfdf);
    horizon.setDepth(-20);

    const ground = this.add.rectangle(width / 2, height * 0.67, width, height * 0.7, 0xb99a76);
    ground.setDepth(-19);

    const cloudA = this.add.ellipse(width * 0.17, height * 0.16, 120, 42, 0xffffff, 0.36);
    const cloudB = this.add.ellipse(width * 0.78, height * 0.12, 150, 46, 0xffffff, 0.3);
    cloudA.setDepth(-18);
    cloudB.setDepth(-18);

    const createShop = (color: number) => {
      const body = this.add.rectangle(0, 0, 96, 64, color).setOrigin(0.5, 1);
      body.setStrokeStyle(2, COLORS.ink);
      const roof = this.add.rectangle(0, -68, 108, 10, 0x2a2522).setOrigin(0.5);
      const awning = this.add.rectangle(0, -50, 88, 12, 0xe8d7ad).setOrigin(0.5);
      const doorway = this.add.rectangle(-20, -24, 22, 38, 0x30444a).setOrigin(0.5);
      const window = this.add.rectangle(22, -28, 28, 22, 0x6f9ca7).setOrigin(0.5);
      const counter = this.add.rectangle(0, -4, 86, 7, 0x6a4430).setOrigin(0.5);
      return this.add.container(0, 0, [body, roof, awning, doorway, window, counter]);
    };

    const createMarketStall = () => {
      const canopy = this.add.triangle(0, -40, 0, 34, 62, 34, 31, 0, 0xf3c84f).setOrigin(0.5);
      const postA = this.add.rectangle(-25, -12, 4, 40, 0x6c4e38);
      const postB = this.add.rectangle(25, -12, 4, 40, 0x6c4e38);
      const table = this.add.rectangle(0, 4, 62, 12, 0x6c4e38);
      const crates = this.add.rectangle(0, 17, 44, 15, 0x9a6b40);
      return this.add.container(0, 0, [canopy, postA, postB, table, crates]);
    };

    const createPalm = () => {
      const trunk = this.add.rectangle(0, 0, 10, 100, 0x705238).setOrigin(0.5, 1);
      trunk.angle = Phaser.Math.Between(-5, 5);
      const crown = this.add.container(0, -100);
      for (let i = 0; i < 7; i += 1) {
        const leaf = this.add.ellipse(0, 0, 46, 12, 0x487744);
        leaf.angle = i * 51 + 12;
        leaf.x = Math.cos(Phaser.Math.DegToRad(leaf.angle)) * 20;
        leaf.y = Math.sin(Phaser.Math.DegToRad(leaf.angle)) * 8;
        crown.add(leaf);
      }
      return this.add.container(0, 0, [trunk, crown]);
    };

    const createPole = () => {
      const pole = this.add.rectangle(0, 0, 8, 118, 0x5e5e58).setOrigin(0.5, 1);
      const arm = this.add.rectangle(0, -110, 54, 5, 0x5e5e58);
      const lamp = this.add.circle(25, -106, 7, 0xe9d58e);
      return this.add.container(0, 0, [pole, arm, lamp]);
    };

    const createBarrier = () => {
      const base = this.add.rectangle(0, 0, 86, 18, 0xb9b7ad);
      const stripeA = this.add.rectangle(-22, 0, 26, 18, 0xe6d9c7);
      const stripeB = this.add.rectangle(22, 0, 26, 18, 0xe6d9c7);
      return this.add.container(0, 0, [base, stripeA, stripeB]);
    };

    const createFuelStation = () => {
      const building = this.add.rectangle(0, 0, 128, 66, 0xd7d0bf).setOrigin(0.5, 1);
      building.setStrokeStyle(3, COLORS.ink);
      const canopy = this.add.rectangle(0, -70, 144, 10, 0xe75d3f);
      const window = this.add.rectangle(-28, -30, 42, 28, 0x20383d);
      const pump = this.add.rectangle(38, -18, 14, 40, 0xf2c64f);
      const sign = this.add.rectangle(0, -96, 54, 20, 0x31565a);
      return this.add.container(0, 0, [building, canopy, window, pump, sign]);
    };

    const createWorkshop = () => {
      const building = this.add.rectangle(0, 0, 128, 72, 0x8a6f58).setOrigin(0.5, 1);
      building.setStrokeStyle(3, COLORS.ink);
      const roof = this.add.rectangle(0, -78, 138, 11, 0x2e4e55);
      const door = this.add.rectangle(-28, -35, 42, 58, 0x222a2e);
      const sign = this.add.rectangle(24, -60, 58, 15, 0xd6b45a);
      return this.add.container(0, 0, [building, roof, door, sign]);
    };

    const createDanfoStop = () => {
      const roof = this.add.rectangle(0, -42, 118, 10, 0xfff3d4);
      const body = this.add.rectangle(0, 6, 104, 48, 0xd9b63a);
      body.setStrokeStyle(3, COLORS.ink);
      const windowA = this.add.rectangle(-30, 2, 23, 17, 0x23343a);
      const windowB = this.add.rectangle(0, 2, 23, 17, 0x23343a);
      const windowC = this.add.rectangle(30, 2, 23, 17, 0x23343a);
      const stripe = this.add.rectangle(0, 22, 74, 7, 0x8b201e);
      return this.add.container(0, 0, [roof, body, windowA, windowB, windowC, stripe]);
    };

    const createBillboard = () => {
      const board = this.add.rectangle(0, -22, 125, 58, 0x31565a);
      board.setStrokeStyle(3, COLORS.ink);
      const pole = this.add.rectangle(0, 38, 7, 74, 0x69706f);
      return this.add.container(0, 0, [board, pole]);
    };

    const createDrainage = () => {
      const slab = this.add.rectangle(0, 0, 115, 24, 0x8d877b);
      slab.setStrokeStyle(2, COLORS.ink);
      const lines = [];
      for (let i = -45; i <= 45; i += 22) lines.push(this.add.rectangle(i, 0, 3, 20, 0x5a5652));
      return this.add.container(0, 0, [slab, ...lines]);
    };

    const createWall = () => {
      const wall = this.add.rectangle(0, 0, 145, 58, 0xa9a79d);
      wall.setStrokeStyle(3, COLORS.ink);
      const jointA = this.add.rectangle(-36, 0, 3, 58, 0x7d7b74);
      const jointB = this.add.rectangle(10, 0, 3, 58, 0x7d7b74);
      const jointC = this.add.rectangle(55, 0, 3, 58, 0x7d7b74);
      return this.add.container(0, 0, [wall, jointA, jointB, jointC]);
    };

    const templates = [
      { kind: "shop", side: -1, color: 0xd49e59 },
      { kind: "palm", side: 1 },
      { kind: "stall", side: -1 },
      { kind: "pole", side: 1 },
      { kind: "shop", side: 1, color: 0xb86f4f },
      { kind: "barrier", side: -1 },
      { kind: "palm", side: -1 },
      { kind: "pole", side: 1 },
      { kind: "stall", side: 1 },
      { kind: "shop", side: -1, color: 0x8f9d62 },
      { kind: "sign", side: 1 },
      { kind: "market", side: -1 },
      { kind: "fuel", side: 1 },
      { kind: "workshop", side: -1 },
      { kind: "danfo-stop", side: 1 },
      { kind: "billboard", side: -1 },
      { kind: "drainage", side: 1 },
      { kind: "wall", side: -1 },
      { kind: "pole", side: -1 },
      { kind: "sign", side: -1 }
    ] as const;

    templates.forEach((template, index) => {
      let object: Phaser.GameObjects.Container;

      if (template.kind === "shop" && this.textures.exists("route-shop")) {
        const image = this.add.image(0, 0, "route-shop").setDisplaySize(150, 120);
        object = this.add.container(0, 0, [image]);
      } else if (template.kind === "palm" && this.textures.exists("route-palm")) {
        const image = this.add.image(0, 0, "route-palm").setDisplaySize(95, 120);
        object = this.add.container(0, 0, [image]);
      } else if (template.kind === "barrier" && this.textures.exists("route-barrier")) {
        const image = this.add.image(0, 0, "route-barrier").setDisplaySize(125, 39);
        object = this.add.container(0, 0, [image]);
      } else if (template.kind === "sign" && this.textures.exists("route-sign")) {
        const image = this.add.image(0, 0, "route-sign").setDisplaySize(105, 78);
        object = this.add.container(0, 0, [image]);
      } else if (template.kind === "market" && this.textures.exists("route-market")) {
        const image = this.add.image(0, 0, "route-market").setDisplaySize(105, 91);
        object = this.add.container(0, 0, [image]);
      } else if (template.kind === "pole" && this.textures.exists("route-pole")) {
        const image = this.add.image(0, 0, "route-pole").setDisplaySize(56, 100);
        object = this.add.container(0, 0, [image]);
      } else if (template.kind === "fuel" && this.textures.exists("route-fuel")) {
        const image = this.add.image(0, 0, "route-fuel").setDisplaySize(150, 110);
        object = this.add.container(0, 0, [image]);
      } else if (template.kind === "workshop" && this.textures.exists("route-workshop")) {
        const image = this.add.image(0, 0, "route-workshop").setDisplaySize(145, 110);
        object = this.add.container(0, 0, [image]);
      } else if (template.kind === "danfo-stop" && this.textures.exists("route-danfo-stop")) {
        const image = this.add.image(0, 0, "route-danfo-stop").setDisplaySize(125, 102);
        object = this.add.container(0, 0, [image]);
      } else if (template.kind === "billboard" && this.textures.exists("route-billboard")) {
        const image = this.add.image(0, 0, "route-billboard").setDisplaySize(120, 104);
        object = this.add.container(0, 0, [image]);
      } else if (template.kind === "drainage" && this.textures.exists("route-drainage")) {
        const image = this.add.image(0, 0, "route-drainage").setDisplaySize(130, 52);
        object = this.add.container(0, 0, [image]);
      } else if (template.kind === "wall" && this.textures.exists("route-wall")) {
        const image = this.add.image(0, 0, "route-wall").setDisplaySize(150, 80);
        object = this.add.container(0, 0, [image]);
      } else if (template.kind === "shop") object = createShop(template.color);
      else if (template.kind === "palm") object = createPalm();
      else if (template.kind === "stall") object = createMarketStall();
      else if (template.kind === "pole") object = createPole();
      else if (template.kind === "market") object = createMarketStall();
      else if (template.kind === "fuel") object = createFuelStation();
      else if (template.kind === "workshop") object = createWorkshop();
      else if (template.kind === "danfo-stop") object = createDanfoStop();
      else if (template.kind === "billboard") object = createBillboard();
      else if (template.kind === "drainage") object = createDrainage();
      else if (template.kind === "wall") object = createWall();
      else object = createBarrier();

      object.setDepth(-8);
      object.setScale(template.kind === "palm" ? 0.68 : 0.82);
      object.setData("side", template.side);
      object.setData("kind", template.kind);
      object.x = template.side < 0
        ? Phaser.Math.Between(28, 140)
        : Phaser.Math.Between(Math.max(width - 140, 0), width - 28);
      object.y = height * (0.2 + (index / templates.length) * 0.75);
      this.scenery.push(object);
    });
  }

  private createRacerVisual(bikeKey: string, riderKey: string, scale = 1) {
    const visual = this.add.container(0, 0);

    if (this.textures.exists(bikeKey)) {
      const bike = this.add.image(0, 28, bikeKey);
      bike.setDisplaySize(112, 162);
      visual.add(bike);
    } else {
      const wheelA = this.add.ellipse(-18, 38, 12, 28, COLORS.ink);
      const wheelB = this.add.ellipse(18, 38, 12, 28, COLORS.ink);
      const shell = this.add.rectangle(0, 18, 34, 52, this.selectedBike?.color ?? COLORS.bike).setStrokeStyle(3, COLORS.ink);
      visual.add([wheelA, wheelB, shell]);
    }

    if (this.textures.exists(riderKey)) {
      const rider = this.add.image(0, -34, riderKey);
      rider.setDisplaySize(86, 120);
      visual.add(rider);
    } else {
      const body = this.add.rectangle(0, -20, 36, 52, this.selectedRider?.color ?? COLORS.bikeLight).setStrokeStyle(3, COLORS.ink);
      const helmet = this.add.circle(0, -54, 13, this.selectedRider?.color ?? COLORS.bikeLight).setStrokeStyle(3, COLORS.ink);
      visual.add([body, helmet]);
    }

    visual.setScale(scale);
    return visual;
  }

  private createRider() {
    const useHeroRear = this.selectedBike.id === "starter" && this.selectedRider.id === "main";
    const bikeKey = useHeroRear ? "hero-bike-rear3q" : `bike-${this.selectedBike.id}`;
    const riderKey = useHeroRear ? "hero-rider-rear" : `rider-${this.selectedRider.id}`;

    this.riderGlow = this.add.circle(0, 0, 66, COLORS.shield, 0.16);
    this.riderGlow.setVisible(false);

    this.boostFx = this.add.container(0, 0);
    const flameA = this.add.triangle(-11, 104, 0, 0, 22, 0, 11, 54, COLORS.nitro, 0.88);
    const flameB = this.add.triangle(11, 108, 0, 0, 18, 0, 9, 46, COLORS.mega, 0.82);
    const flameC = this.add.triangle(0, 112, 0, 0, 14, 0, 7, 38, 0xffffff, 0.92);
    this.boostFx.add([flameA, flameB, flameC]);
    this.boostFx.setVisible(false);

    const visual = this.createRacerVisual(bikeKey, riderKey, 1);
    this.playerVisual = visual;
    this.rider = this.add.container(0, 0, [this.boostFx, this.riderGlow, visual]);
    this.rider.setDepth(9);
  }

  private createAIRiders() {
    const configs = [
      { name: "Tega", rider: "rider-cpu-01", bike: "bike-speed", lane: 0.25, skill: 0.9, aggression: 0.45 },
      { name: "Chidi", rider: "rider-cpu-02", bike: "bike-heavy", lane: 0.5, skill: 1.0, aggression: 0.62 },
      { name: "Zina", rider: "rider-cpu-03", bike: "bike-elite", lane: 0.72, skill: 1.04, aggression: 0.7 },
      { name: "Emeka", rider: "rider-cpu-04", bike: "bike-starter", lane: 0.35, skill: 0.95, aggression: 0.55 },
      { name: "Bisi", rider: "rider-cpu-05", bike: "bike-heavy", lane: 0.62, skill: 1.08, aggression: 0.76 },
      { name: "Femi", rider: "rider-cpu-06", bike: "bike-speed", lane: 0.2, skill: 0.98, aggression: 0.58 },
      { name: "Yemi", rider: "rider-cpu-07", bike: "bike-legendary", lane: 0.78, skill: 1.02, aggression: 0.66 }
    ];

    const difficultyFactor =
      this.aiDifficulty === "easy" ? 0.9 :
      this.aiDifficulty === "hard" ? 1.08 : 1;

    configs.forEach((config, index) => {
      const container = this.createRacerVisual(config.bike, config.rider, 0.72);
      container.setDepth(7);

      const skill = config.skill * difficultyFactor;
      const baseSpeed = this.baseSpeed * skill;

      this.aiRiders.push({
        id: index,
        name: config.name,
        lane: config.lane,
        laneTarget: config.lane,
        laneCooldown: performance.now() + Phaser.Math.Between(500, 1300),
        speed: baseSpeed,
        baseSpeed,
        skill,
        aggression: config.aggression,
        distance: Phaser.Math.Between(-25, 30),
        container,
        heldItem: null,
        itemCooldown: performance.now() + Phaser.Math.Between(900, 2200),
        boostUntil: 0,
        shieldUntil: 0,
        mistakeUntil: 0,
        finished: false
      });
    });
  }

  private updateAIOpponents(dt: number) {
    const now = performance.now();

    for (const ai of this.aiRiders) {
      if (ai.finished) continue;

      if (now >= ai.laneCooldown) {
        ai.laneTarget = this.pickAILane(ai);
        ai.laneCooldown = now + Phaser.Math.Between(700, 1800);
      }

      const laneDelta = ai.laneTarget - ai.lane;
      ai.lane += laneDelta * Math.min(1, dt * (2.5 + ai.aggression * 2.2));

      const nearbyTraffic = this.traffic.find((vehicle) =>
        Math.abs(vehicle.y - ai.container.y) < 115 &&
        Math.abs(vehicle.x - ai.container.x) < 44
      );

      if (nearbyTraffic) {
        ai.laneTarget = this.pickAILane(ai, nearbyTraffic.x);
        ai.laneCooldown = now + 500;
      }

      const nearbyRival = this.aiRiders.find((other) =>
        other !== ai &&
        !other.finished &&
        other.distance > ai.distance &&
        Math.abs(other.container.y - ai.container.y) < 75 &&
        Math.abs(other.container.x - ai.container.x) < 43
      );

      if (nearbyRival) {
        ai.laneTarget = this.pickAILane(ai, nearbyRival.container.x);
      }

      let targetSpeed = ai.baseSpeed;

      if (now < ai.boostUntil) targetSpeed *= 1.18;
      if (now < ai.mistakeUntil) {
        targetSpeed *= 0.7;
      } else if (Math.random() < dt * (0.018 + (1 - ai.skill) * 0.015)) {
        ai.mistakeUntil = now + Phaser.Math.Between(180, 420);
      }

      if (ai.heldItem && now >= ai.itemCooldown && Math.random() < dt * 0.08) {
        this.useAIItem(ai, now);
      }

      ai.speed = Phaser.Math.Linear(ai.speed, targetSpeed, Math.min(1, dt * 3.5));
      ai.distance += ai.speed * dt * 9;

      this.handleAITrafficCollision(ai, now);

      if (ai.distance >= this.goalDistance) {
        ai.finished = true;
        ai.distance = this.goalDistance;
        ai.container.alpha = 0.35;
      }

      ai.container.x = this.roadLeft + this.roadWidth * ai.lane;
      ai.container.y = this.rider.y - (ai.distance - this.distance) * 1.9;
      ai.container.angle = Phaser.Math.Clamp(laneDelta * -22, -12, 12);
      ai.container.y += Math.sin((this.elapsed + ai.id * 130) / 90) * 0.35;
      ai.container.setVisible(
        ai.container.y > -180 && ai.container.y < this.scale.height + 180
      );
    }
  }

  private pickAILane(ai: AIRider, blockedX?: number) {
    const candidates = [0.22, 0.36, 0.5, 0.64, 0.78];

    if (blockedX !== undefined) {
      const safe = candidates.filter((lane) => {
        const x = this.roadLeft + this.roadWidth * lane;
        return Math.abs(x - blockedX) > 55;
      });

      if (safe.length) return Phaser.Utils.Array.GetRandom(safe);
    }

    const direction = Math.random() < 0.5 ? -1 : 1;
    const step = direction * (Math.random() < ai.aggression ? 0.14 : 0.08);
    return Phaser.Math.Clamp(ai.lane + step, 0.18, 0.82);
  }

  private handleAITrafficCollision(ai: AIRider, now: number) {
    for (const vehicle of this.traffic) {
      if (
        Math.abs(vehicle.x - ai.container.x) > 39 ||
        Math.abs(vehicle.y - ai.container.y) > 48
      ) continue;

      if (ai.shieldUntil > now) {
        ai.shieldUntil = 0;
        this.respawnTraffic(vehicle);
        return;
      }

      ai.speed *= 0.66;
      ai.mistakeUntil = now + 480;
      ai.laneTarget = this.pickAILane(ai, vehicle.x);
      this.respawnTraffic(vehicle);
      return;
    }
  }

  private checkAIPickups() {
    const now = performance.now();

    for (const ai of this.aiRiders) {
      if (ai.finished) continue;

      for (const item of this.items) {
        if (!item.visible || ai.heldItem) continue;

        if (Phaser.Math.Distance.Between(ai.container.x, ai.container.y, item.x, item.y) < 38) {
          ai.heldItem = item.getData("type") as PowerUp;
          item.setVisible(false);
          this.itemRespawns.set(item, now + 5200 + Phaser.Math.Between(0, 1800));
          break;
        }
      }

      if (ai.heldItem && now >= ai.itemCooldown) {
        const gapToPlayer = ai.distance - this.distance;
        if (gapToPlayer > -120 || Math.random() < 0.025) {
          this.useAIItem(ai, now);
        }
      }
    }
  }

  private useAIItem(ai: AIRider, now: number) {
    if (!ai.heldItem) return;

    const item = ai.heldItem;
    ai.heldItem = null;
    ai.itemCooldown = now + Phaser.Math.Between(1600, 3000);

    if (item === "nitro") ai.boostUntil = now + 1700;
    else if (item === "mega") ai.boostUntil = now + 2600;
    else if (item === "shield") ai.shieldUntil = now + 4500;
    else if (item === "surge") ai.boostUntil = now + 1200;
  }

  private getRacePosition() {
    if (this.mode === "multiplayer" && this.networkState) {
      const local = this.networkState.players.find((player) => player.id === this.networkPlayerId);
      if (local) {
        return 1 + this.networkState.players.filter(
          (player) => player.id !== local.id && player.distance > local.distance
        ).length;
      }
    }

    const ahead = this.aiRiders.filter((ai) => ai.distance > this.distance).length;
    return 1 + ahead;
  }

  private updateRacePosition() {
    if (this.finished) return;

    for (const ai of this.aiRiders) {
      if (ai.distance >= this.goalDistance) ai.finished = true;
    }
  }

  private createTraffic() {
    const textureKeys = ["traffic-danfo", "traffic-keke", "traffic-sedan", "traffic-minibus", "traffic-suv", "traffic-van"];

    const trafficColors = [0xe6bb31, 0x2f7b58, 0x6e7e88, 0xe0b12c, 0x294d63, 0xe7e1d6];
    trafficColors.forEach((color, index) => {
      const vehicle = this.add.container(0, 0);

      if (this.textures.exists(textureKeys[index])) {
        const image = this.add.image(0, 0, textureKeys[index]);
        const widths = [58, 52, 58, 58, 62, 60];
        const heights = [74, 68, 68, 72, 70, 72];
        image.setDisplaySize(widths[index], heights[index]);
        vehicle.add(image);
      } else {
        const shell = this.add.rectangle(0, 0, 42, 70, color).setOrigin(0.5);
        shell.setStrokeStyle(3, COLORS.ink);

        const rear = this.add.rectangle(0, 25, 30, 7, 0x7b1f1f);
        const window = this.add.rectangle(0, -14, 28, 20, 0x26343b);
        window.setStrokeStyle(2, COLORS.ink);

        vehicle.add([shell, rear, window]);
      }
      vehicle.setData("offset", index * 0.9);
      vehicle.setData("trafficSpeed", 0.65 + index * 0.08);
      vehicle.setDepth(6);
      this.traffic.push(vehicle);
    });
  }

  private createItems() {
    const types: PowerUp[] = ["nitro", "shield", "surge", "mega"];

    types.forEach((type) => {
      const item = this.add.container(0, 0);
      const definition = POWER_UPS[type];

      const glow = this.add.circle(0, 0, 23, definition.color, 0.12);
      if (this.textures.exists(`powerup-${type}`)) {
        const image = this.add.image(0, 0, `powerup-${type}`);
        image.setDisplaySize(46, 46);
        item.add([glow, image]);
      } else {
        const ring = this.add.circle(0, 0, 13, definition.color, 0.92);
        ring.setStrokeStyle(2, 0xf9f1dc);
        const text = this.add.text(0, 0, definition.label, {
          color: "#111417",
          fontFamily: "Arial",
          fontSize: type === "surge" ? "10px" : "12px",
          fontStyle: "bold"
        }).setOrigin(0.5);
        item.add([glow, ring, text]);
      }
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

    this.hudPosition = this.add.text(this.scale.width - 18, 52, "1/8", {
      color: "#fffaf0",
      backgroundColor: "#111417",
      padding: { x: 8, y: 6 },
      fontFamily: "Arial",
      fontSize: "11px",
      fontStyle: "bold"
    }).setOrigin(1, 0);

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
    if (this.routeBackdrop) {
      this.routeBackdrop.setPosition(width / 2, height / 2);
      this.routeBackdrop.setDisplaySize(width, height);
    }
    if (this.routeSkyline) {
      this.routeSkyline.setPosition(width / 2, height * 0.39);
      this.routeSkyline.setDisplaySize(width, Math.max(150, height * 0.52));
    }
    if (this.roadTexture) {
      this.roadTexture.setPosition(width / 2, height / 2);
      this.roadTexture.setDisplaySize(this.roadWidth, height);
    }

    const environmentChildren = this.children.list.filter(
      (child): child is Phaser.GameObjects.Rectangle =>
        child instanceof Phaser.GameObjects.Rectangle &&
        child.depth <= -19
    );
    environmentChildren.forEach((child, index) => {
      child.x = width / 2;
      child.width = width;
      if (index === 0) child.y = height * 0.28;
      else if (index === 1) child.y = height * 0.67;
    });

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
      { lane: 0.18, progress: 0.18 },
      { lane: 0.78, progress: 0.31 },
      { lane: 0.36, progress: 0.44 },
      { lane: 0.62, progress: 0.57 },
      { lane: 0.26, progress: 0.69 },
      { lane: 0.5, progress: 0.82 }
    ];

    this.traffic.forEach((vehicle, index) => {
      const setup = trafficPositions[index % trafficPositions.length];
      vehicle.x = this.roadLeft + this.roadWidth * setup.lane;
      vehicle.y = height * setup.progress;
    });

    this.aiRiders.forEach((ai) => {
      ai.container.x = this.roadLeft + this.roadWidth * ai.lane;
      ai.container.y = this.rider.y - (ai.distance - this.distance) * 1.9;
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
    this.hudPosition.setPosition(width - 18, 52);
    this.hudMessage.setPosition(width / 2, 92);
    this.countdownText.setPosition(width / 2, height / 2);
    this.updateTouchControlLayout();
  }

  private setVisualState(
    state: "idle" | "lean" | "brake" | "nitro" | "pickup" | "crash" | "airborne" | "finish",
    duration: number
  ) {
    const now = performance.now();
    if (this.visualState === state && now < this.visualStateUntil && duration > 0) return;
    this.visualState = state;
    this.visualStateStarted = now;
    this.visualStateUntil = duration > 0 ? now + duration : Number.POSITIVE_INFINITY;
    if (state === "crash") {
      this.visualCrashDirection = Math.random() < 0.5 ? -1 : 1;
    }
  }

  private triggerRiderAnimation(
    state: "nitro" | "pickup" | "crash",
    duration: number
  ) {
    this.setVisualState(state, duration);

    if (state === "crash") {
      this.time.delayedCall(170, () => {
        if (!this.finished) this.setVisualState("airborne", 230);
      });
      this.time.delayedCall(400, () => {
        if (!this.finished) this.setVisualState("idle", 140);
      });
    }
  }

  private animateRiderMotion(steering: number, braking: boolean) {
    if (!this.playerVisual) return;

    const now = performance.now();
    const stateElapsed = now - this.visualStateStarted;
    const bob = Math.sin(this.elapsed / 110) * 1.2;

    let angle = 0;
    let y = bob;
    let scaleX = 1;
    let scaleY = 1;

    if (this.visualState === "lean") {
      angle = Phaser.Math.Clamp(steering * 12, -12, 12);
      y += Math.sin(this.elapsed / 70) * 0.9;
    } else if (this.visualState === "brake") {
      angle = -steering * 7 + 5;
      y += 2 + Math.sin(this.elapsed / 55) * 0.7;
      scaleY = 0.97;
    } else if (this.visualState === "nitro") {
      angle = steering * 5;
      y += Math.sin(this.elapsed / 38) * 1.8;
      scaleX = 1.025;
      scaleY = 0.985;
    } else if (this.visualState === "pickup") {
      const t = Phaser.Math.Clamp(stateElapsed / 480, 0, 1);
      const lift = Math.sin(t * Math.PI) * -15;
      angle = Math.sin(t * Math.PI * 2) * 4;
      y += lift;
      scaleX = 1 + Math.sin(t * Math.PI) * 0.055;
      scaleY = 1 - Math.sin(t * Math.PI) * 0.035;
    } else if (this.visualState === "crash") {
      const t = Phaser.Math.Clamp(stateElapsed / 170, 0, 1);
      angle = this.visualCrashDirection * Phaser.Math.Easing.Quadratic.Out(t) * 26;
      y += Math.sin(t * Math.PI) * 7;
      scaleX = 1 - t * 0.06;
      scaleY = 1 - t * 0.12;
    } else if (this.visualState === "airborne") {
      const t = Phaser.Math.Clamp(stateElapsed / 230, 0, 1);
      y += -Math.sin(t * Math.PI) * 28;
      angle = this.visualCrashDirection * (12 + t * 18);
      scaleY = 1 - Math.sin(t * Math.PI) * 0.08;
    } else if (this.visualState === "finish") {
      angle = Math.sin(this.elapsed / 110) * 7;
      y += -Math.abs(Math.sin(this.elapsed / 180)) * 8;
      scaleX = 1 + Math.sin(this.elapsed / 120) * 0.03;
      scaleY = 1 + Math.cos(this.elapsed / 150) * 0.025;
    }

    this.playerVisual.angle = Phaser.Math.Linear(this.playerVisual.angle, angle, 0.28);
    this.playerVisual.x = Phaser.Math.Linear(this.playerVisual.x, steering * 2, 0.2);
    this.playerVisual.y = Phaser.Math.Linear(this.playerVisual.y, y, 0.24);
    this.playerVisual.scaleX = Phaser.Math.Linear(this.playerVisual.scaleX, scaleX, 0.24);
    this.playerVisual.scaleY = Phaser.Math.Linear(this.playerVisual.scaleY, scaleY, 0.24);

    if (now >= this.visualStateUntil && this.visualState !== "finish") {
      this.visualState = Math.abs(steering) > 0 ? "lean" : braking ? "brake" : "idle";
    }
  }

  private animateRider() {
    const bob = Math.sin(this.elapsed / 110) * 1.2;
    this.rider.y = this.scale.height * 0.82 + bob;
    this.animateRiderMotion(0, false);

    if (this.riderGlow.visible) {
      this.riderGlow.scale = 1 + Math.sin(this.elapsed / 100) * 0.08;
    }
  }

  private playFinishPulse() {
    this.triggerRiderAnimation("pickup", 500);
    this.time.delayedCall(520, () => {
      if (this.finished) this.setVisualState("finish", 0);
    });
  }

  private updateHud() {
    this.hudMultiplier.setText(`${this.multiplier.toFixed(2)}×`);
    this.hudDistance.setText(`${Math.min(5, this.distance / 1000).toFixed(2)} / 5 KM`);
    const totalRacers = this.mode === "multiplayer"
      ? (this.networkState?.players.length ?? 1)
      : this.aiRiders.length + 1;
    this.hudPosition.setText(`${this.getRacePosition()}/${totalRacers}`);
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

  private setupMultiplayer() {
    if (!this.networkRoomId || !this.networkPlayerId) {
      this.showMessage("MULTIPLAYER SESSION IS MISSING");
      return;
    }

    this.items.forEach((item) => item.setVisible(false));
    this.hudItem.setText("ITEMS: SERVER SYNC NEXT");

    this.realtime = getSharedRealtimeClient();

    this.realtime.onState((state) => {
      this.networkState = state;

      const local = state.players.find((player) => player.id === this.networkPlayerId);

      if (state.status === "countdown") {
        this.raceStarted = false;
        const seconds = Math.max(1, Math.ceil((state.countdownMs ?? 3000) / 1000));
        this.countdownText.setText(String(seconds));
        this.countdownText.setVisible(true);
      }

      if (state.status === "racing") {
        if (!this.raceStarted) {
          this.raceStarted = true;
          this.speed = local?.speed ?? this.baseSpeed;
          this.showMessage("RACE LIVE");
        }

        this.countdownText.setText("GO!");
        this.time.delayedCall(450, () => {
          if (!this.finished) this.countdownText.setVisible(false);
        });
      }

      if (local?.finishPosition && !this.finished) {
        this.finishRace();
      }
    });

    this.realtime.onMessage((message) => {
      if (message.type === "error") {
        this.showMessage(String(message.code ?? "NETWORK ERROR"));
      }
    });

    void this.realtime.connect()
      .then(() => this.showMessage("CONNECTED · WAITING FOR START"))
      .catch(() => this.showMessage("NETWORK OFFLINE"));
  }

  private updateMultiplayer(dt: number) {
    if (!this.networkState) return;

    const local = this.networkState.players.find((player) => player.id === this.networkPlayerId);
    if (!local) return;

    if (this.networkState.status === "countdown") {
      this.rider.y = this.scale.height * 0.82;
      return;
    }

    if (this.networkState.status !== "racing") return;

    this.distance = local.distance;
    this.speed = local.speed;
    this.multiplier = local.multiplier;
    this.bestMultiplier = Math.max(this.bestMultiplier, this.multiplier);

    const targetX = this.roadLeft + this.roadWidth * local.lane;
    this.rider.x = Phaser.Math.Linear(this.rider.x, targetX, Math.min(1, dt * 10));
  }

  private syncLocalPlayerFromServer() {
    const local = this.networkState?.players.find((player) => player.id === this.networkPlayerId);
    if (!local) return;

    this.distance = local.distance;
    this.speed = local.speed;
    this.multiplier = local.multiplier;
  }

  private sendNetworkInput(steering: number, braking: boolean) {
    if (!this.realtime || !this.networkRoomId || !this.networkPlayerId) return;

    const now = performance.now();
    if (now - this.lastNetworkInputAt < 50) return;

    this.lastNetworkInputAt = now;

    try {
      this.realtime.sendInput(this.networkRoomId, this.networkPlayerId, {
        steering,
        braking,
        useItem: Boolean(this.keys.e?.isDown || this.keys.space?.isDown || this.touchItem)
      });
    } catch {
      // The socket can briefly be between reconnect states.
    }
  }

  private syncRemoteRiders() {
    if (!this.networkState) return;

    const local = this.networkState.players.find((player) => player.id === this.networkPlayerId);
    if (!local) return;

    const fallbackRiderKeys = ["rider-cpu-01", "rider-cpu-02", "rider-cpu-03", "rider-cpu-04", "rider-cpu-05", "rider-cpu-06", "rider-cpu-07"];
    const fallbackBikeKeys = ["bike-speed", "bike-heavy", "bike-elite", "bike-starter", "bike-legendary"];

    this.networkState.players
      .filter((player) => player.id !== this.networkPlayerId)
      .forEach((player, index) => {
        let remote = this.remoteRiders.get(player.id);

        if (!remote) {
          const riderKey = player.riderId ? `rider-${player.riderId}` : fallbackRiderKeys[index % fallbackRiderKeys.length];
          const bikeKey = player.bikeId ? `bike-${player.bikeId}` : fallbackBikeKeys[index % fallbackBikeKeys.length];

          remote = this.createRacerVisual(
            bikeKey,
            riderKey,
            0.72
          );
          remote.setDepth(7);
          this.remoteRiders.set(player.id, remote);
        }

        remote.x = this.roadLeft + this.roadWidth * player.lane;
        remote.y = this.rider.y - (player.distance - local.distance) * 1.9;
        remote.angle = Phaser.Math.Clamp((0.5 - player.lane) * 18, -10, 10);
        remote.setVisible(remote.y > -180 && remote.y < this.scale.height + 180);
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

export function createGame(parent: HTMLElement, _options?: { mode?: "solo" | "multiplayer" }) {
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
