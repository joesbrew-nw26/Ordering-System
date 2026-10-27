/**
 * Joe's Brew — Digital Ordering & Brand Client
 * Architecture adheres to PRD:
 * - Mobile-first table ordering flow with QR code entry (?table=Top-04)
 * - Modular rotating menu grid system with custom "Joe's Brew Special" badge
 * - Tap to expand item details modal & quick "+ Add"
 * - Persistent slide-up/sticky cart with custom cooking instructions
 * - Frictionless checkout: Pay at Billing Counter (Cash/Card)
 * - Live KDS order status synchronization over WebSocket
 */

const state = {
  menuItems: [],
  cart: [],
  selectedTable: 'Top-04',
  selectedFloor: 'Terrace',
  orderMode: 'Dine-In',
  packagingCharge: 0,
  activeView: 'HOME',
  activeCategory: 'ALL',
  activeOrder: null,
  selectedWaiterReason: 'Water Refill',
  customerPhone: localStorage.getItem('jb_phone') || '',
  customerName: localStorage.getItem('jb_name') || '',
  wsConnected: false
};

let currentDetailItem = null;
let currentDetailQty = 1;
let currentDetailMode = 'Dine-In';

const chimeAudio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');

// ====================================================================
// DOM REFERENCES
// ====================================================================
const tableGatewayView = document.getElementById('tableGatewayView');
const cafeHomeView = document.getElementById('cafeHomeView');
const menuView = document.getElementById('menuView');
const tabCafeHome = document.getElementById('tabCafeHome');
const tabFullMenu = document.getElementById('tabFullMenu');
const navHomeLink = document.getElementById('navHomeLink');
const heroOrderNowBtn = document.getElementById('heroOrderNowBtn');
const browseAllMenuBtn = document.getElementById('browseAllMenuBtn');
const specialsCarousel = document.getElementById('specialsCarousel');
const menuCategoriesBar = document.getElementById('menuCategoriesBar');
const menuItemsGrid = document.getElementById('menuItemsGrid');

const currentTableNavText = document.getElementById('currentTableNavText');
const heroTableHint = document.getElementById('heroTableHint');
const menuTableDisplay = document.getElementById('menuTableDisplay');
const menuTableSwitcherTag = document.getElementById('menuTableSwitcherTag');
const tableSelectorBtn = document.getElementById('tableSelectorBtn');
const orderBrewingOverlay = document.getElementById('orderBrewingOverlay');
const tableModalBackdrop = document.getElementById('tableModalBackdrop');
const closeTableModalBtn = document.getElementById('closeTableModalBtn');
const terraceTableBtns = document.getElementById('terraceTableBtns');
const groundTableBtns = document.getElementById('groundTableBtns');
const modalActiveTableBadge = document.getElementById('modalActiveTableBadge');
const confirmTableSelectionBtn = document.getElementById('confirmTableSelectionBtn');

const cartNavBtn = document.getElementById('cartNavBtn');
const cartCountBadge = document.getElementById('cartCountBadge');
const mobileCartCountBadge = document.getElementById('mobileCartCountBadge');
const stickyCartBar = document.getElementById('stickyCartBar');
const stickyCartCount = document.getElementById('stickyCartCount');
const stickyCartTotal = document.getElementById('stickyCartTotal');
const openCartBtn = document.getElementById('openCartBtn');
const cartModalBackdrop = document.getElementById('cartModalBackdrop');
const closeCartBtn = document.getElementById('closeCartBtn');
const cartItemsList = document.getElementById('cartItemsList');
const cartTableBadge = document.getElementById('cartTableBadge');
const cartSubtotalVal = document.getElementById('cartSubtotalVal');
const cartGrandTotalVal = document.getElementById('cartGrandTotalVal');
const proceedToPaymentBtn = document.getElementById('proceedToPaymentBtn');
const proceedPaymentTotal = document.getElementById('proceedPaymentTotal');
const orderGeneralNotes = document.getElementById('orderGeneralNotes');

// Customer Phone & WhatsApp Details Modal
const customerPhoneModalBackdrop = document.getElementById('customerPhoneModalBackdrop');
const closePhoneModalBtn = document.getElementById('closePhoneModalBtn');
const phoneTableChip = document.getElementById('phoneTableChip');
const customerPhoneInput = document.getElementById('customerPhoneInput');
const customerNameInput = document.getElementById('customerNameInput');
const proceedToPaymentFinalBtn = document.getElementById('proceedToPaymentFinalBtn');
const phoneErrorHint = document.getElementById('phoneErrorHint');

const paymentModalBackdrop = document.getElementById('paymentModalBackdrop');
const closePaymentBtn = document.getElementById('closePaymentBtn');
const paymentTableChip = document.getElementById('paymentTableChip');
const paymentBannerAmount = document.getElementById('paymentBannerAmount');
const confirmOrderBtn = document.getElementById('confirmOrderBtn');

const orderSuccessModal = document.getElementById('orderSuccessModal');
const successOrderNo = document.getElementById('successOrderNo');
const successTable = document.getElementById('successTable');
const orderDoneBtn = document.getElementById('orderDoneBtn');
const successCallWaiterBtn = document.getElementById('successCallWaiterBtn');

const callWaiterNavBtn = document.getElementById('callWaiterNavBtn');
const waiterModalBackdrop = document.getElementById('waiterModalBackdrop');
const closeWaiterModalBtn = document.getElementById('closeWaiterModalBtn');
const waiterTableChip = document.getElementById('waiterTableChip');
const sendWaiterCallBtn = document.getElementById('sendWaiterCallBtn');
const toastStack = document.getElementById('toastStack');

// Item Detail Expand Modal
const itemDetailModalBackdrop = document.getElementById('itemDetailModalBackdrop');
const closeItemDetailBtn = document.getElementById('closeItemDetailBtn');
const itemDetailCategory = document.getElementById('itemDetailCategory');
const itemDetailName = document.getElementById('itemDetailName');
const itemDetailBadgeWrap = document.getElementById('itemDetailBadgeWrap');
const itemDetailDescription = document.getElementById('itemDetailDescription');
const itemDetailTags = document.getElementById('itemDetailTags');
const itemCustomNoteInput = document.getElementById('itemCustomNoteInput');
const itemDetailPrice = document.getElementById('itemDetailPrice');
const itemDetailMinusBtn = document.getElementById('itemDetailMinusBtn');
const itemDetailPlusBtn = document.getElementById('itemDetailPlusBtn');
const itemDetailQtyDisplay = document.getElementById('itemDetailQtyDisplay');
const itemDetailAddToCartBtn = document.getElementById('itemDetailAddToCartBtn');
const itemDetailBtnTotal = document.getElementById('itemDetailBtnTotal');
const detailModeDineInBtn = document.getElementById('detailModeDineInBtn');
const detailModeTakeawayBtn = document.getElementById('detailModeTakeawayBtn');
const detailParcelNotice = document.getElementById('detailParcelNotice');
const detailParcelNoticeText = document.getElementById('detailParcelNoticeText');
const btnSetAllDineIn = document.getElementById('btnSetAllDineIn');
const btnSetAllTakeaway = document.getElementById('btnSetAllTakeaway');

// Mobile Nav Buttons
const mobileTabHome = document.getElementById('mobileTabHome');
const mobileTabMenu = document.getElementById('mobileTabMenu');
const mobileTabCart = document.getElementById('mobileTabCart');
const mobileTabWaiter = document.getElementById('mobileTabWaiter');

