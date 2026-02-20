// ===== ACADEMY SCREEN =====

var currentCourse = null;
var currentLesson = null;
var currentLessons = [];
var currentLessonIndex = 0;
var academyTab = 'all';
var academyCategory = 'all';
var allCourses = [];

var LESSON_TYPES = {
  video: { label: 'Видео', color: '#ef4444' },
  text: { label: 'Текст', color: '#3b82f6' },
  quiz: { label: 'Тест', color: '#f59e0b' }
};

var CAT_LABELS = {
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
  var sb = window.supabase;
  if (!sb) {
    allCourses = [];
    renderAcademyGrid([]);
    return;
  }

  var userId = window.currentUser ? window.currentUser.id : null;

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
  var userId = window.currentUser ? window.currentUser.id : null;
  var filtered = allCourses;

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
  var tabs = document.querySelectorAll('.academy-tab');
  tabs.forEach(function(t) {
    t.classList.toggle('active', t.getAttribute('data-tab') === tab);
  });
  renderAcademyGrid(applyAcademyFilters());
}

function academyFilterCat(cat) {
  academyCategory = cat;
  var cats = document.querySelectorAll('.academy-cat');
  cats.forEach(function(c) {
    c.classList.toggle('active', c.getAttribute('data-cat') === cat);
  });
  renderAcademyGrid(applyAcademyFilters());
}

// ===== RENDER GRID =====

function renderAcademyGrid(courses) {
  var grid = document.getElementById('academyGrid');
  var empty = document.getElementById('academyEmpty');
  if (!grid) return;

  if (courses.length === 0) {
    grid.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  }

  if (empty) empty.classList.add('hidden');
  var userId = window.currentUser ? window.currentUser.id : null;

  grid.innerHTML = courses.map(function(c) {
    var cover = c.cover_url || '';
    var catLabel = CAT_LABELS[c.category] || c.category || '';
    var progressPct = 0;
    var hasProgress = false;

    if (userId && c.progress) {
      var up = c.progress.find(function(p) { return p.user_id === userId; });
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

  var title = document.getElementById('courseTitle');
  var name = document.getElementById('courseName');
  var cover = document.getElementById('courseCover');
  var desc = document.getElementById('courseDesc');
  var lessonsCount = document.getElementById('courseLessonsCount');
  var duration = document.getElementById('courseDuration');
  var xp = document.getElementById('courseXp');
  var levelBadge = document.getElementById('courseLevelBadge');

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
  var sb = window.supabase;
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
  var sb = window.supabase;
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
      var completed = res.data || [];
      currentLessons.forEach(function(l) {
        var found = completed.find(function(p) { return p.lesson_id === l.id; });
        l._completed = found ? true : false;
      });
      var pct = currentLessons.length > 0
        ? Math.round((completed.length / currentLessons.length) * 100) : 0;
      updateCourseProgress(pct);
      renderCourseLessons();
      updateCourseStartBtn();
    });
}

function updateCourseProgress(pct) {
  var wrap = document.getElementById('courseProgressWrap');
  var fill = document.getElementById('courseProgressFill');
  var label = document.getElementById('courseProgressLabel');
  if (pct > 0) {
    if (wrap) wrap.classList.remove('hidden');
    if (fill) fill.style.width = pct + '%';
    if (label) label.textContent = pct + '% пройдено';
  } else {
    if (wrap) wrap.classList.add('hidden');
  }
}

function updateCourseStartBtn() {
  var btn = document.getElementById('courseStartBtn');
  if (!btn) return;
  var firstUndone = currentLessons.findIndex(function(l) { return !l._completed; });
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
  var list = document.getElementById('courseLessons');
  if (!list) return;

  list.innerHTML = currentLessons.map(function(l, i) {
    var type = LESSON_TYPES[l.type] || LESSON_TYPES.text;
    var done = l._completed;
    var statusSvg = done
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
  var idx = currentLessons.findIndex(function(l) { return !l._completed; });
  if (idx === -1) idx = 0;
  openLesson(idx);
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

  var title = document.getElementById('lessonTitle');
  var typeBadge = document.getElementById('lessonTypeBadge');
  var progress = document.getElementById('lessonProgress');
  var videoWrap = document.getElementById('lessonVideoWrap');
  var video = document.getElementById('lessonVideo');
  var content = document.getElementById('lessonContent');
  var prevBtn = document.getElementById('lessonPrevBtn');
  var nextBtn = document.getElementById('lessonNextBtn');

  if (title) title.textContent = currentLesson.title || 'Урок';
  if (progress) progress.textContent = 'Урок ' + (currentLessonIndex + 1) + ' из ' + currentLessons.length;

  var type = LESSON_TYPES[currentLesson.type] || LESSON_TYPES.text;
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
  var sb = window.supabase;
  if (sb && window.currentUser && currentLesson && currentCourse) {
    sb.from('user_progress').upsert({
      user_id: window.currentUser.id,
      lesson_id: currentLesson.id,
      course_id: currentCourse.id,
      completed_at: new Date().toISOString()
    }, { onConflict: 'user_id,lesson_id' }).then(function() {
      var completed = currentLessons.filter(function(l) { return l._completed; }).length + 1;
      var pct = Math.round((completed / currentLessons.length) * 100);
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
