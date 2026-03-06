import { useCallback } from 'react'
import type { Joint, Scene } from '../types'
import { useSceneStore } from '../store/sceneStore'

interface JointPanelProps {
  joint: Joint
  scene: Scene
}

export default function JointPanel({ joint, scene }: JointPanelProps) {
  const updateJoint = useSceneStore((s) => s.updateJoint)
  const deleteJoint = useSceneStore((s) => s.deleteJoint)
  const selectJoint = useSceneStore((s) => s.selectJoint)

  const handleUpdate = useCallback(
    (field: string, value: number | string | boolean | undefined) => {
      updateJoint(joint.id, { [field]: value })
    },
    [joint.id, updateJoint]
  )

  const handleSetDriver = useCallback(() => {
    // Fjern driver fra andre joints
    scene.joints.forEach((j) => {
      if (j.id !== joint.id && j.isDriver) {
        updateJoint(j.id, { isDriver: false })
      }
    })
    updateJoint(joint.id, { isDriver: !joint.isDriver })
  }, [joint.id, joint.isDriver, scene.joints, updateJoint])

  const bodyAName = joint.bodyAId === null || joint.bodyAId === 'ground'
    ? 'Ground'
    : scene.bodies.find((b) => b.id === joint.bodyAId)?.name ?? 'Ukendt'

  const bodyBName = scene.bodies.find((b) => b.id === joint.bodyBId)?.name ?? 'Ukendt'

  const labelClass = 'text-xs text-gray-500 font-medium'
  const numInputClass =
    'w-full bg-[#2a2a2a] border border-[#444] rounded px-2 py-1 text-sm text-gray-200 focus:outline-none focus:border-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'

  return (
    <div className="p-3 space-y-4">
      {/* Overskrift */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-300">Led (Joint)</h3>
        <button
          className="text-xs text-gray-500 hover:text-gray-300"
          onClick={() => selectJoint(null)}
        >
          ✕
        </button>
      </div>

      {/* Type */}
      <div>
        <label className={labelClass}>Type</label>
        <div className="mt-1 text-sm text-gray-300 bg-[#2a2a2a] rounded px-2 py-1">
          {joint.type === 'revolute' ? 'Revolute (rotation)' : 'Slider'}
        </div>
      </div>

      {/* Forbundne bodies */}
      <div>
        <label className={labelClass}>Forbindelser</label>
        <div className="mt-1 space-y-1">
          <div className="text-xs text-gray-400 bg-[#2a2a2a] rounded px-2 py-1">
            A: {bodyAName}
          </div>
          <div className="text-xs text-gray-400 bg-[#2a2a2a] rounded px-2 py-1">
            B: {bodyBName}
          </div>
        </div>
      </div>

      {/* Driver toggle */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={joint.isDriver}
          onChange={handleSetDriver}
          className="rounded"
          id={`driver-${joint.id}`}
        />
        <label htmlFor={`driver-${joint.id}`} className="text-sm text-gray-400">
          Driver (styrer mekanismen)
        </label>
      </div>

      {/* Aktuel vinkel */}
      {joint.isDriver && (
        <div>
          <label className={labelClass}>Aktuel vinkel</label>
          <div className="flex items-center gap-2 mt-1">
            <input
              type="number"
              className={numInputClass}
              value={Math.round(joint.currentAngle * 10) / 10}
              onChange={(e) => handleUpdate('currentAngle', parseFloat(e.target.value) || 0)}
              step={5}
            />
            <span className="text-xs text-gray-500">°</span>
          </div>
        </div>
      )}

      {/* Min/max vinkel */}
      <div>
        <label className={labelClass}>Vinkelgrænser</label>
        <div className="grid grid-cols-2 gap-2 mt-1">
          <div>
            <span className="text-xs text-gray-600">Min</span>
            <input
              type="number"
              className={numInputClass}
              value={joint.minAngle ?? ''}
              placeholder="—"
              onChange={(e) => {
                const val = e.target.value
                handleUpdate('minAngle', val === '' ? undefined : parseFloat(val))
              }}
              step={5}
            />
          </div>
          <div>
            <span className="text-xs text-gray-600">Max</span>
            <input
              type="number"
              className={numInputClass}
              value={joint.maxAngle ?? ''}
              placeholder="—"
              onChange={(e) => {
                const val = e.target.value
                handleUpdate('maxAngle', val === '' ? undefined : parseFloat(val))
              }}
              step={5}
            />
          </div>
        </div>
      </div>

      {/* Slet */}
      <button
        className="w-full py-1.5 rounded text-sm font-medium bg-red-900/40 text-red-400 hover:bg-red-900/70 transition-colors"
        onClick={() => deleteJoint(joint.id)}
      >
        Slet led
      </button>
    </div>
  )
}
