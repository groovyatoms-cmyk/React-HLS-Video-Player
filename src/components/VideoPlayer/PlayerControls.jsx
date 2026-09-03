import { memo, useCallback, useEffect, useRef, useState } from 'react'
import {
  Play,
  Pause,
  Volume2,
  Volume1,
  VolumeX,
  RotateCcw,
  RotateCw,
  Settings,
  Maximize,
  Minimize,
  PictureInPicture2,
  RectangleHorizontal,
  Captions,
  AudioLines,
  Gauge,
  Share2,
  ChevronRight,
  Radio,
} from 'lucide-react'
import QualityMenu from './QualityMenu'
import AudioMenu from './AudioMenu'
import SubtitleMenu from './SubtitleMenu'
import SpeedMenu from './SpeedMenu'
import { formatTime, speedLabel, toPercent, clamp } from './playerUtils'

function chapterAt(chapters, time) {
  if (!chapters || chapters.length === 0) return null
  let active = null
  for (const chapter of chapters) {
    if (chapter.time <= time) active = chapter
    else break
  }
  return active
}

function SeekBar({ currentTime, duration, buffered, isLive, chapters, onSeek, onScrubStart, onScrubEnd }) {
  const trackRef = useRef(null)
  const [hover, setHover] = useState(null) // { x, time }
  const [dragging, setDragging] = useState(false)

  const ratioFromClientX = useCallback((clientX) => {
    const el = trackRef.current
    if (!el) return 0
    const rect = el.getBoundingClientRect()
    return clamp((clientX - rect.left) / rect.width, 0, 1)
  }, [])

  const handleMove = useCallback(
    (clientX) => {
      const ratio = ratioFromClientX(clientX)
      const el = trackRef.current
      if (!el || !Number.isFinite(duration)) return
      const rect = el.getBoundingClientRect()
      setHover({ x: clamp(clientX - rect.left, 0, rect.width), time: ratio * duration })
      if (dragging) onSeek(ratio * duration)
    },
    [duration, dragging, onSeek, ratioFromClientX],
  )

  const handlePointerDown = useCallback(
    (e) => {
      e.currentTarget.setPointerCapture?.(e.pointerId)
      setDragging(true)
      onScrubStart?.()
      handleMove(e.clientX)
    },
    [handleMove, onScrubStart],
  )

  const handlePointerUp = useCallback(
    (e) => {
      if (dragging) {
        const ratio = ratioFromClientX(e.clientX)
        onSeek(ratio * duration)
      }
      setDragging(false)
      onScrubEnd?.()
    },
    [dragging, duration, onSeek, onScrubEnd, ratioFromClientX],
  )

  const playedPct = toPercent(currentTime, duration)
  const bufferedPct = toPercent(buffered, duration)

  return (
    <div className="pv-seek">
      <div
        ref={trackRef}
        className={`pv-seek__track${dragging ? ' pv-seek__track--dragging' : ''}`}
        role="slider"
        tabIndex={0}
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={Number.isFinite(duration) ? duration : 0}
        aria-valuenow={Number.isFinite(currentTime) ? currentTime : 0}
        aria-valuetext={isLive ? 'Live' : formatTime(currentTime)}
        onPointerDown={handlePointerDown}
        onPointerMove={(e) => handleMove(e.clientX)}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => !dragging && setHover(null)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') onSeek(clamp(currentTime + 5, 0, duration))
          else if (e.key === 'ArrowLeft') onSeek(clamp(currentTime - 5, 0, duration))
          else return
          e.preventDefault()
        }}
      >
        <div className="pv-seek__bg" />
        <div className="pv-seek__buffered" style={{ width: `${bufferedPct}%` }} />
        <div className="pv-seek__played" style={{ width: `${playedPct}%` }} />
        {chapters && chapters.length > 1 && duration > 0 && chapters.map((chapter) => (
          <div
            key={chapter.time}
            className="pv-seek__chapter-mark"
            style={{ left: `${toPercent(chapter.time, duration)}%` }}
          />
        ))}
        <div className="pv-seek__thumb" style={{ left: `${playedPct}%` }} />
        {hover && (
          <div className="pv-seek__tooltip" style={{ left: hover.x }}>
            {chapterAt(chapters, hover.time)?.title && (
              <span className="pv-seek__tooltip-chapter">{chapterAt(chapters, hover.time).title}</span>
            )}
            {formatTime(hover.time)}
          </div>
        )}
      </div>
    </div>
  )
}

