// Shared helpers for the VideoPlayer component tree.
// Kept framework-agnostic (no React imports) so they are easy to unit test.

const STORAGE_PREFIX = 'video-player-'

export const STORAGE_KEYS = {
  volume: `${STORAGE_PREFIX}volume`,
  muted: `${STORAGE_PREFIX}muted`,
  playbackRate: `${STORAGE_PREFIX}speed`,
  quality: `${STORAGE_PREFIX}quality`,
  subtitle: `${STORAGE_PREFIX}subtitle`,
  theme: `${STORAGE_PREFIX}theme`,
  theatreMode: `${STORAGE_PREFIX}theatre`
}

/**
 * Safely reads a JSON value from localStorage. Never throws — corrupted or
 * missing values fall back to `fallback` instead of crashing the player.
 */
export function readStorage (key, fallback) {
  try {
    const raw = window.localStorage.getItem(key)
    if (raw === null || raw === undefined) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

/**
 * Safely writes a JSON value to localStorage. Never throws (private
 * browsing / quota errors are swallowed).
 */
export function writeStorage (key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore write failures (private mode, quota exceeded, etc.)
  }
}

/**
 * Formats seconds as `MM:SS` or `HH:MM:SS`, only including the hours
 * segment when needed (or when `forceHours` is requested for a duration
 * that is itself over an hour, so 00:12 doesn't look wrong next to 1:02:00).
 */
export function formatTime (seconds, forceHours = false) {
  if (!Number.isFinite(seconds) || seconds < 0)
    return forceHours ? '0:00:00' : '0:00'

  const totalSeconds = Math.floor(seconds)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const secs = totalSeconds % 60

  if (hours > 0 || forceHours) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(
      secs
    ).padStart(2, '0')}`
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`
}

/** Detects the media type from a source URL. */
export function detectSourceType (src) {
  if (!src || typeof src !== 'string') return 'unknown'

  let pathname = src
  try {
    pathname = new URL(src, window.location.href).pathname
  } catch {
    // relative or malformed URL — fall back to raw string matching
  }

  const lower = pathname.toLowerCase()
  if (lower.endsWith('.m3u8')) return 'hls'
  if (lower.endsWith('.mpd')) return 'dash'
  if (lower.endsWith('.mp4') || lower.endsWith('.m4v')) return 'mp4'
  if (lower.endsWith('.webm')) return 'webm'
  if (lower.endsWith('.ogg') || lower.endsWith('.ogv')) return 'ogg'
  if (lower.endsWith('.mov')) return 'mov'
  return 'native'
}

/** Only http(s) and relative/blob URLs are allowed as playback sources. */
export function isValidStreamUrl (src) {
  if (!src || typeof src !== 'string') return false
  try {
    const url = new URL(src, window.location.href)
    return ['http:', 'https:', 'blob:'].includes(url.protocol)
  } catch {
    return false
  }
}

/** Formats a bits-per-second number as a human readable Mbps/Kbps string. */
export function formatBitrate (bitsPerSecond) {
  if (!Number.isFinite(bitsPerSecond) || bitsPerSecond <= 0) return null
  const mbps = bitsPerSecond / 1_000_000
  if (mbps >= 1) return `${mbps.toFixed(1)} Mbps`
  return `${Math.round(bitsPerSecond / 1000)} Kbps`
}

/** Human-friendly label for an hls.js level, e.g. "1080p", "720p60". */
export function levelLabel (level) {
  if (!level) return 'Unknown'
  const height = level.height
  if (!height) return level.name || 'Auto'
  const fps = level.frameRate ? Math.round(level.frameRate) : null
  const highFps = fps && fps > 30 ? fps : null
  return `${height}p${highFps ? highFps : ''}`
}

let languageDisplayNames = null
try {
  languageDisplayNames =
    typeof Intl !== 'undefined' && Intl.DisplayNames
      ? new Intl.DisplayNames(['en'], { type: 'language' })
      : null
} catch {
  languageDisplayNames = null
}

/**
 * Resolves a BCP-47 language code (e.g. "en", "es-419", "hi") to its real
 * display name (e.g. "English", "Spanish (Latin America)", "Hindi") via the
 * standard `Intl.DisplayNames` API — never a hardcoded language list, and
 * never invented for a code the runtime doesn't recognize.
 */
export function languageName (code) {
  if (!code || code.toLowerCase() === 'und' || !languageDisplayNames)
    return null
  try {
    const name = languageDisplayNames.of(code)
    if (
      name &&
      name.toLowerCase() !== code.toLowerCase() &&
      name.toLowerCase() !== 'root'
    )
      return name
  } catch {
    // malformed/unrecognized subtag
  }
  return null
}

/** Best-effort human label for an HLS audio/subtitle track. */
export function trackLabel (track, index) {
  if (!track) return `Track ${index + 1}`
  const name =
    track.name && track.name.toLowerCase() !== (track.lang || '').toLowerCase()
      ? track.name
      : null
  return (
    name ||
    languageName(track.lang) ||
    track.lang ||
    track.language ||
    (track.default ? 'Default' : `Track ${index + 1}`)
  )
}

/** Maps an HLS #EXT-X-MEDIA CHANNELS attribute (a channel count) to a label. */
export function formatChannels (channels) {
  if (!channels) return null
  const count = parseInt(channels, 10)
  if (!Number.isFinite(count) || count <= 0) return null
  if (count === 1) return 'Mono'
  if (count === 2) return 'Stereo'
  if (count <= 6) return '5.1 Surround'
  if (count <= 8) return '7.1 Surround'
  return `${count}-channel`
}

export function clamp (value, min, max) {
  return Math.min(Math.max(value, min), max)
}

/** Percentage of `value` within [0, total], clamped to [0, 100]. */
export function toPercent (value, total) {
  if (!Number.isFinite(total) || total <= 0) return 0
  return clamp((value / total) * 100, 0, 100)
}

export function isTypingTarget (el) {
  if (!el) return false
  const tag = el.tagName ? el.tagName.toLowerCase() : ''
  return (
    tag === 'input' ||
    tag === 'textarea' ||
    tag === 'select' ||
    el.isContentEditable === true
  )
}

export const SPEED_OPTIONS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]

export function speedLabel (rate) {
  return rate === 1 ? 'Normal' : `${rate}x`
}

export const SLEEP_TIMER_OPTIONS = [
  { minutes: 0, label: 'Off' },
  { minutes: 10, label: '10 minutes' },
  { minutes: 30, label: '30 minutes' },
  { minutes: 60, label: '1 hour' },
  { minutes: 'end', label: 'End of video' }
]
