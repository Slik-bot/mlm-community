// ===== ACADEMY SCREEN =====

let currentCourse = null;
let currentLesson = null;
let currentLessons = [];
let currentLessonIndex = 0;
let academyTab = 'all';
let academyCategory = 'all';
let allCourses = [];

const LESSON_TYPES = {
  video: { label: 'Видео', color: '#ef4444' },
  text: { label: 'Текст', color: '#3b82f6' },
  quiz: { label: 'Тест', color: '#f59e0b' }
};

const CAT_LABELS = {
  mlm: 'MLM',
  marketing: 'Маркетинг',
  sales: 'Продажи',
  mindset: 'Майндсет',
  finance: 'Финансы'
};

// ===== INIT ACADEMY =====

function initAcademy() {
  academyTab = 'all';
  academyCategory = 'all';
  loadCourses();
}

// ===== LOAD COURSES =====

function loadCourses() {
  const sb = window.supabase;
  if (!sb) {
    allCourses = [];
    renderAcademyGrid([]);
    return;
  }

  const userId = window.currentUser ? window.currentUser.id : null;

  sb.from('academy_courses')
    .select('*, progress:user_progress(completed_at, progress_pct, user_id)')
    .eq('is_active', true)
    .order('order_index', { ascending: true })
    .then(function(res) {
      allCourses = res.data || [];
      renderAcademyGrid(applyAcademyFilters());
    });
}

// ===== FILTERS =====

function applyAcademyFilters() {
  const userId = window.currentUser ? window.currentUser.id : null;
  let filtered = allCourses;

  if (academyCategory !== 'all') {
    filtered = filtered.filter(function(c) {
      return c.category === academyCategory;
    });
  }

  if (academyTab === 'my' && userId) {
    filtered = filtered.filter(function(c) {
      return c.progress && c.progress.some(function(p) {
        return p.user_id === userId;
      });
    });
  } else if (academyTab === 'completed' && userId) {
    filtered = filtered.filter(function(c) {
      return c.progress && c.progress.some(function(p) {
        return p.user_id === userId && p.completed_at;
      });
    });
  }

  return filtered;
}

function switchAcademyTab(tab) {
  academyTab = tab;
  const tabs = document.querySelectorAll('.academy-tab');
  tabs.forEach(function(t) {
    t.classList.toggle('active', t.getAttribute('data-tab') === tab);
  });
  renderAcademyGrid(applyAcademyFilters());
}

function academyFilterCat(cat) {
  academyCategory = cat;
  const cats = document.querySelectorAll('.academy-cat');
  cats.forEach(function(c) {
    c.classList.toggle('active', c.getAttribute('data-cat') === cat);
  });
  renderAcademyGrid(applyAcademyFilters());
}

// ===== RENDER GRID =====

function renderAcademyGrid(courses) {
  const grid = document.getElementById('academyGrid');
  const empty = document.getElementById('academyEmpty');
  if (!grid) return;

  if (courses.length === 0) {
    grid.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  }

  if (empty) empty.classList.add('hidden');
  const userId = window.currentUser ? window.currentUser.id : null;

  grid.innerHTML = courses.map(function(c) {
    const cover = c.cover_url || '';
    const catLabel = CAT_LABELS[c.category] || c.category || '';
    let progressPct = 0;
    let hasProgress = false;

    if (userId && c.progress) {
      const up = c.progress.find(function(p) { return p.user_id === userId; });
      if (up) {
        progressPct = up.progress_pct || 0;
        hasProgress = true;
      }
    }

    return '<div class="academy-card" onclick="openCourse(\'' + c.id + '\')">' +
      (cover ? '<img class="academy-card-cover" src="' + cover + '" alt="">' :
        '<div class="academy-card-cover"></div>') +
      '<div class="academy-card-body">' +
        (catLabel ? '<span class="academy-card-cat">' + catLabel + '</span>' : '') +
        '<div class="academy-card-title">' + (c.title || '') + '</div>' +
        '<div class="academy-card-meta">' +
          '<span>' + (c.lessons_count || 0) + ' ур.</span>' +
          '<span>' + (c.xp_reward || 0) + ' XP</span>' +
        '</div>' +
        (hasProgress ? '<div class="academy-card-progress"><div class="academy-card-progress-fill" style="width:' + progressPct + '%"></div></div>' : '') +
      '</div>' +
    '</div>';
  }).join('');
}

