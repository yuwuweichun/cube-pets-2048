import { useCallback, useEffect, useRef, useState } from 'react'

const MUSIC_STORAGE_KEY = 'cube-pets-music-enabled'
const MOVE_SOUND_THROTTLE_MS = 100

function createAudio(src: string, volume: number) {
  const audio = new Audio(src)
  audio.preload = 'auto'
  audio.volume = volume
  return audio
}

function readStoredMusicPreference() {
  if (typeof window === 'undefined') {
    return true
  }

  const storedValue = window.localStorage.getItem(MUSIC_STORAGE_KEY)
  return storedValue === null ? true : storedValue === 'true'
}

export function useGameAudio() {
  const [isMusicEnabled, setIsMusicEnabled] = useState(readStoredMusicPreference)
  const bgmAudioRef = useRef<HTMLAudioElement | null>(null)
  const moveAudioRef = useRef<HTMLAudioElement | null>(null)
  const gameOverAudioRef = useRef<HTMLAudioElement | null>(null)
  const musicResumeTimeRef = useRef(0)
  const lastMoveSoundPlayedAtRef = useRef(0)

  const playMusic = useCallback(() => {
    const bgmAudio = bgmAudioRef.current
    if (!bgmAudio || !isMusicEnabled) {
      return
    }

    if (musicResumeTimeRef.current > 0) {
      bgmAudio.currentTime = musicResumeTimeRef.current
      musicResumeTimeRef.current = 0
    }

    void bgmAudio.play().catch(() => {})
  }, [isMusicEnabled])

  const pauseMusic = useCallback(() => {
    const bgmAudio = bgmAudioRef.current
    if (!bgmAudio) {
      return
    }

    musicResumeTimeRef.current = bgmAudio.currentTime
    bgmAudio.pause()
  }, [])

  const toggleMusic = useCallback(() => {
    setIsMusicEnabled((current) => {
      const nextValue = !current
      window.localStorage.setItem(MUSIC_STORAGE_KEY, String(nextValue))
      return nextValue
    })
  }, [])

  const playMoveSound = useCallback(() => {
    const moveAudio = moveAudioRef.current
    if (!moveAudio) {
      return
    }

    const now = performance.now()
    if (now - lastMoveSoundPlayedAtRef.current < MOVE_SOUND_THROTTLE_MS) {
      return
    }

    lastMoveSoundPlayedAtRef.current = now

    moveAudio.currentTime = 0
    void moveAudio.play().catch(() => {})
  }, [])

  const playGameOverSound = useCallback(() => {
    const gameOverAudio = gameOverAudioRef.current
    if (!gameOverAudio) {
      return
    }

    gameOverAudio.currentTime = 0
    void gameOverAudio.play().catch(() => {})
  }, [])

  useEffect(() => {
    const bgmAudio = createAudio('/audio/cube-pets-bgm.mp3', 0.38)
    bgmAudio.loop = true
    bgmAudioRef.current = bgmAudio

    moveAudioRef.current = createAudio('/audio/move.wav', 0.7)
    gameOverAudioRef.current = createAudio('/audio/game-over.wav', 0.82)

    return () => {
      ;[bgmAudioRef.current, moveAudioRef.current, gameOverAudioRef.current].forEach((audio) => {
        if (!audio) {
          return
        }

        audio.pause()
        audio.src = ''
      })
    }
  }, [])

  useEffect(() => {
    if (!isMusicEnabled) {
      pauseMusic()
      return
    }

    const handleFirstInteraction = () => {
      playMusic()
    }

    window.addEventListener('pointerdown', handleFirstInteraction)
    window.addEventListener('keydown', handleFirstInteraction)

    return () => {
      window.removeEventListener('pointerdown', handleFirstInteraction)
      window.removeEventListener('keydown', handleFirstInteraction)
    }
  }, [isMusicEnabled, pauseMusic, playMusic])

  useEffect(() => {
    if (isMusicEnabled) {
      playMusic()
      return
    }

    pauseMusic()
  }, [isMusicEnabled, pauseMusic, playMusic])

  return {
    isMusicEnabled,
    playGameOverSound,
    playMoveSound,
    toggleMusic,
  }
}
