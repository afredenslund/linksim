import type { Vector2, Body, Joint, Scene } from '../types'
import { vecDist, vecRotate, bodyLocalToWorld } from './geometry'

// === Hjælpefunktioner ===

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180
}

function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI
}

function normalizeAngle(deg: number): number {
  while (deg > 180) deg -= 360
  while (deg < -180) deg += 360
  return deg
}

// === Hent joint anchor world-position ===

export function getJointWorldAnchorA(joint: Joint, scene: Scene): Vector2 {
  if (joint.bodyAId === null || joint.bodyAId === 'ground') {
    // Anchor er i world-koordinater direkte (ground)
    return joint.anchorOnA
  }
  const bodyA = scene.bodies.find((b) => b.id === joint.bodyAId)
  if (!bodyA) return joint.anchorOnA
  return bodyLocalToWorld(joint.anchorOnA, bodyA)
}

export function getJointWorldAnchorB(joint: Joint, scene: Scene): Vector2 {
  const bodyB = scene.bodies.find((b) => b.id === joint.bodyBId)
  if (!bodyB) return joint.anchorOnB
  return bodyLocalToWorld(joint.anchorOnB, bodyB)
}

// === Single revolute joint ===
// En arm der roterer om et fast punkt

export interface SingleRevoluteResult {
  bodyRotation: number // grader
  bodyX: number
  bodyY: number
}

export function solveSingleRevolute(
  joint: Joint,
  driverAngleDeg: number,
  _body: Body,
  pivotWorld: Vector2,
): SingleRevoluteResult {
  // Body roterer med drivervinkel relativt til dens startrotation
  const bodyRotation = driverAngleDeg

  // Beregn ny body-position så anchorOnB ligger på pivotWorld
  const anchorRotated = vecRotate(joint.anchorOnB, bodyRotation)
  const bodyX = pivotWorld.x - anchorRotated.x
  const bodyY = pivotWorld.y - anchorRotated.y

  return { bodyRotation, bodyX, bodyY }
}

// === Four-bar linkage solver (Freudenstein's equation) ===

export interface FourBarConfig {
  groundA: Vector2  // fixed pivot A (ground)
  groundB: Vector2  // fixed pivot B (ground)
  r1: number        // ground link length (distance A to B)
  r2: number        // input link length (driver, from A)
  r3: number        // coupler link length
  r4: number        // output link length (from B)
  groundAngle: number // angle of ground link A→B (radians)
}

export interface FourBarResult {
  theta4: number // output angle in degrees
  // Positions of all 4 joints in world space
  P1: Vector2 // ground pivot A
  P2: Vector2 // end of input link
  P3: Vector2 // end of coupler (= end of output link)
  P4: Vector2 // ground pivot B
  valid: boolean
}

/**
 * Solve four-bar linkage using Freudenstein's equation
 * Returns both configurations (open and crossed)
 */
export function solveFourBar(
  config: FourBarConfig,
  theta2Deg: number,
  prevTheta4Deg?: number,
): FourBarResult | null {
  const { groundA, groundB, r1, r2, r3, r4, groundAngle } = config

  // Input angle relative to ground line
  const theta2 = degToRad(theta2Deg)

  // Freudenstein constants
  const K1 = r1 / r4
  const K2 = r1 / r2
  const K3 = (r2 * r2 - r3 * r3 + r4 * r4 + r1 * r1) / (2 * r2 * r4)

  const A = Math.cos(theta2) - K1 - K2 * Math.cos(theta2) + K3
  const B = -2 * Math.sin(theta2)
  const C = K1 - (K2 + 1) * Math.cos(theta2) + K3

  const discriminant = B * B - 4 * A * C

  if (discriminant < 0) {
    // Mekanismen kan ikke nå denne position — singularitet
    return null
  }

  const sqrtD = Math.sqrt(discriminant)

  // To løsninger: open (+) og crossed (-)
  const t1 = (-B + sqrtD) / (2 * A)
  const t2 = (-B - sqrtD) / (2 * A)

  const theta4_open = 2 * Math.atan(t1)
  const theta4_crossed = 2 * Math.atan(t2)

  // Vælg konfiguration der er nærmest forrige frame
  let theta4: number
  if (prevTheta4Deg !== undefined) {
    const prevRad = degToRad(prevTheta4Deg)
    const diff1 = Math.abs(normalizeAngle(radToDeg(theta4_open - prevRad)))
    const diff2 = Math.abs(normalizeAngle(radToDeg(theta4_crossed - prevRad)))
    theta4 = diff1 <= diff2 ? theta4_open : theta4_crossed
  } else {
    theta4 = theta4_open
  }

  // Beregn positioner
  // P1 = ground pivot A
  const P1 = groundA
  // P2 = end of input link
  const P2: Vector2 = {
    x: groundA.x + r2 * Math.cos(theta2 + groundAngle),
    y: groundA.y + r2 * Math.sin(theta2 + groundAngle),
  }
  // P4 = ground pivot B
  const P4 = groundB
  // P3 = end of output link (from ground B)
  const P3: Vector2 = {
    x: groundB.x + r4 * Math.cos(theta4 + groundAngle),
    y: groundB.y + r4 * Math.sin(theta4 + groundAngle),
  }

  return {
    theta4: radToDeg(theta4),
    P1,
    P2,
    P3,
    P4,
    valid: true,
  }
}

