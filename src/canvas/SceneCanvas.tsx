import { useRef, useCallback, useEffect, useState } from 'react'
import { Stage, Layer } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import type Konva from 'konva'
import { useSceneStore } from '../store/sceneStore'
import { screenToWorld, snapToGrid, getGridSize } from '../engine/geometry'
import GridLayer from './GridLayer'
import BodyShape from './BodyShape'
import GroundAnchorMarker from './GroundAnchorMarker'

export default function SceneCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const isPanningRef = useRef(false)
  const lastPanPosRef = useRef({ x: 0, y: 0 })
  const spaceDownRef = useRef(false)

  const scene = useSceneStore((s) => s.scene)
  const selectedBodyId = useSceneStore((s) => s.selectedBodyId)
  const tool = useSceneStore((s) => s.tool)
  const setCamera = useSceneStore((s) => s.setCamera)
  const selectBody = useSceneStore((s) => s.selectBody)
  const addRectBody = useSceneStore((s) => s.addRectBody)
  const addGroundAnchor = useSceneStore((s) => s.addGroundAnchor)
  const updateBody = useSceneStore((s) => s.updateBody)
  const deleteBody = useSceneStore((s) => s.deleteBody)

  // Resize observer
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        })
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Initial camera center
  useEffect(() => {
    if (scene.camera.x === 0 && scene.camera.y === 0 && dimensions.width > 100) {
      setCamera({
        ...scene.camera,
        x: dimensions.width / 2,
        y: dimensions.height / 2,
      })
    }
  }, [dimensions.width, dimensions.height])

  // Space key for pan
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault()
        spaceDownRef.current = true
      }
      if (e.code === 'Delete' || e.code === 'Backspace') {
        const activeEl = document.activeElement
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) return
        if (selectedBodyId) {
          deleteBody(selectedBodyId)
        }
      }
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spaceDownRef.current = false
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [selectedBodyId, deleteBody])

  // Zoom med scroll
  const handleWheel = useCallback(
    (e: KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault()
      const stage = stageRef.current
      if (!stage) return

      const pointer = stage.getPointerPosition()
      if (!pointer) return

      const oldScale = scene.camera.scale
      const zoomFactor = e.evt.deltaY > 0 ? 0.9 : 1.1
      const newScale = Math.max(0.2, Math.min(20, oldScale * zoomFactor))

      // Zoom mod museposition
      const mouseWorldBefore = screenToWorld(pointer, scene.camera)
      const newCamera = { ...scene.camera, scale: newScale }
      // Beregn ny pan så mouse-world forbliver under cursoren
      newCamera.x = pointer.x - mouseWorldBefore.x * newScale
      newCamera.y = pointer.y + mouseWorldBefore.y * newScale

      setCamera(newCamera)
    },
    [scene.camera, setCamera]
  )

  // Pan med midterste museknap eller Space+drag
  const handleMouseDown = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      // Midterste museknap eller Space+venstre
      if (e.evt.button === 1 || (spaceDownRef.current && e.evt.button === 0)) {
        isPanningRef.current = true
        lastPanPosRef.current = { x: e.evt.clientX, y: e.evt.clientY }
        e.evt.preventDefault()
        return
      }

      // Klik på tom canvas
      if (e.evt.button === 0 && e.target === stageRef.current) {
        const pointer = stageRef.current?.getPointerPosition()
        if (!pointer) return

        const worldPos = screenToWorld(pointer, scene.camera)

        if (tool === 'addRect') {
          const gridSize = getGridSize(scene.camera.scale)
          const snappedX = scene.snapToGrid ? snapToGrid(worldPos.x, gridSize) : worldPos.x
          const snappedY = scene.snapToGrid ? snapToGrid(worldPos.y, gridSize) : worldPos.y
          addRectBody(snappedX, snappedY, 100, 50)
        } else if (tool === 'addGround') {
          const gridSize = getGridSize(scene.camera.scale)
          const snappedX = scene.snapToGrid ? snapToGrid(worldPos.x, gridSize) : worldPos.x
          const snappedY = scene.snapToGrid ? snapToGrid(worldPos.y, gridSize) : worldPos.y
          addGroundAnchor(snappedX, snappedY)
        } else {
          selectBody(null)
        }
      }
    },
    [tool, scene.camera, scene.snapToGrid, addRectBody, addGroundAnchor, selectBody]
  )

  const handleMouseMove = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (!isPanningRef.current) return
      const dx = e.evt.clientX - lastPanPosRef.current.x
      const dy = e.evt.clientY - lastPanPosRef.current.y
      lastPanPosRef.current = { x: e.evt.clientX, y: e.evt.clientY }

      setCamera({
        ...scene.camera,
        x: scene.camera.x + dx,
        y: scene.camera.y + dy,
      })
    },
    [scene.camera, setCamera]
  )

  const handleMouseUp = useCallback(() => {
    isPanningRef.current = false
  }, [])

  const handleBodyDragEnd = useCallback(
    (id: string, newX: number, newY: number) => {
      updateBody(id, { x: newX, y: newY })
    },
    [updateBody]
  )

  const cursorStyle = spaceDownRef.current || isPanningRef.current
    ? 'grabbing'
    : tool === 'addRect' || tool === 'addGround'
    ? 'crosshair'
    : 'default'

  return (
    <div
      ref={containerRef}
      className="flex-1 bg-[#1a1a1a] overflow-hidden"
      style={{ cursor: cursorStyle }}
    >
      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Grid Layer */}
        <Layer listening={false}>
          <GridLayer
            camera={scene.camera}
            stageWidth={dimensions.width}
            stageHeight={dimensions.height}
          />
        </Layer>

        {/* Bodies Layer */}
        <Layer>
          {scene.groundPoints.map((anchor) => (
            <GroundAnchorMarker
              key={anchor.id}
              anchor={anchor}
              camera={scene.camera}
            />
          ))}
          {scene.bodies.map((body) => (
            <BodyShape
              key={body.id}
              body={body}
              camera={scene.camera}
              isSelected={body.id === selectedBodyId}
              snapEnabled={scene.snapToGrid}
              onSelect={selectBody}
              onDragEnd={handleBodyDragEnd}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  )
}
