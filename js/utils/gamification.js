// ═══════════════════════════════════════════════════
// GAMIFICATION.JS — единый источник правды
// Версия: 1.0 | Не дублировать в других файлах
// ═══════════════════════════════════════════════════

const XP_TABLE = [
  { level:'pawn',   stars:1, xpMin:0,         xpNext:1000,     label:'Пешка',  mult:1.0 },
  { level:'pawn',   stars:2, xpMin:1000,      xpNext:2000,     label:'Пешка',  mult:1.0 },
  { level:'pawn',   stars:3, xpMin:3000,      xpNext:4000,     label:'Пешка',  mult:1.0 },
  { level:'pawn',   stars:4, xpMin:7000,      xpNext:8000,     label:'Пешка',  mult:1.0 },
  { level:'pawn',   stars:5, xpMin:15000,     xpNext:10000,    label:'Пешка',  mult:1.0 },
  { level:'knight', stars:1, xpMin:25000,     xpNext:35000,    label:'Конь',   mult:1.0 },
  { level:'knight', stars:2, xpMin:60000,     xpNext:50000,    label:'Конь',   mult:1.0 },
  { level:'knight', stars:3, xpMin:110000,    xpNext:70000,    label:'Конь',   mult:1.0 },
  { level:'knight', stars:4, xpMin:180000,    xpNext:100000,   label:'Конь',   mult:1.0 },
  { level:'knight', stars:5, xpMin:280000,    xpNext:150000,   label:'Конь',   mult:1.0 },
  { level:'bishop', stars:1, xpMin:430000,    xpNext:200000,   label:'Слон',   mult:1.3 },
  { level:'bishop', stars:2, xpMin:630000,    xpNext:270000,   label:'Слон',   mult:1.3 },
  { level:'bishop', stars:3, xpMin:900000,    xpNext:350000,   label:'Слон',   mult:1.3 },
  { level:'bishop', stars:4, xpMin:1250000,   xpNext:450000,   label:'Слон',   mult:1.3 },
  { level:'bishop', stars:5, xpMin:1700000,   xpNext:600000,   label:'Слон',   mult:1.3 },
  { level:'rook',   stars:1, xpMin:2300000,   xpNext:800000,   label:'Ладья',  mult:1.6 },
  { level:'rook',   stars:2, xpMin:3100000,   xpNext:900000,   label:'Ладья',  mult:1.6 },
  { level:'rook',   stars:3, xpMin:4000000,   xpNext:1000000,  label:'Ладья',  mult:1.6 },
  { level:'rook',   stars:4, xpMin:5000000,   xpNext:1000000,  label:'Ладья',  mult:1.6 },
  { level:'rook',   stars:5, xpMin:6000000,   xpNext:1500000,  label:'Ладья',  mult:1.6 },
  { level:'queen',  stars:1, xpMin:7500000,   xpNext:1500000,  label:'Ферзь',  mult:2.0 },
  { level:'queen',  stars:2, xpMin:9000000,   xpNext:2000000,  label:'Ферзь',  mult:2.0 },
  { level:'queen',  stars:3, xpMin:11000000,  xpNext:2000000,  label:'Ферзь',  mult:2.0 },
  { level:'queen',  stars:4, xpMin:13000000,  xpNext:2000000,  label:'Ферзь',  mult:2.0 },
  { level:'queen',  stars:5, xpMin:15000000,  xpNext:10000000, label:'Ферзь',  mult:2.0 },
  { level:'king',   stars:1, xpMin:25000000,  xpNext:null,     label:'Король', mult:2.5 },
];

const XP_REWARDS = {
  onboarding_dna:       3000,
  onboarding_profile:   2000,
  onboarding_interests: 1000,
  onboarding_bonus:     2000,
  create_post:          800,
  create_case:          1500,
  comment:              200,
  like:                 50,
  task_platform_min:    600,
  task_platform_max:    1400,
  task_ad_min:          1000,
  task_ad_max:          4000,
  task_business_min:    10000,
  task_business_max:    100000,
  refer_verified:       10000,
  social_link:          300,
  verification:         5000,
  deal_complete:        2000,
  deal_review:          500,
};

const STREAK_MULTIPLIERS = [
  { days:7,   mult:1.05, bonus:300,   badge:'Неделя'         },
  { days:21,  mult:1.10, bonus:500,   badge:'Три недели'     },
  { days:45,  mult:1.15, bonus:1000,  badge:'Полтора месяца' },
  { days:90,  mult:1.20, bonus:2000,  badge:'Квартал'        },
  { days:120, mult:1.30, bonus:3000,  badge:'4 месяца'       },
  { days:150, mult:1.50, bonus:5000,  badge:'Железная воля'  },
  { days:180, mult:1.70, bonus:8000,  badge:'Полгода'        },
  { days:270, mult:2.00, bonus:15000, badge:'Титан'          },
  { days:365, mult:2.50, bonus:30000, badge:'Легенда'        },
];

window.Gamification = {
  XP_TABLE,
  XP_REWARDS,
  STREAK_MULTIPLIERS,

  getUserLevel(xpTotal) {
    let found = XP_TABLE[0];
    for (const row of XP_TABLE) {
      if (xpTotal >= row.xpMin) found = row;
      else break;
    }
    return found;
  },

  getLevelProgress(xpTotal) {
    const row = this.getUserLevel(xpTotal);
    if (!row.xpNext) return { percent:100, current:0, needed:0, nextStars: null };
    const base = row.xpMin;
    const current = xpTotal - base;
    const needed = row.xpNext;
    const percent = Math.min(100, Math.floor((current / needed) * 100));
    return { percent, current, needed, nextStars: row.stars + 1 };
  },

  getMultiplier(level) {
    const row = XP_TABLE.find(r => r.level === level);
    return row ? row.mult : 1.0;
  },

  getStreakMultiplier(streakDays) {
    let mult = 1.0;
    for (const s of STREAK_MULTIPLIERS) {
      if (streakDays >= s.days) mult = s.mult;
    }
    return mult;
  },

  calculateEarnedXP(baseXP, level, streakDays) {
    const levelMult = this.getMultiplier(level);
    const streakMult = this.getStreakMultiplier(streakDays);
    return Math.round(baseXP * levelMult * streakMult);
  },
};