// ====================================================================
// INITIALIZATION
// ====================================================================
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initTableGateway();
  resolveTableFromUrl();
  buildTableSelectorModal();
  bindEventHandlers();
  fetchMenu();
  initWebSocket();
  initNavbarScroll();
  initScrollAnimations();
});

// ====================================================================
// 0. THEME SYSTEM (Permanently Locked to Vintage Speakeasy Nocturne)
// ====================================================================
function initTheme() {
  document.documentElement.setAttribute('data-theme', 'dark');
  localStorage.removeItem('jb_theme');
}

// ====================================================================
// 0B. TABLE SELECTOR GATEWAY (Entry Screen)
// ====================================================================
function initTableGateway() {
  const gatewayButtons = document.querySelectorAll('.gateway-table-btn');
  gatewayButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tableId = btn.dataset.table;
      if (!tableId) return;

      gatewayButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      setTable(tableId);
      showToast(`Welcome! Seated at ${state.selectedFloor} · Table ${tableId}`);

      setTimeout(() => {
        switchView('HOME');
      }, 240);
    });
  });
}

// ====================================================================
// 1. TABLE RESOLUTION & STATE
// ====================================================================
function resolveTableFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const tableParam = params.get('table') || params.get('t');
  const validTables = ['Top-01', 'Top-02', 'Top-03', 'Top-04', 'Ground-01', 'Ground-02', 'Ground-03', 'Ground-04'];

  if (tableParam && validTables.includes(tableParam)) {
    // 1. Direct Table QR Code Scan: Lock in table, show toast, and bypass Gateway
    setTable(tableParam);
    showToast(`Seated at ${state.selectedFloor} · Table ${tableParam}`);

    // Direct route into menu if requested, otherwise Café Home
    if (params.get('view') === 'menu' || window.location.pathname.includes('/menu')) {
      switchView('MENU');
    } else {
      switchView('HOME');
    }
  } else {
    // 2. Direct Root Visit without table parameter in URL
    const saved = localStorage.getItem('jb_table');
    if (saved && validTables.includes(saved)) {
      setTable(saved);
      if (params.get('view') === 'menu' || window.location.pathname.includes('/menu')) {
        switchView('MENU');
      } else {
        switchView('HOME');
      }
    } else {
      // 3. First-time or unsaved visitor: Land on Table Selector Gateway!
      switchView('GATEWAY');
    }
  }
}

function setTable(tableId) {
  state.selectedTable = tableId;
  state.selectedFloor = tableId.startsWith('Top') ? 'Terrace' : 'Ground Floor';
  localStorage.setItem('jb_table', tableId);

  const displayString = `${tableId} (${state.selectedFloor})`;
  if (currentTableNavText) currentTableNavText.textContent = tableId;
  if (heroTableHint) heroTableHint.textContent = `Table ${displayString}`;
  if (menuTableDisplay) menuTableDisplay.textContent = displayString;
  if (cartTableBadge) cartTableBadge.textContent = `Table: ${displayString}`;
  if (phoneTableChip) phoneTableChip.textContent = `Table: ${displayString}`;
  if (modalActiveTableBadge) modalActiveTableBadge.textContent = `${tableId} · ${state.selectedFloor}`;
  if (paymentTableChip) {
    const phoneDisplay = state.customerPhone ? ` · WhatsApp: +91 ${state.customerPhone}` : '';
    paymentTableChip.textContent = `Table: ${displayString}${phoneDisplay}`;
  }
  if (waiterTableChip) waiterTableChip.textContent = `Table: ${displayString}`;

  // Update active state on gateway buttons if present
  document.querySelectorAll('.gateway-table-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.table === tableId);
  });
}

// ====================================================================
// 2. TABLE SELECTOR MODAL
// ====================================================================
function buildTableSelectorModal() {
  const terrace = Array.from({ length: 4 }, (_, i) => `Top-${String(i + 1).padStart(2, '0')}`);
  const ground = Array.from({ length: 4 }, (_, i) => `Ground-${String(i + 1).padStart(2, '0')}`);

  if (modalActiveTableBadge) {
    modalActiveTableBadge.textContent = `${state.selectedTable} · ${state.selectedFloor}`;
  }

  if (terraceTableBtns) {
    terraceTableBtns.innerHTML = terrace.map(t => `
      <button class="table-select-btn ${t === state.selectedTable ? 'active' : ''}" data-table="${t}">${t}</button>
    `).join('');
  }

  if (groundTableBtns) {
    groundTableBtns.innerHTML = ground.map(t => `
      <button class="table-select-btn ${t === state.selectedTable ? 'active' : ''}" data-table="${t}">${t}</button>
    `).join('');
  }
}

function openTableModal() {
  buildTableSelectorModal();
  if (tableModalBackdrop) {
    tableModalBackdrop.classList.add('is-open');
    tableModalBackdrop.classList.add('open');
  }
}

function closeTableModal() {
  if (tableModalBackdrop) {
    tableModalBackdrop.classList.remove('is-open');
    tableModalBackdrop.classList.remove('open');
  }
}

// ====================================================================
// Helper: measure live navbar height and sync to CSS variable
function updateTopBarHeight() {
  const navbar = document.querySelector('.navbar');
  if (navbar) {
    const h = navbar.offsetHeight;
    if (h > 0) {
      document.documentElement.style.setProperty('--navbar-height', `${h}px`);
    }
  }
}
window.addEventListener('resize', updateTopBarHeight);
window.addEventListener('orientationchange', updateTopBarHeight);
window.addEventListener('load', updateTopBarHeight);

// ====================================================================
// 3. VIEW SWITCHING
// ====================================================================
function switchView(viewName) {
  state.activeView = viewName;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  updateTopBarHeight();

  const mobileNav = document.querySelector('.mobile-nav');
  const stickyCart = document.getElementById('stickyCartBar');

  if (viewName === 'GATEWAY') {
    tableGatewayView?.classList.add('active');
    cafeHomeView?.classList.remove('active');
    menuView?.classList.remove('active');
    tabCafeHome?.classList.remove('active');
    tabFullMenu?.classList.remove('active');
    mobileTabHome?.classList.remove('active');
    mobileTabMenu?.classList.remove('active');
    if (mobileNav) mobileNav.style.display = 'none';
    if (stickyCart) stickyCart.style.display = 'none';
  } else if (viewName === 'HOME') {
    tableGatewayView?.classList.remove('active');
    cafeHomeView?.classList.add('active');
    menuView?.classList.remove('active');
    tabCafeHome?.classList.add('active');
    tabFullMenu?.classList.remove('active');
    mobileTabHome?.classList.add('active');
    mobileTabMenu?.classList.remove('active');
    if (mobileNav) mobileNav.style.display = '';
    if (stickyCart) stickyCart.style.display = '';
  } else {
    tableGatewayView?.classList.remove('active');
    cafeHomeView?.classList.remove('active');
    menuView?.classList.add('active');
    tabCafeHome?.classList.remove('active');
    tabFullMenu?.classList.add('active');
    mobileTabHome?.classList.remove('active');
    mobileTabMenu?.classList.add('active');
    if (mobileNav) mobileNav.style.display = '';
    if (stickyCart) stickyCart.style.display = '';
  }
}

// ====================================================================
// 4. FETCH MENU
// ====================================================================
async function fetchMenu() {
  try {
    const res = await fetch('/api/menu');
    if (!res.ok) throw new Error('Menu fetch failed');
    state.menuItems = await res.json();
    renderSpecialsShowcase();
    renderMenuList();
  } catch (err) {
    console.error(err);
    showToast('Connecting to kitchen menu...');
  }
}

