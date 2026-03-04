// ═══════════════════════════════════════
// DEAL CREATE — форма + договор (2 шага)
// ═══════════════════════════════════════

let _dcStep = 1;
let _dcExecutor = null;
let _dcBroker = null;
let _dcMilestones = [];
let _dcRevisionsTotal = 3;
let _dcDealNumber = '';

const DC_TEMPLATES = [
  { label: 'Дизайн', category: 'design', title: 'Дизайн-проект' },
  { label: 'Разработка', category: 'development', title: 'Разработка' },
  { label: 'Тексты', category: 'copywriting', title: 'Копирайтинг' },
  { label: 'Консалтинг', category: 'consulting', title: 'Консультация' }
];

const DC_TERMS = [
  'Заказчик обязуется оплатить предоплату (50%) после подписания договора.',
  'Исполнитель приступает к работе после получения предоплаты.',
  'Эскроу (30%) выплачивается исполнителю после принятия работы заказчиком.',
  'Платформа удерживает комиссию в размере указанного процента.',
  'В случае спора, платформа выступает арбитром.',
  'Количество бесплатных доработок ограничено условиями сделки.',
  'Стороны подтверждают, что действуют добровольно. За мошеннические действия предусмотрена ответственность в соответствии с законодательством.'
];

// ═══ Init ═══

function initDealCreate() {
  const params = window._screenParams || {};
  _dcStep = 1;
  _dcExecutor = null;
  _dcBroker = null;
  _dcMilestones = [
    { title: 'Начало работы', pct: 30 },
    { title: 'Промежуточный результат', pct: 40 },
    { title: 'Финальная сдача', pct: 30 }
  ];
  _dcRevisionsTotal = 3;

  if (params.executorId) loadExecutorInfo(params.executorId);
  if (params.brokerId) loadBrokerInfo(params.brokerId);

  renderDcTemplates();
  renderDcSplit();
  renderDcMilestones();
  renderDcRevPicker();
  showDcStep(1);
  initDcSliders();

  const deadlineInput = document.getElementById('dcDeadline');
  if (deadlineInput) deadlineInput.min = new Date().toISOString().split('T')[0];
}

// ═══ Загрузка исполнителя / брокера ═══

async function loadExecutorInfo(userId) {
  const { data } = await window.sb.from('users')
    .select('id, name, avatar_url, dna_type, passport_verified, broker_deals_count')
    .eq('id', userId).single();
  if (!data) return;
  _dcExecutor = data;
  renderExecutorCard();

  if (data.broker_deals_count > 0) {
    const level = getBrokerLevel(data.broker_deals_count);
    document.getElementById('dcBrokerWrap').classList.remove('hidden');
  }
}

async function loadBrokerInfo(userId) {
  const { data } = await window.sb.from('users')
    .select('id, name, avatar_url, dna_type, passport_verified, broker_deals_count')
    .eq('id', userId).single();
  if (!data) return;
  _dcBroker = data;
  document.getElementById('dcBrokerWrap').classList.remove('hidden');
}

function renderExecutorCard() {
  const el = document.getElementById('dcExecutor');
  if (!el || !_dcExecutor) return;
  el.classList.remove('hidden');

  const dnaName = window.DNA_TYPES && window.DNA_TYPES[_dcExecutor.dna_type]
    ? window.DNA_TYPES[_dcExecutor.dna_type].name : '';
  const verified = _dcExecutor.passport_verified
    ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>' : '';
  const ava = _dcExecutor.avatar_url
    ? '<img src="' + escHtml(_dcExecutor.avatar_url) + '" alt="">'
    : '<div style="width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.06);display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.4)">' + escHtml((_dcExecutor.name || '?')[0]) + '</div>';

  el.innerHTML = '<div class="executor-av">' + ava + '</div>' +
    '<div class="executor-info"><div class="executor-name">' + escHtml(_dcExecutor.name || '') + ' ' + verified + '</div>' +
    '<div class="executor-meta">' + dnaName + '</div></div>';
}

// ═══ Шаблоны ═══

function renderDcTemplates() {
  const el = document.getElementById('dcTemplates');
  if (!el) return;
  el.innerHTML = DC_TEMPLATES.map(function(t) {
    return '<button class="deal-tpl" onclick="dcSelectTemplate(\'' + t.category + '\',\'' + t.title + '\')">' + t.label + '</button>';
  }).join('');
}

function dcSelectTemplate(category, title) {
  const titleInput = document.getElementById('dcTitleInput');
  const catSelect = document.getElementById('dcCategory');
  if (titleInput && !titleInput.value) titleInput.value = title;
  if (catSelect) catSelect.value = category;

  document.querySelectorAll('.deal-tpl').forEach(function(btn) { btn.classList.remove('active'); });
  const clicked = event.target;
  if (clicked) clicked.classList.add('active');
}

// ═══ Слайдеры ═══

