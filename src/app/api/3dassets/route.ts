import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug")?.trim();

  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: "Invalid 3D asset slug" }, { status: 400 });
  }

  const response = await fetch(
    `https://3dassets.dev/api/v1/assets/${encodeURIComponent(slug)}`,
    { next: { revalidate: 86400 } }
  );

  if (!response.ok) {
    return NextResponse.json(
      { error: `3DAssets.dev lookup failed: ${response.status}` },
      { status: response.status }
    );
  }

  const asset = await response.json();
  if (!asset?.cdnUrl) {
    return NextResponse.json({ error: "Asset has no CDN URL" }, { status: 404 });
  }

  return NextResponse.json(
    {
      slug,
      cdnUrl: asset.cdnUrl,
      license: asset.license?.id ?? "cc0-1.0",
      title: asset.title ?? slug
    },
    {
      headers: {
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800"
      }
    }
  );
}
