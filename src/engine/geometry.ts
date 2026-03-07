import type { Vector2, Camera, Body } from '../types'

// === Koordinat-konvertering ===
// World = mm (y opad), Screen = px (y nedad)

export function worldToScreen(world: Vector2, camera: Camera): Vector2 {
  return {
    x: world.x * camera.scale + camera.x,
    y: -world.y * camera.scale + camera.y, // negér y (world y-op → screen y-ned)
  }
}

export function screenToWorld(screen: Vector2, camera: Camera): Vector2 {
  return {
    x: (screen.x - camera.x) / camera.scale,
    y: -(screen.y - camera.y) / camera.scale, // negér y
  }
}

export function worldLengthToScreen(mm: number, camera: Camera): number {
  return mm * camera.scale
}

export function screenLengthToWorld(px: number, camera: Camera): number {
  return px / camera.scale
}

// === Vektor-operationer ===

export function vecAdd(a: Vector2, b: Vector2): Vector2 {
  return { x: a.x + b.x, y: a.y + b.y }
}

export function vecSub(a: Vector2, b: Vector2): Vector2 {
  return { x: a.x - b.x, y: a.y - b.y }
}

export function vecScale(v: Vector2, s: number): Vector2 {
  return { x: v.x * s, y: v.y * s }
}

export function vecLength(v: Vector2): number {
  return Math.sqrt(v.x * v.x + v.y * v.y)
}

export function vecDist(a: Vector2, b: Vector2): number {
  return vecLength(vecSub(a, b))
}

export function vecNormalize(v: Vector2): Vector2 {
  const len = vecLength(v)
  if (len === 0) return { x: 0, y: 0 }
  return { x: v.x / len, y: v.y / len }
}

export function vecDot(a: Vector2, b: Vector2): number {
  return a.x * b.x + a.y * b.y
}

export function vecCross(a: Vector2, b: Vector2): number {
  return a.x * b.y - a.y * b.x
}

export function vecRotate(v: Vector2, angleDeg: number): Vector2 {
  const rad = (angleDeg * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  return {
    x: v.x * cos - v.y * sin,
    y: v.x * sin + v.y * cos,
  }
}

// === Body-hjælpefunktioner ===

/** Beregn world-position af et lokalt punkt på en body */
export function bodyLocalToWorld(localPos: Vector2, body: Body): Vector2 {
  const rotated = vecRotate(localPos, body.rotation)
  return vecAdd({ x: body.x, y: body.y }, rotated)
}

/** Beregn world-space vertices for en body */
export function getWorldVertices(body: Body): Vector2[] {
  return body.vertices.map((v) => bodyLocalToWorld(v, body))
}

/** Opret rektangulære vertices (lokale koordinater, centreret) */
export function createRectVertices(width: number, height: number): Vector2[] {
  const hw = width / 2
  const hh = height / 2
  return [
    { x: -hw, y: -hh },
    { x: hw, y: -hh },
    { x: hw, y: hh },
    { x: -hw, y: hh },
  ]
}

// === Grid-beregning ===

export function getGridSize(scale: number): number {
  if (scale < 1) return 50
  if (scale <= 3) return 10
  if (scale <= 8) return 5
  return 1
}

// === Snap ===

export function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize
}

// === AABB ===

export interface AABB {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export function getAABB(vertices: Vector2[]): AABB {
  let minX = Infinity, minY = Infinity
  let maxX = -Infinity, maxY = -Infinity
  for (const v of vertices) {
    if (v.x < minX) minX = v.x
    if (v.y < minY) minY = v.y
    if (v.x > maxX) maxX = v.x
    if (v.y > maxY) maxY = v.y
  }
  return { minX, minY, maxX, maxY }
}

export function aabbOverlap(a: AABB, b: AABB): boolean {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY
}

// === World-to-body-local konvertering ===

/** Konverter et world-space punkt til body-lokale koordinater */
export function worldToBodyLocal(worldPos: Vector2, body: Body): Vector2 {
  // Fjern body-translation, derefter invers rotation
  const dx = worldPos.x - body.x
  const dy = worldPos.y - body.y
  return vecRotate({ x: dx, y: dy }, -body.rotation)
}

/**
 * Snap et body-lokalt punkt til nærmeste "snap target" (hjørne, kantmidtpunkt, center)
 * Returnerer snappet punkt hvis inden for threshold, ellers det originale punkt.
 */
export function snapAnchorToBody(localPos: Vector2, body: Body, thresholdMm: number): Vector2 {
  const candidates: Vector2[] = [
    { x: 0, y: 0 }, // center
    ...body.vertices,  // hjørner
  ]

  // Kantmidtpunkter for rektangler
  if (body.width && body.height) {
    candidates.push(
      { x: -(body.width / 2), y: 0 },  // venstre midt
      { x: body.width / 2, y: 0 },      // højre midt
      { x: 0, y: -(body.height / 2) },   // bund midt
      { x: 0, y: body.height / 2 },      // top midt
    )
  }

  let bestCandidate = localPos
  let bestDist = thresholdMm

  for (const c of candidates) {
    const dist = vecDist(localPos, c)
    if (dist < bestDist) {
      bestDist = dist
      bestCandidate = c
    }
  }

  return bestCandidate
}

// === ID-generator ===

export function generateId(): string {
  return crypto.randomUUID()
}
