export const criteria = [
  { 
    id: 1, 
    name: 'Верность и порядочность (Базис)', 
    description: 'Отношение к изменам, наличие бывших в активном доступе, чистоплотность в общении с мужчинами.' 
  },
  { 
    id: 2, 
    name: 'Психологическая устойчивость (Адекватность)', 
    description: 'Отсутствие истерик, эмоциональных качелей, манипуляций («угадай, почему я обиделась»).' 
  },
  { 
    id: 3, 
    name: 'Пригодность к быту (Уют)', 
    description: 'Умение и желание создавать комфорт, отношение к чистоте и приготовлению еды.' 
  },
  { 
    id: 4, 
    name: 'Скромность и воспитание', 
    description: 'Поведение в обществе, отсутствие вульгарности, уважение к старшим и иерархии в отношениях.' 
  },
  { 
    id: 5, 
    name: 'Интеллект и гибкость ума', 
    description: 'Способность слышать аргументы, признавать ошибки, вести содержательный диалог.' 
  },
  { 
    id: 6, 
    name: 'Внешность и женственность', 
    description: 'Натуральная красота, уход за собой, мягкость движений, голос, стиль одежды.' 
  },
  { 
    id: 7, 
    name: 'Сексуальная совместимость', 
    description: 'Отсутствие «торговли» сексом, совпадение темпераментов, готовность радовать партнёра.' 
  },
  { 
    id: 8, 
    name: 'Уважение к мужчине (Признание лидерства)', 
    description: 'Готовность доверять решениям без попыток кастрировать критикой или советами под руку.' 
  },
  { 
    id: 9, 
    name: 'Жизненные ценности и цели', 
    description: 'Совпадение взглядов на семью, детей, деньги, развитие; отсутствие чистого потребительства.' 
  },
  { 
    id: 10, 
    name: 'Конфликтоустойчивость (Умение мириться)', 
    description: 'В ссоре: идёт на примирение или уходит в глухую оборону/агрессию на дни.' 
  }
]

export interface AnalysisResult {
  total: number
  category: string
  categoryClass: string
  description: string
  penalty: string | null
  redFlags: string[]
  isGoldenStandard: boolean
}

const categories = [
  { min: 90, name: 'Единорог', class: 'unicorn', desc: 'Идеал. Береги как зеницу ока, инвестируй максимум.' },
  { min: 80, name: 'Высшая лига', class: 'top', desc: 'Отличный вариант. Стоит строить серьёзные отношения.' },
  { min: 70, name: 'Золотая середина', class: 'gold', desc: 'Хороший баланс. Можно развивать при взаимных усилиях.' },
  { min: 60, name: 'Рабочий вариант', class: 'work', desc: 'Есть над чем работать, но потенциал присутствует.' },
  { min: 51, name: 'Зона риска', class: 'risk', desc: 'Много проблемных зон. Подумай дважды.' },
  { min: 0, name: 'Непригодна', class: 'unfit', desc: 'Режим дистанции. Чёрная дыра для нервов, времени и денег. Переделать/спасти нельзя — дефолт. Полный игнор или разовый секс (если безопасно), без общей территории и планов.' }
]

export function analyzeScores(scores: number[]): AnalysisResult {
  const total = scores.reduce((sum, s) => sum + s, 0)
  const redFlags: string[] = []

  // Штраф: Верность или Уют < 4 → Непригодна
  const isPenalized = scores[0] < 4 || scores[2] < 4
  const penalty = isPenalized 
    ? `Применён штраф: по Верности (п.1) или Пригодности к быту (п.3) < 4 → итог «Непригодна».`
    : null

  // Красные флаги: Верность или Уважение ≤ 3
  if (scores[0] <= 3) redFlags.push('1')
  if (scores[7] <= 3) redFlags.push('8')

  // Золотой стандарт: 75+ и нет пункта ниже 6
  const isGoldenStandard = total >= 75 && scores.every(s => s >= 6)

  // Категория
  let cat = categories[categories.length - 1]
  if (!isPenalized) {
    for (const c of categories) {
      if (total >= c.min) {
        cat = c
        break
      }
    }
  }

  return { 
    total, 
    category: cat.name, 
    categoryClass: cat.class,
    description: cat.desc,
    penalty,
    redFlags, 
    isGoldenStandard 
  }
}

export function buildPrompt(scores: number[], analysis: AnalysisResult): string {
  const scoresList = criteria.map((c, i) => `${c.name}: ${scores[i]}/10`).join('\n')
  
  return `Анализ партнёра по шкале оценки отношений (Cold Format).

Оценки (0-10):
${scoresList}

Итого: ${analysis.total}/100
Категория: ${analysis.category}
${analysis.penalty ? `\n${analysis.penalty}` : ''}
${analysis.redFlags.length ? `Красные флаги: низкие баллы по пунктам ${analysis.redFlags.join(', ')} (≤3)` : ''}
${analysis.isGoldenStandard ? 'Соответствует золотому стандарту (75+ и все пункты ≥6)!' : ''}

Дай краткий анализ (3-4 абзаца):
1. Общая оценка ситуации
2. Ключевые сильные стороны
3. Зоны риска и на что обратить внимание
4. Рекомендации по стратегии отношений`
}
