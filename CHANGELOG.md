# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-09-03

### Added

- **Thumbnail scrub preview**: a `thumbnails` sprite-sheet prop
  (`{ url, interval, columns, rows, tileWidth, tileHeight, count? }`) shows
  the matching storyboard tile above the seek bar's time tooltip on hover.
- **A-B loop (segment repeat)**: "Set loop point A" / "Set loop point B" /
  "Clear loop" in the right-click context menu, with the active segment
  highlighted on the seek bar. Toggle via the `abLoop` prop.
- **Screenshot / frame capture**: "Save screenshot" in the context menu
  captures the current frame to a downloaded PNG via canvas, failing
  gracefully (toast, not a crash) on cross-origin sources without CORS
  clearance. Toggle via the `screenshot` prop.
- **Sleep timer**: a new "Sleep timer" settings-menu row (Off / 10 / 30 /
  60 minutes / End of video) pauses playback on expiry with a toast.
  Toggle via the `sleepTimer` prop.
- Generalized the "resumed from" toast into a reusable toast surface shared
  by the new sleep-timer notifications.

## [1.1.0] - 2026-09-03

### Added

- Expanded hls.js coverage: `maxQuality` (ABR resolution capping via
  `hls.autoLevelCapping`), `capLevelOnFPSDrop`, `lowLatencyMode` (LL-HLS),
  `startPosition`, `drmConfig` (EME/DRM via hls.js's `drmSystems`), codec
  info (`videoCodec`/`audioCodec`) on levels and in the stats panel, and a
  live hls.js bandwidth estimate.
- Proper **Live DVR seeking**: the seek bar now uses the media element's
  actual `seekable` range for live streams instead of `duration` (`Infinity`
  for live, which silently broke the bar's percentage math and made it
  non-functional) — enabling real backward scrubbing into the DVR window,
  not just a jump-to-edge button. The "LIVE" badge now distinguishes "at the
  live edge" (solid red) from "behind the edge" (outlined, click to catch
  up), and `goLive()` works on both the hls.js and native-HLS/Safari paths.
- `onWarning` callback for non-fatal hls.js errors, kept distinct from the
  fatal ones routed through `onError`.
- `onFragChanged` callback, firing on every hls.js fragment switch.
- Ref API additions: `goLive()`, `getStats()`, `getBandwidthEstimate()`,
  `stopLoad()`/`startLoad()`, `swapAudioCodec()`, and `getHlsInstance()` — a
  raw `Hls` instance escape hatch for anything not individually wrapped.
- `hlsConfig` documented as the general escape hatch for any hls.js
  constructor option not exposed as a dedicated prop.

### Fixed

- Center play/pause/seek pulse animation restarting (visibly flickering)
  because its React `key` was tied to continuously-changing `currentTime`.
- Theatre mode collapsing the player to zero height due to a circular `%`
  height reference in CSS (`min(80vh, 100%)` against a parent with no
  explicit height of its own).
- Seek bar's hover/drag thumb rendering as an oval instead of a circle — a
  CSS selector meant to thicken the track on hover was accidentally
  squashing the thumb's height too.
- `react-player`'s CJS build getting double-wrapped by Vite's dev-time
  dependency pre-bundler (`{ default: ReactPlayer }` instead of the
  component itself), crashing to a blank page the moment a progressive
  source or Safari's native-HLS path rendered.

## [1.0.0] - 2026-09-03

### Added

- Initial production-grade `VideoPlayer` component (Vite + React + JSX).
- Dual playback backend: `hls.js` driving a native `<video>` element for
  browsers without native HLS support, and `ReactPlayer` for progressive
  (MP4/WebM/Ogg) sources and Safari's native HLS path.
- `useHlsPlayer` hook: full hls.js lifecycle (create, attach, load, destroy),
  quality levels, audio tracks, subtitle tracks, live detection, and a
  bounded network/media error-recovery strategy.
- Manual + Auto quality selection reading real levels from the HLS manifest,
  with bitrate display and no invented capabilities.
