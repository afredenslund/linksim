import { useRef, useCallback } from 'react'
import { Group, Line, Text } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import type { Body, Camera } from '../types'
import { worldToScreen, getWorldVertices, snapToGrid, getGridSize } from '../engine/geometry'

interface BodyShapeProps {
  body: Body
  camera: Camera
  isSelected: boolean
  snapEnabled: boolean
  onSelect: (id: string) => void
  onDragEnd: (id: string, newX: number, newY: number) => void
}

export default function BodyShape({
  body,
  camera,
  isSelected,
  snapEnabled,
  onSelect,
  onDragEnd,
}: BodyShapeProps) {
  const groupRef = useRef<ReturnType<typeof Group> | null>(null)

  // Beregn screen-koordinater for polygon
  const worldVerts = getWorldVertices(body)
  const screenPoints: number[] = []
  for (const v of worldVerts) {
    const s = worldToScreen(v, camera)
    screenPoints.push(s.x, s.y)
  }

  // Centerpunkt i screen for placering af navn
  const centerScreen = worldToScreen({ x: body.x, y: body.y }, camera)

  const handleClick = useCallback(
    (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
      e.cancelBubble = true
      onSelect(body.id)
    },
    [body.id, onSelect]
  )

  const handleDragStart = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
      e.cancelBubble = true
    },
    []
  )

  const handleDragEnd = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
      const node = e.target
      // Konva giver os dx, dy i screen-pixels
      const dx = node.x()
      const dy = node.y()
      // Reset node position (vi gemmer i world-koordinater)
      node.x(0)
      node.y(0)

      // Konverter delta til world
      let newWorldX = body.x + dx / camera.scale
      let newWorldY = body.y - dy / camera.scale // negér y

      // Snap til grid
      if (snapEnabled && !e.evt.altKey) {
        const gridSize = getGridSize(camera.scale)
        newWorldX = snapToGrid(newWorldX, gridSize)
        newWorldY = snapToGrid(newWorldY, gridSize)
      }

      onDragEnd(body.id, newWorldX, newWorldY)
    },
    [body, camera, snapEnabled, onDragEnd]
  )

  const fontSize = Math.max(10, Math.min(14, 12 / camera.scale * 2))

  return (
    <Group
      ref={groupRef as React.RefObject<never>}
      draggable
      onClick={handleClick}
      onTap={handleClick}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* Body polygon */}
      <Line
        points={screenPoints}
        closed
        fill={body.color}
        opacity={body.opacity}
        stroke={isSelected ? '#4a9eff' : body.isGround ? '#888888' : '#555555'}
        strokeWidth={isSelected ? 2.5 : 1}
        hitStrokeWidth={10}
      />

      {/* Skravering for ground bodies */}
      {body.isGround && (
        <Line
          points={screenPoints}
          closed
          fillPatternImage={undefined}
          stroke="#888888"
          strokeWidth={1}
          dash={[4, 4]}
          listening={false}
        />
      )}

      {/* Body-navn */}
      <Text
        x={centerScreen.x}
        y={centerScreen.y - fontSize / 2}
        text={body.name}
        fill="#ffffff"
        fontSize={fontSize}
        fontFamily="system-ui, sans-serif"
        offsetX={body.name.length * fontSize * 0.3}
        opacity={0.7}
        listening={false}
      />
    </Group>
  )
}