const SETTINGS_ROOT = 'root'

function SettingsPanel({
  activeView,
  setActiveView,
  quality,
  audio,
  subtitles,
  speed,
  showQuality,
  showAudio,
  showSubtitles,
  showSpeed,
}) {
  if (activeView === 'quality') {
    return (
      <QualityMenu
        levels={quality.levels}
        currentLevel={quality.currentLevel}
        autoResolvedHeight={quality.autoResolvedHeight}
        onSelect={(index) => {
          quality.onSelect(index)
          setActiveView(SETTINGS_ROOT)
        }}
        onBack={() => setActiveView(SETTINGS_ROOT)}
      />
    )
  }
  if (activeView === 'audio') {
    return (
      <AudioMenu
        tracks={audio.tracks}
        currentTrack={audio.currentTrack}
        onSelect={(id) => {
          audio.onSelect(id)
          setActiveView(SETTINGS_ROOT)
        }}
        onBack={() => setActiveView(SETTINGS_ROOT)}
      />
    )
  }
  if (activeView === 'subtitles') {
    return (
      <SubtitleMenu
        tracks={subtitles.tracks}
        currentTrack={subtitles.currentTrack}
        onSelect={(id) => {
          subtitles.onSelect(id)
          setActiveView(SETTINGS_ROOT)
        }}
        onBack={() => setActiveView(SETTINGS_ROOT)}
      />
    )
  }
  if (activeView === 'speed') {
    return (
      <SpeedMenu
        options={speed.options}
        current={speed.current}
        onSelect={(rate) => {
          speed.onSelect(rate)
          setActiveView(SETTINGS_ROOT)
        }}
        onBack={() => setActiveView(SETTINGS_ROOT)}
      />
    )
  }

  const qualityValue = quality.currentLevel === -1
    ? `Auto${quality.autoResolvedHeight ? ` (${quality.autoResolvedHeight}p)` : ''}`
    : quality.levels.find((l) => l.index === quality.currentLevel)?.label || 'Auto'
  const audioValue = audio.tracks.find((t) => t.id === audio.currentTrack)?.label || '—'
  const subtitleValue = subtitles.currentTrack === -1
    ? 'Off'
    : subtitles.tracks.find((t) => t.id === subtitles.currentTrack)?.label || 'Off'

  return (
    <div className="pv-submenu" role="menu" aria-label="Settings">
      <div className="pv-submenu__list">
        {showQuality && (
          <button type="button" className="pv-submenu__row" onClick={() => setActiveView('quality')}>
            <span>Quality</span>
            <span className="pv-submenu__row-value">
              {qualityValue}
              <ChevronRight size={16} aria-hidden="true" />
            </span>
          </button>
        )}
        {showSpeed && (
          <button type="button" className="pv-submenu__row" onClick={() => setActiveView('speed')}>
            <span>Playback speed</span>
            <span className="pv-submenu__row-value">
              {speedLabel(speed.current)}
              <ChevronRight size={16} aria-hidden="true" />
            </span>
          </button>
        )}
        {showAudio && (
          <button type="button" className="pv-submenu__row" onClick={() => setActiveView('audio')}>
            <span>Audio</span>
            <span className="pv-submenu__row-value">
              {audioValue}
              <ChevronRight size={16} aria-hidden="true" />
            </span>
          </button>
        )}
        {showSubtitles && (
          <button type="button" className="pv-submenu__row" onClick={() => setActiveView('subtitles')}>
            <span>Subtitles</span>
            <span className="pv-submenu__row-value">
              {subtitleValue}
              <ChevronRight size={16} aria-hidden="true" />
            </span>
          </button>
        )}
      </div>
    </div>
  )
}

