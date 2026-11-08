import { ArrowRight, RotateCcw } from 'lucide-react'
import { emptyContext, type MonitoringContext } from '../types'

interface Props {
  value: MonitoringContext
  onChange: (value: MonitoringContext) => void
  onApply: () => void
}

export default function MonitoringPanel({ value, onChange, onApply }: Props) {
  const update = (key: keyof MonitoringContext, next: string) => onChange({ ...value, [key]: next })
  const filled = Object.values(value).filter(item => item.trim()).length

  return (
    <section className="monitoring-page" aria-labelledby="monitoring-title">
      <div className="section-heading">
        <p className="section-label">Карточка наблюдения</p>
        <h1 id="monitoring-title">Данные мониторинга</h1>
        <p>Заполните известные параметры. Они станут контекстом диалога, но не будут отправлены модели до вашего вопроса.</p>
      </div>
      <form className="monitoring-form" onSubmit={event => { event.preventDefault(); onApply() }}>
        <div className="form-grid">
          <label>Культура
            <input value={value.crop} onChange={e => update('crop', e.target.value)} placeholder="Например, яблоня" />
          </label>
          <label>Фаза развития
            <select value={value.stage} onChange={e => update('stage', e.target.value)}>
              <option>Вегетация</option>
              <option>Цветение</option>
              <option>Формирование завязей</option>
              <option>Плодоношение</option>
              <option>Созревание</option>
              <option>Уборка</option>
            </select>
          </label>
          <label>Площадь, га
            <input type="number" min="0" step="0.01" value={value.area} onChange={e => update('area', e.target.value)} placeholder="0,00" />
          </label>
          <label>Температура, °C
            <input type="number" step="0.1" value={value.temperature} onChange={e => update('temperature', e.target.value)} placeholder="—" />
          </label>
          <label>Цветков на растении
            <input type="number" min="0" step="1" value={value.flowers} onChange={e => update('flowers', e.target.value)} placeholder="Результат YOLO или подсчёта" />
          </label>
          <label>Плодов на растении
            <input type="number" min="0" step="1" value={value.fruits} onChange={e => update('fruits', e.target.value)} placeholder="Результат YOLO или подсчёта" />
          </label>
          <label>Влажность, %
            <input type="number" min="0" max="100" step="0.1" value={value.humidity} onChange={e => update('humidity', e.target.value)} placeholder="—" />
          </label>
        </div>
        <label className="notes-field">Дополнительные наблюдения
          <textarea rows={5} value={value.notes} onChange={e => update('notes', e.target.value)} placeholder="Видимые признаки, дата съёмки, осадки, результаты анализа изображений…" />
        </label>
        <div className="form-actions">
          <span>{filled} из 8 полей заполнено</span>
          <button className="secondary-button" type="button" onClick={() => onChange({ ...emptyContext })}><RotateCcw size={16} /> Очистить</button>
          <button className="primary-button" type="submit">Использовать в диалоге <ArrowRight size={17} /></button>
        </div>
      </form>
    </section>
  )
}
