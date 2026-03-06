import { useCallback } from 'react'
import type { Body } from '../types'
import { useSceneStore } from '../store/sceneStore'

interface BodyPanelProps {
  body: Body
}

export default function BodyPanel({ body }: BodyPanelProps) {
  const updateBody = useSceneStore((s) => s.updateBody)
  const deleteBody = useSceneStore((s) => s.deleteBody)
  const selectBody = useSceneStore((s) => s.selectBody)

  const handleUpdate = useCallback(
    (field: string, value: number | string | boolean) => {
      updateBody(body.id, { [field]: value })
    },
    [body.id, updateBody]
  )

  const labelClass = 'text-xs text-gray-500 font-medium'
  const inputClass =
    'w-full bg-[#2a2a2a] border border-[#444] rounded px-2 py-1 text-sm text-gray-200 focus:outline-none focus:border-blue-500'
  const numInputClass =
    'w-full bg-[#2a2a2a] border border-[#444] rounded px-2 py-1 text-sm text-gray-200 focus:outline-none focus:border-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'

  return (
    <div className="p-3 space-y-4">
      {/* Overskrift */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-300">Legeme</h3>
        <button
          className="text-xs text-gray-500 hover:text-gray-300"
          onClick={() => selectBody(null)}
        >
          ✕
        </button>
      </div>

      {/* Navn */}
      <div>
        <label className={labelClass}>Navn</label>
        <input
          type="text"
          className={inputClass}
          value={body.name}
          onChange={(e) => handleUpdate('name', e.target.value)}
        />
      </div>

      {/* Position */}
      <div>
        <label className={labelClass}>Position (mm)</label>
        <div className="grid grid-cols-2 gap-2 mt-1">
          <div>
            <span className="text-xs text-gray-600">X</span>
            <input
              type="number"
              className={numInputClass}
              value={Math.round(body.x * 10) / 10}
              onChange={(e) => handleUpdate('x', parseFloat(e.target.value) || 0)}
              step={1}
            />
          </div>
          <div>
            <span className="text-xs text-gray-600">Y</span>
            <input
              type="number"
              className={numInputClass}
              value={Math.round(body.y * 10) / 10}
              onChange={(e) => handleUpdate('y', parseFloat(e.target.value) || 0)}
              step={1}
            />
          </div>
        </div>
      </div>

      {/* Rotation */}
      <div>
        <label className={labelClass}>Rotation</label>
        <div className="flex items-center gap-2 mt-1">
          <input
            type="number"
            className={numInputClass}
            value={Math.round(body.rotation * 10) / 10}
            onChange={(e) => handleUpdate('rotation', parseFloat(e.target.value) || 0)}
            step={5}
          />
          <span className="text-xs text-gray-500">°</span>
        </div>
      </div>

      {/* Dimensioner (rektangel) */}
      {body.shapeType === 'rectangle' && (
        <div>
          <label className={labelClass}>Dimensioner (mm)</label>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <div>
              <span className="text-xs text-gray-600">Bredde</span>
              <input
                type="number"
                className={numInputClass}
                value={body.width ?? 100}
                onChange={(e) => handleUpdate('width', Math.max(1, parseFloat(e.target.value) || 1))}
                step={5}
                min={1}
              />
            </div>
            <div>
              <span className="text-xs text-gray-600">Højde</span>
              <input
                type="number"
                className={numInputClass}
                value={body.height ?? 50}
                onChange={(e) => handleUpdate('height', Math.max(1, parseFloat(e.target.value) || 1))}
                step={5}
                min={1}
              />
            </div>
          </div>
        </div>
      )}

      {/* Farve */}
      <div>
        <label className={labelClass}>Farve</label>
        <div className="flex items-center gap-2 mt-1">
          <input
            type="color"
            value={body.color}
            onChange={(e) => handleUpdate('color', e.target.value)}
            className="w-8 h-8 rounded cursor-pointer border border-[#444] bg-transparent"
          />
          <span className="text-xs text-gray-500">{body.color}</span>
        </div>
      </div>

      {/* Opacity */}
      <div>
        <label className={labelClass}>Opacitet</label>
        <div className="flex items-center gap-2 mt-1">
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.05"
            value={body.opacity}
            onChange={(e) => handleUpdate('opacity', parseFloat(e.target.value))}
            className="flex-1"
          />
          <span className="text-xs text-gray-500 w-8">{(body.opacity * 100).toFixed(0)}%</span>
        </div>
      </div>

      {/* Ground toggle */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={body.isGround}
          onChange={(e) => handleUpdate('isGround', e.target.checked)}
          className="rounded"
          id={`ground-${body.id}`}
        />
        <label htmlFor={`ground-${body.id}`} className="text-sm text-gray-400">
          Fast forankret (ground)
        </label>
      </div>

      {/* Slet */}
      <button
        className="w-full py-1.5 rounded text-sm font-medium bg-red-900/40 text-red-400 hover:bg-red-900/70 transition-colors"
        onClick={() => deleteBody(body.id)}
      >
        Slet legeme
      </button>
    </div>
  )
}
