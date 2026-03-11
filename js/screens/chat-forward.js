// ═══════════════════════════════════════
// ПЕРЕСЛАТЬ СООБЩЕНИЕ
// ═══════════════════════════════════════

let _fwdMsgId = null;
let _fwdConvs = [];

function showFwdSheet(msgId) {
  _fwdMsgId = msgId;
  const sheet = document.getElementById('fwdSheet');
  if (!sheet) return;
  sheet.classList.add('visible');

  const convs = window._clCache ?? [];
  _fwdConvs = convs
    .filter(c => c.type !== 'deal' && c.other)
    .map(c => ({
      convId: c.id,
      name: c.other.name || 'Без имени',
      avatar: c.other.avatar_url
    }));
  renderFwdList(_fwdConvs, '');
}

function hideFwdSheet() {
  _fwdMsgId = null;
  const sheet = document.getElementById('fwdSheet');
  if (sheet) sheet.classList.remove('visible');
  const search = document.getElementById('fwdSearch');
  if (search) search.value = '';
}

function renderFwdList(convs, query) {
  const list = document.getElementById('fwdList');
  if (!list) return;
  list.innerHTML = '';
  const q = query.toLowerCase().trim();
  const filtered = q
    ? convs.filter(c => c.name.toLowerCase().includes(q))
    : convs;

  for (const c of filtered) {
    const item = document.createElement('div');
    item.className = 'fwd-item';
    item.onclick = () => sendForward(c.convId);

    if (c.avatar) {
      const img = document.createElement('img');
      img.className = 'fwd-item__ava';
      img.src = c.avatar;
      img.alt = c.name;
      item.appendChild(img);
    } else {
      const ph = document.createElement('div');
      ph.className = 'fwd-item__ava-placeholder';
      ph.textContent = c.name.charAt(0).toUpperCase();
      item.appendChild(ph);
    }

    const name = document.createElement('span');
    name.className = 'fwd-item__name';
    name.textContent = c.name;
    item.appendChild(name);
    list.appendChild(item);
  }
}

async function sendForward(toConvId) {
  if (!_fwdMsgId || !toConvId) return;
  const user = window.getCurrentUser();
  if (!user) return;

  const msgMap = window._chatPagination?.msgMap;
  const original = msgMap?.[_fwdMsgId];
  if (!original) {
    window.showToast?.('Сообщение не найдено');
    hideFwdSheet();
    return;
  }

  try {
    const { error } = await window.sb
      .from('messages')
      .insert({
        conversation_id: toConvId,
        sender_id: user.id,
        content: original.content,
        type: 'text',
        forwarded_from_id: _fwdMsgId
      });
    if (error) throw error;
    window.showToast?.('Сообщение переслано', 'ok', 1500);
  } catch (err) {
    console.error('sendForward:', err);
    window.showToast?.('Ошибка пересылки', 'err', 1500);
  }
  hideFwdSheet();
}

// ── Слушатели ──────────────────────────

document.addEventListener('click', (e) => {
  if (e.target.id === 'fwdBackdrop' || e.target.id === 'fwdClose') {
    hideFwdSheet();
  }
});

document.addEventListener('input', (e) => {
  if (e.target.id === 'fwdSearch') {
    renderFwdList(_fwdConvs, e.target.value);
  }
});

// ── Экспорты ───────────────────────────

window.showFwdSheet = showFwdSheet;
window.hideFwdSheet = hideFwdSheet;