// ====================================================================
// 5. RENDER SPECIALS SHOWCASE (HOMEPAGE)
// ====================================================================
function renderSpecialsShowcase() {
  if (!specialsCarousel) return;
  const specials = state.menuItems.filter(item => item.isSpecial);

  specialsCarousel.innerHTML = specials.map((item, idx) => `
    <div class="special-showcase-card anim-slide ${!item.inStock ? 'is-sold-out' : ''}" data-delay="${idx % 3}" data-id="${item.id}">
      <div class="special-card-top">
        <span class="special-cat-tag">${item.category}</span>
        <span class="special-star-badge">★ Joe's Brew Special</span>
      </div>
      <h3 class="special-item-title">${item.name}</h3>
      <p class="special-item-desc">${item.description}</p>
      <div class="special-card-footer">
        <span class="special-price-tag">₹${item.price}</span>
        <button class="special-add-btn" data-id="${item.id}" ${!item.inStock ? 'disabled' : ''}>
          ${item.inStock ? '+ Add' : 'Sold Out'}
        </button>
      </div>
    </div>
  `).join('');

  observeNewAnimations(specialsCarousel);

  specialsCarousel.querySelectorAll('.special-showcase-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.special-add-btn')) return;
      openItemDetailModal(card.dataset.id);
    });
  });

  specialsCarousel.querySelectorAll('.special-add-btn:not([disabled])').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = e.target.closest('.special-add-btn').dataset.id;
      addToCart(id);
      switchView('MENU');
    });
  });
}