function PlayerControls({
  visible,
  state,
  flags,
  actions,
  isMobile,
}) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [activeView, setActiveView] = useState(SETTINGS_ROOT)
  const settingsRef = useRef(null)

  const closeSettings = useCallback(() => {
    setSettingsOpen(false)
    setActiveView(SETTINGS_ROOT)
  }, [])

  useEffect(() => {
    if (!settingsOpen) return undefined
    const handlePointer = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) closeSettings()
    }
    const handleKey = (e) => {
      if (e.key === 'Escape') closeSettings()
    }
    document.addEventListener('pointerdown', handlePointer)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('pointerdown', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [settingsOpen, closeSettings])

  const toggleSettings = useCallback(() => {
    setSettingsOpen((open) => {
      if (open) setActiveView(SETTINGS_ROOT)
      return !open
    })
  }, [])

  const VolumeIcon = state.muted || state.volume === 0 ? VolumeX : state.volume < 0.5 ? Volume1 : Volume2

  const anySubmenuEnabled = flags.qualitySelector || flags.audioSelector || flags.subtitleSelector || flags.playbackSpeed

  const showCaptionsToggle = flags.subtitleSelector && state.subtitleTracks.length > 0
  const currentChapter = chapterAt(state.chapters, state.currentTime)

  const durationLabel = state.isLive ? null : formatTime(state.duration, state.duration >= 3600)
  const timeLabel = state.isLive ? null : formatTime(state.currentTime, state.duration >= 3600)

  return (
    <div className={`pv-controls${visible ? ' pv-controls--visible' : ''}`}>
      <SeekBar
        currentTime={state.currentTime}
        duration={state.duration}
        buffered={state.buffered}
        isLive={state.isLive}
        chapters={state.chapters}
        onSeek={actions.seekTo}
        onScrubStart={actions.onScrubStart}
        onScrubEnd={actions.onScrubEnd}
      />

      <div className="pv-controls__row">
        <div className="pv-controls__group">
          <button
            type="button"
            className="pv-btn pv-btn--primary"
            onClick={actions.togglePlay}
            aria-label={state.playing ? 'Pause video' : 'Play video'}
          >
            {state.playing ? <Pause size={22} aria-hidden="true" /> : <Play size={22} aria-hidden="true" />}
          </button>

          {!isMobile && (
            <>
              <button type="button" className="pv-btn" onClick={() => actions.seekBy(-10)} aria-label="Rewind 10 seconds">
                <RotateCcw size={20} aria-hidden="true" />
              </button>
              <button type="button" className="pv-btn" onClick={() => actions.seekBy(10)} aria-label="Forward 10 seconds">
                <RotateCw size={20} aria-hidden="true" />
              </button>
            </>
          )}

          {!isMobile && (
            <div className="pv-volume">
              <button
                type="button"
                className="pv-btn"
                onClick={actions.toggleMute}
                aria-label={state.muted ? 'Unmute' : 'Mute'}
              >
                <VolumeIcon size={20} aria-hidden="true" />
              </button>
              <input
                type="range"
                className="pv-volume__slider"
                min={0}
                max={1}
                step={0.01}
                value={state.muted ? 0 : state.volume}
                onChange={(e) => actions.setVolume(Number(e.target.value))}
                aria-label="Volume"
              />
            </div>
          )}

          <div className="pv-time" aria-live="off">
            {state.isLive ? (
              <button type="button" className="pv-live" onClick={actions.goLive} aria-label="Jump to live edge">
                <Radio size={14} aria-hidden="true" />
                LIVE
              </button>
            ) : (
              <span>
                {timeLabel} <span className="pv-time__sep">/</span> {durationLabel}
              </span>
            )}
          </div>

          {currentChapter && !isMobile && <span className="pv-chapter-label">{currentChapter.title}</span>}
        </div>

        <div className="pv-controls__group">
          {showCaptionsToggle && (
            <button
              type="button"
              className={`pv-btn${state.subtitleTrack !== -1 ? ' pv-btn--active' : ''}`}
              onClick={actions.toggleCaptions}
              aria-label="Toggle captions"
              aria-pressed={state.subtitleTrack !== -1}
            >
              <Captions size={20} aria-hidden="true" />
            </button>
          )}

          {flags.audioSelector && state.audioTracks.length > 1 && (
            <button
              type="button"
              className="pv-btn"
              onClick={() => {
                setSettingsOpen(true)
                setActiveView('audio')
              }}
              aria-label="Audio track"
            >
              <AudioLines size={20} aria-hidden="true" />
            </button>
          )}

          {flags.playbackSpeed && (
            <button
              type="button"
              className="pv-btn pv-btn--desktop-only"
              onClick={() => {
                setSettingsOpen(true)
                setActiveView('speed')
              }}
              aria-label="Playback speed"
            >
              <Gauge size={20} aria-hidden="true" />
            </button>
          )}

          {flags.share && (
            <button type="button" className="pv-btn pv-btn--desktop-only" onClick={actions.onShare} aria-label="Share">
              <Share2 size={20} aria-hidden="true" />
            </button>
          )}

          {anySubmenuEnabled && (
            <div className="pv-settings" ref={settingsRef}>
              <button
                type="button"
                className={`pv-btn${settingsOpen ? ' pv-btn--active' : ''}`}
                onClick={toggleSettings}
                aria-label="Settings"
                aria-expanded={settingsOpen}
              >
                <Settings size={20} aria-hidden="true" />
              </button>
              {settingsOpen && (
                <div className="pv-settings__panel" role="dialog" aria-label="Player settings">
                  <SettingsPanel
                    activeView={activeView}
                    setActiveView={setActiveView}
                    showQuality={flags.qualitySelector}
                    showAudio={flags.audioSelector}
                    showSubtitles={flags.subtitleSelector}
                    showSpeed={flags.playbackSpeed}
                    quality={{
                      levels: state.levels,
                      currentLevel: state.selectedQuality,
                      autoResolvedHeight: state.autoResolvedHeight,
                      onSelect: actions.setQuality,
                    }}
                    audio={{
                      tracks: state.audioTracks,
                      currentTrack: state.selectedAudio,
                      onSelect: actions.setAudioTrack,
                    }}
                    subtitles={{
                      tracks: state.subtitleTracks,
                      currentTrack: state.subtitleTrack,
                      onSelect: actions.setSubtitleTrack,
                    }}
                    speed={{
                      options: state.speedOptions,
                      current: state.playbackRate,
                      onSelect: actions.setPlaybackRate,
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {flags.theatreMode && !isMobile && (
            <button
              type="button"
              className={`pv-btn${state.theatreMode ? ' pv-btn--active' : ''}`}
              onClick={actions.toggleTheatre}
              aria-label={state.theatreMode ? 'Exit theatre mode' : 'Theatre mode'}
              aria-pressed={state.theatreMode}
            >
              <RectangleHorizontal size={20} aria-hidden="true" />
            </button>
          )}

          {flags.pictureInPicture && state.pipSupported && (
            <button
              type="button"
              className={`pv-btn${state.pip ? ' pv-btn--active' : ''}`}
              onClick={actions.togglePiP}
              aria-label={state.pip ? 'Exit picture-in-picture' : 'Picture-in-picture'}
              aria-pressed={state.pip}
            >
              <PictureInPicture2 size={20} aria-hidden="true" />
            </button>
          )}

          {flags.fullscreen && (
            <button
              type="button"
              className="pv-btn"
              onClick={actions.toggleFullscreen}
              aria-label={state.fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              aria-pressed={state.fullscreen}
            >
              {state.fullscreen ? <Minimize size={20} aria-hidden="true" /> : <Maximize size={20} aria-hidden="true" />}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default memo(PlayerControls)