- Dynamic audio-language and subtitle/caption track selection sourced from
  `hls.audioTracks` / `hls.subtitleTracks`.
- Configurable subtitle styling (font size, color, background, text shadow)
  via the `subtitleStyle` prop.
- YouTube-style settings menu (Quality / Speed / Audio / Subtitles) with
  back navigation, plus a dedicated seek bar with buffered progress, hover
  time tooltip, drag-to-seek, and keyboard control.
- Full control bar: play/pause, ±10s skip, volume with persistent mute,
  live badge with "Go Live", captions toggle, playback speed, fullscreen,
  Picture-in-Picture, theatre mode, share, and settings.
- Keyboard shortcuts (space/K, arrows, J/L, M, F, P, C, `<`/`>`, 0-9 seek).
- Double-click/tap zones: rewind / fullscreen / forward.
- Auto-hiding controls, animated center play/pause/seek feedback pulse.
- Loading, buffering, and fatal-error overlays with a controlled retry
  strategy and a load-timeout safeguard so playback can never hang forever
  in "Loading…" with no way out.
- Live HLS support with DVR-aware live-edge seeking.
- Light / dark / system theming via CSS custom properties, plus a
  configurable accent color and 16:9 / 4:3 / 21:9 / custom aspect ratios.
- Right-click context menu: copy video URL, copy timestamped URL,
  "Stats for nerds" diagnostics panel (resolution, bitrate, FPS, buffer,
  dropped frames), also available continuously via the `debug` prop.
- Persisted user preferences (volume, mute, playback speed, quality,
  subtitle language, theatre mode) in `localStorage`, with corruption-safe
  parsing and sane fallbacks.
- Full imperative ref API (`play`, `pause`, `seekTo`, `setVolume`,
  `toggleMute`, `enterFullscreen`/`exitFullscreen`, `toggleTheatreMode`,
  `getCurrentTime`, `getDuration`, `getQualities`, `getAudioTracks`,
  `getSubtitleTracks`, `getVideoElement`, `skipAd`).
- Complete callback API (`onPlay`, `onPause`, `onEnded`, `onReady`,
  `onProgress`, `onDuration`, `onBuffer`/`onBufferEnd`, `onError`,
  `onQualityChange`, `onAudioChange`, `onSubtitleChange`,
  `onPlaybackRateChange`, `onFullscreenChange`, `onPiPChange`,
  `onVolumeChange`, `onSeek`).
- Google IMA SDK integration (`useImaAds`) for a single pre-roll linear ad
  slot, wired via `adTagUrl`, with a content pause/resume sync, countdown,
  and skip button. Ships with Google's public sample VAST tag as a demo
  default — ad failures never block content playback.
- Intro/Credits skip markers (`introRange` / `creditsRange`): a "Skip
  Intro" / "Skip Credits" button appears a few seconds after entering the
  marked segment and jumps to its end on click.
- Chapter markers on the seek bar (`chapters` prop) with tick marks and a
  chapter title in the hover tooltip and time row.
- "Continue watching": last playback position is remembered per source in
  `localStorage` and silently resumed on return, with a brief toast.
- "Up Next" autoplay card (`upNext` prop) shown near the end of playback
  with a cancellable countdown, mirroring Netflix/YouTube-style
  episode-to-episode flow.
- A thin, always-visible YouTube-style progress bar shown at the frame's
  bottom edge while the main control bar is auto-hidden.
- Full demo application (`src/App.jsx`) with a stream-URL loader, sample
  stream picker, theme/accent/debug/ads toggles, a live player-event log,
  and current stream/quality/audio/subtitle/time/buffer readouts.

[1.2.0]: https://github.com/groovyatoms-cmyk/reactjvideoplayer/releases/tag/v1.2.0
[1.1.0]: https://github.com/groovyatoms-cmyk/reactjvideoplayer/releases/tag/v1.1.0
[1.0.0]: https://github.com/groovyatoms-cmyk/reactjvideoplayer/releases/tag/v1.0.0
