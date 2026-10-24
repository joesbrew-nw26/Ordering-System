/**
 * Joe's Brew - Client Application
 * Vintage Glassmorphism, Multi-View Cafe & Menu Flow, Cart & UPI Checkout
 */

const state = {
  menuItems: [],
  cart: [],
  selectedTable: 'Top-04',
  selectedFloor: 'Upstairs',
  activeView: 'HOME', // 'HOME' or 'MENU'
  activeCategory: 'ALL',
  activeOrder: null,
  selectedWaiterReason: 'Water Refill',
  wsConnected: false
};

// Audio cue for order and alerts
const chimeAudio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');

// DOM References
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

// Table Display Elements
const currentTableNavText = document.getElementById('currentTableNavText');
const heroTableHint = document.getElementById('heroTableHint');
const menuTableDisplay = document.getElementById('menuTableDisplay');
const menuTableSwitcherTag = document.getElementById('menuTableSwitcherTag');
const tableSelectorBtn = document.getElementById('tableSelectorBtn');
const tableModalBackdrop = document.getElementById('tableModalBackdrop');
const closeTableModalBtn = document.getElementById('closeTableModalBtn');
const upstairsTableBtns = document.getElementById('upstairsTableBtns');
const groundTableBtns = document.getElementById('groundTableBtns');

// Cart & Modals
const cartNavBtn = document.getElementById('cartNavBtn');
const cartCountBadge = document.getElementById('cartCountBadge');
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

// Payment Modal
const paymentModalBackdrop = document.getElementById('paymentModalBackdrop');
const closePaymentBtn = document.getElementById('closePaymentBtn');
const paymentTableChip = document.getElementById('paymentTableChip');
const paymentBannerAmount = document.getElementById('paymentBannerAmount');
const modeCardUpi = document.getElementById('modeCardUpi');
const modeCardCounter = document.getElementById('modeCardCounter');
const confirmOrderBtn = document.getElementById('confirmOrderBtn');

// Order Success Modal
const orderSuccessModal = document.getElementById('orderSuccessModal');
const successOrderNo = document.getElementById('successOrderNo');
const successTable = document.getElementById('successTable');
const orderDoneBtn = document.getElementById('orderDoneBtn');
const successCallWaiterBtn = document.getElementById('successCallWaiterBtn');

// Waiter Modal
const callWaiterNavBtn = document.getElementById('callWaiterNavBtn');
const waiterModalBackdrop = document.getElementById('waiterModalBackdrop');
const closeWaiterModalBtn = document.getElementById('closeWaiterModalBtn');
const waiterTableChip = document.getElementById('waiterTableChip');
const sendWaiterCallBtn = document.getElementById('sendWaiterCallBtn');
const toastStack = document.getElementById('toastStack');

// ==========================================================================
// INITIALIZATION
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  resolveTableFromUrl();
  buildTableSelectorModal();
  bindEventHandlers();
  fetchMenu();
  initWebSocket();
});

// 1. Table Resolution from Query or Storage
function resolveTableFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const tableParam = params.get('table') || params.get('t');

  if (tableParam) {
    setTable(tableParam);
  } else {
    const saved = localStorage.getItem('jb_table');
    if (saved) {
      setTable(saved);
    } else {
      setTable('Top-04');
    }
  }
}

function setTable(tableId) {
  state.selectedTable = tableId;
  state.selectedFloor = tableId.startsWith('Top') ? 'Upstairs' : 'Ground Floor';
  localStorage.setItem('jb_table', tableId);

  const displayString = `${tableId} (${state.selectedFloor})`;
  if (currentTableNavText) currentTableNavText.textContent = displayString;
  if (heroTableHint) heroTableHint.textContent = `Table ${displayString}`;
  if (menuTableDisplay) menuTableDisplay.textContent = displayString;
  if (cartTableBadge) cartTableBadge.textContent = `Table: ${displayString}`;
  if (paymentTableChip) paymentTableChip.textContent = `Table: ${displayString}`;
  if (waiterTableChip) waiterTableChip.textContent = `Table: ${displayString}`;
}

// 2. Build Table Modal Grids
function buildTableSelectorModal() {
  const upstairs = Array.from({ length: 10 }, (_, i) => `Top-${String(i + 1).padStart(2, '0')}`);
  const ground = Array.from({ length: 6 }, (_, i) => `Ground-${String(i + 1).padStart(2, '0')}`);

  if (upstairsTableBtns) {
    upstairsTableBtns.innerHTML = upstairs.map(t => `
      <button class="table-select-btn ${t === state.selectedTable ? 'active' : ''}" data-table="${t}">
        ${t}
      </button>
    `).join('');
  }

  if (groundTableBtns) {
    groundTableBtns.innerHTML = ground.map(t => `
      <button class="table-select-btn ${t === state.selectedTable ? 'active' : ''}" data-table="${t}">
        ${t}
      </button>
    `).join('');
  }
}

