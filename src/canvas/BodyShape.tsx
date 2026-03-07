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
  isInMechanism: boolean
  onSelect: (id: string, screenPos?: { x: number; y: number }) => void
  onDragEnd: (id: string, newX: number, newY: number) => void
  onDragStart?: (id: string) => boolean // return true if mechanism drag
}

export default function BodyShape({
  body,
  camera,
  isSelected,
  snapEnabled,
  isInMechanism,
  onSelect,
  onDragEnd,
  onDragStart,
}: BodyShapeProps) {
  const groupRef = useRef<ReturnType<typeof Group> | null>(null)
  const isMechanismDragRef = useRef(false)

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
      // Hent klik-position fra stage (screen-koordinater)
      const stage = e.target.getStage()
      const pointer = stage?.getPointerPosition()
      onSelect(body.id, pointer ?? undefined)
    },
    [body.id, onSelect]
  )

  const handleDragStart = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
      e.cancelBubble = true
      if (onDragStart) {
        isMechanismDragRef.current = onDragStart(body.id)
        if (isMechanismDragRef.current) {
          // Prevent Konva drag — vi håndterer det via mousemove IK
          e.target.stopDrag()
        }
      }
    },
    [body.id, onDragStart]
  )

  const handleDragEnd = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
      if (isMechanismDragRef.current) {
        isMechanismDragRef.current = false
        e.target.x(0)
        e.target.y(0)
        return
      }

      const node = e.target
      const dx = node.x()
      const dy = node.y()
      node.x(0)
      node.y(0)

      let newWorldX = body.x + dx / camera.scale
      let newWorldY = body.y - dy / camera.scale

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

  // Farve for mekanisme-bodies
  const strokeColor = isSelected
    ? '#4a9eff'
    : isInMechanism
    ? '#ff922b'
    : body.isGround
    ? '#888888'
    : '#555555'

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
        stroke={strokeColor}
        strokeWidth={isSelected ? 2.5 : isInMechanism ? 1.5 : 1}
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