function initDcSliders() {
  const amountSlider = document.getElementById('dcAmountSlider');
  const brokerSlider = document.getElementById('dcBrokerSlider');

  if (amountSlider) {
    amountSlider.addEventListener('input', function() {
      const val = parseInt(amountSlider.value);
      document.getElementById('dcAmountValue').textContent = val.toLocaleString('ru') + ' TF';
      renderDcSplit();
    });
  }

  if (brokerSlider) {
    brokerSlider.addEventListener('input', function() {
      document.getElementById('dcBrokerValue').textContent = brokerSlider.value + '%';
      renderDcSplit();
    });
  }
}

// ═══ Живой расчёт split ═══

function renderDcSplit() {
  const el = document.getElementById('dcSplit');
  if (!el) return;

  const amount = parseInt(document.getElementById('dcAmountSlider').value) || 5000;
  const brokerWrap = document.getElementById('dcBrokerWrap');
  const brokerPct = brokerWrap && !brokerWrap.classList.contains('hidden')
    ? parseInt(document.getElementById('dcBrokerSlider').value) || 0 : 0;
  const feePct = _dcBroker ? getBrokerLevel(_dcBroker.broker_deals_count || 0).feePct : 20;

  const split = calcDealSplit(amount, brokerPct, feePct);

  let html = '<div class="sg gold"><div class="sg-label">Предоплата</div><div class="sg-value">' + split.prepay.toLocaleString('ru') + ' TF</div></div>' +
    '<div class="sg purple"><div class="sg-label">Эскроу</div><div class="sg-value">' + split.escrow.toLocaleString('ru') + ' TF</div></div>' +
    '<div class="sg green"><div class="sg-label">Исполнитель</div><div class="sg-value">' + split.executorNet.toLocaleString('ru') + ' TF</div></div>' +
    '<div class="sg teal"><div class="sg-label">Платформа (' + split.feePct + '%)</div><div class="sg-value">' + split.platformFee.toLocaleString('ru') + ' TF</div></div>';

  if (brokerPct > 0) {
    html += '<div class="sg" style="grid-column:1/-1"><div class="sg-label">Брокер (' + brokerPct + '%)</div><div class="sg-value">' + split.brokerFee.toLocaleString('ru') + ' TF</div></div>';
  }

  el.innerHTML = html;
}

// ═══ Milestones editor ═══

function renderDcMilestones() {
  const el = document.getElementById('dcMilestones');
  if (!el) return;

  let html = _dcMilestones.map(function(m, i) {
    return '<div class="ms-row">' +
      '<input class="glass-input" value="' + escHtml(m.title) + '" placeholder="Этап ' + (i + 1) + '" onchange="dcUpdateMs(' + i + ',this.value)">' +
      '<input class="glass-input ms-pct" type="number" value="' + m.pct + '" placeholder="%" onchange="dcUpdateMsPct(' + i + ',this.value)">' +
      '</div>';
  }).join('');

  html += '<button class="ms-add" onclick="dcAddMilestone()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg> Добавить этап</button>';
  el.innerHTML = html;
}

function dcUpdateMs(index, value) { _dcMilestones[index].title = value; }
function dcUpdateMsPct(index, value) { _dcMilestones[index].pct = parseInt(value) || 0; }

function dcAddMilestone() {
  _dcMilestones.push({ title: '', pct: 0 });
  renderDcMilestones();
}

// ═══ Revisions picker ═══

function renderDcRevPicker() {
  const el = document.getElementById('dcRevPicker');
  if (!el) return;
  const opts = [
    { value: 3, label: '3' },
    { value: 5, label: '5' },
    { value: 0, label: 'Без ограничений' }
  ];
  el.innerHTML = opts.map(function(o) {
    const cls = _dcRevisionsTotal === o.value ? ' active' : '';
    return '<button class="rev-opt' + cls + '" onclick="dcSetRevisions(' + o.value + ')">' + o.label + '</button>';
  }).join('');
}

function dcSetRevisions(val) {
  _dcRevisionsTotal = val;
  renderDcRevPicker();
}

// ═══ Step navigation ═══

function showDcStep(step) {
  _dcStep = step;
  const step1 = document.getElementById('dcStep1');
  const step2 = document.getElementById('dcStep2');
  const btn = document.getElementById('dcSubmitBtn');

  if (step === 1) {
    if (step1) step1.classList.remove('hidden');
    if (step2) step2.classList.add('hidden');
    if (btn) btn.textContent = 'Далее';
  } else {
    if (step1) step1.classList.add('hidden');
    if (step2) step2.classList.remove('hidden');
    if (btn) btn.textContent = 'Создать сделку';
    renderContract();
  }

  document.querySelectorAll('.deal-step').forEach(function(s) {
    s.classList.toggle('active', parseInt(s.getAttribute('data-step')) === step);
  });
}

function dcNextStep() {
  if (_dcStep === 1) {
    if (!validateStep1()) return;
    showDcStep(2);
  } else {
    submitDealCreate();
  }
}

function validateStep1() {
  const title = (document.getElementById('dcTitleInput').value || '').trim();
  if (!title) { showToast('Введите название'); return false; }
  if (!_dcExecutor) { showToast('Исполнитель не выбран'); return false; }
  const amount = parseInt(document.getElementById('dcAmountSlider').value);
  if (amount < 500) { showToast('Минимальная сумма 500 TF'); return false; }
  return true;
}