// 3. View Switching (The Cafe Home vs. Our Menu)
function switchView(viewName) {
  state.activeView = viewName;
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (viewName === 'HOME') {
    cafeHomeView?.classList.add('active');
    menuView?.classList.remove('active');
    tabCafeHome?.classList.add('active');
    tabFullMenu?.classList.remove('active');
  } else {
    cafeHomeView?.classList.remove('active');
    menuView?.classList.add('active');
    tabCafeHome?.classList.remove('active');
    tabFullMenu?.classList.add('active');
  }
}

// 4. Fetch Menu from Backend
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

// 5. Render Curated Specials Showcase on Homepage
function renderSpecialsShowcase() {
  if (!specialsCarousel) return;
  const specials = state.menuItems.filter(item => item.isSpecial);

  specialsCarousel.innerHTML = specials.map(item => {
    return `
      <div class="special-showcase-card" data-id="${item.id}">
        <div class="special-card-top">
          <span class="special-cat-tag">${item.category}</span>
          <span class="special-star-badge">★ ${item.badge || "House Special"}</span>
        </div>
        <h3 class="special-item-title">${item.name}</h3>
        <p class="special-item-desc">${item.description}</p>
        <div class="special-card-footer">
          <span class="special-price-tag">₹${item.price}</span>
          <button class="btn-add-item special-add-btn" data-id="${item.id}">
            + Order Now
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Add click to specials
  specialsCarousel.querySelectorAll('.special-add-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.closest('.special-add-btn').dataset.id;
      addToCart(id);
      switchView('MENU');
    });
  });
}

// 6. Render Full Menu List
function renderMenuList() {
  if (!menuItemsGrid) return;

  let filtered = state.menuItems;
  if (state.activeCategory !== 'ALL') {
    filtered = filtered.filter(item => item.category === state.activeCategory);
  }

  menuItemsGrid.innerHTML = filtered.map(item => {
    const inCart = state.cart.find(c => c.id === item.id);
    const qty = inCart ? inCart.quantity : 0;
    const isSpecial = item.isSpecial;

    return `
      <article class="menu-item-card ${isSpecial ? 'is-special' : ''}" data-id="${item.id}">
        <div class="item-card-header">
          <span class="item-cat-label">${item.category}</span>
          ${isSpecial ? `<span class="item-special-pill">★ Special</span>` : ''}
        </div>

        <h3 class="item-name">${item.name}</h3>
        <p class="item-desc">${item.description}</p>

        <div class="item-card-action-bar">
          <span class="item-price">₹${item.price}</span>

          <div class="item-cart-actions">
            ${qty === 0 ? `
              <button class="btn-add-item" data-id="${item.id}">+ Add</button>
            ` : `
              <div class="qty-counter-group">
                <button class="qty-btn btn-minus" data-id="${item.id}">−</button>
                <span class="qty-display">${qty}</span>
                <button class="qty-btn btn-plus" data-id="${item.id}">+</button>
              </div>
            `}
          </div>
        </div>
      </article>
    `;
  }).join('');

  // Attach Add & Quantity handlers
  menuItemsGrid.querySelectorAll('.btn-add-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.closest('.btn-add-item').dataset.id;
      addToCart(id);
    });
  });

  menuItemsGrid.querySelectorAll('.btn-plus').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.closest('.btn-plus').dataset.id;
      updateCartQuantity(id, 1);
    });
  });

  menuItemsGrid.querySelectorAll('.btn-minus').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.closest('.btn-minus').dataset.id;
      updateCartQuantity(id, -1);
    });
  });
}

// 7. Cart Operations
function addToCart(itemId) {
  const item = state.menuItems.find(m => m.id === itemId);
  if (!item) return;

  const existing = state.cart.find(c => c.id === itemId);
  if (existing) {
    existing.quantity += 1;
  } else {
    state.cart.push({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: 1,
      isSpecial: item.isSpecial,
      note: ''
    });
  }

  showToast(`Added ${item.name} to ticket`);
  updateCartUI();
  renderMenuList();
}

function updateCartQuantity(itemId, delta) {
  const existing = state.cart.find(c => c.id === itemId);
  if (!existing) return;

  existing.quantity += delta;
  if (existing.quantity <= 0) {
    state.cart = state.cart.filter(c => c.id !== itemId);
  }

  updateCartUI();
  renderMenuList();
  renderCartModal();
}

function updateCartUI() {
  const totalCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Update Nav Badge
  if (cartCountBadge) {
    cartCountBadge.textContent = totalCount;
    cartCountBadge.style.display = totalCount > 0 ? 'inline-block' : 'none';
  }

  // Update Sticky Bottom Bar
  if (stickyCartBar) {
    if (totalCount > 0) {
      stickyCartBar.classList.add('is-visible');
      if (stickyCartCount) stickyCartCount.textContent = totalCount;
      if (stickyCartTotal) stickyCartTotal.textContent = totalPrice;
    } else {
      stickyCartBar.classList.remove('is-visible');
    }
  }

  // Update Sheet Totals
  if (cartSubtotalVal) cartSubtotalVal.textContent = `₹${totalPrice}`;
  if (cartGrandTotalVal) cartGrandTotalVal.textContent = `₹${totalPrice}`;
  if (proceedPaymentTotal) proceedPaymentTotal.textContent = `₹${totalPrice}`;
  if (paymentBannerAmount) paymentBannerAmount.textContent = `₹${totalPrice}`;
}

// 8. Render Slide-Up Cart Sheet
function renderCartModal() {
  if (!cartItemsList) return;

  if (state.cart.length === 0) {
    cartItemsList.innerHTML = `
      <div style="text-align: center; padding: 30px; color: var(--text-muted);">
        <p style="font-size: 1.1rem; font-weight: 700;">Your ticket is empty</p>
        <p style="font-size: 0.85rem; margin-top: 4px;">Explore our menu and add your favorite brews!</p>
      </div>
    `;
    if (proceedToPaymentBtn) proceedToPaymentBtn.disabled = true;
    return;
  }

  if (proceedToPaymentBtn) proceedToPaymentBtn.disabled = false;

  cartItemsList.innerHTML = state.cart.map(item => {
    return `
      <div class="cart-item-row" data-id="${item.id}">
        <div class="cart-item-info">
          <h4 class="cart-item-name">${item.name}</h4>
          <span class="cart-item-unit-price">₹${item.price} each</span>
        </div>
        <div class="cart-item-controls">
          <div class="qty-counter-group">
            <button class="qty-btn cart-minus" data-id="${item.id}">−</button>
            <span class="qty-display">${item.quantity}</span>
            <button class="qty-btn cart-plus" data-id="${item.id}">+</button>
          </div>
          <span class="cart-item-total">₹${item.price * item.quantity}</span>
        </div>
      </div>
    `;
  }).join('');

  cartItemsList.querySelectorAll('.cart-plus').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.closest('.cart-plus').dataset.id;
      updateCartQuantity(id, 1);
    });
  });

  cartItemsList.querySelectorAll('.cart-minus').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.closest('.cart-minus').dataset.id;
      updateCartQuantity(id, -1);
    });
  });
}

// 9. Payment & Order Submission
async function submitOrder() {
  if (state.cart.length === 0) return;

  const payMode = document.querySelector('input[name="payMode"]:checked')?.value || 'UPI';
  const notes = orderGeneralNotes?.value.trim() || '';

  const orderPayload = {
    tableId: state.selectedTable,
    floor: state.selectedFloor,
    items: state.cart,
    instructions: notes,
    paymentMode: payMode,
    customerName: 'Guest'
  };

  try {
    confirmOrderBtn.disabled = true;
    confirmOrderBtn.innerHTML = `<span>Transmitting to Kitchen...</span>`;

    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload)
    });

    if (!res.ok) throw new Error('Order creation failed');
    const createdOrder = await res.json();
    state.activeOrder = createdOrder;

    // Reset Cart & Close Modals
    state.cart = [];
    updateCartUI();
    renderMenuList();
    paymentModalBackdrop.classList.remove('is-open');

    // Show Success Modal & Live Tracker
    if (successOrderNo) successOrderNo.textContent = createdOrder.id;
    if (successTable) successTable.textContent = `${createdOrder.tableId} (${createdOrder.floor})`;
    updateLiveTrackerUI(createdOrder.status);
    orderSuccessModal.classList.add('is-open');

    // Play chime sound
    try { chimeAudio.play(); } catch (e) {}

    showToast(`Order ${createdOrder.id} placed! Kitchen alerted.`);
  } catch (err) {
    console.error(err);
    showToast('Failed to send order. Please try again or inform staff.');
  } finally {
    confirmOrderBtn.disabled = false;
    confirmOrderBtn.innerHTML = `<span>Confirm & Send Order to Kitchen</span> <span>➔</span>`;
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

// 10. Call Waiter Feature
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
    showToast(`Staff alerted: ${state.selectedWaiterReason} for ${state.selectedTable}`);
  } catch (e) {
    showToast('Unable to alert staff. Please wave down a server.');
  }
}

// 11. WebSocket Connection for Instant Updates
function initWebSocket() {
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
    const { orderId, status, tableId } = msg.data;
    if (state.activeOrder && state.activeOrder.id === orderId) {
      state.activeOrder.status = status;
      updateLiveTrackerUI(status);
      try { chimeAudio.play(); } catch (e) {}
      showToast(`Order Update: Kitchen marked order as ${status}!`);
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
  }
}

// 12. Bind User Interactions
function bindEventHandlers() {
  // Navigation Tabs
  tabCafeHome?.addEventListener('click', () => switchView('HOME'));
  tabFullMenu?.addEventListener('click', () => switchView('MENU'));
  navHomeLink?.addEventListener('click', () => switchView('HOME'));
  heroOrderNowBtn?.addEventListener('click', () => switchView('MENU'));
  browseAllMenuBtn?.addEventListener('click', () => switchView('MENU'));

  // Category Filters
  menuCategoriesBar?.addEventListener('click', (e) => {
    const btn = e.target.closest('.cat-filter-btn');
    if (!btn) return;
    document.querySelectorAll('.cat-filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.activeCategory = btn.dataset.cat;
    renderMenuList();
  });

  // Open Cart
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

  // Proceed to Payment Modal
  proceedToPaymentBtn?.addEventListener('click', () => {
    cartModalBackdrop.classList.remove('is-open');
    paymentModalBackdrop.classList.add('is-open');
  });

  closePaymentBtn?.addEventListener('click', () => {
    paymentModalBackdrop.classList.remove('is-open');
  });

  // Payment Mode Toggles
  modeCardUpi?.addEventListener('click', () => {
    modeCardUpi.classList.add('active');
    modeCardCounter.classList.remove('active');
    document.querySelector('input[value="UPI"]').checked = true;
    document.getElementById('upiDetailsContainer').style.display = 'block';
  });

  modeCardCounter?.addEventListener('click', () => {
    modeCardCounter.classList.add('active');
    modeCardUpi.classList.remove('active');
    document.querySelector('input[value="PAY_LATER"]').checked = true;
    document.getElementById('upiDetailsContainer').style.display = 'none';
  });

  // Confirm Order Button
  confirmOrderBtn?.addEventListener('click', submitOrder);

  // Order Success Modal Actions
  orderDoneBtn?.addEventListener('click', () => {
    orderSuccessModal.classList.remove('is-open');
    switchView('MENU');
  });

  successCallWaiterBtn?.addEventListener('click', () => {
    waiterModalBackdrop.classList.add('is-open');
  });

  // Call Waiter Button
  callWaiterNavBtn?.addEventListener('click', () => {
    waiterModalBackdrop.classList.add('is-open');
  });

  closeWaiterModalBtn?.addEventListener('click', () => {
    waiterModalBackdrop.classList.remove('is-open');
  });

  // Waiter Reasons Selection
  document.querySelectorAll('.reason-pill').forEach(pill => {
    pill.addEventListener('click', (e) => {
      document.querySelectorAll('.reason-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.selectedWaiterReason = pill.dataset.reason;
    });
  });

  sendWaiterCallBtn?.addEventListener('click', submitWaiterCall);

  // Table Selector Modal Handlers
  const openTableModal = () => {
    buildTableSelectorModal();
    tableModalBackdrop.classList.add('is-open');
  };

  tableSelectorBtn?.addEventListener('click', openTableModal);
  menuTableSwitcherTag?.addEventListener('click', openTableModal);
  heroTableHint?.addEventListener('click', openTableModal);

  closeTableModalBtn?.addEventListener('click', () => {
    tableModalBackdrop.classList.remove('is-open');
  });

  [upstairsTableBtns, groundTableBtns].forEach(grid => {
    grid?.addEventListener('click', (e) => {
      const btn = e.target.closest('.table-select-btn');
      if (!btn) return;
      setTable(btn.dataset.table);
      buildTableSelectorModal();
      tableModalBackdrop.classList.remove('is-open');
      showToast(`Switched table to ${state.selectedTable}`);
    });
  });

  // Click Outside Backdrops to close
  [cartModalBackdrop, paymentModalBackdrop, waiterModalBackdrop, tableModalBackdrop].forEach(backdrop => {
    backdrop?.addEventListener('click', (e) => {
      if (e.target === backdrop) backdrop.classList.remove('is-open');
    });
  });
}

// 13. Toast Feedback Utility
function showToast(message) {
  if (!toastStack) return;
  const toast = document.createElement('div');
  toast.className = 'vintage-toast';
  toast.innerHTML = `<span>☕</span> <span>${message}</span>`;
  toastStack.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'all 0.3s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(12px)';
    setTimeout(() => toast.remove(), 300);
  }, 2600);
}