// === Detect four-bar linkage topology ===

export interface FourBarTopology {
  driverJoint: Joint
  couplerJoint: Joint
  groundAnchorA: Vector2  // driver pivot (ground)
  groundAnchorB: Vector2  // follower pivot (ground)
  inputBody: Body         // connected to driver
  couplerBody: Body       // coupler link
  outputBody: Body | null // output link (if exists)
  r2: number              // input link length
  r3: number              // coupler length
  r4: number              // output link length
  config: FourBarConfig
}

export function detectFourBar(scene: Scene): FourBarTopology | null {
  // Find driver joint
  const driverJoint = scene.joints.find((j) => j.isDriver)
  if (!driverJoint) return null

  // Driver must be connected to ground on one side
  if (driverJoint.bodyAId !== null && driverJoint.bodyAId !== 'ground') {
    // Check if bodyA is a ground body
    const bodyA = scene.bodies.find((b) => b.id === driverJoint.bodyAId)
    if (!bodyA?.isGround) return null
  }

  const inputBody = scene.bodies.find((b) => b.id === driverJoint.bodyBId)
  if (!inputBody) return null

  // Find second joint on input body (not the driver)
  const couplerJoint = scene.joints.find(
    (j) => j.id !== driverJoint.id && (j.bodyAId === inputBody.id || j.bodyBId === inputBody.id)
  )
  if (!couplerJoint) return null

  // Find coupler body (the other body on the coupler joint)
  const couplerBodyId = couplerJoint.bodyAId === inputBody.id ? couplerJoint.bodyBId : couplerJoint.bodyAId
  if (!couplerBodyId) return null
  const couplerBody = scene.bodies.find((b) => b.id === couplerBodyId)
  if (!couplerBody) return null

  // Find third joint on coupler body (connected to ground)
  const outputJoint = scene.joints.find(
    (j) =>
      j.id !== couplerJoint.id &&
      (j.bodyAId === couplerBody.id || j.bodyBId === couplerBody.id) &&
      (j.bodyAId === null || j.bodyAId === 'ground' ||
        scene.bodies.find((b) => b.id === j.bodyAId)?.isGround ||
        j.bodyBId === null ||
        scene.bodies.find((b) => b.id === j.bodyBId)?.isGround)
  )

  // Get ground anchor positions
  const groundA = getJointWorldAnchorA(driverJoint, scene)

  if (!outputJoint) {
    // Simple two-joint mechanism — not a four-bar
    return null
  }

  const groundB =
    outputJoint.bodyAId === null || outputJoint.bodyAId === 'ground' ||
    scene.bodies.find((b) => b.id === outputJoint.bodyAId)?.isGround
      ? getJointWorldAnchorA(outputJoint, scene)
      : getJointWorldAnchorB(outputJoint, scene)

  // Calculate link lengths
  const r1 = vecDist(groundA, groundB)

  // Compute r2 from the body geometry rather than current positions
  const r2AnchorLocal = driverJoint.anchorOnB
  const r2CouplerLocal =
    couplerJoint.bodyAId === inputBody.id ? couplerJoint.anchorOnA : couplerJoint.anchorOnB
  const r2 = vecDist(r2AnchorLocal, r2CouplerLocal)

  // r3 = coupler link length
  const couplerAnchorLocalA =
    couplerJoint.bodyAId === couplerBody.id ? couplerJoint.anchorOnA : couplerJoint.anchorOnB
  const outputAnchorLocal =
    outputJoint.bodyAId === couplerBody.id ? outputJoint.anchorOnA : outputJoint.bodyBId === couplerBody.id ? outputJoint.anchorOnB : couplerAnchorLocalA
  const r3 = vecDist(couplerAnchorLocalA, outputAnchorLocal)

  // r4 = output link length (from ground B to coupler joint at output)
  const r4 = vecDist(groundB, bodyLocalToWorld(outputAnchorLocal, couplerBody))

  const groundAngle = Math.atan2(groundB.y - groundA.y, groundB.x - groundA.x)

  return {
    driverJoint,
    couplerJoint,
    groundAnchorA: groundA,
    groundAnchorB: groundB,
    inputBody,
    couplerBody,
    outputBody: null,
    r2,
    r3,
    r4,
    config: {
      groundA,
      groundB,
      r1,
      r2,
      r3,
      r4,
      groundAngle,
    },
  }
}

