import { Group, Line } from 'react-konva'
import type { GroundAnchor, Camera } from '../types'
import { worldToScreen } from '../engine/geometry'

interface GroundAnchorMarkerProps {
  anchor: GroundAnchor
  camera: Camera
}

export default function GroundAnchorMarker({ anchor, camera }: GroundAnchorMarkerProps) {
  const screen = worldToScreen({ x: anchor.x, y: anchor.y }, camera)
  const size = 8

  return (
    <Group>
      {/* Kors-symbol */}
      <Line
        points={[screen.x - size, screen.y, screen.x + size, screen.y]}
        stroke="#888888"
        strokeWidth={2}
        listening={false}
      />
      <Line
        points={[screen.x, screen.y - size, screen.x, screen.y + size]}
        stroke="#888888"
        strokeWidth={2}
        listening={false}
      />
      {/* Cirkel */}
      <Line
        points={(() => {
          const pts: number[] = []
          for (let i = 0; i <= 24; i++) {
            const angle = (i / 24) * Math.PI * 2
            pts.push(screen.x + Math.cos(angle) * size, screen.y + Math.sin(angle) * size)
          }
          return pts
        })()}
        stroke="#888888"
        strokeWidth={1.5}
        closed
        listening={false}
      />
    </Group>
  )
}
