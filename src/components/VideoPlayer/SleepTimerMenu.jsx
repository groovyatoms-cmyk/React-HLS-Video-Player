import { Check, ChevronLeft } from 'lucide-react'
import { SLEEP_TIMER_OPTIONS } from './playerUtils'

export default function SleepTimerMenu ({ current, onSelect, onBack }) {
  return (
    <div className='pv-submenu' role='menu' aria-label='Sleep timer'>
      <button type='button' className='pv-submenu__header' onClick={onBack}>
        <ChevronLeft size={18} aria-hidden='true' />
        <span>Sleep timer</span>
      </button>
      <div className='pv-submenu__list'>
        {SLEEP_TIMER_OPTIONS.map(option => (
          <button
            key={option.label}
            type='button'
            className='pv-submenu__item'
            role='menuitemradio'
            aria-checked={current === option.minutes}
            onClick={() => onSelect(option.minutes)}
          >
            <span>{option.label}</span>
            {current === option.minutes && (
              <Check size={16} aria-hidden='true' />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
