import { useGLTF } from '@react-three/drei'

const PET_RULES = [
  { value: 2, file: 'animal-beaver.glb', name: 'Beaver' },
  { value: 4, file: 'animal-bee.glb', name: 'Bee' },
  { value: 8, file: 'animal-bunny.glb', name: 'Bunny' },
  { value: 16, file: 'animal-cat.glb', name: 'Cat' },
  { value: 32, file: 'animal-caterpillar.glb', name: 'Caterpillar' },
  { value: 64, file: 'animal-chick.glb', name: 'Chick' },
  { value: 128, file: 'animal-cow.glb', name: 'Cow' },
  { value: 256, file: 'animal-crab.glb', name: 'Crab' },
  { value: 512, file: 'animal-deer.glb', name: 'Deer' },
  { value: 1024, file: 'animal-dog.glb', name: 'Dog' },
  { value: 2048, file: 'animal-elephant.glb', name: 'Elephant' },
] as const

export const PET_MODEL_MAP = Object.fromEntries(
  PET_RULES.map(({ value, file }) => [value, `/models/pets/${file}`]),
) as Record<(typeof PET_RULES)[number]['value'], string>

PET_RULES.forEach(({ value }) => {
  useGLTF.preload(PET_MODEL_MAP[value])
})

export function getPetRule(value: number) {
  const match = PET_RULES.find((rule) => rule.value === value)
  return match ?? PET_RULES[PET_RULES.length - 1]
}

export function getBestPetLabel(value: number) {
  if (value <= 0) {
    return 'None'
  }

  const petRule = PET_RULES.find((rule) => rule.value === value)
  return petRule ? `${petRule.name} ${value}` : `${value}`
}

export function getPetScaleMultiplier(value: number) {
  const ruleIndex = PET_RULES.findIndex((rule) => rule.value === value)
  const safeIndex = Math.max(ruleIndex, 0)

  return Math.min(0.86 + safeIndex * 0.033, 1.18)
}
