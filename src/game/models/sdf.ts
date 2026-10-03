// Pure math: signed-distance shapes + smooth union + naive surface nets.
// This is the runtime equivalent of Blender's Skin modifier + Subdivision:
// organic parts are blended into ONE continuous smooth mesh (no stacked primitives).

export type V3 = readonly [number, number, number];
export type SDF = (x: number, y: number, z: number) => number;
export type MeshData = { pos: Float32Array; nrm: Float32Array; idx: Uint32Array };

export function smin(a: number, b: number, k: number) {
  if (k <= 0) return a < b ? a : b;
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

/** Tapered capsule from a to b; kx/ky/kz stretch the cross-section (e.g. oval torso, flat seat). */
export function capsule(a: V3, b: V3, ra: number, rb = ra, kx = 1, ky = 1, kz = 1): SDF {
  const dx = (b[0] - a[0]) / kx, dy = (b[1] - a[1]) / ky, dz = (b[2] - a[2]) / kz;
  const L2 = dx * dx + dy * dy + dz * dz || 1e-9;
  const f = Math.min(1, kx, ky, kz);
  return (x, y, z) => {
    const px = (x - a[0]) / kx, py = (y - a[1]) / ky, pz = (z - a[2]) / kz;
    let t = (px * dx + py * dy + pz * dz) / L2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const qx = px - dx * t, qy = py - dy * t, qz = pz - dz * t;
    return (Math.sqrt(qx * qx + qy * qy + qz * qz) - (ra + (rb - ra) * t)) * f;
  };
}

export function ellipsoid(c: V3, r: number, kx = 1, ky = 1, kz = 1): SDF {
  const f = Math.min(1, kx, ky, kz);
  return (x, y, z) => {
    const px = (x - c[0]) / kx, py = (y - c[1]) / ky, pz = (z - c[2]) / kz;
    return (Math.sqrt(px * px + py * py + pz * pz) - r) * f;
  };
}

/** Rounded box: c = centre, h = half extents (outer), r = corner radius. */
export function rbox(c: V3, h: V3, r: number): SDF {
  const hx = h[0] - r, hy = h[1] - r, hz = h[2] - r;
  return (x, y, z) => {
    const qx = Math.abs(x - c[0]) - hx, qy = Math.abs(y - c[1]) - hy, qz = Math.abs(z - c[2]) - hz;
    const ox = Math.max(qx, 0), oy = Math.max(qy, 0), oz = Math.max(qz, 0);
    return Math.sqrt(ox * ox + oy * oy + oz * oz) + Math.min(Math.max(qx, qy, qz), 0) - r;
  };
}

/** Cylinder whose axis is the X axis (wheel wells). */
export function cylX(cx: number, cy: number, cz: number, r: number, hw: number): SDF {
  return (x, y, z) => {
    const d1 = Math.sqrt((y - cy) * (y - cy) + (z - cz) * (z - cz)) - r;
    const d2 = Math.abs(x - cx) - hw;
    return Math.min(Math.max(d1, d2), 0) + Math.sqrt(Math.max(d1, 0) ** 2 + Math.max(d2, 0) ** 2);
  };
}

export function union(fs: SDF[], k = 0): SDF {
  return (x, y, z) => {
    let d = fs[0](x, y, z);
    for (let i = 1; i < fs.length; i++) d = smin(d, fs[i](x, y, z), k);
    return d;
  };
}
export const subtract = (a: SDF, b: SDF): SDF => (x, y, z) => Math.max(a(x, y, z), -b(x, y, z));

/** Chain of capsules along a polyline (fenders, tubes, spines). */
export function chain(pts: V3[], r0: number, r1 = r0, kx = 1, ky = 1, kz = 1): SDF {
  const fs: SDF[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const t0 = i / (pts.length - 1), t1 = (i + 1) / (pts.length - 1);
    fs.push(capsule(pts[i], pts[i + 1], r0 + (r1 - r0) * t0, r0 + (r1 - r0) * t1, kx, ky, kz));
  }
  return union(fs, 0.0);
}

const CORNERS: V3[] = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
const EDGES: Array<[number, number]> = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];