// ===== OPEN COURSE =====

function openCourse(courseId) {
  currentCourse = allCourses.find(function(c) {
    return c.id === courseId;
  });
  if (currentCourse) goTo('scrCourse');
}

// ===== INIT COURSE =====

function initCourse() {
  if (!currentCourse) { goBack(); return; }

  const title = document.getElementById('courseTitle');
  const name = document.getElementById('courseName');
  const cover = document.getElementById('courseCover');
  const desc = document.getElementById('courseDesc');
  const lessonsCount = document.getElementById('courseLessonsCount');
  const duration = document.getElementById('courseDuration');
  const xp = document.getElementById('courseXp');
  const levelBadge = document.getElementById('courseLevelBadge');

  if (title) title.textContent = currentCourse.title || 'Курс';
  if (name) name.textContent = currentCourse.title || '';
  if (cover) cover.src = currentCourse.cover_url || '';
  if (desc) desc.textContent = currentCourse.description || '';
  if (lessonsCount) lessonsCount.textContent = (currentCourse.lessons_count || 0) + ' уроков';
  if (duration) duration.textContent = currentCourse.duration || '';
  if (xp) xp.textContent = (currentCourse.xp_reward || 0) + ' XP';
  if (levelBadge) levelBadge.textContent = currentCourse.level || '';

  loadCourseLessons();
}

function loadCourseLessons() {
  const sb = window.supabase;
  if (!sb || !currentCourse) { currentLessons = []; renderCourseLessons(); return; }

  sb.from('academy_lessons')
    .select('*')
    .eq('course_id', currentCourse.id)
    .order('order_index', { ascending: true })
    .then(function(res) {
      currentLessons = res.data || [];
      loadCourseProgress();
    });
}

function loadCourseProgress() {
  const sb = window.supabase;
  if (!sb || !window.currentUser || !currentCourse) {
    renderCourseLessons();
    updateCourseProgress(0);
    return;
  }

  sb.from('user_progress')
    .select('lesson_id, completed_at')
    .eq('user_id', window.currentUser.id)
    .eq('course_id', currentCourse.id)
    .then(function(res) {
      const completed = res.data || [];
      currentLessons.forEach(function(l) {
        const found = completed.find(function(p) { return p.lesson_id === l.id; });
        l._completed = found ? true : false;
      });
      const pct = currentLessons.length > 0
        ? Math.round((completed.length / currentLessons.length) * 100) : 0;
      updateCourseProgress(pct);
      renderCourseLessons();
      updateCourseStartBtn();
    });
}

function updateCourseProgress(pct) {
  const wrap = document.getElementById('courseProgressWrap');
  const fill = document.getElementById('courseProgressFill');
  const label = document.getElementById('courseProgressLabel');
  if (pct > 0) {
    if (wrap) wrap.classList.remove('hidden');
    if (fill) fill.style.width = pct + '%';
    if (label) label.textContent = pct + '% пройдено';
  } else {
    if (wrap) wrap.classList.add('hidden');
  }
}

function updateCourseStartBtn() {
  const btn = document.getElementById('courseStartBtn');
  if (!btn) return;
  const firstUndone = currentLessons.findIndex(function(l) { return !l._completed; });
  if (firstUndone === -1 && currentLessons.length > 0) {
    btn.textContent = 'Курс пройден';
    btn.disabled = true;
  } else if (firstUndone > 0) {
    btn.textContent = 'Продолжить';
    btn.disabled = false;
  } else {
    btn.textContent = 'Начать курс';
    btn.disabled = false;
  }
}

// ===== RENDER LESSONS =====

