import { useSceneStore } from '../store/sceneStore'
import { saveBaseline, loadBaseline, exportSceneToFile, importSceneFromFile } from '../store/persistence'

export default function Toolbar() {
  const tool = useSceneStore((s) => s.tool)
  const setTool = useSceneStore((s) => s.setTool)
  const scene = useSceneStore((s) => s.scene)
  const importScene = useSceneStore((s) => s.importScene)
  const resetScene = useSceneStore((s) => s.resetScene)

  const handleExport = () => {
    exportSceneToFile(scene)
  }

  const handleImport = async () => {
    try {
      const imported = await importSceneFromFile()
      importScene(imported)
    } catch (e) {
      console.warn('Import fejlede:', e)
    }
  }

  const handleSaveBaseline = () => {
    saveBaseline(scene)
  }

  const handleResetBaseline = () => {
    const baseline = loadBaseline()
    if (baseline) {
      importScene(baseline)
    }
  }

  const btnClass = (active: boolean) =>
    `px-3 py-1.5 rounded text-sm font-medium transition-colors ${
      active
        ? 'bg-blue-600 text-white'
        : 'bg-[#2a2a2a] text-gray-300 hover:bg-[#3a3a3a]'
    }`

  const actionBtnClass =
    'px-3 py-1.5 rounded text-sm font-medium bg-[#2a2a2a] text-gray-300 hover:bg-[#3a3a3a] transition-colors'

  return (
    <div className="h-12 bg-[#1e1e1e] border-b border-[#333] flex items-center px-4 gap-2 shrink-0">
      {/* Logo */}
      <span className="text-blue-400 font-bold text-lg mr-4 select-none">LinkSim</span>

      {/* Separator */}
      <div className="w-px h-6 bg-[#444] mx-1" />

      {/* Værktøjer */}
      <button
        className={btnClass(tool === 'select')}
        onClick={() => setTool('select')}
        title="Vælg (V)"
      >
        ↖ Vælg
      </button>
      <button
        className={btnClass(tool === 'addRect')}
        onClick={() => setTool('addRect')}
        title="Tilføj rektangel (R)"
      >
        +Rekt
      </button>
      <button
        className={btnClass(tool === 'addGround')}
        onClick={() => setTool('addGround')}
        title="Tilføj forankringspunkt (G)"
      >
        +Anker
      </button>

      {/* Separator */}
      <div className="w-px h-6 bg-[#444] mx-1" />

      {/* Gem/indlæs */}
      <button className={actionBtnClass} onClick={handleSaveBaseline} title="Gem nuværende som udgangspunkt">
        Gem udg.pkt
      </button>
      <button className={actionBtnClass} onClick={handleResetBaseline} title="Nulstil til gemt udgangspunkt">
        Nulstil
      </button>

      {/* Separator */}
      <div className="w-px h-6 bg-[#444] mx-1" />

      <button className={actionBtnClass} onClick={handleExport} title="Eksporter scene som JSON">
        ↓ JSON
      </button>
      <button className={actionBtnClass} onClick={handleImport} title="Importer scene fra JSON">
        ↑ JSON
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      <button
        className="px-3 py-1.5 rounded text-sm font-medium bg-red-900/50 text-red-300 hover:bg-red-900/80 transition-colors"
        onClick={resetScene}
        title="Ryd hele scenen"
      >
        Ryd scene
      </button>
    </div>
  )
}
