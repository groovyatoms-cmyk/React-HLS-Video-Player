# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[1.0.0]: https://github.com/groovyatoms-cmyk/reactjvideoplayer/releases/tag/v1.0.0
