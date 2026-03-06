import { useRef, useEffect, useState, useCallback } from 'react'
import { useSceneStore } from '../store/sceneStore'
import { solveMechanism } from '../engine/kinematics'

export default function AnimationBar() {
  const scene = useSceneStore((s) => s.scene)
  const updateJoint = useSceneStore((s) => s.updateJoint)
  const updateBody = useSceneStore((s) => s.updateBody)

  const driverJoint = scene.joints.find((j) => j.isDriver)
  const [isPlaying, setIsPlaying] = useState(false)
  const animRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  const angleRef = useRef<number>(driverJoint?.currentAngle ?? 0)

  const minAngle = driverJoint?.minAngle ?? -180
  const maxAngle = driverJoint?.maxAngle ?? 180
  const currentAngle = driverJoint?.currentAngle ?? 0

  // Hold angleRef synkroniseret med den rigtige currentAngle
  // (men kun når vi IKKE animerer — ellers styrer animationen)
  useEffect(() => {
    if (!isPlaying) {
      angleRef.current = currentAngle
    }
  }, [currentAngle, isPlaying])

  // Refs for stabile værdier i animation loop
  const sceneRef = useRef(scene)
  const driverJointRef = useRef(driverJoint)
  const updateJointRef = useRef(updateJoint)
  const updateBodyRef = useRef(updateBody)
  const minAngleRef = useRef(minAngle)
  const maxAngleRef = useRef(maxAngle)

  useEffect(() => { sceneRef.current = scene }, [scene])
  useEffect(() => { driverJointRef.current = driverJoint }, [driverJoint])
  useEffect(() => { updateJointRef.current = updateJoint }, [updateJoint])
  useEffect(() => { updateBodyRef.current = updateBody }, [updateBody])
  useEffect(() => { minAngleRef.current = minAngle }, [minAngle])
  useEffect(() => { maxAngleRef.current = maxAngle }, [maxAngle])

  // Animation loop — afhænger KUN af isPlaying
  useEffect(() => {
    if (!isPlaying || !driverJointRef.current) return

    const speed = 45 // grader per sekund

    const animate = (time: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = time
        animRef.current = requestAnimationFrame(animate)
        return // spring første frame over (dt ville være 0)
      }

      const dt = (time - lastTimeRef.current) / 1000
      lastTimeRef.current = time

      let newAngle = angleRef.current + speed * dt
      if (newAngle > maxAngleRef.current) {
        newAngle = minAngleRef.current
      }
      angleRef.current = newAngle

      // Opdater joint
      const dj = driverJointRef.current
      if (!dj) return

      updateJointRef.current(dj.id, { currentAngle: newAngle })

      // Solve mechanism med opdateret scene
      const currentScene = sceneRef.current
      const updatedScene = {
        ...currentScene,
        joints: currentScene.joints.map((j) =>
          j.id === dj.id ? { ...j, currentAngle: newAngle } : j
        ),
      }
      const solution = solveMechanism(updatedScene, newAngle)
      if (solution.valid) {
        for (const bu of solution.bodyUpdates) {
          updateBodyRef.current(bu.id, { x: bu.x, y: bu.y, rotation: bu.rotation })
        }
      }

      animRef.current = requestAnimationFrame(animate)
    }

    lastTimeRef.current = 0
    animRef.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animRef.current)
    }
  }, [isPlaying]) // eslint-disable-line react-hooks/exhaustive-deps

  const applyDriverAngle = useCallback(
    (angle: number) => {
      if (!driverJoint) return
      angleRef.current = angle
      updateJoint(driverJoint.id, { currentAngle: angle })

      const updatedScene = {
        ...scene,
        joints: scene.joints.map((j) =>
          j.id === driverJoint.id ? { ...j, currentAngle: angle } : j
        ),
      }
      const solution = solveMechanism(updatedScene, angle)
      if (solution.valid) {
        for (const bu of solution.bodyUpdates) {
          updateBody(bu.id, { x: bu.x, y: bu.y, rotation: bu.rotation })
        }
      }
    },
    [driverJoint, scene, updateJoint, updateBody]
  )

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const angle = parseFloat(e.target.value)
      applyDriverAngle(angle)
    },
    [applyDriverAngle]
  )

  if (!driverJoint) {
    return (
      <div className="h-10 bg-[#1e1e1e] border-t border-[#333] flex items-center px-4 text-sm text-gray-600">
        Ingen driver-joint valgt — marker et led som "Driver" for at aktivere animationsbar
      </div>
    )
  }

  return (
    <div className="h-12 bg-[#1e1e1e] border-t border-[#333] flex items-center px-4 gap-3 shrink-0">
      {/* Play/Pause */}
      <button
        className={`px-2 py-1 rounded text-sm font-medium transition-colors ${
          isPlaying
            ? 'bg-orange-600 text-white'
            : 'bg-[#2a2a2a] text-gray-300 hover:bg-[#3a3a3a]'
        }`}
        onClick={() => setIsPlaying(!isPlaying)}
        title={isPlaying ? 'Pause animation' : 'Afspil animation'}
      >
        {isPlaying ? '⏸' : '▶'}
      </button>

      {/* Min label */}
      <span className="text-xs text-gray-500 w-10 text-right">{minAngle}°</span>

      {/* Slider */}
      <input
        type="range"
        min={minAngle}
        max={maxAngle}
        step={0.5}
        value={currentAngle}
        onChange={handleSliderChange}
        className="flex-1 h-2 accent-orange-500"
      />

      {/* Max label */}
      <span className="text-xs text-gray-500 w-10">{maxAngle}°</span>

      {/* Current angle */}
      <span className="text-sm text-orange-400 font-mono w-16 text-right">
        {currentAngle.toFixed(1)}°
      </span>
    </div>
  )
}
