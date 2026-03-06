import { useMemo } from 'react'
import { Group, Line, Text, Rect } from 'react-konva'
import type { Camera } from '../types'
import { getGridSize, screenToWorld, worldToScreen } from '../engine/geometry'

interface GridLayerProps {
  camera: Camera
  stageWidth: number
  stageHeight: number
}

export default function GridLayer({ camera, stageWidth, stageHeight }: GridLayerProps) {
  const gridData = useMemo(() => {
    const gridSizeMm = getGridSize(camera.scale)
    const gridSizePx = gridSizeMm * camera.scale

    // Beregn synligt world-område
    const topLeft = screenToWorld({ x: 0, y: 0 }, camera)
    const bottomRight = screenToWorld({ x: stageWidth, y: stageHeight }, camera)

    const worldMinX = Math.min(topLeft.x, bottomRight.x)
    const worldMaxX = Math.max(topLeft.x, bottomRight.x)
    const worldMinY = Math.min(topLeft.y, bottomRight.y)
    const worldMaxY = Math.max(topLeft.y, bottomRight.y)

    // Snap til grid-grænser
    const startX = Math.floor(worldMinX / gridSizeMm) * gridSizeMm
    const endX = Math.ceil(worldMaxX / gridSizeMm) * gridSizeMm
    const startY = Math.floor(worldMinY / gridSizeMm) * gridSizeMm
    const endY = Math.ceil(worldMaxY / gridSizeMm) * gridSizeMm

    const lines: { points: number[]; isOrigin: boolean }[] = []

    // Vertikale linjer
    for (let wx = startX; wx <= endX; wx += gridSizeMm) {
      const screen = worldToScreen({ x: wx, y: 0 }, camera)
      lines.push({
        points: [screen.x, 0, screen.x, stageHeight],
        isOrigin: wx === 0,
      })
    }

    // Horisontale linjer
    for (let wy = startY; wy <= endY; wy += gridSizeMm) {
      const screen = worldToScreen({ x: 0, y: wy }, camera)
      lines.push({
        points: [0, screen.y, stageWidth, screen.y],
        isOrigin: wy === 0,
      })
    }

    return { lines, gridSizeMm, gridSizePx }
  }, [camera, stageWidth, stageHeight])

  // Målestok-linje
  const scaleBar = useMemo(() => {
    // Find en pæn længde i mm der passer godt på skærmen
    const targetPx = 120
    const targetMm = targetPx / camera.scale
    // Find nærmeste "pæne" tal
    const niceValues = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000]
    let bestMm = niceValues[0]
    for (const v of niceValues) {
      if (Math.abs(v - targetMm) < Math.abs(bestMm - targetMm)) {
        bestMm = v
      }
    }
    const barPx = bestMm * camera.scale
    const label = bestMm >= 10 ? `${bestMm}mm` : `${bestMm}mm`
    return { barPx, label, bestMm }
  }, [camera.scale])

  return (
    <Group>
      {/* Grid-linjer */}
      {gridData.lines.map((line, i) => (
        <Line
          key={i}
          points={line.points}
          stroke={line.isOrigin ? '#444444' : '#2a2a2a'}
          strokeWidth={line.isOrigin ? 1.5 : 0.5}
          listening={false}
        />
      ))}

      {/* Målestok-linje i bunden venstre */}
      <Group x={20} y={stageHeight - 30}>
        <Rect
          x={-5}
          y={-12}
          width={scaleBar.barPx + 30}
          height={28}
          fill="rgba(26, 26, 26, 0.8)"
          cornerRadius={4}
          listening={false}
        />
        <Line
          points={[0, 0, scaleBar.barPx, 0]}
          stroke="#666666"
          strokeWidth={2}
          listening={false}
        />
        {/* Endcaps */}
        <Line points={[0, -5, 0, 5]} stroke="#666666" strokeWidth={2} listening={false} />
        <Line points={[scaleBar.barPx, -5, scaleBar.barPx, 5]} stroke="#666666" strokeWidth={2} listening={false} />
        <Text
          x={scaleBar.barPx + 8}
          y={-7}
          text={scaleBar.label}
          fill="#666666"
          fontSize={12}
          fontFamily="system-ui, sans-serif"
          listening={false}
        />
      </Group>

      {/* Zoom-indikator øverst højre */}
      <Group x={stageWidth - 70} y={12}>
        <Rect
          x={-5}
          y={-3}
          width={65}
          height={22}
          fill="rgba(26, 26, 26, 0.8)"
          cornerRadius={4}
          listening={false}
        />
        <Text
          text={`↗ ${camera.scale.toFixed(1)}x`}
          fill="#666666"
          fontSize={13}
          fontFamily="system-ui, sans-serif"
          listening={false}
        />
      </Group>
    </Group>
  )
}
