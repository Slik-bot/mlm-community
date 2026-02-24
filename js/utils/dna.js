// ═══════════════════════════════════════
// DNA UTILS — конфиг типов и шахматных SVG
// ═══════════════════════════════════════

const DNA_TYPES = {
  S: {
    color: '#3b82f6', light: '#93c5fd',
    glow: 'rgba(59,130,246,0.6)',
    r: 59, g: 130, b: 246,
    name: 'СТРАТЕГ', serial: 'STR',
    desc: 'Ты — архитектор систем. Видишь паттерны там, где другие видят хаос. Твоя сила — стратегическое мышление и умение превращать сложное в простое и масштабируемое.',
    tags: ['Структуры', 'Стратегия', 'Делегирование', 'Системы'],
    pattern: 'geo'
  },
  C: {
    color: '#22c55e', light: '#86efac',
    glow: 'rgba(34,197,94,0.6)',
    r: 34, g: 197, b: 94,
    name: 'КОММУНИКАТОР', serial: 'COM',
    desc: 'Ты — связующее звено мира. Умеешь вдохновлять и объединять людей. Твоя сила в словах, эмпатии и способности создавать доверие с первых секунд.',
    tags: ['Нетворкинг', 'Переговоры', 'Вдохновение', 'Команда'],
    pattern: 'waves'
  },
  K: {
    color: '#f59e0b', light: '#fcd34d',
    glow: 'rgba(245,158,11,0.6)',
    r: 245, g: 158, b: 11,
    name: 'КРЕАТОР', serial: 'CRE',
    desc: 'Ты — творческая сила. Видишь красоту и возможности там, где другие видят обыденность. Создаёшь уникальные идеи и воплощаешь их с особым вкусом.',
    tags: ['Творчество', 'Контент', 'Инновации', 'Визуализация'],
    pattern: 'sparks'
  },
  A: {
    color: '#a78bfa', light: '#c4b5fd',
    glow: 'rgba(167,139,250,0.6)',
    r: 167, g: 139, b: 250,
    name: 'АНАЛИТИК', serial: 'ANL',
    desc: 'Ты — кристаллический разум. Данные — твой язык, точность — твой стиль. Находишь скрытые закономерности и превращаешь информацию в решения.',
    tags: ['Данные', 'Аналитика', 'Точность', 'Исследование'],
    pattern: 'crystal'
  }
};

const CHESS_SVG = {
  pawn:   `<path d="M50 12a14 14 0 1 0 0 28 14 14 0 0 0 0-28zm-8 30l-6 36h28l-6-36H42zm-12 40h40v8H30v-8zm-6 10h52v10H24v-10z" fill="currentColor"/>`,
  knight: `<path d="M32 106h36v-6H32v6zm-4 6h44v8H28v-8zM34 96l2-30c-6-2-10-8-10-16 0-6 2-12 6-16l8-18c4 4 10 6 14 6 12 0 22 10 22 22 0 8-4 14-10 18l2 34H34z" fill="currentColor"/>`,
  bishop: `<path d="M50 10a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 16c-10 0-18 16-18 34 0 12 6 20 14 24h8c8-4 14-12 14-24 0-18-8-34-18-34zm-18 62h36v8H32v-8zm-6 10h48v10H26v-10z" fill="currentColor"/>`,
  rook:   `<path d="M22 10v22h10v8H28l-6 52h56l-6-52H68v-8h10V10H22zm10 6h8v16h-8V16zm26 0h8v16h-8V16zM20 96h60v10H20V96z" fill="currentColor"/>`,
  queen:  `<path d="M50 8a7 7 0 1 0 0 14A7 7 0 0 0 50 8zm-28 6a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm56 0a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM22 30l8 40h40l8-40-16 16L50 26 38 46 22 30zm4 46h48v10H26V76zm-6 14h60v10H20V90z" fill="currentColor"/>`,
  king:   `<path d="M44 6h12v14h14v12H56v14H44V32H30V20h14V6zM28 68l4-24h36l4 24H28zm-6 8h56v10H22V76zm-6 14h68v10H16V90zm0 14h68v8H16v-8z" fill="currentColor"/>`
};

const LEVEL_KEYS = {
  pawn: 'pawn', knight: 'knight', bishop: 'bishop',
  rook: 'rook', queen: 'queen', king: 'king'
};

window.DNA_TYPES  = DNA_TYPES;
window.CHESS_SVG  = CHESS_SVG;
window.LEVEL_KEYS = LEVEL_KEYS;

// ── Обратная совместимость ──

const DNA_COLORS = {
  S: '#3b82f6',
  C: '#22c55e',
  K: '#f59e0b',
  A: '#a78bfa'
};

function getDnaColor(type) {
  return DNA_COLORS[type] || '#3b82f6';
}

function applyDnaTheme(type) {
  const d = DNA_TYPES[type];
  if (!d) return;
  const root = document.documentElement;
  root.style.setProperty('--dna-c',      d.color);
  root.style.setProperty('--dna-cl',     d.light);
  root.style.setProperty('--dna-cg',     d.glow);
  root.style.setProperty('--dna-cr',     d.r);
  root.style.setProperty('--dna-cg-val', d.g);
  root.style.setProperty('--dna-cb',     d.b);
}

window.DNA_COLORS    = DNA_COLORS;
window.getDnaColor   = getDnaColor;
window.applyDnaTheme = applyDnaTheme;
