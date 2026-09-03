import { Check, ChevronLeft } from 'lucide-react'
import { speedLabel } from './playerUtils'

export default function SpeedMenu({ options, current, onSelect, onBack }) {
  return (
    <div className="pv-submenu" role="menu" aria-label="Playback speed">
      <button type="button" className="pv-submenu__header" onClick={onBack}>
        <ChevronLeft size={18} aria-hidden="true" />
        <span>Playback speed</span>
      </button>
      <div className="pv-submenu__list">
        {options.map((rate) => (
          <button
            key={rate}
            type="button"
            className="pv-submenu__item"
            role="menuitemradio"
            aria-checked={current === rate}
            onClick={() => onSelect(rate)}
          >
            <span>{speedLabel(rate)}</span>
            {current === rate && <Check size={16} aria-hidden="true" />}
          </button>
        ))}
      </div>
    </div>
  )
}
