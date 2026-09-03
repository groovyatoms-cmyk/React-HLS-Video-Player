import { useCallback, useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'
import { levelLabel, trackLabel } from '../components/VideoPlayer/playerUtils'

const MAX_NETWORK_RETRIES = 4
const MAX_MEDIA_RETRIES = 2
const RETRY_RESET_WINDOW_MS = 20000

/**
 * Owns the full hls.js lifecycle for a single <video> element: creates the
 * instance, loads the manifest, tracks available quality/audio/subtitle
 * tracks, mirrors the current selections, applies a bounded error-recovery
 * strategy, and tears everything down on unmount or source change.
 *
 * This is the single source of truth for HLS-specific playback state; it
 * never touches play/pause/seek/volume, which stay owned by the <video>
 * element itself (see VideoPlayer.jsx).
 *
 * Only active when `enabled` is true — callers should set that to false for
 * progressive (mp4/webm) sources or for Safari's native HLS path, in which
 * case this hook is a cheap no-op returning empty track lists.
 */
export default function useHlsPlayer({
  videoRef,
  src,
  enabled,
  hlsConfig,
  startLevel = -1,
  onReady,
  onError,
  onLevelSwitched,
  onAudioTrackSwitched,
  onSubtitleTrackSwitched,
}) {
  const hlsRef = useRef(null)
  const retryRef = useRef({ network: 0, media: 0, lastAt: 0 })
  const callbacksRef = useRef({})
  callbacksRef.current = {
    onReady,
    onError,
    onLevelSwitched,
    onAudioTrackSwitched,
    onSubtitleTrackSwitched,
  }

  const [levels, setLevels] = useState([])
  const [currentLevel, setCurrentLevel] = useState(-1)
  const [audioTracks, setAudioTracks] = useState([])
  const [currentAudioTrack, setCurrentAudioTrack] = useState(-1)
  const [subtitleTracks, setSubtitleTracks] = useState([])
  const [currentSubtitleTrack, setCurrentSubtitleTrack] = useState(-1)
  const [isLive, setIsLive] = useState(false)
  const [fatalError, setFatalError] = useState(null)
  const [manifestReady, setManifestReady] = useState(false)

  const destroy = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }
  }, [])

  useEffect(() => {
    setManifestReady(false)
    setFatalError(null)
    setLevels([])
    setCurrentLevel(-1)
    setAudioTracks([])
    setCurrentAudioTrack(-1)
    setSubtitleTracks([])
    setCurrentSubtitleTrack(-1)
    setIsLive(false)

    if (!enabled || !src || !videoRef.current) {
      destroy()
      return undefined
    }

    if (!Hls.isSupported()) {
      setFatalError({
        type: 'UNSUPPORTED',
        message: 'HLS playback is not supported in this browser.',
      })
      return undefined
    }

    const video = videoRef.current
    const hls = new Hls({
      startLevel,
      capLevelToPlayerSize: true,
      enableWorker: true,
      ...hlsConfig,
    })
    hlsRef.current = hls
    retryRef.current = { network: 0, media: 0, lastAt: 0 }

    hls.on(Hls.Events.MANIFEST_PARSED, (_evt, data) => {
      const nextLevels = (data.levels || []).map((level, index) => ({
        index,
        height: level.height,
        width: level.width,
        bitrate: level.bitrate,
        frameRate: level.frameRate,
        label: levelLabel(level),
      }))
      setLevels(nextLevels)
      setCurrentLevel(hls.currentLevel)
      setIsLive(Boolean(hls.liveSyncPosition !== undefined && hls.levels?.[0]?.details?.live))
      setManifestReady(true)
      callbacksRef.current.onReady?.({ levels: nextLevels })
    })

    hls.on(Hls.Events.LEVEL_SWITCHED, (_evt, data) => {
      setCurrentLevel(data.level)
      const level = hls.levels?.[data.level]
      callbacksRef.current.onLevelSwitched?.({
        index: data.level,
        auto: hls.autoLevelEnabled,
        width: level?.width,
        height: level?.height,
        bitrate: level?.bitrate,
      })
    })

    hls.on(Hls.Events.LEVEL_LOADED, (_evt, data) => {
      setIsLive(Boolean(data.details?.live))
    })

    hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, (_evt, data) => {
      const tracks = (data.audioTracks || []).map((track, index) => ({
        id: index,
        label: trackLabel(track, index),
        lang: track.lang || '',
        default: Boolean(track.default),
      }))
      setAudioTracks(tracks)
      setCurrentAudioTrack(hls.audioTrack)
    })

    hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, (_evt, data) => {
      setCurrentAudioTrack(data.id)
      callbacksRef.current.onAudioTrackSwitched?.({ id: data.id })
    })

    hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, (_evt, data) => {
      const tracks = (data.subtitleTracks || []).map((track, index) => ({
        id: index,
        label: trackLabel(track, index),
        lang: track.lang || '',
        default: Boolean(track.default),
      }))
      setSubtitleTracks(tracks)
      setCurrentSubtitleTrack(hls.subtitleTrack)
    })

    hls.on(Hls.Events.SUBTITLE_TRACK_SWITCH, (_evt, data) => {
      setCurrentSubtitleTrack(data.id)
      callbacksRef.current.onSubtitleTrackSwitched?.({ id: data.id })
    })

    hls.on(Hls.Events.ERROR, (_evt, data) => {
      callbacksRef.current.onError?.(data)

      if (!data.fatal) return

      const now = Date.now()
      if (now - retryRef.current.lastAt > RETRY_RESET_WINDOW_MS) {
        retryRef.current.network = 0
        retryRef.current.media = 0
      }
      retryRef.current.lastAt = now

      switch (data.type) {
        case Hls.ErrorTypes.NETWORK_ERROR:
          if (retryRef.current.network < MAX_NETWORK_RETRIES) {
            retryRef.current.network += 1
            hls.startLoad()
          } else {
            setFatalError({ type: data.type, details: data.details, message: 'Network error: unable to load the stream.' })
          }
          break
        case Hls.ErrorTypes.MEDIA_ERROR:
          if (retryRef.current.media < MAX_MEDIA_RETRIES) {
            retryRef.current.media += 1
            hls.recoverMediaError()
          } else {
            setFatalError({ type: data.type, details: data.details, message: 'Media error: playback could not recover.' })
          }
          break
        default:
          setFatalError({ type: data.type, details: data.details, message: 'The stream could not be loaded.' })
          destroy()
          break
      }
    })

    hls.loadSource(src)
    hls.attachMedia(video)

    return () => {
      destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, src, videoRef, destroy])

  const setQuality = useCallback((index) => {
    const hls = hlsRef.current
    if (!hls) return
    hls.currentLevel = index
  }, [])

  const setAudioTrack = useCallback((id) => {
    const hls = hlsRef.current
    if (!hls) return
    hls.audioTrack = id
  }, [])

  const setSubtitleTrack = useCallback((id) => {
    const hls = hlsRef.current
    if (!hls) return
    hls.subtitleTrack = id
    hls.subtitleDisplay = id !== -1
  }, [])

  const goLive = useCallback(() => {
    const hls = hlsRef.current
    const video = videoRef.current
    if (!hls || !video) return
    if (typeof hls.liveSyncPosition === 'number') {
      video.currentTime = hls.liveSyncPosition
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoRef])

  const retry = useCallback(() => {
    const hls = hlsRef.current
    if (!hls || !src || !videoRef.current) return
    retryRef.current = { network: 0, media: 0, lastAt: 0 }
    setFatalError(null)
    hls.loadSource(src)
    hls.attachMedia(videoRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, videoRef])

  const getStats = useCallback(() => {
    const hls = hlsRef.current
    const video = videoRef.current
    if (!hls || !video) return null

    const level = hls.levels?.[hls.currentLevel]
    let bufferLength = 0
    try {
      const { buffered, currentTime } = video
      for (let i = 0; i < buffered.length; i += 1) {
        if (buffered.start(i) <= currentTime && currentTime <= buffered.end(i)) {
          bufferLength = buffered.end(i) - currentTime
          break
        }
      }
    } catch {
      bufferLength = 0
    }

    let droppedFrames = 0
    let totalFrames = 0
    if (typeof video.getVideoPlaybackQuality === 'function') {
      const quality = video.getVideoPlaybackQuality()
      droppedFrames = quality.droppedVideoFrames || 0
      totalFrames = quality.totalVideoFrames || 0
    }

    return {
      resolution: level ? `${level.width} x ${level.height}` : null,
      bitrate: level?.bitrate ?? null,
      fps: level?.frameRate ?? null,
      bufferLength,
      droppedFrames,
      totalFrames,
      liveSyncPosition: hls.liveSyncPosition ?? null,
      latency: hls.latency ?? null,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoRef])

  return {
    hlsRef,
    manifestReady,
    levels,
    currentLevel,
    autoLevelEnabled: hlsRef.current?.autoLevelEnabled ?? true,
    setQuality,
    audioTracks,
    currentAudioTrack,
    setAudioTrack,
    subtitleTracks,
    currentSubtitleTrack,
    setSubtitleTrack,
    isLive,
    goLive,
    fatalError,
    retry,
    getStats,
  }
}
