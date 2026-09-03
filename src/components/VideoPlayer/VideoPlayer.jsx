import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import ReactPlayerImport from 'react-player'
import Hls from 'hls.js'
import { Play, Pause, Loader2, AlertTriangle, Copy, Info, X, ChevronRight } from 'lucide-react'
import useHlsPlayer from '../../hooks/useHlsPlayer'
import useImaAds from '../../hooks/useImaAds'
import PlayerControls from './PlayerControls'
import {
  STORAGE_KEYS,
  SPEED_OPTIONS,
  clamp,
  detectSourceType,
  formatBitrate,
  formatTime,
  isTypingTarget,
  isValidStreamUrl,
  readStorage,
  toPercent,
  writeStorage,
} from './playerUtils'
import './VideoPlayer.css'

// react-player's CJS build gets double-wrapped by some CJS/ESM interop
// pipelines (observed with Vite's dependency pre-bundler), resolving the
// default import to `{ default: ReactPlayer }` instead of the component
// itself. Unwrap defensively so both shapes work.
const ReactPlayer = ReactPlayerImport?.default ?? ReactPlayerImport

const NATIVE_HLS_SUPPORTED =
  typeof document !== 'undefined' &&
  Boolean(document.createElement('video').canPlayType('application/vnd.apple.mpegurl'))

const ASPECT_PRESETS = { '16:9': '16 / 9', '4:3': '4 / 3', '21:9': '21 / 9' }

function resolveAspectRatio(aspectRatio) {
  if (!aspectRatio) return '16 / 9'
  if (typeof aspectRatio === 'number') return `${aspectRatio}`
  if (ASPECT_PRESETS[aspectRatio]) return ASPECT_PRESETS[aspectRatio]
  if (/^\d+(\.\d+)?\s*:\s*\d+(\.\d+)?$/.test(aspectRatio)) return aspectRatio.replace(':', ' / ')
  return aspectRatio
}

const CONTROLS_HIDE_DELAY = 2800
const SKIP_BUTTON_DELAY = 3

