import { Check, ChevronLeft } from 'lucide-react'
import { formatBitrate, formatChannels } from './playerUtils'

/** Audio languages/bitrates come from `hls.audioTracks` — never hardcoded. */
export default function AudioMenu({ tracks, currentTrack, onSelect, onBack }) {
  return (
    <div className="pv-submenu" role="menu" aria-label="Audio">
      <button type="button" className="pv-submenu__header" onClick={onBack}>
        <ChevronLeft size={18} aria-hidden="true" />
        <span>Audio</span>
      </button>
      <div className="pv-submenu__list">
        {tracks.length === 0 ? (
          <p className="pv-submenu__empty">Audio selection unavailable</p>
        ) : (
          tracks.map((track) => {
            const hint = [formatChannels(track.channels), formatBitrate(track.bitrate)]
              .filter(Boolean)
              .join(' • ')
            return (
              <button
                key={track.id}
                type="button"
                className="pv-submenu__item"
                role="menuitemradio"
                aria-checked={currentTrack === track.id}
                onClick={() => onSelect(track.id)}
              >
                <span>
                  {track.label}
                  {hint && <span className="pv-submenu__hint"> &bull; {hint}</span>}
                </span>
                {currentTrack === track.id && <Check size={16} aria-hidden="true" />}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
