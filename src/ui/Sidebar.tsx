import { useSceneStore } from '../store/sceneStore'
import BodyPanel from './BodyPanel'

export default function Sidebar() {
  const scene = useSceneStore((s) => s.scene)
  const selectedBodyId = useSceneStore((s) => s.selectedBodyId)

  const selectedBody = scene.bodies.find((b) => b.id === selectedBodyId) ?? null

  return (
    <div className="w-60 bg-[#1e1e1e] border-r border-[#333] overflow-y-auto shrink-0 flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-[#333]">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
          Egenskaber
        </h2>
      </div>

      {selectedBody ? (
        <BodyPanel body={selectedBody} />
      ) : (
        <div className="p-4 text-sm text-gray-500">
          <p className="mb-3">Klik på et legeme for at redigere dets egenskaber.</p>
          <div className="space-y-2 text-xs text-gray-600">
            <p>• <strong>+Rekt</strong> — Klik på canvas for at tilføje</p>
            <p>• <strong>Scroll</strong> — Zoom ind/ud</p>
            <p>• <strong>Space+træk</strong> — Panorer</p>
            <p>• <strong>Midterklik+træk</strong> — Panorer</p>
            <p>• <strong>Delete</strong> — Slet valgte</p>
          </div>

          {/* Bodies liste */}
          {scene.bodies.length > 0 && (
            <div className="mt-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                Legemer ({scene.bodies.length})
              </h3>
              <div className="space-y-1">
                {scene.bodies.map((b) => (
                  <button
                    key={b.id}
                    className="w-full text-left px-2 py-1 rounded text-xs text-gray-400 hover:bg-[#2a2a2a] flex items-center gap-2"
                    onClick={() => useSceneStore.getState().selectBody(b.id)}
                  >
                    <span
                      className="w-3 h-3 rounded-sm inline-block shrink-0"
                      style={{ backgroundColor: b.color }}
                    />
                    {b.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Ground anchors liste */}
          {scene.groundPoints.length > 0 && (
            <div className="mt-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                Ankerpunkter ({scene.groundPoints.length})
              </h3>
              <div className="space-y-1">
                {scene.groundPoints.map((g) => (
                  <div
                    key={g.id}
                    className="px-2 py-1 text-xs text-gray-400 flex items-center justify-between"
                  >
                    <span>⊕ {g.name} ({g.x.toFixed(0)}, {g.y.toFixed(0)})</span>
                    <button
                      className="text-red-500 hover:text-red-400 text-xs"
                      onClick={() => useSceneStore.getState().deleteGroundAnchor(g.id)}
                      title="Slet anker"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
