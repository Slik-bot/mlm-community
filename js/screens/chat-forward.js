// ═══════════════════════════════════════
// ПЕРЕСЛАТЬ СООБЩЕНИЕ
// ═══════════════════════════════════════
let _fwdMsgId = null;
let _fwdMsgs = null;
let _fwdConvs = [];

async function showFwdSheet(msgId, msgs) {
  _fwdMsgId = msgId;
  _fwdMsgs = msgs ?? null;
  const sheet = document.getElementById('fwdSheet');
  if (!sheet) return;
  sheet.classList.add('visible');
  const list = document.getElementById('fwdList');
  if (list) list.innerHTML =
    '<div style="padding:20px;text-align:center;' +
    'color:rgba(255,255,255,0.4)">Загрузка...</div>';
  // 1. Попробовать кеш
  if (window._clCache?.length) {
    _fwdConvs = window._clCache
      .filter(c => c.type !== 'deal' && c.other)
      .map(c => ({
        convId: c.id,
        name: c.other.name || 'Без имени',
        avatar: c.other.avatar_url
      }));
    renderFwdList(_fwdConvs, '');
    return;
  }
  // 2. Фоллбэк — загрузить из Supabase
  const user = window.getCurrentUser?.();
  if (!user) return;
  const [{ data: myConvs }, { data: others }] =
    await Promise.all([
      window.sb.from('conversation_members')
        .select('conversation_id')
        .eq('user_id', user.id),
      window.sb.from('conversation_members')
        .select(
          'conversation_id,' +
          'users!inner(id,name,avatar_url),' +
          'conversations!inner(type)'
        )
        .eq('conversations.type', 'personal')
        .neq('user_id', user.id)
    ]);
  if (!myConvs?.length) {
    if (list) list.innerHTML =
      '<div style="padding:20px;text-align:center;' +
      'color:rgba(255,255,255,0.4)">Нет чатов</div>';
    return;
  }
  const myIds = new Set(
    myConvs.map(r => r.conversation_id)
  );
  _fwdConvs = (others ?? [])
    .filter(r => myIds.has(r.conversation_id))
    .map(r => ({
      convId: r.conversation_id,
      name: r.users.name || 'Без имени',
      avatar: r.users.avatar_url
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

async function sendForward(convId) {
  const user = window.getCurrentUser?.();
  if (!user || !convId) return;
  hideFwdSheet();
  const toSend = _fwdMsgs
    ?? (_fwdMsgId ? [{ id: _fwdMsgId,
        content: null, type: 'text' }] : []);
  if (!toSend.length) return;
  try {
    for (const msg of toSend) {
      let content = msg.content;
      let type = msg.type ?? 'text';
      if (!content && msg.id) {
        const { data: orig } = await window.sb
          .from('messages')
          .select('content,type,sender:users!sender_id(name)')
          .eq('id', msg.id)
          .single();
        content = orig?.content;
        type = orig?.type ?? 'text';
        if (!msg.sender_name) {
          msg.sender_name = orig?.sender?.name ?? 'Неизвестно';
        }
      }
      if (!content) continue;
      await window.sb.from('messages').insert({
        conversation_id: convId,
        sender_id: user.id,
        content,
        type,
        forwarded_from_id: msg.id,
        forwarded_sender_name: msg.sender_name ?? 'Неизвестно'
      });
    }
    window.showToast?.('Переслано', 'ok', 1500);
  } catch (err) {
    console.error('sendForward:', err);
    window.showToast?.('Ошибка пересылки', 'err', 1500);
  }
}

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

window.showFwdSheet = showFwdSheet;
window.hideFwdSheet = hideFwdSheet;
