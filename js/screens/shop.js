// ===== SHOP SCREENS — каталог, детали, создание =====

let currentProduct = null;
let allProducts = [];
let shopCategory = 'all';
let shopSearchQuery = '';
let shopSortMethod = 'new';
let shopCoverFile = null;

const SHOP_CATEGORIES = {
  course: 'Курс',
  template: 'Шаблон',
  guide: 'Гайд',
  tool: 'Инструмент',
  other: 'Другое'
};

// ===== SHOP LIST =====

function initShop() {
  shopCategory = 'all';
  shopSearchQuery = '';
  shopSortMethod = 'new';
  const searchInp = document.getElementById('shopSearch');
  if (searchInp) searchInp.value = '';
  const sortSel = document.getElementById('shopSortSelect');
  if (sortSel) sortSel.value = 'new';
  updateCatPillsUI();
  loadProducts();
}

async function loadProducts() {
  const query = window.sb.from('products')
    .select('*, author:users(id, name, avatar_url, dna_type)')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  const result = await query;
  allProducts = result.data || [];
  renderShopGrid(applyShopFilters());
}

function applyShopFilters() {
  let filtered = allProducts;

  if (shopCategory !== 'all') {
    filtered = filtered.filter(function(p) { return p.category === shopCategory; });
  }

  if (shopSearchQuery) {
    filtered = filtered.filter(function(p) {
      const title = (p.title || '').toLowerCase();
      const desc = (p.description || '').toLowerCase();
      return title.indexOf(shopSearchQuery) !== -1 || desc.indexOf(shopSearchQuery) !== -1;
    });
  }

  return sortProducts(filtered);
}

function sortProducts(arr) {
  const sorted = arr.slice();
  if (shopSortMethod === 'popular') {
    sorted.sort(function(a, b) { return (b.purchases_count || 0) - (a.purchases_count || 0); });
  } else if (shopSortMethod === 'cheap') {
    sorted.sort(function(a, b) { return (a.price || 0) - (b.price || 0); });
  } else if (shopSortMethod === 'expensive') {
    sorted.sort(function(a, b) { return (b.price || 0) - (a.price || 0); });
  }
  return sorted;
}

function renderShopGrid(products) {
  const gridEl = document.getElementById('shopGrid');
  const emptyEl = document.getElementById('shopEmpty');
  if (!gridEl) return;

  if (!products || products.length === 0) {
    gridEl.innerHTML = '';
    if (emptyEl) emptyEl.classList.remove('hidden');
    return;
  }
  if (emptyEl) emptyEl.classList.add('hidden');

  gridEl.innerHTML = products.map(function(p) {
    const price = p.price ? (p.price / 100).toLocaleString('ru-RU') + ' руб.' : 'Бесплатно';
    const catLabel = SHOP_CATEGORIES[p.category] || p.category;
    const coverSrc = p.cover_url || '';
    const authorName = p.author ? p.author.name : '';

    return '<div class="shop-card" onclick="openProduct(\'' + p.id + '\')">' +
      '<div class="shop-card-cover-wrap">' +
        (coverSrc ? '<img class="shop-card-cover" src="' + coverSrc + '" alt="">' : '<div class="shop-card-cover shop-card-cover-empty"></div>') +
        '<div class="shop-card-cat">' + shopEscapeHtml(catLabel) + '</div>' +
      '</div>' +
      '<div class="shop-card-body">' +
        '<div class="shop-card-title">' + shopEscapeHtml(p.title) + '</div>' +
        '<div class="shop-card-author">' + shopEscapeHtml(authorName) + '</div>' +
        '<div class="shop-card-price">' + price + '</div>' +
      '</div>' +
    '</div>';
  }).join('');
}

function shopEscapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function shopFilterCat(cat) {
  shopCategory = cat;
  updateCatPillsUI();
  renderShopGrid(applyShopFilters());
}

function updateCatPillsUI() {
  const pills = document.querySelectorAll('.cat-pill');
  pills.forEach(function(p) {
    p.classList.toggle('active', p.getAttribute('data-cat') === shopCategory);
  });
}

