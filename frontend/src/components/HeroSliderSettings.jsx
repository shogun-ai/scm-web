import { useId } from 'react';
import {
  DEFAULT_HERO_SLIDER_INTERVAL,
  MIN_HERO_SLIDER_INTERVAL,
  MAX_HERO_SLIDER_INTERVAL,
  isValidHeroSliderInterval,
} from '../../../shared/heroSliderConfig.js';

export default function HeroSliderSettings({ value, onChange }) {
  const inputId = useId();
  const isDisabled = value === 0;
  const isValid = isValidHeroSliderInterval(value);

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div>
        <h5 className="text-sm font-bold text-[#003B5C]">Нүүрний слайд солигдох хугацаа</h5>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">Нүүр хуудасны бүх слайд, сэрэмжлүүлэг энэ хугацаагаар автоматаар солигдоно.</p>
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
        <input
          type="checkbox"
          checked={!isDisabled}
          onChange={event => onChange(event.target.checked ? DEFAULT_HERO_SLIDER_INTERVAL : 0)}
          className="h-4 w-4 accent-[#003B5C]"
        />
        Автоматаар солих
      </label>
      {!isDisabled && (
        <div className="space-y-2">
          <label htmlFor={inputId} className="block text-xs font-semibold text-slate-600">Хугацаа (секунд)</label>
          <input
            id={inputId}
            type="number"
            min={MIN_HERO_SLIDER_INTERVAL}
            max={MAX_HERO_SLIDER_INTERVAL}
            step="1"
            value={Number.isFinite(value) ? value : ''}
            onChange={event => onChange(event.target.value === '' ? '' : event.target.valueAsNumber)}
            aria-invalid={!isValid}
            aria-describedby={`${inputId}-hint`}
            className="w-32 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[#003B5C] focus:outline-none"
          />
          <div className="flex flex-wrap gap-2">
            {[5, 15, 30, 60].map(seconds => (
              <button
                key={seconds}
                type="button"
                onClick={() => onChange(seconds)}
                aria-pressed={value === seconds}
                className={`rounded-lg border px-3 py-2 text-xs font-bold transition ${value === seconds ? 'border-[#003B5C] bg-[#003B5C] text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-[#003B5C]'}`}
              >
                {seconds} сек
              </button>
            ))}
          </div>
          <p id={`${inputId}-hint`} className={`text-xs ${isValid ? 'text-slate-500' : 'text-red-600'}`}>
            {MIN_HERO_SLIDER_INTERVAL}–{MAX_HERO_SLIDER_INTERVAL} секундийн бүхэл тоо оруулна уу. Жишээ: 15.
          </p>
        </div>
      )}
      {isDisabled && <p className="text-xs text-slate-500">Автомат солилт унтарсан. Зочин баруун, зүүн сумыг дарж слайд солино.</p>}
    </div>
  );
}
