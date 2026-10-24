/**
 * Joe's Brew - Kitchen Display System (KDS) Logic
 * Real-Time Ticket Routing, Terrace Audio Chimes & Stock CMS
 */

const kdsState = {
  orders: [],
  waiterCalls: [],
  menuItems: []
};

// Sound effects
const alertChime = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
const runnerChime = new Audio('https://assets.mixkit.co/active_storage/sfx/2874/2874-preview.mp3');

// DOM References
const kdsTicketsList = document.getElementById('kdsTicketsList');
const kdsWaiterCallsList = document.getElementById('kdsWaiterCallsList');
const kdsStockList = document.getElementById('kdsStockList');
const kdsActiveCount = document.getElementById('kdsActiveCount');
const kdsAlertCount = document.getElementById('kdsAlertCount');

// Auth & Session Storage
const KDS_TOKEN_KEY = 'jb_kds_token';
let enteredPin = '';
let currentAuthMode = 'pin';
let selectedSummaryDate = new Date().toISOString().split('T')[0];
let kdsSocket = null;

document.addEventListener('DOMContentLoaded', () => {
  initKdsAuth();
  setupKeyboardListener();

  // Keep active ticket queue elapsed wait times fresh in real time
  setInterval(() => {
    if (kdsState.orders && kdsState.orders.length > 0) {
      renderKdsTickets();
    }
  }, 20000);
});

async function loadKdsData() {
  try {
    const [ordersRes, callsRes, menuRes] = await Promise.all([
      fetch('/api/orders'),
      fetch('/api/call-waiter'),
      fetch('/api/menu')
    ]);

    kdsState.orders = await ordersRes.json();
    kdsState.waiterCalls = await callsRes.json();
    kdsState.menuItems = await menuRes.json();

    renderKdsTickets();
    renderWaiterCalls();
    renderStockList();
    updateKdsCounts();
  } catch (err) {
    console.error('Failed to load KDS data', err);
  }
}

function updateKdsCounts() {
  const activeOrders = kdsState.orders.filter(o => o.status !== 'Completed' && o.status !== 'Cancelled');
  if (kdsActiveCount) kdsActiveCount.textContent = activeOrders.length;
  if (kdsAlertCount) kdsAlertCount.textContent = kdsState.waiterCalls.filter(c => !c.resolved).length;
}

function formatElapsedWait(mins) {
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
}

