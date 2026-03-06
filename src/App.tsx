import Toolbar from './ui/Toolbar'
import Sidebar from './ui/Sidebar'
import SceneCanvas from './canvas/SceneCanvas'
import AnimationBar from './ui/AnimationBar'

export default function App() {
  return (
    <div className="flex flex-col h-screen w-screen bg-[#1a1a1a] text-gray-200">
      <Toolbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <SceneCanvas />
      </div>
      <AnimationBar />
    </div>
  )
}