function shopFilterSearch(query) {
  shopSearchQuery = (query || '').toLowerCase().trim();
  renderShopGrid(applyShopFilters());
}

function shopSort(method) {
  shopSortMethod = method;
  renderShopGrid(applyShopFilters());
}

// ===== PRODUCT DETAIL =====

function openProduct(productId) {
  currentProduct = allProducts.find(function(p) { return p.id === productId; });
  if (!currentProduct) return;
  goTo('scrProductDetail');
}

async function initProductDetail() {
  if (!currentProduct) { goBack(); return; }

  const p = currentProduct;
  setShopText('pdTitle', p.title || 'Продукт');
  setShopText('pdName', p.title || '');
  setShopText('pdDesc', p.description || 'Без описания');

  const price = p.price ? (p.price / 100).toLocaleString('ru-RU') + ' руб.' : 'Бесплатно';
  setShopText('pdPrice', price);
  setShopText('pdBuyPrice', price);
  setShopText('pdSales', (p.purchases_count || 0) + ' продаж');
  setShopText('pdCategory', SHOP_CATEGORIES[p.category] || p.category);

  const coverEl = document.getElementById('pdCover');
  if (coverEl) coverEl.src = p.cover_url || '';

  const author = p.author;
  setShopText('pdAuthorName', author ? author.name : '—');
  setShopText('pdAuthorDna', author && author.dna_type ? author.dna_type : '');
  const avatarEl = document.getElementById('pdAuthorAvatar');
  if (avatarEl) avatarEl.src = author && author.avatar_url ? author.avatar_url : '';

  const user = getCurrentUser();
  const buyBtn = document.getElementById('pdBuyBtn');
  if (user && buyBtn) {
    const purchased = await window.sb.from('purchases')
      .select('id')
      .eq('buyer_id', user.id)
      .eq('product_id', p.id)
      .limit(1);

    if (purchased.data && purchased.data.length > 0) {
      buyBtn.textContent = 'Куплено';
      buyBtn.disabled = true;
    } else {
      buyBtn.textContent = p.price ? 'Купить' : 'Получить';
      buyBtn.disabled = false;
    }
  }

  loadProductReviews(p.id);
}

async function loadProductReviews(productId) {
  const result = await window.sb.from('reviews')
    .select('*, user:users(id, name, avatar_url)')
    .eq('product_id', productId)
    .order('created_at', { ascending: false })
    .limit(10);

  const reviews = result.data || [];
  const container = document.getElementById('pdReviews');
  const ratingEl = document.getElementById('pdRating');
  if (!container) return;

  if (reviews.length === 0) {
    container.innerHTML = '<div class="pd-no-reviews">Пока нет отзывов</div>';
    if (ratingEl) ratingEl.textContent = '';
    return;
  }

  const avg = reviews.reduce(function(s, r) { return s + (r.rating || 0); }, 0) / reviews.length;
  if (ratingEl) ratingEl.textContent = avg.toFixed(1);

  container.innerHTML = reviews.map(function(r) {
    const uName = r.user ? r.user.name : 'Аноним';
    let stars = '';
    for (let i = 0; i < 5; i++) {
      stars += i < (r.rating || 0) ? '<span class="star-filled">&#9733;</span>' : '<span class="star-empty">&#9733;</span>';
    }
    return '<div class="pd-review">' +
      '<div class="pd-review-head">' +
        '<span class="pd-review-author">' + shopEscapeHtml(uName) + '</span>' +
        '<span class="pd-review-stars">' + stars + '</span>' +
      '</div>' +
      '<div class="pd-review-text">' + shopEscapeHtml(r.content) + '</div>' +
    '</div>';
  }).join('');
}

