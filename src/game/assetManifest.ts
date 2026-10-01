export type AssetCategory = "brand" | "riders" | "bikes" | "traffic" | "road" | "buildings" | "props" | "powerups" | "vfx" | "ui" | "environments" | "animation";

export type AssetDefinition = { id:string; category:AssetCategory; path:string; status:"planned"|"prototype"|"ready" };

export const ASSET_MANIFEST: AssetDefinition[] = [
  { id:"AR-01", category:"bikes", path:"/assets/bikes/hero.webp", status:"planned" },
  { id:"AR-05", category:"riders", path:"/assets/riders/main.webp", status:"planned" },
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
  { id:"AR-52", category:"powerups", path:"/assets/powerups/mega.webp", status:"planned" }
];