// ═══ Step 2: Contract ═══

function renderContract() {
  const now = new Date();
  _dcDealNumber = 'DEAL-' + now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(Math.floor(Math.random() * 9000) + 1000);

  renderDocHeader(now);
  renderAgreeSec();
  renderSignRow();
}

function renderDocHeader(now) {
  const el = document.getElementById('dcDocHeader');
  if (!el) return;
  el.innerHTML = '<div class="doc-number">' + _dcDealNumber + '</div>' +
    '<div class="doc-title">Электронный договор</div>' +
    '<div class="doc-date">' + now.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) + '</div>';
}

function renderAgreeSec() {
  const el = document.getElementById('dcAgreeSec');
  if (!el) return;
  const amount = parseInt(document.getElementById('dcAmountSlider').value) || 5000;
  const title = (document.getElementById('dcTitleInput').value || '').trim();

  el.innerHTML = '<div class="agree-sec-title">Предмет договора</div>' +
    '<div style="font-size:13px;color:rgba(255,255,255,0.6);margin-bottom:12px">Сделка: ' + escHtml(title) + ' — ' + amount.toLocaleString('ru') + ' TF</div>' +
    '<div class="agree-sec-title" style="margin-top:12px">Условия</div>' +
    '<ul class="terms">' + DC_TERMS.map(function(t) { return '<li>' + t + '</li>'; }).join('') + '</ul>';
}

function renderSignRow() {
  const el = document.getElementById('dcSignRow');
  if (!el) return;
  const user = getCurrentUser();
  const checkSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';

  let html = buildSignItem(user, 'Заказчик', true, checkSvg);
  if (_dcExecutor) html += buildSignItem(_dcExecutor, 'Исполнитель', false, checkSvg);
  if (_dcBroker) html += buildSignItem(_dcBroker, 'Брокер', false, checkSvg);

  el.innerHTML = html;
}

function buildSignItem(user, role, signed, checkSvg) {
  const ava = user.avatar_url
    ? '<img class="sign-ava" src="' + escHtml(user.avatar_url) + '" alt="">'
    : '<div class="sign-ava" style="display:flex;align-items:center;justify-content:center;font-size:14px;color:rgba(255,255,255,0.4)">' + escHtml((user.name || '?')[0]) + '</div>';
  const verified = user.passport_verified ? ' (верифицирован)' : '';

  return '<div class="sign-item">' +
    '<div class="sign-info">' + ava + '<div><div class="sign-name">' + escHtml(user.name || '') + verified + '</div><div class="sign-role">' + role + '</div></div></div>' +
    '<div class="sign-btn' + (signed ? ' signed' : '') + '" onclick="dcToggleSign(this)">' + checkSvg + '</div></div>';
}

function dcToggleSign(btn) {
  btn.classList.toggle('signed');
  checkAllSigned();
}

function checkAllSigned() {
  const btns = document.querySelectorAll('#dcSignRow .sign-btn');
  let allSigned = true;
  btns.forEach(function(b) { if (!b.classList.contains('signed')) allSigned = false; });
  const submitBtn = document.getElementById('dcSubmitBtn');
  if (submitBtn) submitBtn.disabled = !allSigned;
}

// ═══ Создание сделки ═══

async function submitDealCreate() {
  const btn = document.getElementById('dcSubmitBtn');
  if (btn) btn.disabled = true;

  const amount = parseInt(document.getElementById('dcAmountSlider').value) || 5000;
  const brokerWrap = document.getElementById('dcBrokerWrap');
  const brokerPct = brokerWrap && !brokerWrap.classList.contains('hidden')
    ? parseInt(document.getElementById('dcBrokerSlider').value) || 0 : 0;
  const feePct = _dcBroker ? getBrokerLevel(_dcBroker.broker_deals_count || 0).feePct : 20;

  const params = {
    title: (document.getElementById('dcTitleInput').value || '').trim(),
    description: (document.getElementById('dcDescInput').value || '').trim(),
    category: document.getElementById('dcCategory').value,
    deadline: document.getElementById('dcDeadline').value || null,
    executorId: _dcExecutor.id,
    brokerId: _dcBroker ? _dcBroker.id : null,
    amount: amount,
    brokerPct: brokerPct,
    feePct: feePct,
    revisionsTotal: _dcRevisionsTotal,
    milestones: _dcMilestones.filter(function(m) { return m.title; })
  };

  const result = await createDealApi(params);

  if (result.error) {
    showToast(result.error);
    if (btn) btn.disabled = false;
    return;
  }

  showToast('Сделка создана!');
  goTo('scrDealScreen', { dealId: result.dealId });
}

// ═══ Экспорт ═══

window.initDealCreate = initDealCreate;
window.dcNextStep = dcNextStep;
window.dcSelectTemplate = dcSelectTemplate;
window.dcUpdateMs = dcUpdateMs;
window.dcUpdateMsPct = dcUpdateMsPct;
window.dcAddMilestone = dcAddMilestone;
window.dcSetRevisions = dcSetRevisions;
window.dcToggleSign = dcToggleSign;
