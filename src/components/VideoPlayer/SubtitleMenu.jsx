import { Check, ChevronLeft } from 'lucide-react'

/** Subtitle languages come from `hls.subtitleTracks` — never hardcoded. */
export default function SubtitleMenu({ tracks, currentTrack, onSelect, onBack }) {
  return (
    <div className="pv-submenu" role="menu" aria-label="Subtitles">
      <button type="button" className="pv-submenu__header" onClick={onBack}>
        <ChevronLeft size={18} aria-hidden="true" />
        <span>Subtitles</span>
      </button>
      <div className="pv-submenu__list">
        {tracks.length === 0 ? (
          <p className="pv-submenu__empty">Subtitles unavailable</p>
        ) : (
          <>
            <button
              type="button"
              className="pv-submenu__item"
              role="menuitemradio"
              aria-checked={currentTrack === -1}
              onClick={() => onSelect(-1)}
            >
              <span>Off</span>
              {currentTrack === -1 && <Check size={16} aria-hidden="true" />}
            </button>
            {tracks.map((track) => (
              <button
                key={track.id}
                type="button"
                className="pv-submenu__item"
                role="menuitemradio"
                aria-checked={currentTrack === track.id}
                onClick={() => onSelect(track.id)}
              >
                <span>{track.label}</span>
                {currentTrack === track.id && <Check size={16} aria-hidden="true" />}
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