async function shopBuyProduct() {
  const user = getCurrentUser();
  if (!user) { showToast('Войдите в аккаунт'); return; }
  if (!currentProduct) return;

  const result = await window.sb.from('purchases').insert({
    buyer_id: user.id,
    product_id: currentProduct.id,
    amount: currentProduct.price || 0,
    author_id: currentProduct.author_id
  });

  if (result.error) {
    showToast('Ошибка покупки');
    return;
  }

  const buyBtn = document.getElementById('pdBuyBtn');
  if (buyBtn) {
    buyBtn.textContent = 'Куплено';
    buyBtn.disabled = true;
  }
  showToast('Продукт куплен!');
}

function shopOpenAuthor() {
  if (!currentProduct || !currentProduct.author) return;
  goTo('scrProfile');
}

// ===== PRODUCT CREATE =====

function initProductCreate() {
  const fields = ['pcTitle', 'pcDesc', 'pcPrice'];
  fields.forEach(function(id) {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const catEl = document.getElementById('pcCategory');
  if (catEl) catEl.selectedIndex = 0;
  shopCoverFile = null;
  const preview = document.getElementById('pcCoverPreview');
  const placeholder = document.getElementById('pcCoverPlaceholder');
  if (preview) { preview.classList.add('hidden'); preview.src = ''; }
  if (placeholder) placeholder.classList.remove('hidden');
  const checkboxes = document.querySelectorAll('#pcDnaTypes input[type="checkbox"]');
  checkboxes.forEach(function(cb) { cb.checked = false; });
}

function pcPickCover() {
  const input = document.getElementById('pcCoverInput');
  if (input) input.click();
}

function pcHandleCover(input) {
  if (!input.files || !input.files[0]) return;
  shopCoverFile = input.files[0];
  const reader = new FileReader();
  reader.onload = function(e) {
    const preview = document.getElementById('pcCoverPreview');
    const placeholder = document.getElementById('pcCoverPlaceholder');
    if (preview) { preview.src = e.target.result; preview.classList.remove('hidden'); }
    if (placeholder) placeholder.classList.add('hidden');
  };
  reader.readAsDataURL(shopCoverFile);
}

async function shopCreateProduct() {
  const user = getCurrentUser();
  if (!user) { showToast('Войдите в аккаунт'); return; }

  const title = (document.getElementById('pcTitle').value || '').trim();
  const description = (document.getElementById('pcDesc').value || '').trim();
  const category = document.getElementById('pcCategory').value;
  const priceVal = parseFloat(document.getElementById('pcPrice').value) || 0;
  const price = Math.round(priceVal * 100);

  if (!title) { showToast('Введите название'); return; }

  const dnaChecks = document.querySelectorAll('#pcDnaTypes input[type="checkbox"]:checked');
  const dna_match = [];
  dnaChecks.forEach(function(cb) { dna_match.push(cb.value); });

  let cover_url = null;
  if (shopCoverFile) {
    const ext = shopCoverFile.name.split('.').pop();
    const filePath = 'product-covers/' + user.id + '/' + Date.now() + '.' + ext;
    const upload = await window.sb.storage.from('products').upload(filePath, shopCoverFile);
    if (!upload.error) {
      const urlResult = window.sb.storage.from('products').getPublicUrl(filePath);
      cover_url = urlResult.data.publicUrl;
    }
  }

  const result = await window.sb.from('products').insert({
    author_id: user.id,
    title: title,
    description: description,
    category: category,
    price: price,
    cover_url: cover_url,
    dna_match: dna_match.length > 0 ? dna_match : null,
    is_active: true
  });

  if (result.error) {
    showToast('Ошибка публикации');
    return;
  }
  showToast('Продукт опубликован!');
  goBack();
}

// ===== HELPERS =====

function setShopText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

// ===== EXPORTS =====

window.initShop = initShop;
window.initProductDetail = initProductDetail;
window.initProductCreate = initProductCreate;
window.shopFilterCat = shopFilterCat;
window.shopFilterSearch = shopFilterSearch;
window.shopSort = shopSort;
window.shopBuyProduct = shopBuyProduct;
window.shopCreateProduct = shopCreateProduct;
window.shopOpenAuthor = shopOpenAuthor;
window.pcPickCover = pcPickCover;
window.pcHandleCover = pcHandleCover;
window.openProduct = openProduct;
