// ═══════════════════════════════════════════════════
// GAMIFICATION.JS — единый источник правды
// Версия: 1.0 | Не дублировать в других файлах
// ═══════════════════════════════════════════════════

const XP_TABLE = [
  { level:'pawn',   stars:1, xpMin:0,        xpNext:3000,      label:'Пешка',  mult:1.0 },
  { level:'pawn',   stars:2, xpMin:3000,      xpNext:6000,      label:'Пешка',  mult:1.0 },
  { level:'pawn',   stars:3, xpMin:6000,      xpNext:12000,     label:'Пешка',  mult:1.0 },
  { level:'pawn',   stars:4, xpMin:12000,     xpNext:21000,     label:'Пешка',  mult:1.0 },
  { level:'pawn',   stars:5, xpMin:21000,     xpNext:25000,     label:'Пешка',  mult:1.0 },
  { level:'knight', stars:1, xpMin:25000,     xpNext:35000,     label:'Конь',   mult:1.0 },
  { level:'knight', stars:2, xpMin:60000,     xpNext:50000,     label:'Конь',   mult:1.0 },
  { level:'knight', stars:3, xpMin:110000,    xpNext:70000,     label:'Конь',   mult:1.0 },
  { level:'knight', stars:4, xpMin:180000,    xpNext:100000,    label:'Конь',   mult:1.0 },
  { level:'knight', stars:5, xpMin:280000,    xpNext:150000,    label:'Конь',   mult:1.0 },
  { level:'bishop', stars:1, xpMin:430000,    xpNext:200000,    label:'Слон',   mult:1.3 },
  { level:'bishop', stars:2, xpMin:630000,    xpNext:270000,    label:'Слон',   mult:1.3 },
  { level:'bishop', stars:3, xpMin:900000,    xpNext:350000,    label:'Слон',   mult:1.3 },
  { level:'bishop', stars:4, xpMin:1250000,   xpNext:450000,    label:'Слон',   mult:1.3 },
  { level:'bishop', stars:5, xpMin:1700000,   xpNext:600000,    label:'Слон',   mult:1.3 },
  { level:'rook',   stars:1, xpMin:2300000,   xpNext:800000,    label:'Ладья',  mult:1.6 },
  { level:'rook',   stars:2, xpMin:3100000,   xpNext:900000,    label:'Ладья',  mult:1.6 },
  { level:'rook',   stars:3, xpMin:4000000,   xpNext:1000000,   label:'Ладья',  mult:1.6 },
  { level:'rook',   stars:4, xpMin:5000000,   xpNext:1100000,   label:'Ладья',  mult:1.6 },
  { level:'rook',   stars:5, xpMin:6100000,   xpNext:1200000,   label:'Ладья',  mult:1.6 },
  { level:'queen',  stars:1, xpMin:7300000,   xpNext:1500000,   label:'Ферзь',  mult:2.0 },
  { level:'queen',  stars:2, xpMin:8800000,   xpNext:2000000,   label:'Ферзь',  mult:2.0 },
  { level:'queen',  stars:3, xpMin:10800000,  xpNext:2500000,   label:'Ферзь',  mult:2.0 },
  { level:'queen',  stars:4, xpMin:13300000,  xpNext:3000000,   label:'Ферзь',  mult:2.0 },
  { level:'queen',  stars:5, xpMin:16300000,  xpNext:3500000,   label:'Ферзь',  mult:2.0 },
  { level:'king',   stars:1, xpMin:26600000,  xpNext:null,      label:'Король', mult:2.5 },
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
  { days:7,   mult:1.05, bonus:300,   badge:'streak_7'   },
  { days:21,  mult:1.10, bonus:500,   badge:'streak_21'  },
  { days:45,  mult:1.15, bonus:1000,  badge:'streak_45'  },
  { days:90,  mult:1.20, bonus:2000,  badge:'streak_90'  },
  { days:180, mult:1.70, bonus:8000,  badge:'streak_180' },
  { days:365, mult:2.50, bonus:30000, badge:'streak_365' },
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