// Render Order Tickets
function renderKdsTickets() {
  if (!kdsTicketsList) return;

  // Enforce chronological FIFO sorting: earliest customer order appears FIRST (#1 in Queue), subsequent orders follow
  const activeOrders = kdsState.orders
    .filter(o => o.status !== 'Completed' && o.status !== 'Cancelled')
    .sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (timeA && timeB && timeA !== timeB) return timeA - timeB; // Oldest/first placed comes first!
      const numA = parseInt(String(a.orderNumber || '').replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(String(b.orderNumber || '').replace(/\D/g, ''), 10) || 0;
      if (numA && numB && numA !== numB) return numA - numB;
      return (a.id || '').localeCompare(b.id || '');
    });

  if (activeOrders.length === 0) {
    kdsTicketsList.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #9CA3AF;">
        <h3 style="color: var(--vintage-gold-glow);">All Caught Up!</h3>
        <p style="margin-top: 4px;">No active orders in the queue.</p>
      </div>
    `;
    return;
  }

  kdsTicketsList.innerHTML = activeOrders.map((order, index) => {
    const queueNumber = index + 1;
    const isTerrace = order.floor === 'Terrace' || order.floor === 'Upstairs' || (order.tableId && order.tableId.startsWith('Top'));
    const timeFormatted = order.createdAt ? new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    const elapsedMinutes = order.createdAt ? Math.max(0, Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000)) : 0;
    const isUrgent = elapsedMinutes >= 12;

    const cleanPhone = (order.customerPhone || '').replace(/\D/g, '');
    const waPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : (cleanPhone.startsWith('91') ? cleanPhone : (cleanPhone ? `91${cleanPhone}` : ''));
    const customerDisplayName = order.customerName && order.customerName !== 'Guest' ? order.customerName : '';
    const greeting = customerDisplayName ? `Hello ${customerDisplayName}!` : 'Hello!';
    const waMessage = encodeURIComponent(`☕ *Joe's Brew (Estd 2006)*\n\n${greeting} Your order *#${order.orderNumber || order.id}* for *Table ${order.tableId}* is freshly prepared and *READY TO SERVE*! 🎉\n\nOur service staff is bringing it to your table now. Enjoy your blissful brew! ✨`);
    const waUrl = waPhone ? `https://api.whatsapp.com/send?phone=${waPhone}&text=${waMessage}` : '';

    const isOrderTakeawayOnly = order.orderMode === 'Takeaway' || order.orderMode === 'Parcel';
    const items = order.items || [];

    // Segregate items strictly for clear visual buckets
    const takeawayItems = items.filter(item => item.mode === 'Takeaway' || (isOrderTakeawayOnly && item.mode !== 'Dine-In'));
    const dineInItems = items.filter(item => item.mode !== 'Takeaway' && !(isOrderTakeawayOnly && item.mode !== 'Dine-In'));

    const isMixedOrder = (takeawayItems.length > 0 && dineInItems.length > 0) || order.orderMode === 'Mixed' || (order.generalInstructions && order.generalInstructions.includes('MIXED ORDER'));

    // Strip redundant mode tag from general customer instructions for clean presentation
    const cleanCustomerNote = (order.generalInstructions || '')
      .replace(/\[🍽️\s*\+\s*🥡\s*MIXED\s*ORDER\]/gi, '')
      .replace(/\[🥡\s*TAKEAWAY\s*\/\s*PARCEL\]/gi, '')
      .replace(/\[🍽️\s*DINE-IN\s*ORDER\]/gi, '')
      .trim();

    // Compute totals for clean UI badges
    const takeawayTotalQty = takeawayItems.reduce((acc, i) => acc + (i.quantity || 1), 0);
    const dineInTotalQty = dineInItems.reduce((acc, i) => acc + (i.quantity || 1), 0);
    const grandTotalQty = items.reduce((acc, i) => acc + (i.quantity || 1), 0);

    // Build Items Markup cleanly without clumsy nested box over-layering
    let itemsHtml = '';

    if (takeawayItems.length > 0 && dineInItems.length > 0) {
      // MIXED ORDER: 2 clear sub-sections
      itemsHtml = `
        <div class="ticket-sub-section">
          <div class="ticket-sub-heading takeaway-heading">
            🥡 TAKEAWAY / PARCEL (${takeawayTotalQty} ${takeawayTotalQty === 1 ? 'item' : 'items'} — Pack in Bag)
          </div>
          <div class="ticket-items-list">
            ${takeawayItems.map(item => `
              <div class="clean-item-row">
                <div class="item-left-cell">
                  <span class="item-qty-square qty--takeaway">${item.quantity}×</span>
                  <div class="item-name-block">
                    <span class="item-main-title">${item.name}</span>
                    ${item.note ? `<span class="item-special-note">Note: ${item.note}</span>` : ''}
                  </div>
                </div>
                <span class="item-price-tag">₹${item.price * item.quantity}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="ticket-mixed-divider"></div>

        <div class="ticket-sub-section">
          <div class="ticket-sub-heading dinein-heading">
            🍽️ DINE-IN SERVICE (${dineInTotalQty} ${dineInTotalQty === 1 ? 'item' : 'items'} — Serve at Table)
          </div>
          <div class="ticket-items-list">
            ${dineInItems.map(item => `
              <div class="clean-item-row">
                <div class="item-left-cell">
                  <span class="item-qty-square qty--dinein">${item.quantity}×</span>
                  <div class="item-name-block">
                    <span class="item-main-title">${item.name}</span>
                    ${item.note ? `<span class="item-special-note">Note: ${item.note}</span>` : ''}
                  </div>
                </div>
                <span class="item-price-tag">₹${item.price * item.quantity}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } else if (takeawayItems.length > 0) {
      // 100% TAKEAWAY
      itemsHtml = `
        <div class="ticket-items-list">
          ${takeawayItems.map(item => `
            <div class="clean-item-row">
              <div class="item-left-cell">
                <span class="item-qty-square qty--takeaway">${item.quantity}×</span>
                <div class="item-name-block">
                  <span class="item-main-title">${item.name}</span>
                  ${item.note ? `<span class="item-special-note">Note: ${item.note}</span>` : ''}
                </div>
              </div>
              <span class="item-price-tag">₹${item.price * item.quantity}</span>
            </div>
          `).join('')}
        </div>
      `;
    } else {
      // 100% DINE-IN (or fallback items)
      const renderItems = dineInItems.length > 0 ? dineInItems : items;
      itemsHtml = `
        <div class="ticket-items-list">
          ${renderItems.map(item => `
            <div class="clean-item-row">
              <div class="item-left-cell">
                <span class="item-qty-square qty--dinein">${item.quantity}×</span>
                <div class="item-name-block">
                  <span class="item-main-title">${item.name}</span>
                  ${item.note ? `<span class="item-special-note">Note: ${item.note}</span>` : ''}
                </div>
              </div>
              <span class="item-price-tag">₹${item.price * item.quantity}</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    return `
      <div class="kds-ticket-card ${isTerrace ? 'is-terrace' : ''}" data-id="${order.id}">
        <!-- Top Bar: Table & Floor, Queue Status, Order ID & Time -->
        <div class="ticket-top-bar">
          <div class="ticket-table-group">
            <span class="ticket-table-badge ${!isTerrace ? 'is-ground' : ''}">
              ${order.tableId || 'Table'}
            </span>
            <span class="ticket-floor-tag">${isTerrace ? 'TERRACE' : 'GROUND FLOOR'}</span>
          </div>

          <div class="ticket-queue-badge ${queueNumber === 1 ? 'is-first' : ''} ${isUrgent ? 'is-urgent' : ''}">
            <span class="queue-num">#${queueNumber} IN QUEUE</span>
            <span class="queue-time">⏱️ ${formatElapsedWait(elapsedMinutes)}</span>
          </div>

          <div class="ticket-id-meta">
            <div class="ticket-order-number">#${order.orderNumber || order.id}</div>
            <div class="ticket-time-stamp">${timeFormatted}</div>
          </div>
        </div>

        <!-- Service Ribbon -->
        ${isMixedOrder ? `
          <div class="ticket-service-banner banner--mixed">
            <span class="banner-title">🍽️ DINE-IN + 🥡 TAKEAWAY</span>
            <span class="banner-sub">SPLIT ORDER</span>
          </div>
        ` : (isOrderTakeawayOnly ? `
          <div class="ticket-service-banner banner--takeaway">
            <span class="banner-title">🥡 ALL TAKEAWAY / PARCEL</span>
            <span class="banner-sub">PACK IN BAG</span>
          </div>
        ` : `
          <div class="ticket-service-banner banner--dinein">
            <span class="banner-title">🍽️ TABLE DINE-IN SERVICE</span>
            <span class="banner-sub">SERVE AT TABLE</span>
          </div>
        `)}

        <!-- Customer & Payment Bar -->
        <div class="ticket-customer-bar">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="customer-name">👤 ${order.customerName || 'Guest'}</span>
            ${order.customerPhone ? `<span class="customer-phone">📞 +91 ${order.customerPhone}</span>` : ''}
          </div>
          <span class="customer-pay-tag">💳 ${order.paymentMode || 'Counter'}</span>
        </div>

        <!-- Items Container -->
        <div class="ticket-items-container">
          ${itemsHtml}
        </div>

        <!-- Packaging Charge (if applicable) -->
        ${order.packagingCharge ? `
          <div class="ticket-packaging-row">
            <span>🥡 Container Packaging</span>
            <span>+₹${order.packagingCharge}</span>
          </div>
        ` : ''}

        <!-- Special Request Note (if applicable) -->
        ${cleanCustomerNote ? `
          <div class="ticket-customer-note-callout">
            <strong>Special Request:</strong> ${cleanCustomerNote}
          </div>
        ` : ''}

        <!-- Total Price Row -->
        <div class="ticket-bottom-total-row">
          <span class="total-label">Total (${grandTotalQty} ${grandTotalQty === 1 ? 'item' : 'items'})</span>
          <span class="total-value">₹${order.total || (order.subtotal + (order.packagingCharge || 0))}</span>
        </div>

        <!-- Action Buttons -->
        <div class="ticket-action-bar">
          <button class="kds-step-btn ${order.status === 'Received' ? 'active' : ''}" onclick="advanceOrderStatus('${order.id}', 'Received')">
            Received
          </button>
          <button class="kds-step-btn ${order.status === 'Preparing' ? 'active' : ''}" onclick="advanceOrderStatus('${order.id}', 'Preparing')">
            Prep
          </button>
          <button class="kds-step-btn ${order.status === 'Ready to Serve' ? 'active' : ''}" onclick="advanceOrderStatus('${order.id}', 'Ready to Serve')">
            Ready 🚀
          </button>
          <button class="kds-step-btn" onclick="advanceOrderStatus('${order.id}', 'Completed')">
            Done ✓
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// Visual Toast in KDS
function showKdsToast(msg) {
  const container = document.getElementById('kdsToastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.style.cssText = 'background: #1B3E34; border: 1.5px solid #25D366; color: #E8F8F5; padding: 10px 16px; border-radius: 8px; font-weight: 700; font-size: 0.88rem; box-shadow: 0 4px 16px rgba(0,0,0,0.6); transition: all 0.25s ease;';
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    setTimeout(() => toast.remove(), 260);
  }, 3500);
}

// Status Advancement
async function advanceOrderStatus(orderId, nextStatus) {
  const order = kdsState.orders.find(o => o.id === orderId);

  // AUTOMATED 1-CLICK WHATSAPP DISPATCH ON 'READY'
  // Triggered synchronously on button click so browser popup blocker does not intercept it
  if (nextStatus === 'Ready to Serve' && order?.customerPhone) {
    const cleanPhone = (order.customerPhone || '').replace(/\D/g, '');
    const waPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : (cleanPhone.startsWith('91') ? cleanPhone : (cleanPhone ? `91${cleanPhone}` : ''));
    if (waPhone) {
      const isTakeaway = order.orderMode === 'Takeaway' || order.orderMode === 'Parcel';
      const isMixed = order.orderMode === 'Mixed';
      const customerDisplayName = order.customerName && order.customerName !== 'Guest' ? order.customerName : '';
      const greeting = customerDisplayName ? `Hello ${customerDisplayName}! 🌟` : 'Hello there! 🌟';
      const floorText = (order.floor === 'Upstairs' ? 'Terrace' : order.floor) || (order.tableId?.startsWith('Top') ? 'Terrace' : 'Ground Floor');
      const itemsSummary = order.items?.map(i => `${i.quantity}x ${i.name} (${i.mode || 'Dine-In'})`).join(', ') || '';
      
      let pickupNotice = `🔔 *Kindly come and get your order from our service point in the kitchen!* 🍽️`;
      if (isTakeaway) {
        pickupNotice = `🔔 *Your Takeaway Parcel is packed in sealed containers & ready for pickup at our kitchen counter!* 🥡✨`;
      } else if (isMixed) {
        pickupNotice = `🔔 *Your order with dine-in and takeaway containers is ready at our service point!* 🍽️🥡`;
      }

      const waMessage = encodeURIComponent(
        `☕ *Joe's Brew (Estd 2006)* ☕\n\n` +
        `${greeting}\n` +
        `Great news! Your order *#${order.orderNumber || order.id}* for *Table ${order.tableId} (${floorText})* is freshly prepared, hot & delicious! 🎉✨\n\n` +
        (isTakeaway ? `📦 *Type:* Takeaway / Parcel (Containers sealed)\n` : (isMixed ? `📦 *Type:* Mixed Order (Dine-in + Takeaway)\n` : '')) +
        (itemsSummary ? `📋 *Order Items:* ${itemsSummary}\n\n` : '') +
        `${pickupNotice}\n\n` +
        `We hope every bite and sip brings a bright smile to your day. Enjoy your blissful brew & treats! 💛☕🍰`
      );
      const waUrl = `https://api.whatsapp.com/send?phone=${waPhone}&text=${waMessage}`;
      window.open(waUrl, '_blank');
    }
  }

  try {
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus })
    });

    if (!res.ok) throw new Error('Status update failed');
    const data = await res.json();

    if (order) order.status = nextStatus;

    if (nextStatus === 'Ready to Serve') {
      try { runnerChime.play(); } catch (e) {}
      showKdsToast(`☕ Table ${order?.tableId} is READY! WhatsApp pickup alert dispatched.`);
    }

    renderKdsTickets();
    updateKdsCounts();
  } catch (err) {
    console.error(err);
  }
}

// Render Waiter Calls
function renderWaiterCalls() {
  if (!kdsWaiterCallsList) return;
  const activeCalls = kdsState.waiterCalls.filter(c => !c.resolved);
  const livePill = document.getElementById('kdsWaiterLivePill');
  const waiterSection = document.querySelector('.kds-waiter-section');

  if (livePill) {
    livePill.textContent = activeCalls.length > 0 ? `🚨 ${activeCalls.length} Urgent` : '0 Pending';
    if (activeCalls.length > 0) {
      livePill.classList.add('is-active');
    } else {
      livePill.classList.remove('is-active');
    }
  }

  if (waiterSection) {
    if (activeCalls.length > 0) {
      waiterSection.classList.add('has-active-calls');
    } else {
      waiterSection.classList.remove('has-active-calls');
    }
  }

  if (activeCalls.length === 0) {
    kdsWaiterCallsList.innerHTML = `
      <div class="waiter-empty-state">
        <span style="font-size: 1rem; line-height: 1;">🟢</span>
        <span>Terrace call bell quiet • All tables attended</span>
      </div>
    `;
    return;
  }

  kdsWaiterCallsList.innerHTML = activeCalls.map(call => {
    const timeFormatted = call.timestamp ? new Date(call.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now';
    const displayFloor = call.floor === 'Upstairs' ? 'TERRACE' : (call.floor || 'TERRACE').toUpperCase();
    return `
      <div class="waiter-call-card" data-id="${call.id}">
        <div class="waiter-call-info">
          <div class="waiter-call-table">
            <span>Table ${call.tableId}</span>
            <span class="waiter-call-floor-badge">${displayFloor}</span>
          </div>
          <div class="waiter-call-reason">Reason: <strong>${call.reason || 'Assistance Needed'}</strong></div>
          <div class="waiter-call-time">🔔 Called at ${timeFormatted}</div>
        </div>
        <button class="btn-resolve-call" onclick="resolveWaiterCall('${call.id}')">Done ✓</button>
      </div>
    `;
  }).join('');
}

async function resolveWaiterCall(callId) {
  try {
    await fetch(`/api/call-waiter/${callId}/resolve`, { method: 'PATCH' });
    const call = kdsState.waiterCalls.find(c => c.id === callId);
    if (call) call.resolved = true;
    renderWaiterCalls();
    updateKdsCounts();
  } catch (e) {
    console.error(e);
  }
}

// Render 1-Tap Stock Management (CMS)
let stockSearchFilter = '';

function filterStockList(query) {
  stockSearchFilter = (query || '').toLowerCase().trim();
  renderStockList();
}

function renderStockList() {
  if (!kdsStockList) return;

  const items = kdsState.menuItems.filter(item => {
    if (!stockSearchFilter) return true;
    return (item.name || '').toLowerCase().includes(stockSearchFilter) ||
           (item.category || '').toLowerCase().includes(stockSearchFilter);
  });

  if (items.length === 0) {
    kdsStockList.innerHTML = `
      <div style="text-align: center; padding: 24px; color: #9CA3AF; font-size: 0.85rem;">
        No items match "${stockSearchFilter}"
      </div>
    `;
    return;
  }

  kdsStockList.innerHTML = items.map(item => `
    <div class="stock-item-row" data-id="${item.id}">
      <div>
        <strong class="stock-item-name">${item.name}</strong>
        <span class="stock-item-price">₹${item.price}</span>
      </div>
      <button class="stock-toggle-switch ${!item.inStock ? 'is-out' : ''}" onclick="toggleItemStock('${item.id}')">
        ${item.inStock ? '✓ In Stock' : '✕ Sold Out'}
      </button>
    </div>
  `).join('');
}

async function toggleItemStock(itemId) {
  try {
    const item = kdsState.menuItems.find(i => i.id === itemId);
    if (!item) return;

    const newStock = !item.inStock;
    const res = await fetch('/api/menu/stock-toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, inStock: newStock })
    });

    if (res.ok) {
      item.inStock = newStock;
      renderStockList();
    }
  } catch (e) {
    console.error(e);
  }
}

// Real-time Sync (Supabase Realtime & WebSocket Fallback)
async function initKdsWebSocket() {
  try {
    const res = await fetch('/api/config');
    const config = await res.json();
    if (config.isSupabase && config.supabaseUrl && config.supabaseAnonKey && window.supabase) {
      console.log('⚡ Connected to Supabase Cloud Realtime for Kitchen Station');
      const sb = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);

      sb.channel('kds-orders-channel')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
          const o = payload.new;
          const formatted = {
            id: o.id,
            orderNumber: o.order_number,
            tableId: o.table_id,
            floor: o.floor,
            items: o.items || [],
            orderMode: o.order_mode || o.orderMode || 'Dine-In',
            packagingCharge: Number(o.packaging_charge || o.packagingCharge || 0),
            generalInstructions: o.general_instructions || '',
            subtotal: Number(o.subtotal),
            total: Number(o.total),
            paymentMode: o.payment_mode,
            paymentStatus: o.payment_status,
            status: o.status,
            customerName: o.customer_name,
            customerPhone: o.customer_phone,
            statusHistory: o.status_history || [],
            createdAt: o.created_at
          };
          // Avoid duplicate if already in list
          if (!kdsState.orders.some(item => item.id === formatted.id)) {
            kdsState.orders.push(formatted);
            renderKdsTickets();
            updateKdsCounts();
            try { alertChime.play(); } catch (e) {}
          }
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
          const o = payload.new;
          const existing = kdsState.orders.find(item => item.id === o.id);
          if (existing) {
            existing.status = o.status;
            existing.statusHistory = o.status_history || [];
            renderKdsTickets();
            updateKdsCounts();
          }
        })
        .subscribe();

      sb.channel('kds-waiter-channel')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'waiter_calls' }, (payload) => {
          const c = payload.new;
          if (!kdsState.waiterCalls.some(item => item.id === c.id)) {
            kdsState.waiterCalls.unshift({
              id: c.id,
              tableId: c.table_id,
              floor: c.floor,
              reason: c.reason,
              timestamp: c.timestamp,
              resolved: c.resolved
            });
            renderWaiterCalls();
            updateKdsCounts();
            try { alertChime.play(); } catch (e) {}
          }
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'waiter_calls' }, (payload) => {
          const c = payload.new;
          const call = kdsState.waiterCalls.find(item => item.id === c.id);
          if (call) call.resolved = c.resolved;
          renderWaiterCalls();
          updateKdsCounts();
        })
        .subscribe();

      return;
    }
  } catch (err) {}

  // Local WebSocket fallback
  if (kdsSocket && kdsSocket.readyState === WebSocket.OPEN) return;

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}`;

  try {
    kdsSocket = new WebSocket(wsUrl);

    kdsSocket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handleKdsSocketMessage(msg);
      } catch (e) {}
    };

    kdsSocket.onclose = () => {
      const token = localStorage.getItem(KDS_TOKEN_KEY);
      if (token) {
        setTimeout(initKdsWebSocket, 3000);
      }
    };
  } catch (e) {}
}

function handleKdsSocketMessage(msg) {
  switch (msg.type) {
    case 'NEW_ORDER':
      if (!kdsState.orders.some(o => o.id === msg.data.id)) {
        kdsState.orders.push(msg.data);
      }
      renderKdsTickets();
      updateKdsCounts();
      try { alertChime.play(); } catch (e) {}
      break;

    case 'ORDER_STATUS_UPDATE':
      const existing = kdsState.orders.find(o => o.id === msg.data.orderId);
      if (existing) existing.status = msg.data.status;
      renderKdsTickets();
      updateKdsCounts();
      break;

    case 'CALL_WAITER':
      kdsState.waiterCalls.unshift(msg.data);
      renderWaiterCalls();
      updateKdsCounts();
      try { alertChime.play(); } catch (e) {}
      break;

    case 'WAITER_CALL_RESOLVED':
      const call = kdsState.waiterCalls.find(c => c.id === msg.data.id);
      if (call) call.resolved = true;
      renderWaiterCalls();
      updateKdsCounts();
      break;

    case 'STOCK_UPDATE':
      const mItem = kdsState.menuItems.find(i => i.id === msg.data.itemId);
      if (mItem) mItem.inStock = msg.data.inStock;
      renderStockList();
      break;

    case 'KDS_SHIFT_CLOSED':
      showKdsToast(`🔒 Shift for ${msg.data.date} finalized by staff (₹${msg.data.totalRevenue})`);
      break;
  }
}

// ==========================================================================
// KDS AUTHENTICATION & PIN PAD LOGIC
// ==========================================================================

async function initKdsAuth() {
  const token = localStorage.getItem(KDS_TOKEN_KEY);
  if (!token) {
    showLoginPortal();
    return;
  }

  try {
    const res = await fetch(`/api/kds/auth-check?token=${encodeURIComponent(token)}`);
    const data = await res.json();
    if (data.authenticated) {
      hideLoginPortal();
      loadKdsData();
      initKdsWebSocket();
    } else {
      localStorage.removeItem(KDS_TOKEN_KEY);
      showLoginPortal('Session expired. Please enter Station PIN.');
    }
  } catch (err) {
    console.error('Auth verification error:', err);
    showLoginPortal();
  }
}

function showLoginPortal(errorMsg = '') {
  const portal = document.getElementById('kdsLoginPortal');
  if (portal) portal.classList.remove('hidden');
  resetPinState();
  const errorEl = document.getElementById('kdsLoginError');
  if (errorEl) errorEl.textContent = errorMsg;
}

function hideLoginPortal() {
  const portal = document.getElementById('kdsLoginPortal');
  if (portal) portal.classList.add('hidden');
  const errorEl = document.getElementById('kdsLoginError');
  if (errorEl) errorEl.textContent = '';
}

function switchKdsAuthMode(mode) {
  currentAuthMode = mode;
  const pinBtn = document.getElementById('tabPinBtn');
  const credsBtn = document.getElementById('tabCredsBtn');
  const pinView = document.getElementById('kdsPinView');
  const credsView = document.getElementById('kdsCredsView');
  const errorEl = document.getElementById('kdsLoginError');

  if (errorEl) errorEl.textContent = '';

  if (mode === 'pin') {
    if (pinBtn) pinBtn.classList.add('active');
    if (credsBtn) credsBtn.classList.remove('active');
    if (pinView) pinView.style.display = 'block';
    if (credsView) credsView.style.display = 'none';
    resetPinState();
  } else {
    if (credsBtn) credsBtn.classList.add('active');
    if (pinBtn) pinBtn.classList.remove('active');
    if (pinView) pinView.style.display = 'none';
    if (credsView) credsView.style.display = 'block';
    const usernameInput = document.getElementById('kdsUsername');
    if (usernameInput) usernameInput.focus();
  }
}

function resetPinState() {
  enteredPin = '';
  updatePinDots();
}

function updatePinDots() {
  for (let i = 0; i < 4; i++) {
    const dot = document.getElementById(`dot${i}`);
    if (dot) {
      if (i < enteredPin.length) {
        dot.classList.add('filled');
      } else {
        dot.classList.remove('filled');
      }
    }
  }
}

function pressPinKey(digit) {
  if (enteredPin.length < 4) {
    enteredPin += digit;
    updatePinDots();

    // Auto submit upon entering 4th digit
    if (enteredPin.length === 4) {
      setTimeout(() => {
        submitPinLogin();
      }, 90);
    }
  }
}

function clearPinKey() {
  if (enteredPin.length > 0) {
    enteredPin = enteredPin.slice(0, -1);
    updatePinDots();
    const errorEl = document.getElementById('kdsLoginError');
    if (errorEl) errorEl.textContent = '';
  }
}

async function submitPinLogin() {
  if (enteredPin.length === 0) return;

  const errorEl = document.getElementById('kdsLoginError');
  if (enteredPin.length < 4) {
    if (errorEl) errorEl.textContent = 'Please enter the 4-digit Station PIN.';
    return;
  }

  try {
    const res = await fetch('/api/kds/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: enteredPin })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      localStorage.setItem(KDS_TOKEN_KEY, data.token);
      hideLoginPortal();
      loadKdsData();
      initKdsWebSocket();
      showKdsToast(`🔓 Welcome! Authenticated as ${data.user.name}`);
    } else {
      if (errorEl) errorEl.textContent = data.error || 'Invalid PIN. Try default PIN 2006.';
      shakeLoginCard();
      resetPinState();
    }
  } catch (err) {
    console.error(err);
    if (errorEl) errorEl.textContent = 'Connection error. Please try again.';
    resetPinState();
  }
}

async function submitCredsLogin(e) {
  if (e) e.preventDefault();
  const username = document.getElementById('kdsUsername')?.value || '';
  const password = document.getElementById('kdsPassword')?.value || '';
  const errorEl = document.getElementById('kdsLoginError');

  if (!username || !password) {
    if (errorEl) errorEl.textContent = 'Please enter both username and password.';
    return;
  }

  try {
    const res = await fetch('/api/kds/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      localStorage.setItem(KDS_TOKEN_KEY, data.token);
      hideLoginPortal();
      loadKdsData();
      initKdsWebSocket();
      showKdsToast(`🔓 Welcome! Authenticated as ${data.user.name}`);
    } else {
      if (errorEl) errorEl.textContent = data.error || 'Invalid credentials.';
      shakeLoginCard();
    }
  } catch (err) {
    console.error(err);
    if (errorEl) errorEl.textContent = 'Connection error. Please try again.';
  }
}

function shakeLoginCard() {
  const card = document.querySelector('.kds-login-card');
  if (!card) return;
  card.style.animation = 'none';
  card.offsetHeight; // trigger reflow
  card.style.animation = 'shakeError 0.4s ease';
}

// Physical Keyboard support for fast PIN entry
function setupKeyboardListener() {
  window.addEventListener('keydown', (e) => {
    const portal = document.getElementById('kdsLoginPortal');
    if (!portal || portal.classList.contains('hidden')) return;

    if (currentAuthMode === 'pin') {
      if (e.key >= '0' && e.key <= '9') {
        pressPinKey(e.key);
      } else if (e.key === 'Backspace') {
        clearPinKey();
      } else if (e.key === 'Enter') {
        submitPinLogin();
      }
    }
  });
}

// ==========================================================================
// DAILY SALES SUMMARY & SHIFT SETTLEMENT MODAL (7-DAY RETENTION)
// ==========================================================================

function openShiftClosingModal(targetDate) {
  selectedSummaryDate = targetDate || new Date().toISOString().split('T')[0];
  const modal = document.getElementById('kdsSummaryModal');
  if (modal) modal.classList.remove('hidden');

  loadSalesHistory();
  loadSalesSummary(selectedSummaryDate);
}

function closeShiftClosingModal() {
  const modal = document.getElementById('kdsSummaryModal');
  if (modal) modal.classList.add('hidden');
}

// Fetch past 7 days history for date selector strip
async function loadSalesHistory() {
  try {
    const res = await fetch('/api/kds/sales-history?days=7');
    if (!res.ok) return;
    const data = await res.json();
    renderHistoryDateTabs(data.history || []);
  } catch (err) {
    console.error('Failed to load sales history tabs', err);
  }
}

function renderHistoryDateTabs(history) {
  const tabsContainer = document.getElementById('historyDateTabs');
  if (!tabsContainer) return;

  const todayStr = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // Render quick tabs
  tabsContainer.innerHTML = history.slice(0, 7).map(item => {
    let label = item.date;
    if (item.date === todayStr) {
      label = `Today (₹${item.totalRevenue})`;
    } else if (item.date === yesterdayStr) {
      label = `Yesterday (₹${item.totalRevenue})`;
    } else {
      const [y, m, d] = item.date.split('-');
      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      label = `${d} ${monthNames[parseInt(m,10)-1]} (₹${item.totalRevenue})`;
    }

    const isActive = item.date === selectedSummaryDate;
    return `
      <button class="history-date-tab ${isActive ? 'active' : ''}" type="button" onclick="selectHistoryDate('${item.date}')">
        ${label}
      </button>
    `;
  }).join('');

  const datePicker = document.getElementById('ledgerCustomDatePicker');
  if (datePicker) {
    datePicker.value = selectedSummaryDate;
  }
}

function selectHistoryDate(dateStr) {
  selectedSummaryDate = dateStr;
  const tabs = document.querySelectorAll('.history-date-tab');
  tabs.forEach(tab => tab.classList.remove('active'));

  const datePicker = document.getElementById('ledgerCustomDatePicker');
  if (datePicker) datePicker.value = dateStr;

  loadSalesSummary(dateStr);
  loadSalesHistory(); // Refresh tab labels and active state
}

function onCustomDateSelected(dateStr) {
  if (dateStr) {
    selectHistoryDate(dateStr);
  }
}

// Fetch & Render Full Daily Sales Summary for selected date
async function loadSalesSummary(dateStr) {
  const targetDate = dateStr || selectedSummaryDate;
  try {
    const res = await fetch(`/api/kds/sales-summary?date=${targetDate}`);
    if (!res.ok) throw new Error('Failed to fetch sales summary');
    const summary = await res.json();
    renderDailySalesSummary(summary);
  } catch (err) {
    console.error('Error fetching sales summary:', err);
    showKdsToast('Failed to load daily sales ledger.');
  }
}

function renderDailySalesSummary(summary) {
  // Date title formatting
  const dateObj = new Date(summary.date + 'T00:00:00');
  const dateFormatted = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const subtitleEl = document.getElementById('ledgerDateSubtitle');
  if (subtitleEl) subtitleEl.textContent = `Audit Date: ${dateFormatted} • Database Verified`;

  // Status Pill
  const statusPill = document.getElementById('ledgerStatusPill');
  if (statusPill) {
    if (summary.isShiftClosed) {
      statusPill.className = 'ledger-status-pill is-closed';
      statusPill.textContent = '🔒 Shift Finalized & Archived';
    } else {
      statusPill.className = 'ledger-status-pill is-live';
      statusPill.textContent = '🟢 Live Shift (In Progress)';
    }
  }

  // Bento Metrics
  const grossRevEl = document.getElementById('kpiGrossRevenue');
  if (grossRevEl) grossRevEl.textContent = `₹${summary.totalRevenue.toLocaleString()}`;

  const totalOrdersEl = document.getElementById('kpiTotalOrders');
  if (totalOrdersEl) totalOrdersEl.textContent = `${summary.totalOrders} Orders`;

  const breakdownEl = document.getElementById('kpiOrdersBreakdown');
  if (breakdownEl) {
    breakdownEl.textContent = `${summary.statusCounts.completed} Completed • ${summary.statusCounts.ready + summary.statusCounts.preparing + summary.statusCounts.received} Active • ${summary.statusCounts.cancelled} Cancelled`;
  }

  // Floor Breakdown
  const floorTextEl = document.getElementById('kpiFloorText');
  if (floorTextEl) {
    const upRev = summary.floorBreakdown?.terrace?.revenue ?? summary.floorBreakdown?.upstairs?.revenue ?? 0;
    const upCount = summary.floorBreakdown?.terrace?.orderCount ?? summary.floorBreakdown?.upstairs?.orderCount ?? 0;
    const grRev = summary.floorBreakdown?.ground?.revenue ?? 0;
    const grCount = summary.floorBreakdown?.ground?.orderCount ?? 0;
    floorTextEl.textContent = `Terrace: ₹${upRev} (${upCount}) • Ground: ₹${grRev} (${grCount})`;
  }

  const barUpstairs = document.getElementById('barUpstairs');
  const barGround = document.getElementById('barGround');
  if (barUpstairs && barGround) {
    const upPct = summary.totalRevenue > 0 ? summary.floorBreakdown.upstairs.percentage : 50;
    const grPct = 100 - upPct;
    barUpstairs.style.width = `${upPct}%`;
    barGround.style.width = `${grPct}%`;
  }

  // Items Sold & Avg Ticket
  const itemsSoldEl = document.getElementById('kpiItemsSold');
  if (itemsSoldEl) itemsSoldEl.textContent = `${summary.totalItemsSold} Items`;

  const avgTicketEl = document.getElementById('kpiAvgTicket');
  if (avgTicketEl) {
    const avg = summary.validOrdersCount > 0 ? Math.round(summary.totalRevenue / summary.validOrdersCount) : 0;
    avgTicketEl.textContent = `Avg Ticket: ₹${avg}`;
  }

  // Waiter calls
  const waiterCallsEl = document.getElementById('kpiWaiterCalls');
  if (waiterCallsEl) waiterCallsEl.textContent = summary.waiterCallsCount;

  // Itemized Sales Table
  const tableBody = document.getElementById('ledgerTableBody');
  const itemsCountEl = document.getElementById('ledgerItemsCount');
  if (itemsCountEl) itemsCountEl.textContent = `${summary.itemSales.length} distinct menu items sold`;

  if (tableBody) {
    if (summary.itemSales.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 24px; color: #9CA3AF;">
            No items sold on this date.
          </td>
        </tr>
      `;
    } else {
      tableBody.innerHTML = summary.itemSales.map((item, index) => {
        const sharePct = summary.totalRevenue > 0 ? Math.round((item.totalRevenue / summary.totalRevenue) * 100) : 0;
        let rankBadge = '';
        if (index === 0) rankBadge = '<span class="top-rank-badge">🥇</span>';
        else if (index === 1) rankBadge = '<span class="top-rank-badge">🥈</span>';
        else if (index === 2) rankBadge = '<span class="top-rank-badge">🥉</span>';
        else rankBadge = `<span style="color: #9CA3AF; margin-right: 6px;">#${index + 1}</span>`;

        return `
          <tr>
            <td>
              ${rankBadge}
              <strong style="color: #FFF;">${item.name}</strong>
            </td>
            <td style="text-align: center;">
              <span class="item-qty-badge">${item.quantity}x</span>
            </td>
            <td style="text-align: right; color: #D1C4B9;">
              ₹${item.unitPrice}
            </td>
            <td style="text-align: right; color: var(--brass-bright); font-weight: 800;">
              ₹${item.totalRevenue}
            </td>
            <td style="text-align: right; color: #6EE7B7; font-weight: 700;">
              ${sharePct}%
            </td>
          </tr>
        `;
      }).join('');
    }
  }

  // Staff notes
  const notesInput = document.getElementById('ledgerStaffNotes');
  if (notesInput) {
    notesInput.value = summary.staffNotes || '';
  }

  const closedMetaEl = document.getElementById('ledgerClosedMeta');
  if (closedMetaEl) {
    if (summary.isShiftClosed && summary.closedAt) {
      const closedTime = new Date(summary.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      closedMetaEl.style.display = 'block';
      closedMetaEl.innerHTML = `🔒 Shift finalized on <strong>${closedTime}</strong> by <strong>${summary.closedBy || 'Kitchen Staff'}</strong>.`;
    } else {
      closedMetaEl.style.display = 'none';
    }
  }

  const btnFinalize = document.getElementById('btnFinalizeShift');
  if (btnFinalize) {
    btnFinalize.textContent = summary.isShiftClosed ? '🔒 Re-Finalize & Log Out' : '🛑 Finalize Shift & Log Out';
  }
}

