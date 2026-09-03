# React HLS Video Player

A production-grade, reusable HLS video player component built with **Vite +
React (JSX)**, [`react-player`](https://github.com/cookpete/react-player) and
[`hls.js`](https://github.com/video-dev/hls.js), styled to feel like a
premium OTT/streaming player. See [`CHANGELOG.md`](./CHANGELOG.md) for
release history.

## Features

- Plays HLS (`.m3u8`), MP4, WebM and any HTML5-compatible source; auto-detects
  the source type and picks the right playback backend.
- Manual + Auto quality selection, dynamic audio-track and subtitle-track
  selection — all read live from the HLS manifest, never invented.
- Full custom control bar: seek bar with buffered progress + hover preview,
  volume with persisted mute, live badge + "Go Live", captions, playback
  speed, fullscreen, Picture-in-Picture, theatre mode, share, settings menu.
- Keyboard shortcuts, double-click/tap seek zones, auto-hiding controls.
- Loading / buffering / error states with a bounded retry strategy and a
  load-timeout safeguard.
- Light / dark / system themes, configurable accent color, 16:9 / 4:3 / 21:9
  / custom aspect ratios — all via CSS custom properties.
- Persisted preferences (volume, mute, speed, quality, subtitle language,
  theatre mode) via `localStorage`.
- Full imperative ref API and callback API.
- Google IMA SDK pre-roll ad support, intro/credits skip markers, chapter
  markers, "continue watching" resume, and a Netflix-style "Up Next" card.
- "Stats for nerds" diagnostics panel and a right-click context menu.

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
│       └── playerUtils.js       # time/storage/detection helpers
├── hooks/
│   ├── useHlsPlayer.js          # hls.js lifecycle & state
│   └── useImaAds.js             # Google IMA SDK integration
├── data/
│   ├── demoStreams.js           # DEMO_STREAM + sample streams
│   └── adsConfig.js             # IMA SDK URL + demo VAST tag
├── App.jsx                      # demo application
├── main.jsx
└── index.css
```

## Getting started

```bash
npm install
npm run dev       # start the dev server
npm run build     # production build (outputs to dist/)
npm run preview   # preview the production build locally
npm run lint       # oxlint
```

## Basic usage

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
      accentColor="#e63946"
      autoplay={false}
      muted={false}
      loop={false}
      qualitySelector
      audioSelector
      subtitleSelector
      playbackSpeed
      fullscreen
      pictureInPicture
      theatreMode
      keyboardShortcuts
      debug={false}
      onQualityChange={(q) => console.log('quality', q)}
      onError={(err) => console.error(err)}
    />
  )
}
```

Or with a custom stream: `<VideoPlayer src="https://example.com/stream/master.m3u8" />`.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `src` | `string` | — | Video URL. `.m3u8` → HLS, `.mp4`/`.webm`/`.ogg` → progressive, anything else → native `<video>`. |
| `poster` | `string` | — | Poster image shown before playback starts. |
| `autoplay` | `boolean` | `false` | Attempts autoplay; browser autoplay restrictions are respected (never assumed to succeed). |
| `muted` | `boolean` | `false` | Initial muted state (overridden by a persisted user preference if one exists). |
| `loop` | `boolean` | `false` | Loop playback. |
| `theme` | `'dark' \| 'light' \| 'system'` | `'dark'` | Color theme. `'system'` follows `prefers-color-scheme`. |
| `accentColor` | `string` (CSS color) | `'#8b5cf6'` (royal violet) | Drives `--player-accent` (progress bar, active states). |
| `aspectRatio` | `'16:9' \| '4:3' \| '21:9' \| number \| string` | `'16:9'` | Frame aspect ratio. Ignored in fullscreen/theatre mode. |
| `controls` | `boolean` | `true` | Render the custom control chrome. |
| `qualitySelector` | `boolean` | `true` | Show the Quality submenu (HLS only). |
| `audioSelector` | `boolean` | `true` | Show the Audio submenu (HLS only). |
| `subtitleSelector` | `boolean` | `true` | Show the Subtitles submenu/caption toggle (HLS only). |
| `playbackSpeed` | `boolean` | `true` | Show the Playback speed submenu. |
| `fullscreen` | `boolean` | `true` | Show the fullscreen button / enable the `F` shortcut. |
| `pictureInPicture` | `boolean` | `true` | Show the PiP button when the browser supports it. |
| `theatreMode` | `boolean` | `true` | Show the theatre-mode toggle. |
| `keyboardShortcuts` | `boolean` | `true` | Enable keyboard shortcuts (see below). |
| `share` | `boolean` | `true` | Show the share button (`navigator.share` with clipboard fallback). |
| `debug` | `boolean` | `false` | Permanently show the "Stats for nerds" diagnostics panel. |
| `doubleClickToSeek` | `boolean` | `true` | Enable left/right double-click seek zones (center = fullscreen). |
| `doubleClickSeekSeconds` | `number` | `10` | Seconds skipped by a double-click. |
| `subtitleStyle` | `{ fontSize, color, background, textShadow }` | — | Maps to `::cue` styling. |
| `introRange` / `creditsRange` | `{ start: number, end: number }` | — | Shows a "Skip Intro"/"Skip Credits" button ~3s after entering the range; click jumps to `end`. |
| `chapters` | `{ time: number, title: string }[]` | — | Tick marks on the seek bar + chapter title in the tooltip/time row. |
| `upNext` | `{ title: string, thumbnail?: string }` | — | Shows a Netflix-style autoplay card in the last `autoplayNextDelay` seconds. |
| `autoplayNextDelay` | `number` | `8` | Seconds-from-end at which the "Up Next" card appears. |
| `onNextEpisode` | `() => void` | — | Called when "Up Next" fires (countdown reaches 0 or "Play now" is clicked). |
| `rememberPosition` | `boolean` | `true` | Persist and silently resume the last playback position per `src`. |
| `adTagUrl` | `string` | — | VAST ad tag URL; enables a Google IMA SDK pre-roll ad. |
| `className` / `style` | — | — | Passed through to the player wrapper. |

## Callbacks

`onPlay`, `onPause`, `onEnded`, `onReady`, `onProgress({ playedSeconds, played, loadedSeconds, loaded })`,
`onDuration(seconds)`, `onBuffer`, `onBufferEnd`, `onError({ type, message, ... })`,
`onQualityChange({ index, auto, width, height, bitrate })`, `onAudioChange({ id })`,
`onSubtitleChange({ id })`, `onPlaybackRateChange(rate)`, `onFullscreenChange(bool)`,
`onPiPChange(bool)`, `onVolumeChange({ volume, muted })`, `onSeek(seconds)`.

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
```

## Keyboard shortcuts

`Space`/`K` play-pause · `←`/`→` ±5s · `J`/`L` ±10s · `↑`/`↓` volume ·
`M` mute · `F` fullscreen · `P` PiP · `C` captions · `<`/`>` speed ·
`0`-`9` seek to 0%-90%. Ignored while focus is inside an input, textarea,
select, or button.

## ReactPlayer + hls.js integration

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

## Quality / audio / subtitle handling

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
- Selections are persisted to `localStorage` (quality by resolved height,
  subtitle by language) and re-applied the next time matching tracks are
  available for a manifest — never forced onto a manifest that doesn't
  offer them.

## Error handling & resilience

`useHlsPlayer` classifies fatal `hls.js` errors and applies a bounded
recovery strategy: network errors call `hls.startLoad()` (up to 4 retries),
media errors call `hls.recoverMediaError()` (up to 2 retries), with the
retry counters reset after a quiet window so a later, unrelated failure
isn't punished by an earlier one's retry budget. If recovery is exhausted,
or if the stream simply never becomes ready within a load-timeout window,
the player shows an "Unable to play this video" overlay with a manual
Retry button — it never retries silently forever, and it never gets stuck
on a loading spinner with no way out.

## Browser compatibility

| Browser | HLS strategy |
| --- | --- |
| Chrome / Edge / Firefox | `hls.js` (feature-detected via `Hls.isSupported()`) |
| Safari (macOS/iOS) | Native HLS via `video.canPlayType('application/vnd.apple.mpegurl')` |
| Any browser, MP4/WebM/Ogg | Native `<video>` via ReactPlayer, no `hls.js` involved |

Picture-in-Picture and the context-menu "copy" actions degrade gracefully
(button hidden / clipboard API unavailable) rather than throwing when a
browser doesn't support them.

## Ads (Google IMA SDK)

Set `adTagUrl` to a VAST tag to enable a single pre-roll linear ad via the
Google IMA SDK (`src/hooks/useImaAds.js`). The SDK loader script is loaded
from Google's official CDN (required by their terms) on first play; the
default demo tag in `src/data/adsConfig.js` is Google's own public sample
VAST tag, not real inventory. Any ad-loading or ad-playback failure is
swallowed and simply resumes content playback — a broken ad never blocks
the video itself.

## Typography

The UI is set in [Poppins](https://fonts.google.com/specimen/Poppins), loaded
via Google Fonts in `index.html`. Both the demo app and the player component
itself list Poppins first in their font stack with a full system-font
fallback chain, so the player still renders correctly if you embed it in a
host app that hasn't loaded Poppins — it just falls back to the system font.

## Production deployment notes

- `npm run build` outputs a static `dist/` bundle — deploy it behind any
  static host/CDN (the app makes no server-side assumptions).
- `hls.js` and `react-player`'s per-provider chunks are the largest
  contributors to bundle size; `react-player`'s non-file providers
  (YouTube, Vimeo, Twitch, …) are already code-split and only fetched if
  used, but are unused by this player and can be removed by depending on
  `react-player/lazy` file-only build if you want to trim them further.
- Serve HLS manifests/segments with correct CORS headers if the player is
  embedded on a different origin than the stream host.
- The Google IMA SDK script is fetched from `imasdk.googleapis.com` at
  runtime; if ads are enabled, make sure that host isn't blocked by any
  CSP/network policy in your deployment environment.
