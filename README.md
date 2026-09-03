# React HLS Video Player

A production-grade, reusable HLS video player component built with **Vite +
React (JSX)**, [`react-player`](https://github.com/cookpete/react-player) and
[`hls.js`](https://github.com/video-dev/hls.js), styled to feel like a
premium OTT/streaming player.

See [`CHANGELOG.md`](./CHANGELOG.md) for release history.

## Table of contents

1. [Overview](#overview)
2. [Features](#features)
3. [Quick start](#quick-start)
4. [Use cases & recipes](#use-cases--recipes)
   - [Simple VOD embed](#1-simple-vod-embed)
   - [OTT episodic streaming](#2-ott-episodic-streaming-netflixstyle)
   - [Live streaming with DVR](#3-live-streaming-with-dvr)
   - [Pre-roll advertising](#4-pre-roll-advertising)
   - [DRM-protected premium content](#5-drm-protected-premium-content)
   - [Multi-language / international catalog](#6-multi-language--international-catalog)
   - [Analytics & QoE telemetry](#7-analytics--qoe-telemetry)
   - [White-label theming per tenant](#8-white-label-theming-per-tenant)
   - [Minimal, accessibility-first embed](#9-minimal-accessibility-first-embed)
   - [Support/QA debug mode](#10-supportqa-debug-mode)
   - [Driving the player from external UI](#11-driving-the-player-from-external-ui)
5. [Project structure](#project-structure)
6. [Props reference](#props-reference)
7. [Callbacks reference](#callbacks-reference)
8. [Ref (imperative) API](#ref-imperative-api)
9. [Keyboard shortcuts](#keyboard-shortcuts)
10. [Architecture & internals](#architecture--internals)
    - [ReactPlayer + hls.js integration](#reactplayer--hlsjs-integration)
    - [Quality / audio / subtitle handling](#quality--audio--subtitle-handling)
    - [Error handling & resilience](#error-handling--resilience)
    - [hls.js feature coverage](#hlsjs-feature-coverage)
    - [Advanced playback tools](#advanced-playback-tools)
    - [Ads (Google IMA SDK)](#ads-google-ima-sdk)
11. [Theming & customization](#theming--customization)
12. [Accessibility](#accessibility)
13. [Browser compatibility](#browser-compatibility)
14. [Performance & production deployment](#performance--production-deployment)
15. [Troubleshooting / FAQ](#troubleshooting--faq)
16. [Testing](#testing)
17. [Contributing](#contributing)
18. [License](#license)

## Overview

Most "video player" examples online stop at "renders a `<video>` tag and
calls `hls.js`". This project is the layer above that: a single
`<VideoPlayer />` component that a real product can drop in and get a
complete, opinionated OTT-grade experience — manifest-driven quality/audio/
subtitle selection, Live DVR, ads, resume-watching, intro/credits skipping,
episode-to-episode autoplay, DRM, thumbnail scrubbing, and a full keyboard/
accessibility story — without the integrating app having to know that
`hls.js` or `react-player` exist underneath it.

The design principle throughout is **honesty about capability**: the player
never invents a quality level, audio track, or subtitle language that isn't
actually in the manifest, and every optional feature (ads, DRM, thumbnails,
chapters, …) degrades gracefully to "simply not shown" rather than crashing
or faking data when it isn't configured.

## Features

**Playback & formats**
- HLS (`.m3u8`), MP4, WebM and any HTML5-compatible source, auto-detected
  from the URL, with the right backend picked per source (see
  [ReactPlayer + hls.js integration](#reactplayer--hlsjs-integration)).
- Manual + Auto quality selection, dynamic audio-track and subtitle-track
  selection — all read live from the manifest.
- DRM (Widevine/PlayReady/FairPlay) via hls.js's EME support.

**Controls & UX**
- Full custom control bar: seek bar with buffered progress + hover preview,
  volume with persisted mute, playback speed, fullscreen, Picture-in-Picture,
  theatre mode, share, settings menu.
- Keyboard shortcuts, double-click/tap seek zones, auto-hiding controls,
  animated center play/pause/seek feedback.
- Loading / buffering / error states with a bounded retry strategy and a
  load-timeout safeguard — never a silent infinite spinner.

**Live**
- Live badge with a real **DVR-aware** seek bar (scrub backward into the
  live window, not just jump to the edge) and a "Go Live" control.
- Low-latency HLS (LL-HLS) support.

**OTT / personalization**
- Google IMA SDK pre-roll ad support.
- Intro/credits skip markers, chapter markers, "continue watching" resume,
  and a Netflix-style "Up Next" autoplay card.
- Persisted preferences (volume, mute, speed, quality, subtitle language,
  theatre mode) via `localStorage`.

**Advanced tools**
- Thumbnail (storyboard) scrub preview, A-B loop / segment repeat,
  one-click screenshot capture, and a sleep timer.
- "Stats for nerds" diagnostics panel and a right-click context menu.

**Integration**
- Full imperative ref API and callback API for embedding in any app or
  telemetry pipeline.
- Light / dark / system themes, configurable accent color, 16:9 / 4:3 /
  21:9 / custom aspect ratios — all via CSS custom properties.

## Quick start

```bash
npm install
npm run dev       # start the dev server
npm run build     # production build (outputs to dist/)
npm run preview   # preview the production build locally
npm run lint       # oxlint
```

```jsx
import { useRef } from 'react'
import VideoPlayer from './components/VideoPlayer/VideoPlayer'
import { DEMO_STREAM } from './data/demoStreams'

function Example() {
  const playerRef = useRef(null)

  return (
    <VideoPlayer
      ref={playerRef}
      src={DEMO_STREAM}
      poster="/poster.jpg"
      theme="dark"
      accentColor="#8b5cf6"
      onQualityChange={(q) => console.log('quality', q)}
      onError={(err) => console.error(err)}
    />
  )
}
```

Or with your own stream: `<VideoPlayer src="https://example.com/stream/master.m3u8" />`.
Every feature below is opt-in via props — the component above is already a
fully working player with sensible defaults for everything else.

## Use cases & recipes

Complete, realistic configurations for common product scenarios. Each one
only uses props documented in the [reference](#props-reference) below.

### 1. Simple VOD embed

A blog post, landing page, or product demo embedding a single on-demand
video — no OTT chrome needed.

```jsx
<VideoPlayer
  src="https://example.com/videos/product-demo/master.m3u8"
  poster="/product-demo-poster.jpg"
  theatreMode={false}
  share={false}
/>
```

### 2. OTT episodic streaming (Netflix-style)

A full streaming-service episode player: resumes where the viewer left
off, skips intro/credits, shows chapter markers, and prompts to autoplay
the next episode.

```jsx
<VideoPlayer
  src={episode.hlsUrl}
  poster={episode.posterUrl}
  theme="dark"
  accentColor="#e50914"
  rememberPosition
  introRange={episode.introRange}       // e.g. { start: 0, end: 45 }
  creditsRange={episode.creditsRange}   // e.g. { start: 1180, end: 1240 }
  chapters={episode.chapters}           // [{ time, title }, ...]
  upNext={{ title: nextEpisode.title, thumbnail: nextEpisode.thumbnail }}
  autoplayNextDelay={10}
  onNextEpisode={() => router.push(`/watch/${nextEpisode.id}`)}
  onProgress={({ playedSeconds }) => saveWatchProgress(episode.id, playedSeconds)}
/>
```

### 3. Live streaming with DVR

A live sports/news stream where viewers can scrub back into what already
aired and jump back to the live edge.

```jsx
<VideoPlayer
  src="https://example.com/live/channel-1/master.m3u8"
  autoplay
  muted            // required by browser autoplay policy for unmuted-by-default live
  lowLatencyMode={false}   // true for a real-time/interactive stream (e.g. a live auction)
  qualitySelector
  onError={(err) => reportStreamHealth(err)}
/>
```

The LIVE badge and seek bar behavior are automatic — no extra prop needed —
driven by the manifest's live sliding window (see
[hls.js feature coverage](#hlsjs-feature-coverage)).

### 4. Pre-roll advertising

An ad-supported free tier: one pre-roll linear ad before content starts.

```jsx
<VideoPlayer
  src={content.hlsUrl}
  adTagUrl={`https://ads.example.com/vast?content_id=${content.id}`}
  onWarning={(w) => analytics.track('player_warning', w)}
  onError={(err) => analytics.track('player_error', err)}
/>
```

Ads are strictly best-effort: any ad-loading/playback failure resumes
content automatically rather than blocking playback (see
[Ads](#ads-google-ima-sdk)).

### 5. DRM-protected premium content

Subscription/rental content behind Widevine (or PlayReady/FairPlay).

```jsx
<VideoPlayer
  src={premiumTitle.hlsUrl}
  drmConfig={{
    keySystem: 'widevine',
    licenseUrl: 'https://license.example.com/widevine',
    certificateUrl: 'https://license.example.com/widevine/certificate',
  }}
  onError={(err) => {
    if (err.type === 'keySystemError') redirectToEntitlementCheck()
  }}
/>
```

Your license server, not this component, owns entitlement/authorization —
`drmConfig` only wires hls.js's EME plumbing to it.

### 6. Multi-language / international catalog

Content with several dubbed audio tracks and subtitle languages, with
subtitle styling matched to a brand's typography.

```jsx
<VideoPlayer
  src={title.hlsUrl}
  audioSelector
  subtitleSelector
  subtitleStyle={{
    fontSize: '20px',
    color: '#ffffff',
    background: 'rgba(0,0,0,0.7)',
    textShadow: '0 1px 2px rgba(0,0,0,0.8)',
  }}
  onAudioChange={({ id }) => saveUserPreference('audioTrack', id)}
  onSubtitleChange={({ id }) => saveUserPreference('subtitleTrack', id)}
/>
```

Audio/subtitle menus only ever list what the manifest actually contains —
if a title has one dub and no subtitles, the UI says so honestly rather
than showing fabricated options.

### 7. Analytics & QoE telemetry

Wiring playback into an analytics/QoE pipeline (buffering ratio, average
bitrate, rebuffer events, session heartbeat).

```jsx
<VideoPlayer
  ref={playerRef}
  src={content.hlsUrl}
  onReady={() => analytics.track('video_start', { id: content.id })}
  onBuffer={() => analytics.track('rebuffer_start')}
  onBufferEnd={() => analytics.track('rebuffer_end')}
  onQualityChange={(q) => analytics.track('bitrate_switch', q)}
  onFragChanged={(f) => analytics.track('segment_loaded', f)}
  onError={(err) => analytics.track('playback_error', err)}
/>
```

```js
// Session heartbeat using the ref's getStats() — poll on your own interval
useEffect(() => {
  const id = setInterval(() => {
    const stats = playerRef.current?.getStats()
    if (stats) analytics.track('heartbeat', stats)
  }, 30000)
  return () => clearInterval(id)
}, [])
```

### 8. White-label theming per tenant

A multi-tenant platform where each customer gets their own brand color and
theme, driven from tenant config rather than hardcoded.

```jsx
<VideoPlayer
  src={content.hlsUrl}
  theme={tenant.darkMode ? 'dark' : 'light'}
  accentColor={tenant.brandColor}       // any valid CSS color
  className="tenant-player"
  style={{ '--player-radius': tenant.roundedCorners ? '16px' : '0px' }}
/>
```

Every visual token is a CSS custom property (see
[Theming & customization](#theming--customization)), so tenant-specific
overrides can also be layered in via `className`/`style` or a scoped
stylesheet without forking the component.

### 9. Minimal, accessibility-first embed

A stripped-down player for a context where screen-reader users and
keyboard-only navigation are the primary audience — full keyboard support
stays on, decorative extras are trimmed.

```jsx
<VideoPlayer
  src={content.hlsUrl}
  keyboardShortcuts
  share={false}
  theatreMode={false}
  pictureInPicture={false}
  doubleClickToSeek={false}
/>
```

See [Accessibility](#accessibility) for the ARIA/keyboard details that
apply regardless of which optional chrome is shown.

### 10. Support/QA debug mode

A build flag or internal admin view that gives support engineers live
diagnostics without leaving the page.

```jsx
<VideoPlayer
  ref={playerRef}
  src={content.hlsUrl}
  debug={isInternalSupportUser}
/>
```

```js
// Expose the player for ad-hoc console debugging in that build
if (isInternalSupportUser) window.__player = playerRef.current
// window.__player.getStats(), .getHlsInstance(), .getQualities(), etc.
```

### 11. Driving the player from external UI

A custom episode/chapter rail built outside the player's own chrome,
controlling playback imperatively.

```jsx
function ChapterRail({ chapters, playerRef }) {
  return (
    <div className="chapter-rail">
      {chapters.map((chapter) => (
        <button key={chapter.time} onClick={() => playerRef.current?.seekTo(chapter.time)}>
          {chapter.title}
        </button>
      ))}
    </div>
  )
}
```

Anything the built-in UI can do, the [ref API](#ref-imperative-api) can do
from outside it — the control surface is the same either way.

## Project structure

```text
src/
├── components/
│   └── VideoPlayer/
│       ├── VideoPlayer.jsx      # main component (forwardRef)
│       ├── VideoPlayer.css      # themeable styles
│       ├── PlayerControls.jsx   # control bar + seek bar + settings host
│       ├── QualityMenu.jsx
│       ├── AudioMenu.jsx
│       ├── SubtitleMenu.jsx
│       ├── SpeedMenu.jsx
│       ├── SleepTimerMenu.jsx
│       └── playerUtils.js       # time/storage/detection helpers
├── hooks/
│   ├── useHlsPlayer.js          # hls.js lifecycle & state
│   └── useImaAds.js             # Google IMA SDK integration
├── data/
│   ├── demoStreams.js           # DEMO_STREAM + sample streams + demo thumbnails
│   └── adsConfig.js             # IMA SDK URL + demo VAST tag
├── App.jsx                      # demo application
├── main.jsx
└── index.css
```

## Props reference

### Core / source

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `src` | `string` | — | Video URL. `.m3u8` → HLS, `.mp4`/`.webm`/`.ogg` → progressive, anything else → native `<video>`. |
| `poster` | `string` | — | Poster image shown before playback starts. |
| `autoplay` | `boolean` | `false` | Attempts autoplay; browser autoplay restrictions are respected (never assumed to succeed). |
| `muted` | `boolean` | `false` | Initial muted state (overridden by a persisted user preference if one exists). |
| `loop` | `boolean` | `false` | Loop playback. |
| `rememberPosition` | `boolean` | `true` | Persist and silently resume the last playback position per `src`. |
| `className` / `style` | — | — | Passed through to the player wrapper. `style` can also set `--player-*` CSS variables. |

### Layout & theming

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `theme` | `'dark' \| 'light' \| 'system'` | `'dark'` | Color theme. `'system'` follows `prefers-color-scheme`. |
| `accentColor` | `string` (CSS color) | `'#8b5cf6'` | Drives `--player-accent` (progress bar, active states). |
| `aspectRatio` | `'16:9' \| '4:3' \| '21:9' \| number \| string` | `'16:9'` | Frame aspect ratio. Ignored in fullscreen/theatre mode. |
| `subtitleStyle` | `{ fontSize, color, background, textShadow }` | — | Maps to `::cue` styling. |

### Feature toggles (control chrome)

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `controls` | `boolean` | `true` | Render the custom control chrome. |
| `qualitySelector` | `boolean` | `true` | Show the Quality submenu (HLS only). |
| `audioSelector` | `boolean` | `true` | Show the Audio submenu (HLS only). |
| `subtitleSelector` | `boolean` | `true` | Show the Subtitles submenu/caption toggle (HLS only). |
| `playbackSpeed` | `boolean` | `true` | Show the Playback speed submenu. |
| `fullscreen` | `boolean` | `true` | Show the fullscreen button / enable the `F` shortcut. |
| `pictureInPicture` | `boolean` | `true` | Show the PiP button when the browser supports it. |
| `theatreMode` | `boolean` | `true` | Show the theatre-mode toggle. |
| `keyboardShortcuts` | `boolean` | `true` | Enable keyboard shortcuts. |
| `share` | `boolean` | `true` | Show the share button (`navigator.share` with clipboard fallback). |
| `debug` | `boolean` | `false` | Permanently show the "Stats for nerds" diagnostics panel. |
| `doubleClickToSeek` | `boolean` | `true` | Enable left/right double-click seek zones (center = fullscreen). |
| `doubleClickSeekSeconds` | `number` | `10` | Seconds skipped by a double-click. |

### Content & personalization (OTT / ads)

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `introRange` / `creditsRange` | `{ start: number, end: number }` | — | Shows a "Skip Intro"/"Skip Credits" button ~3s after entering the range; click jumps to `end`. |
| `chapters` | `{ time: number, title: string }[]` | — | Tick marks on the seek bar + chapter title in the tooltip/time row. |
| `upNext` | `{ title: string, thumbnail?: string }` | — | Shows a Netflix-style autoplay card in the last `autoplayNextDelay` seconds. |
| `autoplayNextDelay` | `number` | `8` | Seconds-from-end at which the "Up Next" card appears. |
| `onNextEpisode` | `() => void` | — | Called when "Up Next" fires (countdown reaches 0 or "Play now" is clicked). |
| `adTagUrl` | `string` | — | VAST ad tag URL; enables a Google IMA SDK pre-roll ad. |

### HLS & advanced playback

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `hlsConfig` | `object` | — | Passed straight through to the `Hls` constructor, merged after the named hls.js props below — the escape hatch for any hls.js option not individually exposed. |
| `startLevel` | `number` | `-1` (auto) | Initial hls.js quality level index. |
| `startPosition` | `number` (seconds) | — | Native hls.js start position for the initial load (distinct from `rememberPosition`'s resume-on-return). |
| `maxQuality` | `number` (max height, e.g. `720`) | — | Caps ABR to this vertical resolution or lower via `hls.autoLevelCapping`; manual selection above the cap is still allowed. |
| `capLevelOnFPSDrop` | `boolean` | `false` | hls.js's `capLevelOnFPSDrop` — steps ABR down if the browser can't keep up on FPS. |
| `lowLatencyMode` | `boolean` | hls.js default (`true`) | Enables/disables hls.js Low-Latency HLS (LL-HLS) mode. |
| `drmConfig` | `{ keySystem: 'widevine' \| 'playready' \| 'fairplay', licenseUrl, certificateUrl? }` | — | Maps to hls.js's EME `drmSystems` config for encrypted (DRM-protected) streams. |
| `thumbnails` | `{ url, interval, columns, rows, tileWidth, tileHeight, count? }` | — | Sprite-sheet scrub preview on the seek bar. |
| `abLoop` | `boolean` | `true` | Enable the A-B loop ("set loop point A/B") context-menu entries. |
| `screenshot` | `boolean` | `true` | Enable the "Save screenshot" context-menu entry. |
| `sleepTimer` | `boolean` | `true` | Show the "Sleep timer" row in the settings menu. |

## Callbacks reference

| Callback | Payload | Fires when |
| --- | --- | --- |
| `onPlay` | — | Playback starts. |
| `onPause` | — | Playback pauses. |
| `onEnded` | — | Playback reaches the end. |
| `onReady` | — | The underlying media element is attached and ready. |
| `onProgress` | `{ playedSeconds, played, loadedSeconds, loaded }` | On every `timeupdate`. |
| `onDuration` | `seconds` | Duration becomes known/changes. |
| `onBuffer` / `onBufferEnd` | — | Playback starts/stops waiting for data. |
| `onError` | `{ type, message, fatal, ... }` | A fatal error occurs (see [Error handling](#error-handling--resilience)). |
| `onWarning` | `{ type, details, message }` | A non-fatal hls.js error (e.g. one retried fragment load) — kept distinct from `onError`. |
| `onQualityChange` | `{ index, auto, width, height, bitrate, videoCodec, audioCodec }` | The active HLS level changes. |
| `onAudioChange` | `{ id, label, lang, bitrate, channels, audioCodec }` | The active audio track changes. `label` is the resolved language name (via `Intl.DisplayNames`) or manifest-provided name; `bitrate`/`channels`/`audioCodec` are only populated when the manifest's `#EXT-X-MEDIA` entry provides them. |
| `onSubtitleChange` | `{ id, label, lang }` | The active subtitle track changes (`-1` = off, `label` is `'Off'` in that case). |
| `onPlaybackRateChange` | `rate` | Playback speed changes. |
| `onFullscreenChange` | `boolean` | Browser fullscreen state changes. |
| `onPiPChange` | `boolean` | Picture-in-Picture state changes. |
| `onVolumeChange` | `{ volume, muted }` | Volume or mute state changes. |
| `onSeek` | `seconds` | A seek completes. |
| `onFragChanged` | `{ sn, level, start, duration, programDateTime }` | On every hls.js fragment switch. |

## Ref (imperative) API

```js
playerRef.current.play()
playerRef.current.pause()
playerRef.current.seekTo(120)
playerRef.current.setVolume(0.5)
playerRef.current.toggleMute()
playerRef.current.enterFullscreen()
playerRef.current.exitFullscreen()
playerRef.current.toggleTheatreMode()
playerRef.current.getCurrentTime()
playerRef.current.getDuration()
playerRef.current.getQualities()
playerRef.current.getAudioTracks()
playerRef.current.getSubtitleTracks()
playerRef.current.getVideoElement()
playerRef.current.skipAd()
playerRef.current.goLive()               // jumps to the live edge (hls.js or native HLS)
playerRef.current.getStats()             // resolution/bitrate/codecs/bandwidth/buffer/dropped frames
playerRef.current.getBandwidthEstimate() // hls.js's current ABR bandwidth estimate, bits/sec

// hls.js-specific — no-ops on the ReactPlayer/native backend (progressive
// sources, or Safari's native HLS, where there is no hls.js instance):
playerRef.current.stopLoad()            // pause segment loading without destroying the instance
playerRef.current.startLoad()           // resume it
playerRef.current.swapAudioCodec()      // hls.js's swapAudioCodec()
playerRef.current.getHlsInstance()      // raw Hls instance — anything not wrapped above,
                                         // e.g. playerRef.current.getHlsInstance()?.trigger(...)
```

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `Space` / `K` | Play / Pause |
| `←` / `→` | Seek ±5s |
| `J` / `L` | Seek ±10s |
| `↑` / `↓` | Volume ± |
| `M` | Mute |
| `F` | Fullscreen |
| `P` | Picture-in-Picture |
| `C` | Toggle captions |
| `<` / `>` | Decrease / increase speed |
| `0`-`9` | Seek to 0%-90% |

Ignored while focus is inside an input, textarea, select, or button.

## Architecture & internals

### ReactPlayer + hls.js integration

The player is a **single source of truth** for playback, volume, seeking,
rate, and HLS-level/track state, driven by two backends chosen per source:

- **HLS on browsers without native HLS support** (Chrome, Firefox, Edge):
  a bare `<video>` element is rendered and `useHlsPlayer` owns the full
  `hls.js` lifecycle directly against our own bundled, pinned `hls.js`
  version — create → `loadSource` → `attachMedia` → read levels/tracks from
  `MANIFEST_PARSED` → monitor/recover errors → `destroy()` on unmount.
  This avoids react-player's default behavior of lazy-loading `hls.js` from
  a CDN at runtime, so quality/audio/subtitle control always targets the
  exact `hls.js` instance we configured, with no version drift and no
  runtime CDN dependency.
- **Progressive sources (MP4/WebM/Ogg) and Safari's native HLS**:
  `ReactPlayer` renders and manages the `<video>` element, giving us robust
  multi-format source handling for free.

Regardless of backend, once the underlying `<video>` DOM node is available
(via a direct ref for the `hls.js` path, or `reactPlayerRef.current.getInternalPlayer()`
for the ReactPlayer path) all playback control — play/pause, seek, volume,
mute, rate — is driven **imperatively on that one DOM node**, and all
player state is derived from **native media events** (`play`, `pause`,
`timeupdate`, `progress`, `volumechange`, `waiting`/`playing`, `ended`,
`error`, …). This means there is never a second, competing control system:
ReactPlayer's own controlled props are not used reactively for playback
state, so nothing fights the DOM for authority over what the video is
doing.

### Quality / audio / subtitle handling

`useHlsPlayer` (`src/hooks/useHlsPlayer.js`) listens for
`Hls.Events.MANIFEST_PARSED`, `AUDIO_TRACKS_UPDATED` and
`SUBTITLE_TRACKS_UPDATED` and mirrors `hls.levels`, `hls.audioTracks` and
`hls.subtitleTracks` into React state — nothing is hardcoded or invented.
If a manifest exposes only one quality level, or no alternate audio/subtitle
tracks, the UI reflects that honestly (`Auto` only, "Audio selection
unavailable", "Subtitles unavailable") rather than fabricating options.

- **Auto quality** sets `hls.currentLevel = -1` and displays the
  auto-resolved height (`Auto • 720p`) once hls.js has picked one.
- **Manual quality** sets `hls.currentLevel = <index>` directly — hls.js
  preserves playback position and play state across a level switch, so no
  manual seek/restart is needed.
- **Audio/subtitle tracks** are switched via `hls.audioTrack` /
  `hls.subtitleTrack`; subtitle rendering uses hls.js's native text-track
  injection, styled via the `subtitleStyle` prop through `::cue`.
- **Language names** are resolved from the manifest's raw BCP-47 language
  code (e.g. `es-419`) to a real display name (e.g. "Spanish (Latin
  America)") via the standard `Intl.DisplayNames` API — not a hardcoded
  language list, and never shown at all for a code the runtime can't
  resolve (falls back to the manifest's own `NAME` attribute, then the raw
  code, then `Track N`).
- **Audio bitrate/channel layout** — when a manifest's `#EXT-X-MEDIA` audio
  entry provides `BANDWIDTH`/`CHANNELS`, the Audio menu shows it (e.g.
  "English • 5.1 Surround • 384 Kbps"), the same way the Quality menu
  shows per-level bitrate. Never fabricated for a manifest that doesn't
  provide it.
- Selections are persisted to `localStorage` (quality by resolved height,
  subtitle by language) and re-applied the next time matching tracks are
  available for a manifest — never forced onto a manifest that doesn't
  offer them.

### Error handling & resilience

`useHlsPlayer` classifies fatal `hls.js` errors and applies a bounded
recovery strategy: network errors call `hls.startLoad()` (up to 4 retries),
media errors call `hls.recoverMediaError()` (up to 2 retries), with the
retry counters reset after a quiet window so a later, unrelated failure
isn't punished by an earlier one's retry budget. If recovery is exhausted,
or if the stream simply never becomes ready within a load-timeout window,
the player shows an "Unable to play this video" overlay with a manual
Retry button — it never retries silently forever, and it never gets stuck
on a loading spinner with no way out.

### hls.js feature coverage

hls.js has a very large API surface; rather than enumerate every internal as
a distinct prop, the player wires up the pieces that meaningfully change
player *behavior* and leaves two deliberate escape hatches for the rest:

- **`hlsConfig`** — passed straight into the `Hls` constructor, so any
  hls.js config option (buffer sizing, ABR tuning, CMCD, custom loaders,
  `xhrSetup`, …) not individually exposed as a prop is still reachable.
- **`playerRef.current.getHlsInstance()`** — returns the raw `Hls`
  instance once created, for anything not wrapped at all (`hls.trigger(...)`,
  reading `hls.media`, low-level event subscriptions, etc.).

What's wired into actual player behavior:

- **ABR / quality**: real levels from the manifest (never invented), manual
  + Auto selection, `maxQuality` capping, `capLevelOnFPSDrop`,
  `capLevelToPlayerSize` (always on), codec info surfaced per level and in
  the stats panel, live bandwidth estimate.
- **Live DVR**: for live streams, the seek bar uses the media element's
  actual `seekable` range (hls.js keeps this in sync with the live sliding
  window) instead of `duration` (which is `Infinity` for live and would
  otherwise make the bar non-functional) — so you can scrub backward into
  the DVR window, not just jump to the edge. The "LIVE" badge is solid red
  at the live edge and turns into an outlined "jump back to live" button
  once you've scrubbed behind it (`goLive()` on the ref, or the badge
  itself, jumps back using `hls.liveSyncPosition` when available).
- **Fragment-level detail**: `onFragChanged` fires on every fragment
  switch; current fragment number, codecs, and bandwidth estimate appear in
  the "Stats for nerds" panel.
- **Error taxonomy**: fatal hls.js errors go through `onError` and the
  bounded retry strategy above; non-fatal ones (a single retried segment,
  for example) go through a separate `onWarning` instead of being lumped in
  with real failures.
- **DRM (EME)**: `drmConfig` maps onto hls.js's `drmSystems` config for
  Widevine/PlayReady/FairPlay-protected streams.
- **Low-latency HLS**: `lowLatencyMode` toggles hls.js's LL-HLS handling.
- **Load control**: `stopLoad()`/`startLoad()` on the ref pause and resume
  segment loading without tearing down the `Hls` instance; `swapAudioCodec()`
  is exposed for the same reason hls.js exposes it (recovering from an
  audio codec mismatch mid-stream).

### Advanced playback tools

- **Thumbnail scrub preview** — pass `thumbnails` as a sprite-sheet
  descriptor and hovering the seek bar shows the matching tile above the
  time tooltip:

  ```jsx
  <VideoPlayer
    src={src}
    thumbnails={{
      url: '/storyboard.jpg',  // single sprite image
      interval: 10,             // seconds represented by each tile
      columns: 10,
      rows: 10,
      tileWidth: 160,
      tileHeight: 90,
      // count: 97,             // optional — defaults to columns * rows
    }}
  />
  ```

  The player never generates thumbnails itself — supply a sprite from your
  encoding pipeline (this is the same storyboard format YouTube/Netflix use).

- **A-B loop (segment repeat)** — right-click the player → "Set loop point
  A", then again at the point you want to loop back from → "Set loop point
  B". The segment between them is highlighted on the seek bar and repeats
  until "Clear loop" is chosen. Disable via `abLoop={false}`.
- **Screenshot / frame capture** — right-click → "Save screenshot" grabs
  the current frame to a PNG download. This uses `<canvas>.drawImage()` on
  the video element, so it's subject to the same-origin/CORS rules any
  canvas-based capture is: a cross-origin source without permissive CORS
  headers will fail silently with a toast rather than crash. Disable via
  `screenshot={false}`.
- **Sleep timer** — a "Sleep timer" row in the settings menu (Off / 10 /
  30 / 60 minutes / End of video) pauses playback when it elapses, with a
  toast confirmation. Disable via `sleepTimer={false}`.

### Ads (Google IMA SDK)

Set `adTagUrl` to a VAST tag to enable a single pre-roll linear ad via the
Google IMA SDK (`src/hooks/useImaAds.js`). The SDK loader script is loaded
from Google's official CDN (required by their terms) on first play; the
default demo tag in `src/data/adsConfig.js` is Google's own public sample
VAST tag, not real inventory. Any ad-loading or ad-playback failure is
swallowed and simply resumes content playback — a broken ad never blocks
the video itself.

## Theming & customization

Every visual token is a CSS custom property scoped to the player wrapper,
so theming never requires editing component source:

```css
--player-bg
--player-control-bg
--player-panel-bg
--player-text
--player-muted-text
--player-accent      /* set via the accentColor prop */
--player-accent-2
--player-progress
--player-buffer
--player-track-bg
--player-border
--player-radius
```

- `theme="dark" | "light" | "system"` switches the whole palette (see
  `VideoPlayer.css` for the light/dark value sets).
- `accentColor` sets `--player-accent` directly — any valid CSS color.
- Override any variable per-instance via the `style` prop (e.g.
  `style={{ '--player-radius': '0px' }}`) or scope a stylesheet to a custom
  `className`.
- `subtitleStyle` controls caption rendering specifically (`fontSize`,
  `color`, `background`, `textShadow`), independent of the chrome theme.
- The UI is set in [Poppins](https://fonts.google.com/specimen/Poppins),
  loaded via Google Fonts in `index.html`. Both the demo app and the player
  component list Poppins first in their font stack with a full system-font
  fallback chain, so the player still renders correctly if embedded in a
  host app that hasn't loaded Poppins — it just falls back to the system
  font.

## Accessibility

- Every control is a real `<button>` with an `aria-label` describing its
  action (e.g. "Play video", "Mute", "Fullscreen"), not a bare icon with no
  accessible name.
- The seek bar is `role="slider"` with `aria-valuemin`/`aria-valuemax`/
  `aria-valuenow`/`aria-valuetext` kept in sync with actual playback
  position (and the live DVR window, for live streams), and is fully
  keyboard-operable (arrow keys seek).
- Menus use `role="menu"`/`role="menuitemradio"` with `aria-checked`
  reflecting the current selection (quality, audio, subtitle, speed, sleep
  timer); toggle buttons use `aria-pressed`/`aria-expanded` as appropriate.
- Full keyboard shortcut coverage (see [above](#keyboard-shortcuts)); the
  player wrapper is focusable (`tabIndex={0}`) and shortcuts are ignored
  while focus is inside an input, textarea, select, or button, so the
  player never hijacks keystrokes meant for surrounding page UI.
- Focus states use `:focus-visible` rather than suppressing the outline.
- Captions are rendered through the browser's native text-track pipeline
  (not a custom overlay), so they interoperate with OS/browser-level
  accessibility settings.

One thing this component **can't** guarantee for you: color contrast for
an arbitrary `accentColor`. The shipped default (`#8b5cf6` on the dark/light
palettes in `VideoPlayer.css`) was chosen to read clearly against both, but
if you override it with a brand color, verify contrast against your actual
background with your organization's accessibility tooling.

## Browser compatibility

| Browser | HLS strategy |
| --- | --- |
| Chrome / Edge / Firefox | `hls.js` (feature-detected via `Hls.isSupported()`) |
| Safari (macOS/iOS) | Native HLS via `video.canPlayType('application/vnd.apple.mpegurl')` |
| Any browser, MP4/WebM/Ogg | Native `<video>` via ReactPlayer, no `hls.js` involved |

Picture-in-Picture and the context-menu "copy"/"screenshot" actions degrade
gracefully (button hidden / action unavailable with a toast) rather than
throwing when a browser doesn't support them.

## Performance & production deployment

- `npm run build` outputs a static `dist/` bundle — deploy it behind any
  static host/CDN (the app makes no server-side assumptions).
- `hls.js` and `react-player`'s per-provider chunks are the largest
  contributors to bundle size; `react-player`'s non-file providers
  (YouTube, Vimeo, Twitch, …) are already code-split and only fetched if
  used, but are unused by this player and can be removed by depending on
  `react-player/lazy` file-only build if you want to trim them further.
- Serve HLS manifests/segments with correct CORS headers if the player is
  embedded on a different origin than the stream host — this also matters
  for the screenshot feature, which needs a CORS-cleared response to avoid
  a tainted canvas.
- The Google IMA SDK script is fetched from `imasdk.googleapis.com` at
  runtime; if ads are enabled, make sure that host isn't blocked by any
  CSP/network policy in your deployment environment.
- All hooks proxy their callback props through a ref (`callbacksRef`)
  rather than depending on them directly, so passing new inline arrow
  functions as props on every parent render doesn't tear down and re-wire
  the underlying `hls.js` instance or native media listeners.

## Troubleshooting / FAQ

**Dev server shows a blank page / "Element type is invalid... but got:
object" in the console.**
This is almost always a stale Vite dependency pre-bundling cache after a
dependency change (switching branches, installing/removing a package).
Fix: `rm -rf node_modules/.vite && npm run dev`.

**The seek bar doesn't move on a live stream.**
Live streams report `duration = Infinity`, which the player deliberately
does *not* use for the seek bar — it derives the bar's range from the
media element's `seekable` window instead (see
[hls.js feature coverage](#hlsjs-feature-coverage)). If it's still not
moving, check that your live manifest actually exposes a sliding window
(`#EXT-X-PLAYLIST-TYPE` absent/`EVENT`, not `VOD`) and that segments are
being appended — `getStats()` on the ref will show `bufferLength` growing
if segments are arriving.

**Autoplay isn't starting.**
Browsers only allow autoplay that's muted or follows a user gesture —
this is a browser policy, not something the player can override. Pass
`autoplay muted` for a background/hero-style video, or rely on the
initial user tap/click to start playback.

**Ads never play.**
Check that `imasdk.googleapis.com` isn't blocked by an ad blocker, CSP, or
network policy, and that your VAST tag URL itself is reachable (open it
directly in a browser tab). Ads also only request on first play — a user
gesture is required by the IMA SDK itself.

**Screenshot capture fails or downloads a blank image.**
The video source needs CORS headers permissive enough to avoid a
"tainted canvas" (cross-origin content without `Access-Control-Allow-Origin`
poisons anything drawn from it via `<canvas>`). This is a browser security
restriction, not a bug — the feature fails with a toast rather than
throwing, by design.

**Quality/Audio/Subtitle menus show fewer options than expected.**
The menus only ever show what hls.js reports from the manifest. If a
menu shows "Auto" only, or "Audio selection unavailable", the manifest
genuinely doesn't expose additional levels/tracks — verify with the
manifest directly (or `playerRef.current.getHlsInstance().levels` in the
console) rather than assuming a UI bug.

**DRM playback fails immediately.**
`drmConfig` only wires the EME plumbing; the license server itself must be
reachable, correctly configured for the content, and — for Widevine on
Chrome — served over HTTPS. Check the browser console for the underlying
`MediaKeySystemAccess`/license-request error, which is more specific than
what the player can surface generically.

## Testing

This project is verified through **linting, production builds, and live
browser passes** (Playwright-driven, exercising real user interactions —
clicking through streams, opening menus, checking for console/page errors)
during development, rather than a checked-in automated test suite — there
is currently no Jest/Vitest/Testing-Library setup in this repository. If
you're extending this project for production use, adding component tests
(Vitest + React Testing Library) and a small Playwright E2E suite around
the demo app would be the natural next investment, particularly for the
HLS lifecycle (`useHlsPlayer`) and the seek bar's DVR-window math.

Before submitting a change, at minimum run:

```bash
npm run lint
npm run build
```

## Contributing

1. Fork/branch from the current state of the player.
2. Match the existing code style (no semicolons, single quotes, 2-space
   indent — see `.oxlintrc.json` for the enforced subset).
3. Keep components focused: presentational pieces (menus, controls) stay
   free of `hls.js`/`react-player` specifics, which live in the hooks.
4. Run `npm run lint` and `npm run build` before opening a PR — both must
   be clean.
5. For anything touching playback behavior, do a manual pass in a real
   browser (`npm run dev`) with a real stream — build/lint passing doesn't
   verify that video actually plays.
6. Update `README.md` and `CHANGELOG.md` for any user-facing prop,
   callback, or ref API change.

## License

No license has been chosen for this project yet. Until one is added, all
rights are reserved by default — add a `LICENSE` file (MIT, Apache-2.0, or
whichever fits) before treating this as open source or redistributing it.