// Print daily settlement slip
function printShiftSummary() {
  window.print();
}

// Finalize Shift & Log Out
async function finalizeShiftAndLogout() {
  const confirmMsg = `Are you sure you want to finalize today's shift (${selectedSummaryDate}) and log out?\n\nThis will archive today's gross revenue and sales ledger to the database for historical retention.`;
  if (!window.confirm(confirmMsg)) return;

  const staffNotes = document.getElementById('ledgerStaffNotes')?.value || 'Daily register and kitchen closing reconciled.';

  try {
    const res = await fetch('/api/kds/close-shift', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: selectedSummaryDate,
        closedBy: 'Kitchen Dispatcher',
        staffNotes
      })
    });

    const data = await res.json();
    if (res.ok) {
      // Disconnect socket & clear local token
      const token = localStorage.getItem(KDS_TOKEN_KEY);
      if (token) {
        try {
          await fetch('/api/kds/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token })
          });
        } catch (e) {}
      }

      localStorage.removeItem(KDS_TOKEN_KEY);
      if (kdsSocket) {
        try { kdsSocket.close(); } catch (e) {}
        kdsSocket = null;
      }

      closeShiftClosingModal();
      showLoginPortal(`✅ Shift for ${selectedSummaryDate} finalized and saved to DB. Logged out.`);
      showKdsToast('Shift finalized and archived to database.');
    } else {
      alert(data.error || 'Failed to finalize shift');
    }
  } catch (err) {
    console.error(err);
    alert('Failed to finalize shift due to a network error.');
  }
}

// Shake animation keyframes injection
if (!document.getElementById('kdsKeyframeStyles')) {
  const kfStyle = document.createElement('style');
  kfStyle.id = 'kdsKeyframeStyles';
  kfStyle.textContent = `
    @keyframes shakeError {
      0%, 100% { transform: translateX(0); }
      20%, 60% { transform: translateX(-8px); }
      40%, 80% { transform: translateX(8px); }
    }
  `;
  document.head.appendChild(kfStyle);
}

// Expose globals for onclick HTML handlers
window.advanceOrderStatus = advanceOrderStatus;
window.resolveWaiterCall = resolveWaiterCall;
window.toggleItemStock = toggleItemStock;
window.switchKdsAuthMode = switchKdsAuthMode;
window.pressPinKey = pressPinKey;
window.clearPinKey = clearPinKey;
window.submitPinLogin = submitPinLogin;
window.submitCredsLogin = submitCredsLogin;
window.openShiftClosingModal = openShiftClosingModal;
window.closeShiftClosingModal = closeShiftClosingModal;
window.selectHistoryDate = selectHistoryDate;
window.onCustomDateSelected = onCustomDateSelected;
window.printShiftSummary = printShiftSummary;
window.finalizeShiftAndLogout = finalizeShiftAndLogout;
