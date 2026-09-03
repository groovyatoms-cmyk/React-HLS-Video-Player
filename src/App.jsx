import { useCallback, useRef, useState } from 'react'
import VideoPlayer from './components/VideoPlayer/VideoPlayer'
import { DEMO_STREAM, DEMO_STREAMS } from './data/demoStreams'
import { DEMO_AD_TAG_URL } from './data/adsConfig'
import { formatBitrate, formatTime } from './components/VideoPlayer/playerUtils'
import './App.css'

const MAX_EVENTS = 30

function nowLabel() {
  return new Date().toLocaleTimeString([], { hour12: false })
}

export default function App() {
  const playerRef = useRef(null)
  const [streamUrl, setStreamUrl] = useState(DEMO_STREAM)
  const [pendingUrl, setPendingUrl] = useState(DEMO_STREAM)
  const [theme, setTheme] = useState('dark')
  const [debug, setDebug] = useState(false)
  const [adsEnabled, setAdsEnabled] = useState(false)
  const [accentColor, setAccentColor] = useState('#8b5cf6')

  const [currentQuality, setCurrentQuality] = useState('Auto')
  const [currentAudio, setCurrentAudio] = useState('—')
  const [currentSubtitle, setCurrentSubtitle] = useState('Off')
  const [playbackTime, setPlaybackTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [bufferedSeconds, setBufferedSeconds] = useState(0)
  const [events, setEvents] = useState([])

  const logEvent = useCallback((label) => {
    setEvents((prev) => [{ id: `${Date.now()}-${Math.random()}`, label, at: nowLabel() }, ...prev].slice(0, MAX_EVENTS))
  }, [])

  const handleSubmitUrl = (e) => {
    e.preventDefault()
    setStreamUrl(pendingUrl.trim())
    logEvent(`Loading stream: ${pendingUrl.trim()}`)
  }

  return (
    <div className="demo">
      <header className="demo__header">
        <h1>React HLS Player</h1>
        <p>A production-grade, reusable HLS video player built with Vite, React, ReactPlayer and hls.js.</p>
      </header>

      <main className="demo__player-col">
        <VideoPlayer
          ref={playerRef}
          src={streamUrl}
          poster=""
          theme={theme}
          accentColor={accentColor}
          debug={debug}
          adTagUrl={adsEnabled ? DEMO_AD_TAG_URL : undefined}
          onReady={() => logEvent('ready')}
          onPlay={() => logEvent('play')}
          onPause={() => logEvent('pause')}
          onEnded={() => logEvent('ended')}
          onBuffer={() => logEvent('buffer (waiting)')}
          onBufferEnd={() => logEvent('buffer end')}
          onError={(err) => logEvent(`error: ${err.message || err.type}`)}
          onSeek={(t) => logEvent(`seek → ${formatTime(t)}`)}
          onFullscreenChange={(fs) => logEvent(`fullscreen: ${fs}`)}
          onPiPChange={(pip) => logEvent(`picture-in-picture: ${pip}`)}
          onVolumeChange={({ volume, muted }) => logEvent(`volume: ${Math.round(volume * 100)}% ${muted ? '(muted)' : ''}`)}
          onPlaybackRateChange={(rate) => logEvent(`speed: ${rate}x`)}
          onProgress={({ playedSeconds, loadedSeconds }) => {
            setPlaybackTime(playedSeconds)
            setBufferedSeconds(loadedSeconds)
          }}
          onDuration={(d) => setDuration(d)}
          onQualityChange={(info) => {
            setCurrentQuality(info.auto ? `Auto (${info.height}p)` : `${info.height}p`)
            logEvent(`quality → ${info.auto ? 'Auto' : `${info.height}p`}${formatBitrate(info.bitrate) ? ` (${formatBitrate(info.bitrate)})` : ''}`)
          }}
          onAudioChange={(info) => {
            setCurrentAudio(`Track ${info.id + 1}`)
            logEvent(`audio track → ${info.id}`)
          }}
          onSubtitleChange={(info) => {
            setCurrentSubtitle(info.id === -1 ? 'Off' : `Track ${info.id + 1}`)
            logEvent(`subtitles → ${info.id === -1 ? 'off' : info.id}`)
          }}
        />

        <section className="demo__stream-info">
          <div>
            <span className="demo__label">Current Stream</span>
            <span className="demo__value demo__value--url" title={streamUrl}>{streamUrl}</span>
          </div>
          <div>
            <span className="demo__label">Current Quality</span>
            <span className="demo__value">{currentQuality}</span>
          </div>
          <div>
            <span className="demo__label">Current Audio</span>
            <span className="demo__value">{currentAudio}</span>
          </div>
          <div>
            <span className="demo__label">Current Subtitle</span>
            <span className="demo__value">{currentSubtitle}</span>
          </div>
          <div>
            <span className="demo__label">Playback Time</span>
            <span className="demo__value">{formatTime(playbackTime)} / {formatTime(duration)}</span>
          </div>
          <div>
            <span className="demo__label">Buffer</span>
            <span className="demo__value">{formatTime(bufferedSeconds)}</span>
          </div>
        </section>
      </main>

      <aside className="demo__panel">
        <h2>Demo Controls</h2>

        <form className="demo__field" onSubmit={handleSubmitUrl}>
          <label htmlFor="stream-url">Stream URL</label>
          <input
            id="stream-url"
            type="text"
            value={pendingUrl}
            onChange={(e) => setPendingUrl(e.target.value)}
            placeholder="https://example.com/stream/master.m3u8"
          />
          <button type="submit">Load</button>
        </form>

        <div className="demo__field">
          <span className="demo__field-label">Sample streams</span>
          <div className="demo__chip-row">
            {DEMO_STREAMS.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`demo__chip${streamUrl === s.url ? ' demo__chip--active' : ''}`}
                onClick={() => {
                  setPendingUrl(s.url)
                  setStreamUrl(s.url)
                  logEvent(`Loading stream: ${s.label}`)
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="demo__field demo__field--row">
          <span className="demo__field-label">Theme</span>
          <div className="demo__toggle-group">
            {['dark', 'light', 'system'].map((t) => (
              <button
                key={t}
                type="button"
                className={`demo__toggle${theme === t ? ' demo__toggle--active' : ''}`}
                onClick={() => setTheme(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="demo__field demo__field--row">
          <span className="demo__field-label">Accent colour</span>
          <input
            type="color"
            value={accentColor}
            onChange={(e) => setAccentColor(e.target.value)}
            className="demo__color-input"
          />
        </div>

        <div className="demo__field demo__field--row">
          <span className="demo__field-label">Debug</span>
          <div className="demo__toggle-group">
            <button type="button" className={`demo__toggle${!debug ? ' demo__toggle--active' : ''}`} onClick={() => setDebug(false)}>
              Off
            </button>
            <button type="button" className={`demo__toggle${debug ? ' demo__toggle--active' : ''}`} onClick={() => setDebug(true)}>
              On
            </button>
          </div>
        </div>

        <div className="demo__field demo__field--row">
          <span className="demo__field-label">Ads (IMA sample tag)</span>
          <div className="demo__toggle-group">
            <button type="button" className={`demo__toggle${!adsEnabled ? ' demo__toggle--active' : ''}`} onClick={() => setAdsEnabled(false)}>
              Off
            </button>
            <button type="button" className={`demo__toggle${adsEnabled ? ' demo__toggle--active' : ''}`} onClick={() => setAdsEnabled(true)}>
              On
            </button>
          </div>
        </div>

        <div className="demo__field">
          <span className="demo__field-label">Player Events</span>
          <ul className="demo__events">
            {events.length === 0 && <li className="demo__events-empty">No events yet — interact with the player.</li>}
            {events.map((evt) => (
              <li key={evt.id}>
                <span className="demo__events-time">{evt.at}</span> {evt.label}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  )
}