// === Solve mechanism (opdater alle bodies fra driver-vinkel) ===

export interface MechanismSolution {
  bodyUpdates: Array<{ id: string; x: number; y: number; rotation: number }>
  valid: boolean
}

export function solveMechanism(
  scene: Scene,
  driverAngleDeg: number,
): MechanismSolution {
  const driverJoint = scene.joints.find((j) => j.isDriver)
  if (!driverJoint) return { bodyUpdates: [], valid: false }

  const bodyUpdates: Array<{ id: string; x: number; y: number; rotation: number }> = []

  // Get driver pivot position (ground anchor)
  const pivotWorld = getJointWorldAnchorA(driverJoint, scene)
  const inputBody = scene.bodies.find((b) => b.id === driverJoint.bodyBId)
  if (!inputBody) return { bodyUpdates: [], valid: false }

  // Count joints on input body (excl. driver)
  const otherJointsOnInput = scene.joints.filter(
    (j) => j.id !== driverJoint.id && (j.bodyAId === inputBody.id || j.bodyBId === inputBody.id)
  )

  if (otherJointsOnInput.length === 0) {
    // === Simple revolute: single arm ===
    const result = solveSingleRevolute(driverJoint, driverAngleDeg, inputBody, pivotWorld)
    bodyUpdates.push({
      id: inputBody.id,
      x: result.bodyX,
      y: result.bodyY,
      rotation: result.bodyRotation,
    })
    return { bodyUpdates, valid: true }
  }

  // === Try four-bar linkage ===
  const fourBar = detectFourBar(scene)
  if (fourBar) {
    const result = solveFourBar(fourBar.config, driverAngleDeg)
    if (result) {
      // Opdater input body
      const driverAnchorLocal = driverJoint.anchorOnB
      const inputRotation = driverAngleDeg
      const rotatedAnchor = vecRotate(driverAnchorLocal, inputRotation)
      bodyUpdates.push({
        id: inputBody.id,
        x: pivotWorld.x - rotatedAnchor.x,
        y: pivotWorld.y - rotatedAnchor.y,
        rotation: inputRotation,
      })

      // Opdater coupler body
      // Coupler body position baseret på P2 og P3
      const couplerJoint = fourBar.couplerJoint
      const couplerBody = fourBar.couplerBody
      const couplerAnchorLocal =
        couplerJoint.bodyAId === couplerBody.id ? couplerJoint.anchorOnA : couplerJoint.anchorOnB

      // Coupler rotation: angle fra couplerAnchor til outputAnchor
      const couplerRotation = radToDeg(
        Math.atan2(result.P3.y - result.P2.y, result.P3.x - result.P2.x)
      ) - radToDeg(Math.atan2(
        fourBar.config.groundB.y - fourBar.config.groundA.y + 0.001,
        fourBar.config.groundB.x - fourBar.config.groundA.x + 0.001
      )) // approximate

      const rotatedCouplerAnchor = vecRotate(couplerAnchorLocal, couplerRotation)
      bodyUpdates.push({
        id: couplerBody.id,
        x: result.P2.x - rotatedCouplerAnchor.x,
        y: result.P2.y - rotatedCouplerAnchor.y,
        rotation: couplerRotation,
      })

      return { bodyUpdates, valid: true }
    }
  }

  // Fallback: simple revolute
  const result = solveSingleRevolute(driverJoint, driverAngleDeg, inputBody, pivotWorld)
  bodyUpdates.push({
    id: inputBody.id,
    x: result.bodyX,
    y: result.bodyY,
    rotation: result.bodyRotation,
  })
  return { bodyUpdates, valid: true }
}

// === Drag IK ===

export function computeDriverAngleFromMouse(
  mouseWorld: Vector2,
  pivotWorld: Vector2,
  joint: Joint,
): number {
  const desiredAngle = radToDeg(
    Math.atan2(mouseWorld.y - pivotWorld.y, mouseWorld.x - pivotWorld.x)
  )

  // Clamp to limits
  if (joint.minAngle !== undefined && joint.maxAngle !== undefined) {
    return clampAngle(desiredAngle, joint.minAngle, joint.maxAngle)
  }
  return desiredAngle
}

function clampAngle(angle: number, min: number, max: number): number {
  // Normalize angle to be within a reasonable range
  let a = normalizeAngle(angle)
  const lo = normalizeAngle(min)
  const hi = normalizeAngle(max)

  if (lo <= hi) {
    return Math.max(lo, Math.min(hi, a))
  } else {
    // Wrapped range
    if (a >= lo || a <= hi) return a
    const distToLo = Math.abs(normalizeAngle(a - lo))
    const distToHi = Math.abs(normalizeAngle(a - hi))
    return distToLo < distToHi ? lo : hi
  }
}