const VideoPlayer = forwardRef(function VideoPlayer(
  {
    src,
    poster,
    autoplay = false,
    muted: initialMuted = false,
    loop = false,
    theme = 'dark',
    accentColor = '#8b5cf6',
    aspectRatio = '16:9',
    controls = true,
    qualitySelector = true,
    audioSelector = true,
    subtitleSelector = true,
    playbackSpeed = true,
    fullscreen: fullscreenEnabled = true,
    pictureInPicture: pipEnabled = true,
    theatreMode: theatreEnabled = true,
    keyboardShortcuts = true,
    share: shareEnabled = true,
    debug = false,
    doubleClickToSeek = true,
    doubleClickSeekSeconds = 10,
    subtitleStyle,
    introRange,
    creditsRange,
    adTagUrl,
    chapters,
    upNext,
    rememberPosition = true,
    autoplayNextDelay = 8,
    onNextEpisode,
    hlsConfig,
    startLevel = -1,
    startPosition,
    maxQuality,
    capLevelOnFPSDrop = false,
    lowLatencyMode,
    drmConfig,
    className = '',
    style,
    onPlay,
    onPause,
    onEnded,
    onReady,
    onProgress,
    onDuration,
    onBuffer,
    onBufferEnd,
    onError,
    onWarning,
    onQualityChange,
    onAudioChange,
    onSubtitleChange,
    onPlaybackRateChange,
    onFullscreenChange,
    onPiPChange,
    onVolumeChange,
    onSeek,
    onFragChanged,
  },
  ref,
) {
  const wrapperRef = useRef(null)
  const nativeVideoRef = useRef(null)
  const reactPlayerRef = useRef(null)
  const mediaElRef = useRef(null)
  const adContainerRef = useRef(null)
  const listenersRef = useRef(null)
  const hideTimerRef = useRef(null)
  const clickTimerRef = useRef(null)
  const scrubbingRef = useRef(false)
  const bufferedRef = useRef(0)
  const wasPlayingBeforeAdRef = useRef(false)
  const adsRequestedRef = useRef(false)
  const introCreditsRef = useRef({ activeKey: null, enteredAt: null })
  const appliedPrefsRef = useRef(false)

  const callbacksRef = useRef({})
  callbacksRef.current = {
    onPlay,
    onPause,
    onEnded,
    onReady,
    onProgress,
    onDuration,
    onBuffer,
    onBufferEnd,
    onError,
    onPlaybackRateChange,
    onVolumeChange,
    onSeek,
    onFullscreenChange,
    onPiPChange,
    onWarning,
  }

  const sourceType = useMemo(() => detectSourceType(src), [src])
  const validSource = useMemo(() => isValidStreamUrl(src), [src])
  const useHlsJsBackend = validSource && sourceType === 'hls' && !NATIVE_HLS_SUPPORTED && Hls.isSupported()
  const useReactPlayerBackend = validSource && !useHlsJsBackend

  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [buffered, setBuffered] = useState(0)
  const [seekableRange, setSeekableRange] = useState({ start: 0, end: 0 })
  const [volume, setVolumeState] = useState(() => readStorage(STORAGE_KEYS.volume, 1))
  const [muted, setMuted] = useState(() => readStorage(STORAGE_KEYS.muted, initialMuted))
  const [playbackRate, setPlaybackRateState] = useState(() => readStorage(STORAGE_KEYS.playbackRate, 1))
  const [buffering, setBuffering] = useState(false)
  const [mediaReady, setMediaReady] = useState(false)
  const [fatalMediaError, setFatalMediaError] = useState(null)
  const [fullscreenState, setFullscreenState] = useState(false)
  const [theatreMode, setTheatreMode] = useState(() => readStorage(STORAGE_KEYS.theatreMode, false))
  const [pip, setPip] = useState(false)
  const [pipSupported, setPipSupported] = useState(false)
  const [controlsVisible, setControlsVisible] = useState(true)
  const [pulse, setPulse] = useState(null) // { type, id }
  const pulseIdRef = useRef(0)
  const triggerPulse = useCallback((type) => {
    pulseIdRef.current += 1
    setPulse({ type, id: pulseIdRef.current })
  }, [])
  const [contextMenu, setContextMenu] = useState(null)
  const [statsVisible, setStatsVisible] = useState(false)
  const [skipInfo, setSkipInfo] = useState(null)
  const [resumeToast, setResumeToast] = useState(null)
  const [upNextCountdown, setUpNextCountdown] = useState(null)
  const upNextCancelledRef = useRef(false)
  const upNextFiredRef = useRef(false)
  const lastSavedPositionRef = useRef(0)
  const resumedRef = useRef(false)
  const [resolvedTheme, setResolvedTheme] = useState(theme === 'light' ? 'light' : 'dark')

  const handleHlsError = useCallback((data) => {
    callbacksRef.current.onError?.({
      type: data.type,
      details: data.details,
      fatal: data.fatal,
      message: data.error?.message || data.details,
    })
  }, [])

  const handleHlsWarning = useCallback((data) => {
    callbacksRef.current.onWarning?.({
      type: data.type,
      details: data.details,
      message: data.error?.message || data.details,
    })
  }, [])

  const handleLevelSwitched = useCallback(
    (info) => onQualityChange?.(info),
    [onQualityChange],
  )
  const handleAudioSwitched = useCallback((info) => onAudioChange?.(info), [onAudioChange])
  const handleSubtitleSwitched = useCallback((info) => onSubtitleChange?.(info), [onSubtitleChange])
  const handleFragChanged = useCallback((info) => onFragChanged?.(info), [onFragChanged])

  const hls = useHlsPlayer({
    videoRef: nativeVideoRef,
    src,
    enabled: useHlsJsBackend,
    hlsConfig,
    startLevel,
    startPosition,
    maxQuality,
    capLevelOnFPSDrop,
    lowLatencyMode,
    drmConfig,
    onError: handleHlsError,
    onWarning: handleHlsWarning,
    onLevelSwitched: handleLevelSwitched,
    onAudioTrackSwitched: handleAudioSwitched,
    onSubtitleTrackSwitched: handleSubtitleSwitched,
    onFragChanged: handleFragChanged,
  })

  const ads = useImaAds({
    adTagUrl,
    src,
    videoRef: mediaElRef,
    containerRef: adContainerRef,
    onContentPauseRequested: () => {
      wasPlayingBeforeAdRef.current = !mediaElRef.current?.paused
      mediaElRef.current?.pause()
    },
    onContentResumeRequested: () => {
      if (wasPlayingBeforeAdRef.current) mediaElRef.current?.play().catch(() => {})
    },
  })

  const isLive = hls.isLive || duration === Infinity

  // ---- theme resolution -------------------------------------------------
  useEffect(() => {
    if (theme !== 'system') {
      setResolvedTheme(theme === 'light' ? 'light' : 'dark')
      return undefined
    }
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const update = () => setResolvedTheme(mq.matches ? 'dark' : 'light')
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [theme])

  // ---- media element event wiring (shared by both backends) -------------
  const detachListeners = useCallback(() => {
    const rec = listenersRef.current
    if (!rec) return
    Object.entries(rec.handlers).forEach(([evt, fn]) => rec.el.removeEventListener(evt, fn))
    listenersRef.current = null
  }, [])

  const attachListeners = useCallback(
    (el) => {
      if (!el) return
      const handlers = {
        play: () => setPlaying(true),
        pause: () => {
          setPlaying(false)
          callbacksRef.current.onPause?.()
        },
        playing: () => {
          setBuffering(false)
          callbacksRef.current.onBufferEnd?.()
        },
        waiting: () => {
          setBuffering(true)
          callbacksRef.current.onBuffer?.()
        },
        stalled: () => setBuffering(true),
        canplay: () => setMediaReady(true),
        loadedmetadata: () => {
          setMediaReady(true)
          const d = el.duration
          setDuration(d)
          callbacksRef.current.onDuration?.(d)
        },
        durationchange: () => {
          setDuration(el.duration)
          callbacksRef.current.onDuration?.(el.duration)
        },
        timeupdate: () => {
          setCurrentTime(el.currentTime)
          callbacksRef.current.onProgress?.({
            playedSeconds: el.currentTime,
            played: el.duration ? el.currentTime / el.duration : 0,
            loadedSeconds: bufferedRef.current,
            loaded: el.duration ? bufferedRef.current / el.duration : 0,
          })
        },
        progress: () => {
          try {
            const b = el.buffered
            if (b.length > 0) {
              const end = b.end(b.length - 1)
              bufferedRef.current = end
              setBuffered(end)
            }
          } catch {
            /* ignore */
          }
          try {
            const s = el.seekable
            if (s.length > 0) {
              setSeekableRange({ start: s.start(0), end: s.end(s.length - 1) })
            }
          } catch {
            /* ignore */
          }
        },
        volumechange: () => {
          setVolumeState(el.volume)
          setMuted(el.muted)
          callbacksRef.current.onVolumeChange?.({ volume: el.volume, muted: el.muted })
        },
        ratechange: () => {
          setPlaybackRateState(el.playbackRate)
          callbacksRef.current.onPlaybackRateChange?.(el.playbackRate)
        },
        ended: () => {
          setPlaying(false)
          callbacksRef.current.onEnded?.()
        },
        seeked: () => callbacksRef.current.onSeek?.(el.currentTime),
        error: () => {
          if (useHlsJsBackend) return // hls.js reports its own errors
          const mediaError = el.error
          if (!mediaError) return
          const message = {
            1: 'Playback was aborted.',
            2: 'A network error caused playback to fail.',
            3: 'The media could not be decoded.',
            4: 'This media format or source is not supported.',
          }[mediaError.code]
          setFatalMediaError({ type: 'MEDIA_ERROR', message: message || 'Unable to play this video.' })
          callbacksRef.current.onError?.({ type: 'MEDIA_ERROR', code: mediaError.code, message })
        },
        enterpictureinpicture: () => {
          setPip(true)
          callbacksRef.current.onPiPChange?.(true)
        },
        leavepictureinpicture: () => {
          setPip(false)
          callbacksRef.current.onPiPChange?.(false)
        },
      }
      Object.entries(handlers).forEach(([evt, fn]) => el.addEventListener(evt, fn))
      listenersRef.current = { el, handlers }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [useHlsJsBackend],
  )

  const attachMedia = useCallback(
    (el) => {
      if (!el || el === mediaElRef.current) return
      detachListeners()
      mediaElRef.current = el
      attachListeners(el)
      setPipSupported(Boolean(document.pictureInPictureEnabled) && !el.disablePictureInPicture)
      el.volume = volume
      el.playbackRate = playbackRate
      callbacksRef.current.onReady?.()
    },
    [attachListeners, detachListeners, playbackRate, volume],
  )

  const nativeVideoCallbackRef = useCallback(
    (el) => {
      nativeVideoRef.current = el
      if (el) attachMedia(el)
    },
    [attachMedia],
  )

  useEffect(() => {
    if (!useReactPlayerBackend) return undefined
    const raf = requestAnimationFrame(() => {
      const el = reactPlayerRef.current?.getInternalPlayer?.()
      if (el) attachMedia(el)
    })
    return () => cancelAnimationFrame(raf)
  }, [useReactPlayerBackend, src, attachMedia])

  useEffect(() => {
    appliedPrefsRef.current = false
    setFatalMediaError(null)
    setMediaReady(false)
    setPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    setBuffered(0)
    setSeekableRange({ start: 0, end: 0 })
    adsRequestedRef.current = false
    resumedRef.current = false
    upNextCancelledRef.current = false
    upNextFiredRef.current = false
    setUpNextCountdown(null)
    setResumeToast(null)
  }, [src])

  // ---- load timeout safeguard: never get stuck on "Loading…" forever ----
  useEffect(() => {
    if (!validSource || mediaReady || fatalMediaError || hls.fatalError) return undefined
    const timer = setTimeout(() => {
      setFatalMediaError({
        type: 'TIMEOUT',
        message: 'The stream took too long to load. Please check the URL and try again.',
      })
    }, 20000)
    return () => clearTimeout(timer)
  }, [validSource, mediaReady, src, fatalMediaError, hls.fatalError])

  const positionStorageKey = useMemo(() => `video-player-position-${encodeURIComponent(src || '')}`, [src])

  // ---- continue watching: resume last position once metadata is known ----
  useEffect(() => {
    if (!rememberPosition || resumedRef.current || !mediaReady || duration <= 0) return
    resumedRef.current = true
    const saved = readStorage(positionStorageKey, 0)
    if (saved > 5 && saved < duration - 10) {
      mediaControls.seekTo(saved)
      setResumeToast(`Resumed from ${formatTime(saved)}`)
      const timer = setTimeout(() => setResumeToast(null), 4000)
      return () => clearTimeout(timer)
    }
    return undefined
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rememberPosition, mediaReady, duration, positionStorageKey])

  useEffect(() => {
    if (!rememberPosition || duration <= 0) return
    if (Math.abs(currentTime - lastSavedPositionRef.current) < 5) return
    lastSavedPositionRef.current = currentTime
    if (currentTime > 5 && currentTime < duration - 10) {
      writeStorage(positionStorageKey, currentTime)
    }
  }, [currentTime, duration, rememberPosition, positionStorageKey])

  useEffect(() => {
    if (!playing) return undefined
    const handleEnd = () => writeStorage(positionStorageKey, 0)
    const el = mediaElRef.current
    el?.addEventListener('ended', handleEnd)
    return () => el?.removeEventListener('ended', handleEnd)
  }, [playing, positionStorageKey])

  // ---- up next autoplay card ------------------------------------------------
  useEffect(() => {
    if (!upNext || duration <= 0 || upNextCancelledRef.current || upNextFiredRef.current) return
    const remaining = duration - currentTime
    if (remaining <= autoplayNextDelay && remaining > 0) {
      setUpNextCountdown(Math.ceil(remaining))
    } else if (remaining <= 0) {
      setUpNextCountdown(null)
      if (!upNextFiredRef.current) {
        upNextFiredRef.current = true
        onNextEpisode?.()
      }
    } else {
      setUpNextCountdown(null)
    }
  }, [upNext, currentTime, duration, autoplayNextDelay, onNextEpisode])

  const cancelUpNext = useCallback(() => {
    upNextCancelledRef.current = true
    setUpNextCountdown(null)
  }, [])

  const playUpNextNow = useCallback(() => {
    upNextFiredRef.current = true
    setUpNextCountdown(null)
    onNextEpisode?.()
  }, [onNextEpisode])

  useEffect(() => () => detachListeners(), [detachListeners])

  // ---- apply persisted preferences once tracks are known -----------------
  useEffect(() => {
    if (appliedPrefsRef.current || hls.levels.length === 0) return
    appliedPrefsRef.current = true
    const preferredHeight = readStorage(STORAGE_KEYS.quality, 'auto')
    if (preferredHeight !== 'auto') {
      const match = hls.levels.find((l) => l.height === preferredHeight)
      if (match) hls.setQuality(match.index)
    }
  }, [hls, hls.levels])

  useEffect(() => {
    if (hls.subtitleTracks.length === 0) return
    const preferredLang = readStorage(STORAGE_KEYS.subtitle, null)
    if (!preferredLang) return
    const match = hls.subtitleTracks.find((t) => t.lang === preferredLang)
    if (match) hls.setSubtitleTrack(match.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hls.subtitleTracks])

  // ---- intro / credits skip ----------------------------------------------
  useEffect(() => {
    const seg = introRange && currentTime >= introRange.start && currentTime < introRange.end
      ? { key: 'intro', range: introRange, label: 'Skip Intro' }
      : creditsRange && currentTime >= creditsRange.start && currentTime < creditsRange.end
        ? { key: 'credits', range: creditsRange, label: 'Skip Credits' }
        : null

    const state = introCreditsRef.current
    if (!seg) {
      if (state.activeKey !== null) {
        state.activeKey = null
        state.enteredAt = null
        setSkipInfo(null)
      }
      return
    }
    if (state.activeKey !== seg.key) {
      state.activeKey = seg.key
      state.enteredAt = currentTime
    }
    const elapsed = currentTime - state.enteredAt
    setSkipInfo(elapsed >= SKIP_BUTTON_DELAY ? seg : null)
  }, [currentTime, introRange, creditsRange])

  // ---- imperative media controls -----------------------------------------
  const mediaControls = useMemo(
    () => ({
      play: () => mediaElRef.current?.play().catch((err) => callbacksRef.current.onError?.({ type: 'PLAY_REJECTED', message: err.message })),
      pause: () => mediaElRef.current?.pause(),
      seekTo: (seconds) => {
        const el = mediaElRef.current
        if (!el) return
        const target = clamp(seconds, 0, Number.isFinite(el.duration) ? el.duration : seconds)
        el.currentTime = target
        setCurrentTime(target)
      },
      seekBy: (delta) => {
        const el = mediaElRef.current
        if (!el) return
        const target = clamp(el.currentTime + delta, 0, Number.isFinite(el.duration) ? el.duration : el.currentTime + delta)
        el.currentTime = target
        setCurrentTime(target)
      },
      setVolume: (v) => {
        const el = mediaElRef.current
        const next = clamp(v, 0, 1)
        if (el) {
          el.volume = next
          if (next > 0 && el.muted) el.muted = false
        }
        setVolumeState(next)
        writeStorage(STORAGE_KEYS.volume, next)
      },
      setMuted: (value) => {
        const el = mediaElRef.current
        if (el) el.muted = value
        setMuted(value)
        writeStorage(STORAGE_KEYS.muted, value)
      },
      toggleMute: () => {
        const el = mediaElRef.current
        const next = !(el ? el.muted : muted)
        if (el) el.muted = next
        setMuted(next)
        writeStorage(STORAGE_KEYS.muted, next)
      },
      setPlaybackRate: (rate) => {
        const el = mediaElRef.current
        if (el) el.playbackRate = rate
        setPlaybackRateState(rate)
        writeStorage(STORAGE_KEYS.playbackRate, rate)
      },
    }),
    [muted],
  )

  const togglePlay = useCallback(() => {
    const el = mediaElRef.current
    if (!el) return
    if (adTagUrl && !adsRequestedRef.current) {
      adsRequestedRef.current = true
      ads.requestAds()
    }
    const willPlay = el.paused || el.ended
    triggerPulse(willPlay ? 'play' : 'pause')
    if (willPlay) mediaControls.play()
    else mediaControls.pause()
  }, [adTagUrl, ads, mediaControls, triggerPulse])

  // ---- fullscreen ----------------------------------------------------------
  const enterFullscreen = useCallback(() => {
    wrapperRef.current?.requestFullscreen?.()
  }, [])
  const exitFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen?.()
  }, [])
  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement === wrapperRef.current) exitFullscreen()
    else enterFullscreen()
  }, [enterFullscreen, exitFullscreen])

  useEffect(() => {
    const handler = () => {
      const isFs = document.fullscreenElement === wrapperRef.current
      setFullscreenState(isFs)
      callbacksRef.current.onFullscreenChange?.(isFs)
    }
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- picture-in-picture ---------------------------------------------------
  const togglePiP = useCallback(async () => {
    const el = mediaElRef.current
    if (!el) return
    try {
      if (document.pictureInPictureElement === el) await document.exitPictureInPicture()
      else await el.requestPictureInPicture()
    } catch (err) {
      callbacksRef.current.onError?.({ type: 'PIP_ERROR', message: err.message })
    }
  }, [])

  // ---- theatre mode ----------------------------------------------------------
  const toggleTheatre = useCallback(() => {
    setTheatreMode((prev) => {
      const next = !prev
      writeStorage(STORAGE_KEYS.theatreMode, next)
      return next
    })
  }, [])

  // ---- live edge -----------------------------------------------------------------
  const goLive = useCallback(() => {
    if (useHlsJsBackend) {
      hls.goLive()
      return
    }
    const el = mediaElRef.current
    if (el && seekableRange.end > 0) el.currentTime = seekableRange.end
  }, [useHlsJsBackend, hls, seekableRange.end])

  // ---- captions toggle ---------------------------------------------------------
  const toggleCaptions = useCallback(() => {
    if (hls.currentSubtitleTrack === -1) {
      const first = hls.subtitleTracks[0]
      if (first) {
        hls.setSubtitleTrack(first.id)
        writeStorage(STORAGE_KEYS.subtitle, first.lang || null)
      }
    } else {
      hls.setSubtitleTrack(-1)
    }
  }, [hls])

  const setQuality = useCallback(
    (index) => {
      hls.setQuality(index)
      const level = hls.levels.find((l) => l.index === index)
      writeStorage(STORAGE_KEYS.quality, level ? level.height : 'auto')
    },
    [hls],
  )

  const setAudioTrack = useCallback((id) => hls.setAudioTrack(id), [hls])

  const setSubtitleTrack = useCallback(
    (id) => {
      hls.setSubtitleTrack(id)
      const track = hls.subtitleTracks.find((t) => t.id === id)
      writeStorage(STORAGE_KEYS.subtitle, track ? track.lang : null)
    },
    [hls],
  )

  // ---- controls auto-hide -----------------------------------------------------
  const showControls = useCallback(() => {
    setControlsVisible(true)
    clearTimeout(hideTimerRef.current)
    if (playing) {
      hideTimerRef.current = setTimeout(() => setControlsVisible(false), CONTROLS_HIDE_DELAY)
    }
  }, [playing])

  useEffect(() => {
    showControls()
    return () => clearTimeout(hideTimerRef.current)
  }, [playing, showControls])

  // ---- keyboard shortcuts -----------------------------------------------------
  const handleKeyDown = useCallback(
    (e) => {
      if (!keyboardShortcuts) return
      if (isTypingTarget(e.target)) return
      const el = mediaElRef.current
      if (!el) return

      switch (e.key) {
        case ' ':
        case 'k':
        case 'K':
          e.preventDefault()
          togglePlay()
          break
        case 'ArrowLeft':
          mediaControls.seekBy(-5)
          break
        case 'ArrowRight':
          mediaControls.seekBy(5)
          break
        case 'j':
        case 'J':
          mediaControls.seekBy(-10)
          break
        case 'l':
        case 'L':
          mediaControls.seekBy(10)
          break
        case 'ArrowUp':
          e.preventDefault()
          mediaControls.setVolume(clamp((muted ? 0 : volume) + 0.05, 0, 1))
          break
        case 'ArrowDown':
          e.preventDefault()
          mediaControls.setVolume(clamp((muted ? 0 : volume) - 0.05, 0, 1))
          break
        case 'm':
        case 'M':
          mediaControls.toggleMute()
          break
        case 'f':
        case 'F':
          if (fullscreenEnabled) toggleFullscreen()
          break
        case 'p':
        case 'P':
          if (pipEnabled && pipSupported) togglePiP()
          break
        case 'c':
        case 'C':
          if (subtitleSelector) toggleCaptions()
          break
        case '<':
        case ',': {
          const idx = SPEED_OPTIONS.indexOf(playbackRate)
          if (idx > 0) mediaControls.setPlaybackRate(SPEED_OPTIONS[idx - 1])
          break
        }
        case '>':
        case '.': {
          const idx = SPEED_OPTIONS.indexOf(playbackRate)
          if (idx !== -1 && idx < SPEED_OPTIONS.length - 1) mediaControls.setPlaybackRate(SPEED_OPTIONS[idx + 1])
          break
        }
        default:
          if (/^[0-9]$/.test(e.key) && Number.isFinite(duration) && duration > 0) {
            mediaControls.seekTo((Number(e.key) / 10) * duration)
          }
      }
      showControls()
    },
    [
      keyboardShortcuts,
      togglePlay,
      mediaControls,
      muted,
      volume,
      fullscreenEnabled,
      toggleFullscreen,
      pipEnabled,
      pipSupported,
      togglePiP,
      subtitleSelector,
      toggleCaptions,
      playbackRate,
      duration,
      showControls,
    ],
  )

  // ---- double click zones -----------------------------------------------------
  const handleVideoClick = useCallback(() => {
    if (clickTimerRef.current) return
    clickTimerRef.current = setTimeout(() => {
      togglePlay()
      clickTimerRef.current = null
    }, 220)
  }, [togglePlay])

  const handleVideoDoubleClick = useCallback(
    (e) => {
      clearTimeout(clickTimerRef.current)
      clickTimerRef.current = null
      if (!doubleClickToSeek) {
        if (fullscreenEnabled) toggleFullscreen()
        return
      }
      const rect = wrapperRef.current.getBoundingClientRect()
      const ratio = (e.clientX - rect.left) / rect.width
      if (ratio < 0.33) {
        mediaControls.seekBy(-doubleClickSeekSeconds)
        triggerPulse('rewind')
      } else if (ratio > 0.67) {
        mediaControls.seekBy(doubleClickSeekSeconds)
        triggerPulse('forward')
      } else if (fullscreenEnabled) {
        toggleFullscreen()
      }
    },
    [doubleClickToSeek, doubleClickSeekSeconds, fullscreenEnabled, mediaControls, toggleFullscreen, triggerPulse],
  )

  // ---- context menu -------------------------------------------------------------
  const handleContextMenu = useCallback((e) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }, [])

  useEffect(() => {
    if (!contextMenu) return undefined
    const close = () => setContextMenu(null)
    window.addEventListener('click', close)
    window.addEventListener('scroll', close, true)
    return () => {
      window.removeEventListener('click', close)
      window.removeEventListener('scroll', close, true)
    }
  }, [contextMenu])

  const copyText = useCallback(async (text) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      /* clipboard unavailable */
    }
  }, [])

  const handleShare = useCallback(async () => {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({ url, title: document.title })
        return
      } catch {
        /* fall through to clipboard copy */
      }
    }
    await copyText(`${url.split('#')[0].split('?')[0]}?t=${Math.floor(currentTime)}`)
  }, [copyText, currentTime])

  // ---- imperative ref API -----------------------------------------------------
  useImperativeHandle(
    ref,
    () => ({
      play: () => mediaControls.play(),
      pause: () => mediaControls.pause(),
      seekTo: (seconds) => mediaControls.seekTo(seconds),
      setVolume: (v) => mediaControls.setVolume(v),
      toggleMute: () => mediaControls.toggleMute(),
      enterFullscreen,
      exitFullscreen,
      toggleTheatreMode: toggleTheatre,
      getCurrentTime: () => mediaElRef.current?.currentTime ?? 0,
      getDuration: () => (Number.isFinite(mediaElRef.current?.duration) ? mediaElRef.current.duration : 0),
      getQualities: () => hls.levels,
      getAudioTracks: () => hls.audioTracks,
      getSubtitleTracks: () => hls.subtitleTracks,
      getVideoElement: () => mediaElRef.current,
      skipAd: () => ads.skipAd(),
      goLive,
      // hls.js-specific escape hatches — no-ops when the ReactPlayer/native
      // backend is active (progressive source, or Safari's native HLS).
      getHlsInstance: () => hls.getHlsInstance(),
      stopLoad: () => hls.stopLoad(),
      startLoad: () => hls.resumeLoad(),
      swapAudioCodec: () => hls.swapAudioCodec(),
      getBandwidthEstimate: () => hls.getBandwidthEstimate(),
      getStats: () => hls.getStats(),
    }),
    [mediaControls, enterFullscreen, exitFullscreen, toggleTheatre, hls, ads, goLive],
  )

  // ---- render helpers -----------------------------------------------------------
  const autoResolvedHeight = useMemo(() => {
    if (hls.currentLevel !== -1) return null
    const level = hls.hlsRef.current?.levels?.[hls.hlsRef.current?.currentLevel]
    return level?.height ?? null
  }, [hls])

  const aspectCss = useMemo(() => resolveAspectRatio(aspectRatio), [aspectRatio])

  const subtitleCssVars = useMemo(() => {
    if (!subtitleStyle) return {}
    return {
      '--pv-subtitle-size': subtitleStyle.fontSize,
      '--pv-subtitle-color': subtitleStyle.color,
      '--pv-subtitle-bg': subtitleStyle.background,
      '--pv-subtitle-shadow': subtitleStyle.textShadow,
    }
  }, [subtitleStyle])

  const showBigLoading = !mediaReady && !fatalMediaError && !hls.fatalError && validSource
  const activeError = fatalMediaError || (hls.fatalError && useHlsJsBackend ? hls.fatalError : null)

  const retryPlayback = useCallback(() => {
    setFatalMediaError(null)
    if (useHlsJsBackend) hls.retry()
    else mediaElRef.current?.load?.()
  }, [hls, useHlsJsBackend])

  const wrapperClassName = [
    'pv-wrapper',
    className,
    theatreMode && 'pv-wrapper--theatre',
    fullscreenState && 'pv-wrapper--fullscreen',
    !controlsVisible && playing && 'pv-wrapper--hide-cursor',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      ref={wrapperRef}
      className={wrapperClassName}
      data-theme={resolvedTheme}
      style={{ '--player-accent': accentColor, ...subtitleCssVars, ...style }}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseMove={showControls}
      onMouseEnter={showControls}
      onMouseLeave={() => playing && setControlsVisible(false)}
      onTouchStart={showControls}
      onContextMenu={handleContextMenu}
    >
      <div className="pv-frame" style={{ aspectRatio: fullscreenState || theatreMode ? undefined : aspectCss }}>
        {!validSource ? (
          <div className="pv-error">
            <AlertTriangle size={40} aria-hidden="true" />
            <p>No valid video source provided.</p>
          </div>
        ) : (
          <>
            {useHlsJsBackend ? (
              <video
                key={src}
                ref={nativeVideoCallbackRef}
                className="pv-video"
                poster={poster}
                muted={muted}
                loop={loop}
                autoPlay={autoplay}
                playsInline
                onClick={handleVideoClick}
                onDoubleClick={handleVideoDoubleClick}
              />
            ) : (
              <div className="pv-video" onClick={handleVideoClick} onDoubleClick={handleVideoDoubleClick}>
                <ReactPlayer
                  key={src}
                  ref={reactPlayerRef}
                  url={src}
                  playing={autoplay}
                  muted={muted}
                  loop={loop}
                  width="100%"
                  height="100%"
                  playsinline
                  config={{ file: { attributes: { poster, playsInline: true } } }}
                  onError={(err) => callbacksRef.current.onError?.({ type: 'PLAYER_ERROR', message: String(err) })}
                />
              </div>
            )}

            <div ref={adContainerRef} className="pv-ad-container" hidden={!ads.adState.playing} />

            {controls && !ads.adState.playing && (
              <button
                type="button"
                className="pv-center-toggle"
                aria-label={playing ? 'Pause' : 'Play'}
                onClick={handleVideoClick}
                onDoubleClick={handleVideoDoubleClick}
                tabIndex={-1}
              />
            )}

            {pulse && (
              <div className="pv-pulse" key={pulse.id} onAnimationEnd={() => setPulse(null)}>
                {pulse.type === 'play' && <Play size={34} aria-hidden="true" />}
                {pulse.type === 'pause' && <Pause size={34} aria-hidden="true" />}
                {pulse.type === 'rewind' && <span className="pv-pulse__seek">-{doubleClickSeekSeconds}s</span>}
                {pulse.type === 'forward' && <span className="pv-pulse__seek">+{doubleClickSeekSeconds}s</span>}
              </div>
            )}

            {showBigLoading && (
              <div className="pv-overlay pv-overlay--loading">
                <Loader2 className="pv-spinner" size={44} aria-hidden="true" />
                <span>Loading&hellip;</span>
              </div>
            )}

            {!showBigLoading && buffering && playing && !activeError && (
              <div className="pv-overlay pv-overlay--buffering">
                <Loader2 className="pv-spinner" size={36} aria-hidden="true" />
              </div>
            )}

            {activeError && (
              <div className="pv-overlay pv-overlay--error">
                <AlertTriangle size={40} aria-hidden="true" />
                <p className="pv-overlay__title">Unable to play this video</p>
                <p className="pv-overlay__subtitle">{activeError.message || 'The stream could not be loaded.'}</p>
                <button type="button" className="pv-retry-btn" onClick={retryPlayback}>
                  Retry
                </button>
              </div>
            )}

            {ads.adState.playing && (
              <div className="pv-ad-bar">
                <span className="pv-ad-badge">Ad</span>
                <span>{formatTime(ads.adState.remaining)}</span>
                {ads.adState.skippable && (
                  <button type="button" className="pv-ad-skip" onClick={ads.skipAd}>
                    Skip Ad <ChevronRight size={14} aria-hidden="true" />
                  </button>
                )}
              </div>
            )}

            {skipInfo && !ads.adState.playing && (
              <button
                type="button"
                className="pv-skip-btn"
                onClick={() => mediaControls.seekTo(skipInfo.range.end)}
              >
                {skipInfo.label} <ChevronRight size={16} aria-hidden="true" />
              </button>
            )}

            {resumeToast && (
              <div className="pv-toast">{resumeToast}</div>
            )}

            {upNextCountdown !== null && !ads.adState.playing && (
              <div className="pv-upnext">
                {upNext.thumbnail && <img src={upNext.thumbnail} alt="" className="pv-upnext__thumb" />}
                <div className="pv-upnext__body">
                  <p className="pv-upnext__eyebrow">Up next</p>
                  <p className="pv-upnext__title">{upNext.title}</p>
                  <div className="pv-upnext__actions">
                    <button type="button" className="pv-upnext__play" onClick={playUpNextNow}>
                      Play now
                    </button>
                    <button type="button" className="pv-upnext__cancel" onClick={cancelUpNext}>
                      Cancel ({upNextCountdown}s)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {!controlsVisible && playing && !ads.adState.playing && (
              <div className="pv-thin-progress">
                <div className="pv-thin-progress__fill" style={{ width: `${toPercent(currentTime, duration)}%` }} />
              </div>
            )}

            {controls && !ads.adState.playing && (
              <PlayerControls
                visible={controlsVisible || !playing}
                isMobile={false}
                state={{
                  playing,
                  currentTime,
                  duration,
                  buffered,
                  volume,
                  muted,
                  playbackRate,
                  speedOptions: SPEED_OPTIONS,
                  isLive,
                  fullscreen: fullscreenState,
                  theatreMode,
                  pip,
                  pipSupported,
                  levels: hls.levels,
                  selectedQuality: hls.currentLevel,
                  autoResolvedHeight,
                  audioTracks: hls.audioTracks,
                  selectedAudio: hls.currentAudioTrack,
                  subtitleTracks: hls.subtitleTracks,
                  subtitleTrack: hls.currentSubtitleTrack,
                  chapters,
                  seekableStart: seekableRange.start,
                  seekableEnd: seekableRange.end,
                }}
                flags={{
                  qualitySelector: qualitySelector && useHlsJsBackend,
                  audioSelector: audioSelector && useHlsJsBackend,
                  subtitleSelector: subtitleSelector && useHlsJsBackend,
                  playbackSpeed,
                  fullscreen: fullscreenEnabled,
                  pictureInPicture: pipEnabled,
                  theatreMode: theatreEnabled,
                  share: shareEnabled,
                }}
                actions={{
                  togglePlay,
                  seekTo: mediaControls.seekTo,
                  seekBy: mediaControls.seekBy,
                  onScrubStart: () => {
                    scrubbingRef.current = true
                  },
                  onScrubEnd: () => {
                    scrubbingRef.current = false
                  },
                  setVolume: mediaControls.setVolume,
                  toggleMute: mediaControls.toggleMute,
                  setPlaybackRate: mediaControls.setPlaybackRate,
                  setQuality,
                  setAudioTrack,
                  setSubtitleTrack,
                  toggleCaptions,
                  toggleFullscreen,
                  togglePiP,
                  toggleTheatre,
                  goLive,
                  onShare: handleShare,
                }}
              />
            )}
          </>
        )}
      </div>

      {debug && mediaReady && (
        <StatsPanel getStats={hls.getStats} currentTime={currentTime} buffering={buffering} pinned onClose={null} />
      )}

      {statsVisible && (
        <StatsPanel getStats={hls.getStats} currentTime={currentTime} buffering={buffering} onClose={() => setStatsVisible(false)} />
      )}

      {contextMenu && (
        <div
          className="pv-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          role="menu"
        >
          <button type="button" onClick={() => copyText(window.location.href)}>
            <Copy size={14} aria-hidden="true" /> Copy video URL
          </button>
          <button
            type="button"
            onClick={() => copyText(`${window.location.href.split('?')[0]}?t=${Math.floor(currentTime)}`)}
          >
            <Copy size={14} aria-hidden="true" /> Copy timestamp
          </button>
          <button type="button" onClick={() => setStatsVisible(true)}>
            <Info size={14} aria-hidden="true" /> Stats for nerds
          </button>
        </div>
      )}
    </div>
  )
})

