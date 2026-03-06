import { useRef, useCallback, useEffect, useState } from 'react'
import { Stage, Layer } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import type Konva from 'konva'
import { useSceneStore } from '../store/sceneStore'
import { screenToWorld, snapToGrid, getGridSize } from '../engine/geometry'
import { solveMechanism, computeDriverAngleFromMouse, getJointWorldAnchorA } from '../engine/kinematics'
import GridLayer from './GridLayer'
import BodyShape from './BodyShape'
import GroundAnchorMarker from './GroundAnchorMarker'
import JointMarker from './JointMarker'

export default function SceneCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const isPanningRef = useRef(false)
  const lastPanPosRef = useRef({ x: 0, y: 0 })
  const spaceDownRef = useRef(false)
  const isDraggingMechanismRef = useRef(false)

  const scene = useSceneStore((s) => s.scene)
  const selectedBodyId = useSceneStore((s) => s.selectedBodyId)
  const selectedJointId = useSceneStore((s) => s.selectedJointId)
  const tool = useSceneStore((s) => s.tool)
  const jointCreation = useSceneStore((s) => s.jointCreation)
  const setCamera = useSceneStore((s) => s.setCamera)
  const selectBody = useSceneStore((s) => s.selectBody)
  const selectJoint = useSceneStore((s) => s.selectJoint)
  const addRectBody = useSceneStore((s) => s.addRectBody)
  const addGroundAnchor = useSceneStore((s) => s.addGroundAnchor)
  const updateBody = useSceneStore((s) => s.updateBody)
  const updateJoint = useSceneStore((s) => s.updateJoint)
  const deleteBody = useSceneStore((s) => s.deleteBody)
  const selectJointBodyA = useSceneStore((s) => s.selectJointBodyA)
  const selectJointBodyB = useSceneStore((s) => s.selectJointBodyB)
  const cancelJointCreation = useSceneStore((s) => s.cancelJointCreation)

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

  // Space key + Escape for cancel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault()
        spaceDownRef.current = true
      }
      if (e.code === 'Escape') {
        if (jointCreation) {
          cancelJointCreation()
        }
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
  }, [selectedBodyId, deleteBody, jointCreation, cancelJointCreation])

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

      const mouseWorldBefore = screenToWorld(pointer, scene.camera)
      const newCamera = { ...scene.camera, scale: newScale }
      newCamera.x = pointer.x - mouseWorldBefore.x * newScale
      newCamera.y = pointer.y + mouseWorldBefore.y * newScale

      setCamera(newCamera)
    },
    [scene.camera, setCamera]
  )

  // Check om en body er del af en mekanisme med driver
  const isBodyInMechanism = useCallback(
    (bodyId: string): boolean => {
      return scene.joints.some(
        (j) => j.isDriver && (j.bodyAId === bodyId || j.bodyBId === bodyId)
      )
    },
    [scene.joints]
  )

  // Pan og tool-handling
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
        } else if (tool === 'addJoint' && jointCreation) {
          // Joint creation: klik på ground
          if (jointCreation.step === 'selectBodyA') {
            const gridSize = getGridSize(scene.camera.scale)
            const snappedX = scene.snapToGrid ? snapToGrid(worldPos.x, gridSize) : worldPos.x
            const snappedY = scene.snapToGrid ? snapToGrid(worldPos.y, gridSize) : worldPos.y
            selectJointBodyA(null, { x: snappedX, y: snappedY })
          }
        } else {
          selectBody(null)
          selectJoint(null)
        }
      }
    },
    [tool, jointCreation, scene.camera, scene.snapToGrid, addRectBody, addGroundAnchor, selectBody, selectJoint, selectJointBodyA]
  )

  const handleMouseMove = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (isPanningRef.current) {
        const dx = e.evt.clientX - lastPanPosRef.current.x
        const dy = e.evt.clientY - lastPanPosRef.current.y
        lastPanPosRef.current = { x: e.evt.clientX, y: e.evt.clientY }
        setCamera({
          ...scene.camera,
          x: scene.camera.x + dx,
          y: scene.camera.y + dy,
        })
        return
      }

      // IK drag: når body trækkes i en mekanisme
      if (isDraggingMechanismRef.current) {
        const pointer = stageRef.current?.getPointerPosition()
        if (!pointer) return

        const mouseWorld = screenToWorld(pointer, scene.camera)
        const driverJoint = scene.joints.find((j) => j.isDriver)
        if (!driverJoint) return

        const pivotWorld = getJointWorldAnchorA(driverJoint, scene)
        const newAngle = computeDriverAngleFromMouse(mouseWorld, pivotWorld, driverJoint)

        updateJoint(driverJoint.id, { currentAngle: newAngle })

        const updatedScene = {
          ...scene,
          joints: scene.joints.map((j) =>
            j.id === driverJoint.id ? { ...j, currentAngle: newAngle } : j
          ),
        }
        const solution = solveMechanism(updatedScene, newAngle)

        if (solution.valid) {
          for (const bu of solution.bodyUpdates) {
            updateBody(bu.id, { x: bu.x, y: bu.y, rotation: bu.rotation })
          }
        }
      }
    },
    [scene, setCamera, updateJoint, updateBody]
  )

  const handleMouseUp = useCallback(() => {
    isPanningRef.current = false
    isDraggingMechanismRef.current = false
  }, [])

  // Body drag/click handler
  const handleBodyClick = useCallback(
    (id: string) => {
      if (tool === 'addJoint' && jointCreation) {
        const body = scene.bodies.find((b) => b.id === id)
        if (!body) return

        // Beregn anchor som nærmeste kant-punkt til ground-anchor
        // For A-side: brug body center
        // For B-side: beregn nærmeste kant mod A-anchor
        if (jointCreation.step === 'selectBodyA') {
          selectJointBodyA(id, { x: 0, y: 0 })
        } else if (jointCreation.step === 'selectBodyB') {
          if (id !== jointCreation.bodyAId) {
            // Find det nærmeste hjørne/kantpunkt til ground-ankeret
            let anchor = { x: 0, y: 0 }
            if (jointCreation.anchorOnA && body.vertices.length > 0) {
              const groundWorld = jointCreation.anchorOnA
              // Simpel: brug nærmeste vertex i body-lokale coords
              let bestDist = Infinity
              for (const v of body.vertices) {
                // Approx: find vertex nærmest ground anchor i world
                const rad = (body.rotation * Math.PI) / 180
                const wx = body.x + v.x * Math.cos(rad) - v.y * Math.sin(rad)
                const wy = body.y + v.x * Math.sin(rad) + v.y * Math.cos(rad)
                const dist = Math.sqrt((wx - groundWorld.x) ** 2 + (wy - groundWorld.y) ** 2)
                if (dist < bestDist) {
                  bestDist = dist
                  anchor = { x: v.x, y: v.y }
                }
              }
              // Brug også kantmidter (venstre, højre, top, bund)
              if (body.width && body.height) {
                const edgeMids = [
                  { x: -(body.width / 2), y: 0 },  // venstre
                  { x: body.width / 2, y: 0 },      // højre
                  { x: 0, y: -(body.height / 2) },   // bund
                  { x: 0, y: body.height / 2 },      // top
                ]
                for (const em of edgeMids) {
                  const rad = (body.rotation * Math.PI) / 180
                  const wx = body.x + em.x * Math.cos(rad) - em.y * Math.sin(rad)
                  const wy = body.y + em.x * Math.sin(rad) + em.y * Math.cos(rad)
                  const dist = Math.sqrt((wx - groundWorld.x) ** 2 + (wy - groundWorld.y) ** 2)
                  if (dist < bestDist) {
                    bestDist = dist
                    anchor = { x: em.x, y: em.y }
                  }
                }
              }
            }
            selectJointBodyB(id, anchor)
          }
        }
        return
      }

      selectBody(id)
    },
    [tool, jointCreation, scene.bodies, selectBody, selectJointBodyA, selectJointBodyB]
  )

  const handleBodyDragStart = useCallback(
    (id: string) => {
      // Check om body er i mekanisme — brug IK i stedet for direkte drag
      if (isBodyInMechanism(id)) {
        isDraggingMechanismRef.current = true
        return true // signal at det er mechanism drag
      }
      return false
    },
    [isBodyInMechanism]
  )

  const handleBodyDragEnd = useCallback(
    (id: string, newX: number, newY: number) => {
      if (!isDraggingMechanismRef.current) {
        updateBody(id, { x: newX, y: newY })
      }
      isDraggingMechanismRef.current = false
    },
    [updateBody]
  )

  const handleJointSelect = useCallback(
    (id: string) => {
      selectJoint(id)
    },
    [selectJoint]
  )

  const cursorStyle = spaceDownRef.current || isPanningRef.current
    ? 'grabbing'
    : tool === 'addRect' || tool === 'addGround'
    ? 'crosshair'
    : tool === 'addJoint'
    ? 'pointer'
    : 'default'

  return (
    <div
      ref={containerRef}
      className="flex-1 bg-[#1a1a1a] overflow-hidden relative"
      style={{ cursor: cursorStyle }}
    >
      {/* Joint creation overlay */}
      {jointCreation && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-orange-600/90 text-white px-4 py-2 rounded-lg text-sm z-10 flex items-center gap-3">
          {jointCreation.step === 'selectBodyA' && (
            <span>Klik på første legeme/ground (A-side)</span>
          )}
          {jointCreation.step === 'selectBodyB' && (
            <span>Klik på andet legeme (B-side)</span>
          )}
          <button
            className="text-white/80 hover:text-white underline text-xs"
            onClick={cancelJointCreation}
          >
            Annuller (Esc)
          </button>
        </div>
      )}

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
              onSelect={handleBodyClick}
              onDragEnd={handleBodyDragEnd}
              onDragStart={handleBodyDragStart}
              isInMechanism={isBodyInMechanism(body.id)}
            />
          ))}
        </Layer>

        {/* Joints Layer */}
        <Layer>
          {scene.joints.map((joint) => (
            <JointMarker
              key={joint.id}
              joint={joint}
              scene={scene}
              camera={scene.camera}
              isSelected={joint.id === selectedJointId}
              onSelect={handleJointSelect}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  )
}
