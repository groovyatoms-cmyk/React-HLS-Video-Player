import { Check, ChevronLeft } from 'lucide-react'
import { formatBitrate } from './playerUtils'

/**
 * Quality levels come straight from `hls.levels` (via useHlsPlayer) — never
 * invented. When only one level (or none) is available, Auto is still the
 * sole option, which is the correct behavior rather than an error state.
 */
export default function QualityMenu({ levels, currentLevel, autoResolvedHeight, onSelect, onBack }) {
  return (
    <div className="pv-submenu" role="menu" aria-label="Quality">
      <button type="button" className="pv-submenu__header" onClick={onBack}>
        <ChevronLeft size={18} aria-hidden="true" />
        <span>Quality</span>
      </button>
      <div className="pv-submenu__list">
        <button
          type="button"
          className="pv-submenu__item"
          role="menuitemradio"
          aria-checked={currentLevel === -1}
          onClick={() => onSelect(-1)}
        >
          <span>
            Auto
            {currentLevel === -1 && autoResolvedHeight ? (
              <span className="pv-submenu__hint"> &bull; {autoResolvedHeight}p</span>
            ) : null}
          </span>
          {currentLevel === -1 && <Check size={16} aria-hidden="true" />}
        </button>
        {levels.map((level) => (
          <button
            key={level.index}
            type="button"
            className="pv-submenu__item"
            role="menuitemradio"
            aria-checked={currentLevel === level.index}
            onClick={() => onSelect(level.index)}
          >
            <span>
              {level.label}
              {formatBitrate(level.bitrate) ? (
                <span className="pv-submenu__hint"> &bull; {formatBitrate(level.bitrate)}</span>
              ) : null}
            </span>
            {currentLevel === level.index && <Check size={16} aria-hidden="true" />}
          </button>
        ))}
      </div>
    </div>
  )
}
