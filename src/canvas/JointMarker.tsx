import { Group, Circle, Line, Text } from 'react-konva'
import type { Joint, Scene, Camera } from '../types'
import { worldToScreen } from '../engine/geometry'
import { getJointWorldAnchorA, getJointWorldAnchorB } from '../engine/kinematics'

interface JointMarkerProps {
  joint: Joint
  scene: Scene
  camera: Camera
  isSelected: boolean
  onSelect: (id: string) => void
}

export default function JointMarker({
  joint,
  scene,
  camera,
  isSelected,
  onSelect,
}: JointMarkerProps) {
  const anchorAWorld = getJointWorldAnchorA(joint, scene)
  const anchorBWorld = getJointWorldAnchorB(joint, scene)

  const screenA = worldToScreen(anchorAWorld, camera)
  const screenB = worldToScreen(anchorBWorld, camera)

  const pinRadius = isSelected ? 7 : 5

  // Linje mellem anchor A og B (for at vise forbindelsen)
  const showLine = joint.bodyAId !== null && joint.bodyAId !== 'ground'

  return (
    <Group
      onClick={(e) => {
        e.cancelBubble = true
        onSelect(joint.id)
      }}
    >
      {/* Forbindelseslinje */}
      {showLine && (
        <Line
          points={[screenA.x, screenA.y, screenB.x, screenB.y]}
          stroke={isSelected ? '#4a9eff' : '#ffaa00'}
          strokeWidth={1.5}
          dash={[4, 3]}
          listening={false}
        />
      )}

      {/* Pin A (ground side) */}
      <Circle
        x={screenA.x}
        y={screenA.y}
        radius={pinRadius}
        fill={joint.isDriver ? '#ff922b' : '#ffaa00'}
        stroke={isSelected ? '#4a9eff' : '#ffffff'}
        strokeWidth={isSelected ? 2 : 1}
        hitStrokeWidth={15}
      />

      {/* Pin B (body side) — kun hvis de ikke er på samme punkt */}
      {(Math.abs(screenA.x - screenB.x) > 2 || Math.abs(screenA.y - screenB.y) > 2) && (
        <Circle
          x={screenB.x}
          y={screenB.y}
          radius={pinRadius - 1}
          fill="#ffaa00"
          stroke={isSelected ? '#4a9eff' : '#ffffff'}
          strokeWidth={isSelected ? 2 : 1}
          hitStrokeWidth={15}
        />
      )}

      {/* Driver-indikator */}
      {joint.isDriver && (
        <Group>
          {/* Lille pil der viser at det er en driver */}
          <Circle
            x={screenA.x}
            y={screenA.y}
            radius={pinRadius + 4}
            stroke="#ff922b"
            strokeWidth={1.5}
            dash={[3, 2]}
            listening={false}
          />
          <Text
            x={screenA.x + 10}
            y={screenA.y - 16}
            text="D"
            fill="#ff922b"
            fontSize={11}
            fontFamily="system-ui, sans-serif"
            fontStyle="bold"
            listening={false}
          />
        </Group>
      )}

      {/* Vinkelindikator for driver */}
      {joint.isDriver && (
        <Text
          x={screenA.x + 10}
          y={screenA.y + 4}
          text={`${joint.currentAngle.toFixed(1)}°`}
          fill="#aaaaaa"
          fontSize={10}
          fontFamily="system-ui, sans-serif"
          listening={false}
        />
      )}
    </Group>
  )
}
