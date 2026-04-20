import type { MutableRefObject } from 'react'
import * as THREE from 'three'
import { GRID_SIZE } from '../../game/board'

export type SceneTheme = 'day' | 'night'

export type ThemeBlendRef = MutableRefObject<number>

export type SceneThemeConfig = {
  background: string
  fog: [string, number, number]
  ambientIntensity: number
  hemisphereIntensity: number
  hemisphereGroundColor: string
  hemisphereColor: string
  directionalIntensity: number
  directionalPosition: [number, number, number]
  floorColor: string
  boardBaseColor: string
  cellColor: string
  tileColor: string
}

export type StarLayerSpec = {
  count: number
  size: number
  opacity: number
  breath: number
  speed: number
  phase: number
}

export type StarFieldPlacement = {
  baseX: number
  baseHorizontalSpread: number
  horizontalSpreadStep: number
  baseY: number
  yRange: number
  yStep: number
  baseZ: number
  baseDepthSpread: number
  depthSpreadStep: number
  depthMultiplier: number
}

export type StarPulseConfig = {
  sizePulseMultiplier: number
}

export type StarMaterialConfig = {
  color: string
}

export type NightLampConfig = {
  spotPosition: [number, number, number]
  spotAngle: number
  spotPenumbra: number
  spotIntensity: number
  spotDistance: number
  spotColor: string
  pointPosition: [number, number, number]
  pointIntensity: number
  pointDistance: number
  pointColor: string
  targetPosition: [number, number, number]
}

export const CELL_SIZE = 1.95
export const HALF_GRID_OFFSET = ((GRID_SIZE - 1) * CELL_SIZE) / 2

// Camera tuning values live here so they are easy to tweak by hand later.
export const DEFAULT_CAMERA_POSITION = new THREE.Vector3(0, 4, 10)
export const DEFAULT_CAMERA_TARGET = new THREE.Vector3(0, 0.7, 0)
export const DEFAULT_CAMERA_FOV = 34

// Initial camera distance from target. Mobile can start a bit farther out.
export const DESKTOP_CAMERA_DISTANCE = DEFAULT_CAMERA_POSITION.distanceTo(DEFAULT_CAMERA_TARGET)
export const MOBILE_CAMERA_DISTANCE = 24

// OrbitControls dolly range for desktop/mobile.
export const DESKTOP_MIN_CAMERA_DISTANCE = 5.5
export const DESKTOP_MAX_CAMERA_DISTANCE = 14
export const MOBILE_MIN_CAMERA_DISTANCE = 8.5
export const MOBILE_MAX_CAMERA_DISTANCE = 24
export const THEME_BLEND_DAMPING = 4.8

export const NIGHT_STAR_FIELD_PLACEMENT: StarFieldPlacement = {
  baseX: 0,
  baseHorizontalSpread: 20,
  horizontalSpreadStep: 7,
  baseY: 0.5,
  yRange: 2.2,
  yStep: 0.6,
  baseZ: 9,
  baseDepthSpread: 4,
  depthSpreadStep: 1,
  depthMultiplier: 4,
}

export const NIGHT_STAR_PULSE: StarPulseConfig = {
  sizePulseMultiplier: 1.05,
}

export const NIGHT_STAR_MATERIAL: StarMaterialConfig = {
  color: '#eef5ff',
}

export const NIGHT_LAMP_CONFIG: NightLampConfig = {
  spotPosition: [0.5, 10.8, 3.4],
  spotAngle: 0.48,
  spotPenumbra: 0.88,
  spotIntensity: 34,
  spotDistance: 30,
  spotColor: '#ffe3a6',
  pointPosition: [0.45, 10.1, 3.1],
  pointIntensity: 2.2,
  pointDistance: 8.5,
  pointColor: '#ffd98f',
  targetPosition: [0, 0.3, 0],
}

export const STAR_LAYERS: StarLayerSpec[] = [
  { count: 100, size: 0.1, opacity: 0.8, breath: 0.34, speed: 0.78, phase: 0 },
  { count: 60, size: 0.15, opacity: 0.4, breath: 0.38, speed: 1.04, phase: 1.7 },
  { count: 20, size: 0.2, opacity: 0.9, breath: 0.44, speed: 0.62, phase: 3.1 },
]

export const SCENE_THEME_CONFIG: Record<SceneTheme, SceneThemeConfig> = {
  day: {
    background: '#f7efe5',
    fog: ['#f7efe5', 10, 20],
    ambientIntensity: 1.55,
    hemisphereIntensity: 0.95,
    hemisphereGroundColor: '#bb9367',
    hemisphereColor: '#fff9ef',
    directionalIntensity: 2.6,
    directionalPosition: [6, 9, 5],
    floorColor: '#f1e0ca',
    boardBaseColor: '#c89f76',
    cellColor: '#d4b591',
    tileColor: '#fff6ea',
  },
  night: {
    background: '#07111f',
    fog: ['#07111f', 11.5, 24],
    ambientIntensity: 0.34,
    hemisphereIntensity: 0.36,
    hemisphereGroundColor: '#130f17',
    hemisphereColor: '#2e4772',
    directionalIntensity: 0.42,
    directionalPosition: [5.5, 10.5, 4.5],
    floorColor: '#101826',
    boardBaseColor: '#634d40',
    cellColor: '#816554',
    tileColor: '#efe7dd',
  },
}

export const DAY_EMISSIVE = new THREE.Color('#ffd04a')
export const NIGHT_EMISSIVE = new THREE.Color('#ffd786')

export function getGridPosition(row: number, col: number): [number, number, number] {
  return [
    col * CELL_SIZE - HALF_GRID_OFFSET,
    0.42,
    row * CELL_SIZE - HALF_GRID_OFFSET,
  ]
}

export function getThemeBlendValue(theme: SceneTheme) {
  return theme === 'night' ? 1 : 0
}