function renderCourseLessons() {
  const list = document.getElementById('courseLessons');
  if (!list) return;

  list.innerHTML = currentLessons.map(function(l, i) {
    const type = LESSON_TYPES[l.type] || LESSON_TYPES.text;
    const done = l._completed;
    const statusSvg = done
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5" width="18" height="18"><path d="M20 6L9 17l-5-5"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18" opacity="0.3"><circle cx="12" cy="12" r="10"/></svg>';

    return '<div class="lesson-row' + (done ? ' lesson-row--done' : '') + '" onclick="openLesson(' + i + ')">' +
      '<div class="lesson-num">' + (i + 1) + '</div>' +
      '<div class="lesson-info">' +
        '<div class="lesson-name">' + (l.title || 'Урок ' + (i + 1)) + '</div>' +
        '<div class="lesson-duration">' +
          '<span class="lesson-type-dot" style="background:' + type.color + '"></span>' +
          type.label +
          (l.duration ? ' · ' + l.duration : '') +
        '</div>' +
      '</div>' +
      '<div class="lesson-status">' + statusSvg + '</div>' +
    '</div>';
  }).join('');
}

// ===== COURSE START =====

function courseStart() {
  const idx = currentLessons.findIndex(function(l) { return !l._completed; });
  const finalIdx = idx === -1 ? 0 : idx;
  openLesson(finalIdx);
}

// ===== OPEN LESSON =====

function openLesson(index) {
  if (index < 0 || index >= currentLessons.length) return;
  currentLessonIndex = index;
  currentLesson = currentLessons[index];
  goTo('scrLesson');
}

// ===== INIT LESSON =====

function initLesson() {
  if (!currentLesson) { goBack(); return; }

  const title = document.getElementById('lessonTitle');
  const typeBadge = document.getElementById('lessonTypeBadge');
  const progress = document.getElementById('lessonProgress');
  const videoWrap = document.getElementById('lessonVideoWrap');
  const video = document.getElementById('lessonVideo');
  const content = document.getElementById('lessonContent');
  const prevBtn = document.getElementById('lessonPrevBtn');
  const nextBtn = document.getElementById('lessonNextBtn');

  if (title) title.textContent = currentLesson.title || 'Урок';
  if (progress) progress.textContent = 'Урок ' + (currentLessonIndex + 1) + ' из ' + currentLessons.length;

  const type = LESSON_TYPES[currentLesson.type] || LESSON_TYPES.text;
  if (typeBadge) {
    typeBadge.textContent = type.label;
    typeBadge.style.background = type.color + '20';
    typeBadge.style.color = type.color;
  }

  if (currentLesson.type === 'video' && currentLesson.video_url) {
    if (videoWrap) videoWrap.classList.remove('hidden');
    if (video) video.src = currentLesson.video_url;
  } else {
    if (videoWrap) videoWrap.classList.add('hidden');
    if (video) video.src = '';
  }

  if (content) content.innerHTML = currentLesson.content || '';

  if (prevBtn) prevBtn.style.display = currentLessonIndex === 0 ? 'none' : '';
  if (nextBtn) nextBtn.textContent = currentLessonIndex === currentLessons.length - 1 ? 'Завершить' : 'Далее';
}

// ===== LESSON NAVIGATION =====

function lessonNext() {
  const sb = window.supabase;
  if (sb && window.currentUser && currentLesson && currentCourse) {
    sb.from('user_progress').upsert({
      user_id: window.currentUser.id,
      lesson_id: currentLesson.id,
      course_id: currentCourse.id,
      completed_at: new Date().toISOString()
    }, { onConflict: 'user_id,lesson_id' }).then(function() {
      const completed = currentLessons.filter(function(l) { return l._completed; }).length + 1;
      const pct = Math.round((completed / currentLessons.length) * 100);
      sb.from('user_progress').upsert({
        user_id: window.currentUser.id,
        course_id: currentCourse.id,
        progress_pct: pct
      }, { onConflict: 'user_id,course_id' });
    });
  }

  currentLesson._completed = true;

  if (currentLessonIndex >= currentLessons.length - 1) {
    goBack();
    return;
  }

  currentLessonIndex++;
  currentLesson = currentLessons[currentLessonIndex];
  initLesson();
}

function lessonPrev() {
  if (currentLessonIndex <= 0) return;
  currentLessonIndex--;
  currentLesson = currentLessons[currentLessonIndex];
  initLesson();
}

// ===== EXPORTS =====

window.initAcademy = initAcademy;
window.initCourse = initCourse;
window.initLesson = initLesson;
window.switchAcademyTab = switchAcademyTab;
window.academyFilterCat = academyFilterCat;
window.openCourse = openCourse;
window.courseStart = courseStart;
window.openLesson = openLesson;
window.lessonNext = lessonNext;
window.lessonPrev = lessonPrev;
