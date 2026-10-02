const MODEL_SOURCES: Record<string, string> = {
  "15423": "https://cdn.3dassets.dev/assets/15423/v1/model.glb",
  "15424": "https://cdn.3dassets.dev/assets/15424/v1/model.glb",
  "15428": "https://cdn.3dassets.dev/assets/15428/v1/model.glb",
  "15416": "https://cdn.3dassets.dev/assets/15416/v1/model.glb",
  "15415": "https://cdn.3dassets.dev/assets/15415/v1/model.glb",
  "15429": "https://cdn.3dassets.dev/assets/15429/v1/model.glb",
  "15420": "https://cdn.3dassets.dev/assets/15420/v1/model.glb",
  "15421": "https://cdn.3dassets.dev/assets/15421/v1/model.glb",
  "34194": "https://cdn.3dassets.dev/assets/34194/v1/model.glb",
  "34283": "https://cdn.3dassets.dev/assets/34283/v1/model.glb",
  "34231": "https://cdn.3dassets.dev/assets/34231/v1/model.glb",
  "32490": "https://cdn.3dassets.dev/assets/32490/v1/model.glb",
  "32500": "https://cdn.3dassets.dev/assets/32500/v1/model.glb",
  "18680": "https://cdn.3dassets.dev/assets/18680/v1/model.glb",
  "34221": "https://cdn.3dassets.dev/assets/34221/v1/model.glb",
  "34323": "https://cdn.3dassets.dev/assets/34323/v1/model.glb"
};

export const runtime = "nodejs";

export async function GET(request: Request) {
  const asset = new URL(request.url).searchParams.get("asset")?.trim();
  const source = asset ? MODEL_SOURCES[asset] : undefined;
  if (!source) return new Response("Unknown 3D asset", { status: 404 });

  try {
    const response = await fetch(source, { cache: "force-cache" });
    if (!response.ok) return new Response("3D asset upstream failed", { status: response.status });
    return new Response(await response.arrayBuffer(), {
      headers: {
        "Content-Type": "model/gltf-binary",
        "Cache-Control": "public, max-age=31536000, immutable",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch {
    return new Response("3D asset proxy failed", { status: 502 });
  }
}