/** Naive surface nets on a regular grid, with vertices projected onto the surface and SDF-gradient normals. */
export function surfaceNets(f: SDF, min: V3, max: V3, h: number): MeshData {
  const nx = Math.ceil((max[0] - min[0]) / h) + 1;
  const ny = Math.ceil((max[1] - min[1]) / h) + 1;
  const nz = Math.ceil((max[2] - min[2]) / h) + 1;
  const val = new Float32Array(nx * ny * nz);
  const I = (i: number, j: number, k: number) => i + nx * (j + ny * k);
  for (let k = 0; k < nz; k++)
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) val[I(i, j, k)] = f(min[0] + i * h, min[1] + j * h, min[2] + k * h);

  const cell = new Int32Array(nx * ny * nz).fill(-1);
  const pos: number[] = [];
  const cv = new Float32Array(8);
  for (let k = 0; k < nz - 1; k++)
    for (let j = 0; j < ny - 1; j++)
      for (let i = 0; i < nx - 1; i++) {
        let inside = 0;
        for (let c = 0; c < 8; c++) {
          const o = CORNERS[c];
          cv[c] = val[I(i + o[0], j + o[1], k + o[2])];
          if (cv[c] < 0) inside++;
        }
        if (inside === 0 || inside === 8) continue;
        let sx = 0, sy = 0, sz = 0, n = 0;
        for (const [a, b] of EDGES) {
          const va = cv[a], vb = cv[b];
          if ((va < 0) === (vb < 0)) continue;
          const t = va / (va - vb);
          sx += CORNERS[a][0] + t * (CORNERS[b][0] - CORNERS[a][0]);
          sy += CORNERS[a][1] + t * (CORNERS[b][1] - CORNERS[a][1]);
          sz += CORNERS[a][2] + t * (CORNERS[b][2] - CORNERS[a][2]);
          n++;
        }
        cell[I(i, j, k)] = pos.length / 3;
        pos.push(min[0] + (i + sx / n) * h, min[1] + (j + sy / n) * h, min[2] + (k + sz / n) * h);
      }

  // project vertices onto the true surface (one Newton step) and compute smooth gradient normals
  const vc = pos.length / 3;
  const P = new Float32Array(pos);
  const N = new Float32Array(vc * 3);
  const e = h * 0.5;
  const grad = (x: number, y: number, z: number, out: number[]) => {
    const gx = f(x + e, y, z) - f(x - e, y, z), gy = f(x, y + e, z) - f(x, y - e, z), gz = f(x, y, z + e) - f(x, y, z - e);
    const l = Math.sqrt(gx * gx + gy * gy + gz * gz) || 1;
    out[0] = gx / l; out[1] = gy / l; out[2] = gz / l;
  };
  const g: number[] = [0, 0, 0];
  for (let v = 0; v < vc; v++) {
    let x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2];
    grad(x, y, z, g);
    const d = f(x, y, z);
    const step = Math.max(-h, Math.min(h, d)) * 0.8;
    x -= g[0] * step; y -= g[1] * step; z -= g[2] * step;
    P[v * 3] = x; P[v * 3 + 1] = y; P[v * 3 + 2] = z;
    grad(x, y, z, g);
    N[v * 3] = g[0]; N[v * 3 + 1] = g[1]; N[v * 3 + 2] = g[2];
  }

  const idx: number[] = [];
  const quad = (a: number, b: number, c: number, d: number) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    const tri = (p: number, q: number, r: number) => {
      const ux = P[q * 3] - P[p * 3], uy = P[q * 3 + 1] - P[p * 3 + 1], uz = P[q * 3 + 2] - P[p * 3 + 2];
      const wx = P[r * 3] - P[p * 3], wy = P[r * 3 + 1] - P[p * 3 + 1], wz = P[r * 3 + 2] - P[p * 3 + 2];
      const nx_ = uy * wz - uz * wy, ny_ = uz * wx - ux * wz, nz_ = ux * wy - uy * wx;
      const sx = N[p * 3] + N[q * 3] + N[r * 3], sy = N[p * 3 + 1] + N[q * 3 + 1] + N[r * 3 + 1], sz = N[p * 3 + 2] + N[q * 3 + 2] + N[r * 3 + 2];
      if (nx_ * sx + ny_ * sy + nz_ * sz >= 0) idx.push(p, q, r); else idx.push(p, r, q);
    };
    tri(a, b, c); tri(a, c, d);
  };
  for (let k = 1; k < nz - 1; k++)
    for (let j = 1; j < ny - 1; j++)
      for (let i = 1; i < nx - 1; i++) {
        const v0 = val[I(i, j, k)] < 0;
        if (v0 !== val[I(i + 1, j, k)] < 0) quad(cell[I(i, j - 1, k - 1)], cell[I(i, j, k - 1)], cell[I(i, j, k)], cell[I(i, j - 1, k)]);
        if (v0 !== val[I(i, j + 1, k)] < 0) quad(cell[I(i - 1, j, k - 1)], cell[I(i, j, k - 1)], cell[I(i, j, k)], cell[I(i - 1, j, k)]);
        if (v0 !== val[I(i, j, k + 1)] < 0) quad(cell[I(i - 1, j - 1, k)], cell[I(i, j - 1, k)], cell[I(i, j, k)], cell[I(i - 1, j, k)]);
      }
  return { pos: P, nrm: N, idx: new Uint32Array(idx) };
}
