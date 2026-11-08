import { BrainCircuit, Database, Eye, LineChart, ScanLine, ShieldCheck } from 'lucide-react'

const modules = [
  {
    icon: ScanLine,
    title: 'Компьютерное зрение YOLO',
    status: 'Внешний модуль',
    text: 'Детекция, классификация и подсчёт цветков, завязей и плодов. Результаты детекции можно передать агенту в поле «Данные мониторинга».',
  },
  {
    icon: Eye,
    title: 'Визуально-языковая модель',
    status: 'Через API',
    text: 'Интерпретация фотографий и визуальных признаков вместе с текстовым контекстом. Загрузка изображения уже предусмотрена в диалоге.',
  },
  {
    icon: Database,
    title: 'RAG + ChromaDB',
    status: 'Следующий этап',
    text: 'Поиск по нормативным документам, научным публикациям и локальной базе знаний с указанием использованных источников.',
  },
  {
    icon: LineChart,
    title: 'Прогноз урожайности',
    status: 'Нужны данные',
    text: 'Количественная и качественная оценка урожая потребует исторических наблюдений, калибровки и проверки точности на независимых данных.',
  },
  {
    icon: BrainCircuit,
    title: 'Адаптация QLoRA',
    status: 'Исследование',
    text: 'Дообучение VLM на подготовленном наборе агрономических примеров. Выполняется отдельно от веб-приложения и требует вычислительных ресурсов.',
  },
  {
    icon: ShieldCheck,
    title: 'Контроль достоверности',
    status: 'В системном контуре',
    text: 'Агент разделяет наблюдения, расчёты и гипотезы, обозначает неопределённость и не выдаёт предположение за результат измерения.',
  },
]

export default function ArchitecturePanel() {
  return (
    <section className="architecture-page" aria-labelledby="architecture-title">
      <div className="section-heading">
        <p className="section-label">Состав системы</p>
        <h1 id="architecture-title">От наблюдения к обоснованному решению</h1>
        <p>Веб-приложение объединяет данные мониторинга и диалог с моделью. Специализированные модели подключаются по мере появления данных и результатов исследований.</p>
      </div>
      <div className="module-grid">
        {modules.map(module => (
          <article className="module-item" key={module.title}>
            <div className="module-topline">
              <module.icon size={22} strokeWidth={1.7} />
              <span>{module.status}</span>
            </div>
            <h2>{module.title}</h2>
            <p>{module.text}</p>
          </article>
        ))}
      </div>
      <div className="method-note">
        <strong>Принцип работы</strong>
        <p>YOLO формирует измерения → RAG находит релевантные знания → VLM объясняет визуальный контекст → аналитические модели оценивают урожайность → агент представляет выводы и ограничения.</p>
      </div>
    </section>
  )
}
