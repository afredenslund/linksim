import { create } from 'zustand'
import type { Scene, Body, Joint, TrailPoint, GroundAnchor, Camera } from '../types'
import { generateId, createRectVertices } from '../engine/geometry'
import { loadScene, saveScene } from './persistence'

interface SceneState {
  scene: Scene
  selectedBodyId: string | null
  selectedJointId: string | null
  tool: 'select' | 'addRect' | 'addGround' | 'addJoint'

  // Camera
  setCamera: (camera: Camera) => void

  // Selection
  selectBody: (id: string | null) => void
  selectJoint: (id: string | null) => void

  // Tool
  setTool: (tool: SceneState['tool']) => void

  // Bodies
  addRectBody: (x: number, y: number, width: number, height: number) => void
  updateBody: (id: string, updates: Partial<Body>) => void
  deleteBody: (id: string) => void

  // Joints
  addJoint: (joint: Omit<Joint, 'id'>) => void
  updateJoint: (id: string, updates: Partial<Joint>) => void
  deleteJoint: (id: string) => void

  // Ground anchors
  addGroundAnchor: (x: number, y: number) => void
  deleteGroundAnchor: (id: string) => void

  // Trail points
  addTrailPoint: (tp: Omit<TrailPoint, 'id'>) => void
  deleteTrailPoint: (id: string) => void

  // Scene
  setSceneName: (name: string) => void
  resetScene: () => void
  importScene: (scene: Scene) => void
  exportScene: () => Scene
}

function createDefaultScene(): Scene {
  return {
    id: generateId(),
    name: 'Ny scene',
    bodies: [],
    joints: [],
    trailPoints: [],
    groundPoints: [],
    camera: { x: 0, y: 0, scale: 2.0 },
    snapToGrid: true,
    gridSizeMm: 10,
  }
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null

function debouncedSave(scene: Scene) {
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => {
    saveScene(scene)
  }, 500)
}

const bodyColors = [
  '#4a9eff', '#ff6b6b', '#51cf66', '#ffd43b',
  '#cc5de8', '#ff922b', '#22b8cf', '#e599f7',
]
let colorIndex = 0

export const useSceneStore = create<SceneState>((set, get) => ({
  scene: loadScene() ?? createDefaultScene(),
  selectedBodyId: null,
  selectedJointId: null,
  tool: 'select',

  setCamera: (camera) => {
    set((state) => {
      const newScene = { ...state.scene, camera }
      debouncedSave(newScene)
      return { scene: newScene }
    })
  },

  selectBody: (id) => set({ selectedBodyId: id, selectedJointId: null }),
  selectJoint: (id) => set({ selectedJointId: id, selectedBodyId: null }),

  setTool: (tool) => set({ tool }),

  addRectBody: (x, y, width, height) => {
    const body: Body = {
      id: generateId(),
      name: `Legeme ${get().scene.bodies.length + 1}`,
      shapeType: 'rectangle',
      x,
      y,
      rotation: 0,
      vertices: createRectVertices(width, height),
      width,
      height,
      color: bodyColors[colorIndex % bodyColors.length],
      opacity: 0.8,
      isGround: false,
    }
    colorIndex++
    set((state) => {
      const newScene = {
        ...state.scene,
        bodies: [...state.scene.bodies, body],
      }
      debouncedSave(newScene)
      return { scene: newScene, selectedBodyId: body.id, tool: 'select' as const }
    })
  },

  updateBody: (id, updates) => {
    set((state) => {
      const bodies = state.scene.bodies.map((b) => {
        if (b.id !== id) return b
        const updated = { ...b, ...updates }
        // Genberegn vertices hvis width/height ændres
        if (updated.shapeType === 'rectangle' && (updates.width !== undefined || updates.height !== undefined)) {
          updated.vertices = createRectVertices(updated.width ?? 100, updated.height ?? 50)
        }
        return updated
      })
      const newScene = { ...state.scene, bodies }
      debouncedSave(newScene)
      return { scene: newScene }
    })
  },

  deleteBody: (id) => {
    set((state) => {
      const bodies = state.scene.bodies.filter((b) => b.id !== id)
      const joints = state.scene.joints.filter(
        (j) => j.bodyAId !== id && j.bodyBId !== id
      )
      const trailPoints = state.scene.trailPoints.filter((tp) => tp.bodyId !== id)
      const newScene = { ...state.scene, bodies, joints, trailPoints }
      debouncedSave(newScene)
      return {
        scene: newScene,
        selectedBodyId: state.selectedBodyId === id ? null : state.selectedBodyId,
      }
    })
  },

  addJoint: (jointData) => {
    const joint: Joint = { ...jointData, id: generateId() }
    set((state) => {
      const newScene = {
        ...state.scene,
        joints: [...state.scene.joints, joint],
      }
      debouncedSave(newScene)
      return { scene: newScene }
    })
  },

  updateJoint: (id, updates) => {
    set((state) => {
      const joints = state.scene.joints.map((j) =>
        j.id === id ? { ...j, ...updates } : j
      )
      const newScene = { ...state.scene, joints }
      debouncedSave(newScene)
      return { scene: newScene }
    })
  },

  deleteJoint: (id) => {
    set((state) => {
      const joints = state.scene.joints.filter((j) => j.id !== id)
      const newScene = { ...state.scene, joints }
      debouncedSave(newScene)
      return {
        scene: newScene,
        selectedJointId: state.selectedJointId === id ? null : state.selectedJointId,
      }
    })
  },

  addGroundAnchor: (x, y) => {
    const anchor: GroundAnchor = {
      id: generateId(),
      x,
      y,
      name: `Anker ${get().scene.groundPoints.length + 1}`,
    }
    set((state) => {
      const newScene = {
        ...state.scene,
        groundPoints: [...state.scene.groundPoints, anchor],
      }
      debouncedSave(newScene)
      return { scene: newScene, tool: 'select' as const }
    })
  },

  deleteGroundAnchor: (id) => {
    set((state) => {
      const groundPoints = state.scene.groundPoints.filter((g) => g.id !== id)
      const newScene = { ...state.scene, groundPoints }
      debouncedSave(newScene)
      return { scene: newScene }
    })
  },

  addTrailPoint: (tpData) => {
    const tp: TrailPoint = { ...tpData, id: generateId() }
    set((state) => {
      const newScene = {
        ...state.scene,
        trailPoints: [...state.scene.trailPoints, tp],
      }
      debouncedSave(newScene)
      return { scene: newScene }
    })
  },

  deleteTrailPoint: (id) => {
    set((state) => {
      const trailPoints = state.scene.trailPoints.filter((tp) => tp.id !== id)
      const newScene = { ...state.scene, trailPoints }
      debouncedSave(newScene)
      return { scene: newScene }
    })
  },

  setSceneName: (name) => {
    set((state) => {
      const newScene = { ...state.scene, name }
      debouncedSave(newScene)
      return { scene: newScene }
    })
  },

  resetScene: () => {
    const newScene = createDefaultScene()
    saveScene(newScene)
    set({ scene: newScene, selectedBodyId: null, selectedJointId: null })
  },

  importScene: (scene) => {
    saveScene(scene)
    set({ scene, selectedBodyId: null, selectedJointId: null })
  },

  exportScene: () => get().scene,
}))
