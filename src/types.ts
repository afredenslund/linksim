// === Vector2 ===
export interface Vector2 {
  x: number
  y: number
}

// === Camera ===
export interface Camera {
  x: number // pan offset x in px
  y: number // pan offset y in px
  scale: number // px per mm
}

// === Body (stivt legeme) ===
export interface Body {
  id: string
  name: string
  shapeType: 'rectangle' | 'polygon' | 'svg'

  // Position og rotation i world-koordinater (mm og grader)
  x: number
  y: number
  rotation: number // grader, 0 = vandret

  // Geometri — body-lokale koordinater (relativt til referencepunkt)
  vertices: Vector2[]

  // Rectangle-specifikt
  width?: number  // mm
  height?: number // mm

  // SVG-specifikt
  svgSource?: string
  svgWidth?: number
  svgHeight?: number

  // Visualisering
  color: string
  opacity: number
  isGround: boolean
}

// === Joint (led) ===
export interface Joint {
  id: string
  type: 'revolute' | 'slider'

  bodyAId: string | null // null = ground
  bodyBId: string
  anchorOnA: Vector2
  anchorOnB: Vector2

  sliderAxis?: Vector2

  minAngle?: number // grader
  maxAngle?: number // grader

  isDriver: boolean
  currentAngle: number // grader
}

// === GroundAnchor ===
export interface GroundAnchor {
  id: string
  x: number
  y: number
  name: string
}

// === TrailPoint (sporpunkt) ===
export interface TrailPoint {
  id: string
  bodyId: string
  localPos: Vector2
  name: string

  color: string
  lineWidth: number
  dotSize: number
  opacity: number

  trailPositions?: Vector2[]
  collisionStatus?: ('clear' | 'warning' | 'collision')[]
}

// === Scene (rod-objekt) ===
export interface Scene {
  id: string
  name: string
  bodies: Body[]
  joints: Joint[]
  trailPoints: TrailPoint[]
  groundPoints: GroundAnchor[]
  camera: Camera
  snapToGrid: boolean
  gridSizeMm: number
}