function StatsPanel({ getStats, currentTime, buffering, onClose, pinned }) {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    const update = () => setStats(getStats())
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [getStats])

  return (
    <div className={`pv-stats${pinned ? ' pv-stats--pinned' : ''}`}>
      {!pinned && (
        <button type="button" className="pv-stats__close" onClick={onClose} aria-label="Close stats">
          <X size={14} aria-hidden="true" />
        </button>
      )}
      <p className="pv-stats__title">Stream Information</p>
      <dl>
        <dt>Resolution</dt>
        <dd>{stats?.resolution || '—'}</dd>
        <dt>Bitrate</dt>
        <dd>{formatBitrate(stats?.bitrate) || '—'}</dd>
        <dt>FPS</dt>
        <dd>{stats?.fps ? Math.round(stats.fps) : '—'}</dd>
        <dt>Video codec</dt>
        <dd>{stats?.videoCodec || '—'}</dd>
        <dt>Audio codec</dt>
        <dd>{stats?.audioCodec || '—'}</dd>
        <dt>Est. bandwidth</dt>
        <dd>{formatBitrate(stats?.bandwidthEstimate) || '—'}</dd>
        <dt>Fragment</dt>
        <dd>{stats?.fragmentSn != null ? `#${stats.fragmentSn}` : '—'}</dd>
        <dt>Buffer</dt>
        <dd>{stats ? `${stats.bufferLength.toFixed(1)}s` : '—'}</dd>
        <dt>Dropped frames</dt>
        <dd>{stats ? `${stats.droppedFrames} / ${stats.totalFrames}` : '—'}</dd>
        <dt>Latency</dt>
        <dd>{stats?.latency != null ? `${stats.latency.toFixed(1)}s` : '—'}</dd>
        <dt>Current time</dt>
        <dd>{formatTime(currentTime)}</dd>
        <dt>State</dt>
        <dd>{buffering ? 'Buffering' : 'Playing'}</dd>
      </dl>
    </div>
  )
}

export default VideoPlayer