// ====================================================================
// 6. RENDER FULL MODULAR MENU
// ====================================================================
function renderMenuList() {
  if (!menuItemsGrid) return;

  // Prioritized Category Ordering: Artisan Tea -> Fresh Coffee -> Biscuits/Cookies -> Cold Beverages -> Melt -> Snacks -> Eats
  const CATEGORY_PRIORITY = {
    'TEA': 1,
    'COFFEE': 2,
    'COOKIES': 3,
    'DRINKS': 4,
    'MELT': 5,
    'SNACKS': 6,
    'EATS': 7
  };

  let filtered = [...state.menuItems];
  if (state.activeCategory !== 'ALL') {
    filtered = filtered.filter(item => item.category === state.activeCategory);
  } else {
    filtered.sort((a, b) => {
      const pA = CATEGORY_PRIORITY[a.category] || 99;
      const pB = CATEGORY_PRIORITY[b.category] || 99;
      return pA - pB;
    });
  }

  menuItemsGrid.innerHTML = filtered.map((item, idx) => {
    // Total quantity of this menu item across both Dine-In and Takeaway modes
    const totalQty = state.cart.filter(c => c.id === item.id).reduce((sum, c) => sum + c.quantity, 0);
    const isSpecial = item.isSpecial;
    const inStock = item.inStock !== false;

    return `
      <article class="menu-item-card anim-fade ${isSpecial ? 'is-special' : ''} ${!inStock ? 'is-sold-out' : ''}" data-delay="${idx % 4}" data-id="${item.id}">
        <div class="item-card-header">
          <span class="item-cat-label">${item.category}</span>
          ${!inStock ? `<span class="item-sold-out-pill">Sold Out</span>` : (isSpecial ? `<span class="item-special-pill">★ Joe's Brew Special</span>` : '')}
        </div>
        <h3 class="item-name">${item.name}</h3>
        <p class="item-desc">${item.description}</p>
        <div class="item-card-action-bar">
          <span class="item-price">₹${item.price}</span>
          <div class="item-cart-actions">
            ${!inStock ? `
              <button class="btn-add-item" disabled>Sold Out</button>
            ` : (totalQty === 0 ? `
              <button class="btn-add-item" data-id="${item.id}">+ Add</button>
            ` : `
              <div class="qty-counter-group" onclick="event.stopPropagation()">
                <button class="qty-btn btn-minus" data-id="${item.id}">−</button>
                <span class="qty-display">${totalQty}</span>
                <button class="qty-btn btn-plus" data-id="${item.id}">+</button>
              </div>
            `)}
          </div>
        </div>
      </article>
    `;
  }).join('');

  observeNewAnimations(menuItemsGrid);

  // Tapping the card opens item details modal
  menuItemsGrid.querySelectorAll('.menu-item-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.btn-add-item') || e.target.closest('.qty-counter-group')) {
        return;
      }
      openItemDetailModal(card.dataset.id);
    });
  });

  // Attach Add Button handlers (Default is Dine-In)
  menuItemsGrid.querySelectorAll('.btn-add-item:not([disabled])').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = e.target.closest('.btn-add-item').dataset.id;
      addToCart(id, '', 1, 'Dine-In');
    });
  });

  // Attach Plus Stepper handlers (increments Dine-In by default)
  menuItemsGrid.querySelectorAll('.btn-plus').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = e.target.closest('.btn-plus').dataset.id;
      handleQuickMenuPlus(id);
    });
  });

  // Attach Minus Stepper handlers
  menuItemsGrid.querySelectorAll('.btn-minus').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = e.target.closest('.btn-minus').dataset.id;
      handleQuickMenuMinus(id);
    });
  });
}

function handleQuickMenuPlus(itemId) {
  // If there's an existing Dine-In entry, increment it
  const dineInItem = state.cart.find(c => c.id === itemId && c.mode === 'Dine-In');
  if (dineInItem) {
    updateCartQuantityByCartId(dineInItem.cartId, 1);
  } else {
    // Otherwise add as Dine-In (the default)
    addToCart(itemId, '', 1, 'Dine-In');
  }
}

function handleQuickMenuMinus(itemId) {
  // If there's a Dine-In entry, decrement it first
  const dineInItem = state.cart.find(c => c.id === itemId && c.mode === 'Dine-In');
  if (dineInItem) {
    updateCartQuantityByCartId(dineInItem.cartId, -1);
    return;
  }
  // Otherwise find takeaway entry
  const takeawayItem = state.cart.find(c => c.id === itemId);
  if (takeawayItem) {
    updateCartQuantityByCartId(takeawayItem.cartId, -1);
  }
}

// ====================================================================
// 7. ITEM DETAIL MODAL (TAP TO EXPAND)
// ====================================================================
function openItemDetailModal(itemId) {
  const item = state.menuItems.find(m => m.id === itemId);
  if (!item) return;
  if (item.inStock === false) {
    showToast(`${item.name} is currently sold out`);
    return;
  }

  currentDetailItem = item;
  currentDetailMode = 'Dine-In'; // Default is always Dine-In
  currentDetailQty = 1;

  if (itemDetailCategory) itemDetailCategory.textContent = item.category;
  if (itemDetailName) itemDetailName.textContent = item.name;
  if (itemDetailDescription) itemDetailDescription.textContent = item.description;

  if (itemDetailBadgeWrap) {
    itemDetailBadgeWrap.innerHTML = item.isSpecial
      ? `<span class="item-special-pill">★ Joe's Brew Special</span>`
      : '';
  }

  if (itemDetailTags) {
    const tags = [];
    if (item.type === 'hot') tags.push('☕ Hot Serving');
    if (item.type === 'cold') tags.push('🧊 Chilled Serving');
    if (item.type === 'snack') tags.push('🍽️ Fresh Kitchen');
    tags.push('Handcrafted');
    tags.push('Estd 2006 Recipe');
    itemDetailTags.innerHTML = tags.map(t => `<span class="item-tag">${t}</span>`).join('');
  }

  // Reset modal mode toggle buttons: default is Dine-In
  if (detailModeDineInBtn) detailModeDineInBtn.classList.add('active');
  if (detailModeTakeawayBtn) detailModeTakeawayBtn.classList.remove('active');
  if (detailParcelNotice) detailParcelNotice.style.display = 'none';

  if (itemCustomNoteInput) itemCustomNoteInput.value = '';
  updateDetailModalQty();
  itemDetailModalBackdrop?.classList.add('is-open');
}

function updateDetailModalQty() {
  if (!currentDetailItem) return;
  const isHotBev = (currentDetailItem.category === 'TEA' || currentDetailItem.category === 'COFFEE');

  if (itemDetailQtyDisplay) itemDetailQtyDisplay.textContent = currentDetailQty;
  if (itemDetailPrice) itemDetailPrice.textContent = `₹${currentDetailItem.price}`;
  const total = currentDetailItem.price * currentDetailQty;
  if (itemDetailBtnTotal) itemDetailBtnTotal.textContent = `₹${total}`;

  if (detailParcelNotice && detailParcelNoticeText) {
    if (currentDetailMode === 'Takeaway') {
      detailParcelNotice.style.display = 'block';
      if (isHotBev) {
        detailParcelNoticeText.innerHTML = `☕ <strong>Takeaway Flask Container:</strong> <strong>+₹25</strong> container charge covers up to 5 cups of this beverage (an extra ₹25 added for every additional 5 cups). Distinct beverages are packed in separate containers.`;
      } else {
        detailParcelNoticeText.innerHTML = `🥡 <strong>Eco-Friendly Packaging:</strong> <strong>+₹10</strong> per item packaging charge applied at checkout.`;
      }
    } else {
      detailParcelNotice.style.display = 'none';
    }
  }
}

// ====================================================================
// 8. CART OPERATIONS & PER-ITEM DINE-IN / TAKEAWAY
// ====================================================================
function addToCart(itemId, customNote = '', quantity = 1, mode = 'Dine-In') {
  const item = state.menuItems.find(m => m.id === itemId);
  if (!item) return;
  if (item.inStock === false) {
    showToast(`${item.name} is currently sold out`);
    return;
  }

  const itemQty = Math.max(1, Number(quantity) || 1);

  // Look for existing item with matching id, mode, and note
  const existing = state.cart.find(c => c.id === itemId && c.mode === mode && (c.note || '') === (customNote || ''));
  if (existing) {
    existing.quantity += itemQty;
  } else {
    const cartId = `${item.id}_${mode}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    state.cart.push({
      cartId,
      id: item.id,
      name: item.name,
      category: item.category,
      price: item.price,
      quantity: itemQty,
      mode: mode,
      isSpecial: item.isSpecial,
      note: customNote || ''
    });
  }

  showToast(`Added ${itemQty}x ${item.name} (${mode}) to ticket`);
  updateCartUI();
  triggerCartAnimation();
  renderMenuList();
}

function setItemMode(cartId, newMode) {
  const item = state.cart.find(c => c.cartId === cartId);
  if (!item || item.mode === newMode) return;

  const isHotBev = (item.category === 'TEA' || item.category === 'COFFEE');

  if (newMode === 'Takeaway' && isHotBev) {
    showToast(`${item.name} set to Takeaway (+₹25 container covers up to 5 cups)`);
  } else if (newMode === 'Takeaway') {
    showToast(`${item.name} set to Takeaway (+₹10 packaging charge)`);
  } else {
    showToast(`${item.name} set to Dine-In`);
  }

  // Check if another entry with same ID, note, and target mode exists
  const existingTarget = state.cart.find(c => c.cartId !== cartId && c.id === item.id && c.mode === newMode && (c.note || '') === (item.note || ''));
  if (existingTarget) {
    existingTarget.quantity += item.quantity;
    state.cart = state.cart.filter(c => c.cartId !== cartId);
  } else {
    item.mode = newMode;
  }

  updateCartUI();
  renderCartModal();
  renderMenuList();
}

function updateCartQuantityByCartId(cartId, delta) {
  const item = state.cart.find(c => c.cartId === cartId);
  if (!item) return;

  item.quantity += delta;
  if (item.quantity <= 0) {
    state.cart = state.cart.filter(c => c.cartId !== cartId);
    showToast(`Removed ${item.name} from ticket`);
  }

  updateCartUI();
  renderMenuList();
  renderCartModal();
}

function removeFromCartByCartId(cartId) {
  const item = state.cart.find(c => c.cartId === cartId);
  state.cart = state.cart.filter(c => c.cartId !== cartId);
  if (item) {
    showToast(`Removed ${item.name} from ticket`);
  }
  updateCartUI();
  renderMenuList();
  renderCartModal();
}

function setAllItemsMode(newMode) {
  if (state.cart.length === 0) return;

  state.cart.forEach(item => {
    item.mode = newMode;
  });

  // Re-merge duplicates
  const merged = [];
  state.cart.forEach(item => {
    const existing = merged.find(m => m.id === item.id && m.mode === item.mode && (m.note || '') === (item.note || ''));
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      merged.push(item);
    }
  });
  state.cart = merged;

  showToast(`All items set to ${newMode}`);
  updateCartUI();
  renderMenuList();
  renderCartModal();
}

// Backward compatibility alias
function updateCartQuantity(itemId, delta) {
  const dineIn = state.cart.find(c => c.id === itemId && c.mode === 'Dine-In');
  if (dineIn) {
    updateCartQuantityByCartId(dineIn.cartId, delta);
  } else {
    const item = state.cart.find(c => c.id === itemId);
    if (item) updateCartQuantityByCartId(item.cartId, delta);
  }
}

// ====================================================================
// 8.1. PACKAGING CHARGES CALCULATION (Per User Rules)
// - Items with mode 'Takeaway' only:
//   * Artisan Tea & Fresh Coffee: Separate containers per distinct beverage!
//     A flask container holds up to 5 cups of that specific beverage (Rs.25 each).
//   * Quick Bites & Hearty Eats: Rs.10 per item
//   * Milkshake / Cold Drinks: Rs.10 per item
// ====================================================================
function calculatePackagingCharges(cart) {
  const bevMap = {};
  let foodCount = 0;
  let drinkCount = 0;
  let hasTakeaway = false;
  let hasDineIn = false;

  cart.forEach(item => {
    if (item.mode === 'Takeaway') {
      hasTakeaway = true;
      const cat = (item.category || '').toUpperCase();
      const qty = item.quantity || 1;

      if (cat === 'TEA' || cat === 'COFFEE') {
        const key = item.id || item.name;
        if (!bevMap[key]) {
          bevMap[key] = {
            id: key,
            name: item.name,
            category: cat,
            qty: 0
          };
        }
        bevMap[key].qty += qty;
      } else if (cat === 'SNACKS' || cat === 'EATS' || cat === 'COOKIES') {
        foodCount += qty;
      } else if (cat === 'DRINKS' || cat === 'MELT') {
        drinkCount += qty;
      } else {
        foodCount += qty;
      }
    } else {
      hasDineIn = true;
    }
  });

  // Calculate container charges:
  // Each distinct Tea or Coffee item requires its own flask container (each flask holds up to 5 cups of that specific beverage)
  let teaCoffeeContainers = 0;
  let teaCoffeeCharge = 0;
  let teaCoffeeCount = 0;
  const bevBreakdown = [];

  Object.values(bevMap).forEach(bev => {
    const containers = Math.ceil(bev.qty / 5);
    const charge = containers * 25;
    teaCoffeeContainers += containers;
    teaCoffeeCharge += charge;
    teaCoffeeCount += bev.qty;
    bevBreakdown.push({
      id: bev.id,
      name: bev.name,
      category: bev.category,
      qty: bev.qty,
      containers,
      charge
    });
  });

  // Quick Bites & Hearty Eats: Rs.10 per item
  const foodCharge = foodCount * 10;

  // Milkshakes & cold beverages: Rs.10 per item
  const drinkCharge = drinkCount * 10;

  const totalPackaging = teaCoffeeCharge + foodCharge + drinkCharge;
  const overallMode = (hasTakeaway && hasDineIn) 
    ? 'Mixed' 
    : (hasTakeaway ? 'Takeaway' : 'Dine-In');

  return {
    totalPackaging,
    teaCoffeeCharge,
    teaCoffeeCount,
    teaCoffeeContainers,
    bevBreakdown,
    foodCharge,
    foodCount,
    drinkCharge,
    drinkCount,
    overallMode,
    hasTakeaway,
    hasDineIn
  };
}

function updateCartUI() {
  const totalCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const packInfo = calculatePackagingCharges(state.cart);
  state.packagingCharge = packInfo.totalPackaging;
  state.orderMode = packInfo.overallMode;
  const grandTotal = subtotal + state.packagingCharge;

  if (cartCountBadge) {
    cartCountBadge.textContent = totalCount;
    cartCountBadge.style.display = totalCount > 0 ? 'inline-flex' : 'none';
  }

  if (mobileCartCountBadge) {
    mobileCartCountBadge.textContent = totalCount;
    mobileCartCountBadge.style.display = totalCount > 0 ? 'flex' : 'none';
  }

  if (stickyCartBar) {
    if (totalCount > 0) {
      stickyCartBar.classList.add('is-visible');
      if (stickyCartCount) stickyCartCount.textContent = totalCount;
      if (stickyCartTotal) stickyCartTotal.textContent = grandTotal;
    } else {
      stickyCartBar.classList.remove('is-visible');
    }
  }

  if (cartSubtotalVal) cartSubtotalVal.textContent = `₹${subtotal}`;
  if (cartGrandTotalVal) cartGrandTotalVal.textContent = `₹${grandTotal}`;
  if (proceedPaymentTotal) proceedPaymentTotal.textContent = `₹${grandTotal}`;
  if (paymentBannerAmount) paymentBannerAmount.textContent = `₹${grandTotal}`;

  // Update Packaging Row in Bill
  const cartPackagingRow = document.getElementById('cartPackagingRow');
  const cartPackagingVal = document.getElementById('cartPackagingVal');
  const cartPackagingBreakdown = document.getElementById('cartPackagingBreakdown');

  if (cartPackagingRow) {
    if (state.packagingCharge > 0) {
      cartPackagingRow.style.display = 'flex';
      if (cartPackagingVal) cartPackagingVal.textContent = `+₹${state.packagingCharge}`;
    } else {
      cartPackagingRow.style.display = 'none';
    }
  }

  if (cartPackagingBreakdown) {
    if (state.packagingCharge > 0) {
      const rows = [];
      if (packInfo.teaCoffeeCharge > 0) {
        if (packInfo.bevBreakdown && packInfo.bevBreakdown.length > 1) {
          const detailStr = packInfo.bevBreakdown.map(b => `${b.containers}x Flask for ${b.name} (${b.qty} cup${b.qty > 1 ? 's' : ''})`).join(', ');
          rows.push(`<div class="cart-bill__breakdown-item"><span>☕ ${packInfo.teaCoffeeContainers}x Flask Containers (${detailStr} — ₹25 each up to 5 cups):</span><strong>₹${packInfo.teaCoffeeCharge}</strong></div>`);
        } else if (packInfo.bevBreakdown && packInfo.bevBreakdown.length === 1) {
          const single = packInfo.bevBreakdown[0];
          rows.push(`<div class="cart-bill__breakdown-item"><span>☕ ${packInfo.teaCoffeeContainers}x Flask Container (${single.name}, ${single.qty} cup${single.qty > 1 ? 's' : ''} — holds up to 5):</span><strong>₹${packInfo.teaCoffeeCharge}</strong></div>`);
        }
      }
      if (packInfo.foodCharge > 0) {
        rows.push(`<div class="cart-bill__breakdown-item"><span>🍽️ ${packInfo.foodCount}x Food Eco-box (Quick Bites & Eats):</span><strong>₹${packInfo.foodCharge}</strong></div>`);
      }
      if (packInfo.drinkCharge > 0) {
        rows.push(`<div class="cart-bill__breakdown-item"><span>🥤 ${packInfo.drinkCount}x Sealed Cup (Milkshakes & Cold):</span><strong>₹${packInfo.drinkCharge}</strong></div>`);
      }
      cartPackagingBreakdown.innerHTML = rows.join('');
      cartPackagingBreakdown.style.display = 'block';
    } else {
      cartPackagingBreakdown.style.display = 'none';
      cartPackagingBreakdown.innerHTML = '';
    }
  }

  const orderModeChip = document.getElementById('orderModeChip');
  if (orderModeChip) {
    if (packInfo.overallMode === 'Takeaway') {
      orderModeChip.textContent = '🥡 All Takeaway';
    } else if (packInfo.overallMode === 'Mixed') {
      orderModeChip.textContent = '🍽️ + 🥡 Mixed Order';
    } else {
      orderModeChip.textContent = '🍽️ Dine-In by Default';
    }
  }

  if (cartTableBadge) {
    cartTableBadge.textContent = `Table: ${state.selectedTable} · ${packInfo.overallMode}`;
  }

  const paymentOrderTypeLabel = document.getElementById('paymentOrderTypeLabel');
  if (paymentOrderTypeLabel) {
    if (packInfo.overallMode === 'Takeaway') {
      paymentOrderTypeLabel.textContent = '🥡 Takeaway / Parcel';
    } else if (packInfo.overallMode === 'Mixed') {
      paymentOrderTypeLabel.textContent = '🍽️ + 🥡 Mixed Order (Dine-In + Takeaway)';
    } else {
      paymentOrderTypeLabel.textContent = '🍽️ Dine-In Table';
    }
  }
}

// ====================================================================
// 9. CART MODAL RENDERING (Per-Item Toggle Buttons)
// ====================================================================
function renderCartModal() {
  if (!cartItemsList) return;

  if (state.cart.length === 0) {
    cartItemsList.innerHTML = `
      <div style="text-align: center; padding: 36px 20px; color: var(--text-muted);">
        <p style="font-size: 2rem; margin-bottom: 8px;">☕</p>
        <p style="font-size: 1.05rem; font-weight: 800; color: var(--text-main);">Your ticket is empty</p>
        <p style="font-size: 0.86rem; margin-top: 4px;">Explore our menu and add your favorites!</p>
      </div>
    `;
    if (proceedToPaymentBtn) proceedToPaymentBtn.disabled = true;
    updateCartUI();
    return;
  }

  if (proceedToPaymentBtn) proceedToPaymentBtn.disabled = false;

  cartItemsList.innerHTML = state.cart.map(item => {
    const isHotBev = (item.category === 'TEA' || item.category === 'COFFEE');
    const isTakeaway = item.mode === 'Takeaway';

    return `
      <div class="cart-item-card" data-cart-id="${item.cartId}">
        <div class="cart-item-card__header">
          <div style="flex: 1; min-width: 0;">
            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
              <h4 class="cart-item-name">${item.name}</h4>
              <span class="cart-item-mode-pill ${isTakeaway ? 'is-takeaway' : 'is-dinein'}">
                ${isTakeaway ? '🥡 Takeaway' : '🍽️ Dine-In'}
              </span>
            </div>
            <span class="cart-item-unit-price">₹${item.price} each</span>
            ${isTakeaway && isHotBev ? `
              <div class="item-parcel-pill" style="margin-top: 4px;">
                <span>☕ Flask Container: +₹25 per 5 cups</span>
              </div>
            ` : (isTakeaway ? `
              <div class="item-parcel-pill" style="margin-top: 4px;">
                <span>🥡 Eco-box: +₹10 per item</span>
              </div>
            ` : '')}
            ${item.note ? `<div class="cart-item-note" style="margin-top: 3px;">Note: ${item.note}</div>` : ''}
          </div>
          <button type="button" class="cart-item-remove-btn" data-cart-id="${item.cartId}" title="Remove item" aria-label="Remove item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </button>
        </div>

        <div class="cart-item-mode-selector" role="radiogroup" style="margin-top: 10px;">
          <button type="button" class="item-mode-btn ${!isTakeaway ? 'active' : ''}" data-cart-id="${item.cartId}" data-mode="Dine-In">
            <span>🍽️ Dine-In</span>
          </button>
          <button type="button" class="item-mode-btn ${isTakeaway ? 'active' : ''}" data-cart-id="${item.cartId}" data-mode="Takeaway">
            <span>🥡 Takeaway</span>
          </button>
        </div>

        <div class="cart-item-footer" style="margin-top: 10px;">
          <div class="qty-counter-group">
            <button type="button" class="qty-btn cart-minus" data-cart-id="${item.cartId}">−</button>
            <span class="qty-display">${item.quantity}</span>
            <button type="button" class="qty-btn cart-plus" data-cart-id="${item.cartId}">+</button>
          </div>
          <span class="cart-item-total">₹${item.price * item.quantity}</span>
        </div>
      </div>
    `;
  }).join('');

  // Attach Item Mode Toggle handlers
  cartItemsList.querySelectorAll('.item-mode-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetBtn = e.target.closest('.item-mode-btn');
      const cartId = targetBtn.dataset.cartId;
      const mode = targetBtn.dataset.mode;
      setItemMode(cartId, mode);
    });
  });

  // Attach Plus Stepper handlers
  cartItemsList.querySelectorAll('.cart-plus').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const cartId = e.target.closest('.cart-plus').dataset.cartId;
      updateCartQuantityByCartId(cartId, 1);
    });
  });

  // Attach Minus Stepper handlers
  cartItemsList.querySelectorAll('.cart-minus').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const cartId = e.target.closest('.cart-minus').dataset.cartId;
      updateCartQuantityByCartId(cartId, -1);
    });
  });

  // Attach Remove Button handlers
  cartItemsList.querySelectorAll('.cart-item-remove-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const cartId = e.target.closest('.cart-item-remove-btn').dataset.cartId;
      removeFromCartByCartId(cartId);
    });
  });

  updateCartUI();
}

// ====================================================================
// 10. PAYMENT & ORDER SUBMISSION
// ====================================================================
async function submitOrder() {
  if (state.cart.length === 0) return;

  const notes = orderGeneralNotes?.value.trim() || '';
  const packInfo = calculatePackagingCharges(state.cart);
  const packagingCharge = packInfo.totalPackaging;
  const subtotal = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const grandTotal = subtotal + packagingCharge;

  const orderPayload = {
    tableId: state.selectedTable,
    floor: state.selectedFloor,
    items: state.cart,
    instructions: notes,
    orderMode: packInfo.overallMode,
    packagingCharge: packagingCharge,
    subtotal: subtotal,
    total: grandTotal,
    paymentMode: 'Pay at Counter',
    paymentStatus: 'Pending (Pay at Counter)',
    customerName: state.customerName || 'Guest',
    customerPhone: state.customerPhone || ''
  };

  try {
    confirmOrderBtn.disabled = true;
    confirmOrderBtn.innerHTML = `<span>Brewing Ticket...</span>`;

    // 1. Immediately hide payment modal and display cafe brewing animation
    paymentModalBackdrop?.classList.remove('is-open');
    paymentModalBackdrop?.classList.remove('open');
    if (orderBrewingOverlay) {
      orderBrewingOverlay.classList.add('is-open');
      orderBrewingOverlay.classList.add('open');
    }

    // Pacing delay (~800ms) so customer gets to enjoy the handcrafted cafe animation
    const minDelay = new Promise(resolve => setTimeout(resolve, 800));

    const orderPromise = fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload)
    }).then(async res => {
      if (!res.ok) throw new Error('Order creation failed');
      return res.json();
    });

    const [createdOrder] = await Promise.all([orderPromise, minDelay]);
    state.activeOrder = createdOrder;

    // Reset Cart
    state.cart = [];
    if (orderGeneralNotes) orderGeneralNotes.value = '';
    updateCartUI();
    renderMenuList();

    // Populate Success Modal
    const displayNum = createdOrder.orderNumber ? `#${createdOrder.orderNumber}` : (createdOrder.id?.startsWith('JB-') ? `#${createdOrder.id.replace('JB-', '')}` : `#${createdOrder.id}`);
    if (successOrderNo) successOrderNo.textContent = displayNum;
    if (successTable) {
      const waText = createdOrder.customerPhone ? `<br><small style="color:#25D366;font-size:0.80rem;font-weight:700;">📲 WhatsApp Alert: +91 ${createdOrder.customerPhone}</small>` : '';
      successTable.innerHTML = `${createdOrder.tableId} (${createdOrder.floor})${waText}`;
    }
    updateLiveTrackerUI(createdOrder.status);

    // Hide brewing animation and open Success Modal
    if (orderBrewingOverlay) {
      orderBrewingOverlay.classList.remove('is-open');
      orderBrewingOverlay.classList.remove('open');
    }
    orderSuccessModal.classList.add('is-open');
    orderSuccessModal.classList.add('open');

    try { chimeAudio.play(); } catch (e) {}
    showToast(`Order ${displayNum} placed! Kitchen alerted.`);
  } catch (err) {
    console.error(err);
    if (orderBrewingOverlay) {
      orderBrewingOverlay.classList.remove('is-open');
      orderBrewingOverlay.classList.remove('open');
    }
    paymentModalBackdrop?.classList.add('is-open');
    paymentModalBackdrop?.classList.add('open');
    showToast('Failed to send order. Please try again.');
  } finally {
    confirmOrderBtn.disabled = false;
    confirmOrderBtn.innerHTML = `
      <span>Confirm & Send to Kitchen</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
    `;
  }
}

function updateLiveTrackerUI(status) {
  const stepReceived = document.getElementById('stepReceived');
  const stepPreparing = document.getElementById('stepPreparing');
  const stepReady = document.getElementById('stepReady');

  [stepReceived, stepPreparing, stepReady].forEach(s => s?.classList.remove('active'));

  if (status === 'Received') {
    stepReceived?.classList.add('active');
  } else if (status === 'Preparing') {
    stepReceived?.classList.add('active');
    stepPreparing?.classList.add('active');
  } else if (status === 'Ready to Serve' || status === 'Completed') {
    stepReceived?.classList.add('active');
    stepPreparing?.classList.add('active');
    stepReady?.classList.add('active');
  }
}

// ====================================================================
// 11. CALL WAITER
// ====================================================================
async function submitWaiterCall() {
  try {
    const res = await fetch('/api/call-waiter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tableId: state.selectedTable,
        floor: state.selectedFloor,
        reason: state.selectedWaiterReason
      })
    });

    if (!res.ok) throw new Error('Call waiter failed');
    waiterModalBackdrop.classList.remove('is-open');
    showToast(`Staff notified: ${state.selectedWaiterReason} for ${state.selectedTable}`);
  } catch (e) {
    showToast('Unable to alert staff. Please try again.');
  }
}

