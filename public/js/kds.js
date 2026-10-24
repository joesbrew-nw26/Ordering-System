/**
 * Joe's Brew - Kitchen Display System (KDS) Logic
 * Real-Time Ticket Routing, Upstairs Audio Chimes & Stock CMS
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

document.addEventListener('DOMContentLoaded', () => {
  loadKdsData();
  initKdsWebSocket();
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

// Render Order Tickets
function renderKdsTickets() {
  if (!kdsTicketsList) return;

  const activeOrders = kdsState.orders.filter(o => o.status !== 'Completed');

  if (activeOrders.length === 0) {
    kdsTicketsList.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #9CA3AF;">
        <h3 style="color: var(--vintage-gold-glow);">All Caught Up!</h3>
        <p style="margin-top: 4px;">No active orders in the queue.</p>
      </div>
    `;
    return;
  }

  kdsTicketsList.innerHTML = activeOrders.map(order => {
    const isUpstairs = order.floor === 'Upstairs' || order.tableId.startsWith('Top');
    const timeFormatted = new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return `
      <div class="kds-ticket-card ${isUpstairs ? 'is-upstairs' : ''}" data-id="${order.id}">
        <div class="ticket-header-row">
          <div>
            <span class="ticket-table-badge ${!isUpstairs ? 'is-ground' : ''}">
              ${isUpstairs ? 'UPSTAIRS' : 'GROUND'} • ${order.tableId}
            </span>
          </div>
          <div class="ticket-meta">
            <strong>#${order.orderNumber || order.id}</strong>
            <div>${timeFormatted} • ${order.paymentMode}</div>
          </div>
        </div>

        <div class="ticket-items-list">
          ${order.items.map(item => `
            <div class="ticket-item-line">
              <div>
                <span class="item-qty-badge">${item.quantity}x</span>
                <strong>${item.name}</strong>
              </div>
              <span style="color: var(--vintage-gold-glow);">₹${item.price * item.quantity}</span>
            </div>
          `).join('')}
        </div>

        ${order.generalInstructions ? `
          <div class="ticket-notes-box">
            <strong>NOTE:</strong> ${order.generalInstructions}
          </div>
        ` : ''}

        <div class="ticket-action-row">
          <button class="kds-step-btn ${order.status === 'Received' ? 'active' : ''}" onclick="advanceOrderStatus('${order.id}', 'Received')">
            Received
          </button>
          <button class="kds-step-btn ${order.status === 'Preparing' ? 'active' : ''}" onclick="advanceOrderStatus('${order.id}', 'Preparing')">
            Prep
          </button>
          <button class="kds-step-btn ${order.status === 'Ready to Serve' ? 'active' : ''}" onclick="advanceOrderStatus('${order.id}', 'Ready to Serve')">
            Ready
          </button>
          <button class="kds-step-btn" onclick="advanceOrderStatus('${order.id}', 'Completed')">
            Done ✓
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// Status Advancement
async function advanceOrderStatus(orderId, nextStatus) {
  try {
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus })
    });

    if (!res.ok) throw new Error('Status update failed');
    const data = await res.json();

    const order = kdsState.orders.find(o => o.id === orderId);
    if (order) order.status = nextStatus;

    if (nextStatus === 'Ready to Serve') {
      try { runnerChime.play(); } catch (e) {}
      alert(`🏃 ALERT RUNNER: Order for Table ${order?.tableId} (${order?.floor}) is READY TO SERVE!`);
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

  if (activeCalls.length === 0) {
    kdsWaiterCallsList.innerHTML = `<p style="font-size: 0.82rem; color: #9CA3AF;">No active waiter calls.</p>`;
    return;
  }

  kdsWaiterCallsList.innerHTML = activeCalls.map(call => `
    <div class="waiter-call-card" data-id="${call.id}">
      <div>
        <strong style="color: #F87171; font-size: 0.95rem;">Table ${call.tableId} (${call.floor})</strong>
        <div style="font-size: 0.8rem; margin-top: 2px;">Reason: <strong>${call.reason}</strong></div>
      </div>
      <button class="btn-resolve-call" onclick="resolveWaiterCall('${call.id}')">Done ✓</button>
    </div>
  `).join('');
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
function renderStockList() {
  if (!kdsStockList) return;

  kdsStockList.innerHTML = kdsState.menuItems.map(item => `
    <div class="stock-item-row" data-id="${item.id}">
      <div>
        <strong>${item.name}</strong>
        <span style="font-size: 0.72rem; color: #D1C4B9; margin-left: 6px;">₹${item.price}</span>
      </div>
      <button class="stock-toggle-switch ${!item.inStock ? 'is-out' : ''}" onclick="toggleItemStock('${item.id}')">
        ${item.inStock ? 'In Stock' : 'Sold Out'}
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

// WebSocket Connection
function initKdsWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}`;

  try {
    const socket = new WebSocket(wsUrl);

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handleKdsSocketMessage(msg);
      } catch (e) {}
    };

    socket.onclose = () => {
      setTimeout(initKdsWebSocket, 3000);
    };
  } catch (e) {}
}

function handleKdsSocketMessage(msg) {
  switch (msg.type) {
    case 'NEW_ORDER':
      kdsState.orders.unshift(msg.data);
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
  }
}

// Expose globals for onclick handlers
window.advanceOrderStatus = advanceOrderStatus;
window.resolveWaiterCall = resolveWaiterCall;
window.toggleItemStock = toggleItemStock;
