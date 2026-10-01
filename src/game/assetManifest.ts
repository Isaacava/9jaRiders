export type AssetCategory = "brand" | "riders" | "bikes" | "traffic" | "road" | "buildings" | "props" | "powerups" | "vfx" | "ui" | "environments" | "animation";

export type AssetDefinition = { id:string; category:AssetCategory; path:string; status:"planned"|"prototype"|"ready" };

export const ASSET_MANIFEST: AssetDefinition[] = [
  { id:"AR-01", category:"bikes", path:"/assets/bikes/starter.svg", status:"ready" },
  { id:"AR-02", category:"bikes", path:"/assets/bikes/speed.svg", status:"ready" },
  { id:"AR-03", category:"bikes", path:"/assets/bikes/heavy.svg", status:"ready" },
  { id:"AR-04", category:"bikes", path:"/assets/bikes/elite.svg", status:"ready" },
  { id:"AR-05-BIKE", category:"bikes", path:"/assets/bikes/legendary.svg", status:"ready" },
  { id:"AR-05", category:"riders", path:"/assets/riders/main.svg", status:"ready" },
  { id:"AR-06", category:"riders", path:"/assets/riders/ada.svg", status:"ready" },
  { id:"AR-07", category:"riders", path:"/assets/riders/kobby.svg", status:"ready" },
  { id:"AR-08", category:"riders", path:"/assets/riders/tobi.svg", status:"ready" },
  { id:"AR-09", category:"riders", path:"/assets/riders/cpu-01.webp", status:"planned" },
  { id:"AR-10", category:"riders", path:"/assets/riders/cpu-02.webp", status:"planned" },
  { id:"AR-11", category:"riders", path:"/assets/riders/cpu-03.webp", status:"planned" },
  { id:"AR-12", category:"riders", path:"/assets/riders/cpu-04.webp", status:"planned" },
  { id:"AR-13", category:"riders", path:"/assets/riders/cpu-05.webp", status:"planned" },
  { id:"AR-14", category:"riders", path:"/assets/riders/cpu-06.webp", status:"planned" },
  { id:"AR-15", category:"riders", path:"/assets/riders/cpu-07.webp", status:"planned" },
  { id:"AR-21", category:"traffic", path:"/assets/traffic/danfo.webp", status:"planned" },
  { id:"AR-49", category:"powerups", path:"/assets/powerups/nitro.webp", status:"planned" },
  { id:"AR-50", category:"powerups", path:"/assets/powerups/shield.webp", status:"planned" },
  { id:"AR-51", category:"powerups", path:"/assets/powerups/surge.webp", status:"planned" },
  { id:"AR-52", category:"powerups", path:"/assets/powerups/mega.webp", status:"planned" },
  { id:"AR-21-DANFO", category:"traffic", path:"/assets/traffic/danfo.svg", status:"prototype" },
  { id:"AR-23-KEKE", category:"traffic", path:"/assets/traffic/keke.svg", status:"prototype" },
  { id:"AR-24-SEDAN", category:"traffic", path:"/assets/traffic/sedan.svg", status:"prototype" },
  { id:"AR-36-SHOP", category:"props", path:"/assets/props/shop.svg", status:"prototype" },
  { id:"AR-42-PALM", category:"props", path:"/assets/props/palm.svg", status:"prototype" },
  { id:"AR-44-BARRIER", category:"props", path:"/assets/props/barrier.svg", status:"prototype" },
  { id:"AR-ROUTE-LAGOS-SKY", category:"environments", path:"/assets/environments/route-lagos-sky.svg", status:"prototype" }
];