// ====================================================================
// 12. REAL-TIME SYNC (SUPABASE REALTIME & WEBSOCKET FALLBACK)
// ====================================================================
async function initWebSocket() {
  // Check if Supabase Realtime is enabled (production mode on Vercel)
  try {
    const res = await fetch('/api/config');
    const config = await res.json();
    if (config.isSupabase && config.supabaseUrl && config.supabaseAnonKey && window.supabase) {
      console.log('⚡ Connected to Supabase Cloud Realtime');
      const sb = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);

      // Listen for order status updates
      sb.channel('customer-orders')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
          const updated = payload.new;
          if (state.activeOrder && state.activeOrder.id === updated.id) {
            state.activeOrder.status = updated.status;
            updateLiveTrackerUI(updated.status);
            try { chimeAudio.play(); } catch (e) {}
            showToast(`Kitchen status: ${updated.status}`);
          }
        })
        .subscribe();

      // Listen for menu stock changes
      sb.channel('customer-menu')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'menu_items' }, (payload) => {
          const updated = payload.new;
          const item = state.menuItems.find(m => m.id === updated.id);
          if (item) {
            item.inStock = updated.in_stock;
            renderMenuList();
            renderSpecialsShowcase();
            showToast(`${updated.name} is now ${updated.in_stock ? 'Available' : 'Sold Out'}`);
          }
        })
        .subscribe();

      state.wsConnected = true;
      return;
    }
  } catch (err) {
    // Fall back to local WebSocket
  }

  // Local Node.js WebSocket fallback
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}`;

  try {
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      state.wsConnected = true;
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handleSocketMessage(msg);
      } catch (e) {}
    };

    socket.onclose = () => {
      state.wsConnected = false;
      setTimeout(initWebSocket, 3000);
    };
  } catch (e) {}
}

function handleSocketMessage(msg) {
  if (msg.type === 'ORDER_STATUS_UPDATE') {
    const { orderId, status } = msg.data;
    if (state.activeOrder && state.activeOrder.id === orderId) {
      state.activeOrder.status = status;
      updateLiveTrackerUI(status);
      try { chimeAudio.play(); } catch (e) {}
      showToast(`Kitchen status: ${status}`);
    }
  } else if (msg.type === 'STOCK_UPDATE') {
    const { itemId, inStock, name } = msg.data;
    const item = state.menuItems.find(m => m.id === itemId);
    if (item) {
      item.inStock = inStock;
      renderMenuList();
      renderSpecialsShowcase();
      showToast(`${name} is now ${inStock ? 'Available' : 'Sold Out'}`);
    }
  } else if (msg.type === 'MENU_UPDATE') {
    const { action, item, itemId } = msg.data || {};
    if (action === 'ADD' && item) {
      if (!state.menuItems.some(m => m.id === item.id)) {
        state.menuItems.push(item);
      }
      renderMenuList();
      renderSpecialsShowcase();
      showToast(`✨ New creation added: ${item.name}`);
    } else if (action === 'UPDATE' && item) {
      const idx = state.menuItems.findIndex(m => m.id === item.id);
      if (idx !== -1) {
        state.menuItems[idx] = item;
      }
      // Update price in active cart if already added
      state.cart.forEach(cartItem => {
        if (cartItem.id === item.id) {
          cartItem.price = item.price;
        }
      });
      updateCartUI();
      renderMenuList();
      renderSpecialsShowcase();
    } else if (action === 'DELETE' && itemId) {
      state.menuItems = state.menuItems.filter(m => m.id !== itemId);
      renderMenuList();
      renderSpecialsShowcase();
    }
  }
}

// ====================================================================
// 13. EVENT HANDLERS
// ====================================================================
function bindEventHandlers() {
  // Navigation Tabs & Links
  const navigateToHomeOrGateway = () => {
    const validTables = ['Top-01', 'Top-02', 'Top-03', 'Top-04', 'Ground-01', 'Ground-02', 'Ground-03', 'Ground-04'];
    const saved = localStorage.getItem('jb_table');
    if (saved && validTables.includes(saved)) {
      switchView('HOME');
    } else {
      switchView('GATEWAY');
    }
  };

  tabCafeHome?.addEventListener('click', navigateToHomeOrGateway);
  tabFullMenu?.addEventListener('click', () => switchView('MENU'));
  navHomeLink?.addEventListener('click', navigateToHomeOrGateway);
  heroOrderNowBtn?.addEventListener('click', () => switchView('MENU'));
  browseAllMenuBtn?.addEventListener('click', () => switchView('MENU'));

  // Mobile Bottom Navigation Tabs
  mobileTabHome?.addEventListener('click', navigateToHomeOrGateway);
  mobileTabMenu?.addEventListener('click', () => switchView('MENU'));
  mobileTabCart?.addEventListener('click', () => {
    renderCartModal();
    cartModalBackdrop.classList.add('is-open');
  });
  mobileTabWaiter?.addEventListener('click', () => {
    waiterModalBackdrop.classList.add('is-open');
  });

  // Menu Category Buttons (.cat-btn)
  menuCategoriesBar?.addEventListener('click', (e) => {
    const btn = e.target.closest('.cat-btn');
    if (!btn) return;
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.activeCategory = btn.dataset.cat;
    renderMenuList();
  });

  // Item Detail Modal Actions
  closeItemDetailBtn?.addEventListener('click', () => {
    itemDetailModalBackdrop?.classList.remove('is-open');
  });

  detailModeDineInBtn?.addEventListener('click', () => {
    currentDetailMode = 'Dine-In';
    detailModeDineInBtn.classList.add('active');
    detailModeTakeawayBtn?.classList.remove('active');
    updateDetailModalQty();
  });

  detailModeTakeawayBtn?.addEventListener('click', () => {
    currentDetailMode = 'Takeaway';
    detailModeTakeawayBtn.classList.add('active');
    detailModeDineInBtn?.classList.remove('active');
    updateDetailModalQty();
  });

  itemDetailMinusBtn?.addEventListener('click', () => {
    if (currentDetailQty > 1) {
      currentDetailQty -= 1;
      updateDetailModalQty();
    }
  });

  itemDetailPlusBtn?.addEventListener('click', () => {
    currentDetailQty += 1;
    updateDetailModalQty();
  });

  itemDetailAddToCartBtn?.addEventListener('click', () => {
    if (!currentDetailItem) return;
    const note = itemCustomNoteInput ? itemCustomNoteInput.value.trim() : '';
    addToCart(currentDetailItem.id, note, currentDetailQty, currentDetailMode);
    itemDetailModalBackdrop?.classList.remove('is-open');
  });

  // Bulk Cart Buttons: Set All Dine-In vs Set All Takeaway
  btnSetAllDineIn?.addEventListener('click', () => {
    setAllItemsMode('Dine-In');
  });

  btnSetAllTakeaway?.addEventListener('click', () => {
    setAllItemsMode('Takeaway');
  });

  // Cart Open & Close
  cartNavBtn?.addEventListener('click', () => {
    renderCartModal();
    cartModalBackdrop.classList.add('is-open');
  });

  openCartBtn?.addEventListener('click', () => {
    renderCartModal();
    cartModalBackdrop.classList.add('is-open');
  });

  closeCartBtn?.addEventListener('click', () => {
    cartModalBackdrop.classList.remove('is-open');
  });

  // Proceed to Phone & WhatsApp Modal
  proceedToPaymentBtn?.addEventListener('click', () => {
    cartModalBackdrop?.classList.remove('is-open');
    cartModalBackdrop?.classList.remove('open');
    if (phoneTableChip) phoneTableChip.textContent = `Table: ${state.selectedTable} (${state.selectedFloor})`;
    if (customerPhoneInput && state.customerPhone) customerPhoneInput.value = state.customerPhone;
    if (customerNameInput && state.customerName) customerNameInput.value = state.customerName;
    customerPhoneModalBackdrop?.classList.add('is-open');
    customerPhoneModalBackdrop?.classList.add('open');
    setTimeout(() => customerPhoneInput?.focus(), 250);
  });

  closePhoneModalBtn?.addEventListener('click', () => {
    customerPhoneModalBackdrop?.classList.remove('is-open');
    customerPhoneModalBackdrop?.classList.remove('open');
  });

  // Proceed from Phone Modal to Payment Modal
  proceedToPaymentFinalBtn?.addEventListener('click', () => {
    const rawPhone = customerPhoneInput ? customerPhoneInput.value.trim() : '';
    const cleanDigits = rawPhone.replace(/\D/g, '');

    if (!cleanDigits || cleanDigits.length !== 10) {
      if (phoneErrorHint) {
        phoneErrorHint.textContent = '⚠️ Please enter a valid 10-digit mobile number for WhatsApp alerts';
        phoneErrorHint.style.color = '#E74C3C';
        phoneErrorHint.style.fontWeight = '700';
      }
      customerPhoneInput?.focus();
      return;
    }

    if (phoneErrorHint) {
      phoneErrorHint.textContent = 'Kitchen uses this to send your order ready notification';
      phoneErrorHint.style.color = 'var(--text-muted)';
      phoneErrorHint.style.fontWeight = 'normal';
    }

    const name = customerNameInput ? customerNameInput.value.trim() : '';
    state.customerPhone = cleanDigits;
    state.customerName = name;
    localStorage.setItem('jb_phone', cleanDigits);
    if (name) localStorage.setItem('jb_name', name);

    customerPhoneModalBackdrop?.classList.remove('is-open');
    customerPhoneModalBackdrop?.classList.remove('open');

    if (paymentTableChip) {
      paymentTableChip.textContent = `Table: ${state.selectedTable} · WhatsApp: +91 ${cleanDigits}`;
    }

    paymentModalBackdrop?.classList.add('is-open');
    paymentModalBackdrop?.classList.add('open');
  });

  closePaymentBtn?.addEventListener('click', () => {
    paymentModalBackdrop?.classList.remove('is-open');
    paymentModalBackdrop?.classList.remove('open');
  });

  confirmOrderBtn?.addEventListener('click', submitOrder);

  // Success Modal Actions: Dismiss and return to Homepage
  orderDoneBtn?.addEventListener('click', () => {
    orderSuccessModal.classList.remove('is-open');
    orderSuccessModal.classList.remove('open');
    switchView('HOME');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  successCallWaiterBtn?.addEventListener('click', () => {
    orderSuccessModal.classList.remove('is-open');
    orderSuccessModal.classList.remove('open');
    waiterModalBackdrop.classList.add('is-open');
    waiterModalBackdrop.classList.add('open');
  });

  // Call Waiter Modal
  callWaiterNavBtn?.addEventListener('click', () => {
    waiterModalBackdrop.classList.add('is-open');
    waiterModalBackdrop.classList.add('open');
  });

  closeWaiterModalBtn?.addEventListener('click', () => {
    waiterModalBackdrop.classList.remove('is-open');
    waiterModalBackdrop.classList.remove('open');
  });

  // Waiter Reason Selection (.waiter-option)
  document.querySelectorAll('.waiter-option').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.waiter-option').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      state.selectedWaiterReason = opt.dataset.reason;
    });
  });

  sendWaiterCallBtn?.addEventListener('click', submitWaiterCall);

  // Table Selector Modal
  tableSelectorBtn?.addEventListener('click', openTableModal);
  menuTableSwitcherTag?.addEventListener('click', openTableModal);
  document.getElementById('heroTableChangeBtn')?.addEventListener('click', openTableModal);

  closeTableModalBtn?.addEventListener('click', closeTableModal);

  confirmTableSelectionBtn?.addEventListener('click', () => {
    closeTableModal();
    showToast(`Table confirmed: ${state.selectedTable} (${state.selectedFloor})`);
    switchView('MENU');
  });

  [terraceTableBtns, groundTableBtns].forEach(grid => {
    grid?.addEventListener('click', (e) => {
      const btn = e.target.closest('.table-select-btn');
      if (!btn) return;
      setTable(btn.dataset.table);
      buildTableSelectorModal();
      closeTableModal();
      showToast(`Seated at Table ${state.selectedTable} (${state.selectedFloor})`);
    });
  });

  // Dismiss modals by clicking on backdrop
  [cartModalBackdrop, customerPhoneModalBackdrop, paymentModalBackdrop, waiterModalBackdrop, tableModalBackdrop, orderSuccessModal, itemDetailModalBackdrop].forEach(backdrop => {
    backdrop?.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        backdrop.classList.remove('is-open');
        backdrop.classList.remove('open');
      }
    });
  });

  // Global Escape key to close active modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      [cartModalBackdrop, customerPhoneModalBackdrop, paymentModalBackdrop, waiterModalBackdrop, tableModalBackdrop, orderSuccessModal, itemDetailModalBackdrop].forEach(b => {
        b?.classList.remove('is-open');
        b?.classList.remove('open');
      });
    }
  });
}

// ====================================================================
// 13B. SCROLL & ENTRANCE ANIMATION ENGINE
// ====================================================================
let scrollObserver = null;

function initScrollAnimations() {
  const animatedElements = document.querySelectorAll('.anim-fade, .anim-slide');
  if (!animatedElements.length) return;

  if ('IntersectionObserver' in window) {
    if (scrollObserver) scrollObserver.disconnect();

    scrollObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          scrollObserver.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: '0px 0px -30px 0px',
      threshold: 0.1
    });

    animatedElements.forEach(el => scrollObserver.observe(el));
  } else {
    animatedElements.forEach(el => el.classList.add('is-visible'));
  }
}

function observeNewAnimations(container = document) {
  if (!scrollObserver) {
    initScrollAnimations();
    return;
  }
  const elements = container.querySelectorAll('.anim-fade:not(.is-visible), .anim-slide:not(.is-visible)');
  elements.forEach(el => scrollObserver.observe(el));
}

// Micro-interaction: Animated Cart Button Bounce & Spring Pop
function triggerCartAnimation() {
  const targets = [
    document.querySelector('.nav-btn--cart'),
    document.getElementById('mobileTabCart')
  ];
  targets.forEach(btn => {
    if (!btn) return;
    btn.classList.remove('cart-bounce');
    void btn.offsetWidth; // Force reflow
    btn.classList.add('cart-bounce');
    setTimeout(() => btn.classList.remove('cart-bounce'), 600);
  });
}

// ====================================================================
// 14. TOAST NOTIFICATIONS
// ====================================================================
function showToast(message) {
  if (!toastStack) return;
  const toast = document.createElement('div');
  toast.className = 'vintage-toast';
  toast.innerHTML = `<span>☕</span> <span>${message}</span>`;
  toastStack.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'all 0.3s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-8px)';
    setTimeout(() => toast.remove(), 300);
  }, 2600);
}

// ====================================================================
// 15. NAVBAR SCROLL EFFECT
// ====================================================================
function initNavbarScroll() {
  const navbar = document.getElementById('glassNavbar');
  if (!navbar) return;

  window.addEventListener('scroll', () => {
    if (window.pageYOffset > 15) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }, { passive: true });
}
