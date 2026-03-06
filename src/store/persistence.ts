import type { Scene } from '../types'

const SCENE_KEY = 'linksim_scene'
const BASELINE_KEY = 'linksim_baseline'

export function saveScene(scene: Scene): void {
  try {
    localStorage.setItem(SCENE_KEY, JSON.stringify(scene))
  } catch (e) {
    console.warn('Kunne ikke gemme scene:', e)
  }
}

export function loadScene(): Scene | null {
  try {
    const raw = localStorage.getItem(SCENE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as Scene
  } catch {
    return null
  }
}

export function saveBaseline(scene: Scene): void {
  try {
    localStorage.setItem(BASELINE_KEY, JSON.stringify(scene))
  } catch (e) {
    console.warn('Kunne ikke gemme udgangspunkt:', e)
  }
}

export function loadBaseline(): Scene | null {
  try {
    const raw = localStorage.getItem(BASELINE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as Scene
  } catch {
    return null
  }
}

export function exportSceneToFile(scene: Scene): void {
  const json = JSON.stringify(scene, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${scene.name || 'scene'}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function importSceneFromFile(): Promise<Scene> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) {
        reject(new Error('Ingen fil valgt'))
        return
      }
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const scene = JSON.parse(reader.result as string) as Scene
          resolve(scene)
        } catch {
          reject(new Error('Ugyldig JSON-fil'))
        }
      }
      reader.readAsText(file)
    }
    input.click()
  })
}
