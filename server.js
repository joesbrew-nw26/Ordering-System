import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  getTables,
  getMenuItems,
  toggleMenuItemStock,
  updateMenuItem,
  addMenuItem,
  deleteMenuItem,
  getOrders,
  getOrderById,
  getLatestOrderNumber,
  createOrder,
  updateOrderStatus,
  getWaiterCalls,
  createWaiterCall,
  resolveWaiterCall,
  getDailySalesRecord,
  saveDailySalesShiftClosure,
  isSupabaseConfigured
} from './lib/supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(__dirname, 'public', 'assets')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Active KDS Session tokens in-memory (token -> userSession)
const activeSessions = new Map();
const KDS_DEFAULT_PIN = process.env.KDS_PIN || '2006';
const KDS_CREDENTIALS = {
  username: process.env.KDS_USER || 'admin',
  password: process.env.KDS_PASSWORD || 'brew2006'
};

// High-speed in-memory cache for menu items during order submission
let cachedMenuItems = null;
let lastMenuFetchTime = 0;
const MENU_CACHE_TTL = 120 * 1000; // 2 minutes

async function getFastMenuItems() {
  const now = Date.now();
  if (cachedMenuItems && (now - lastMenuFetchTime < MENU_CACHE_TTL)) {
    return cachedMenuItems;
  }
  cachedMenuItems = await getMenuItems();
  lastMenuFetchTime = now;
  return cachedMenuItems;
}

function invalidateMenuCache() {
  cachedMenuItems = null;
}

// Middleware: Enforce Admin Role for menu & rate mutations
function requireAdminRole(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : req.query.token;

  if (!token || !activeSessions.has(token)) {
    return res.status(401).json({ error: 'Unauthorized: Admin authentication token required' });
  }

  const session = activeSessions.get(token);
  if (session.role !== 'Admin') {
    return res.status(403).json({ error: 'Forbidden: Admin role privileges required to modify menu & rates' });
  }

  req.adminUser = session;
  next();
}

// WebSocket broadcast helper (active in local server mode; Vercel clients use Supabase Realtime)
function broadcast(eventType, payload) {
  const message = JSON.stringify({ type: eventType, data: payload, timestamp: new Date().toISOString() });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

wss.on('connection', async (ws) => {
  const orders = await getOrders();
  const waiterCalls = await getWaiterCalls();

  ws.send(JSON.stringify({
    type: 'CONNECTED',
    data: {
      message: "Connected to Joe's Brew Realtime Hub",
      activeOrdersCount: orders.filter(o => o.status !== 'Completed').length,
      waiterCallsCount: waiterCalls.filter(c => !c.resolved).length
    }
  }));

  ws.on('message', (message) => {
    try {
      const parsed = JSON.parse(message);
      if (parsed.type === 'PING') {
        ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
      }
    } catch (e) {}
  });
});

// Daily sales aggregator function
async function calculateDailySummary(dateStr) {
  const targetDate = dateStr || new Date().toISOString().split('T')[0];
  const allOrders = await getOrders();
  const dayOrders = allOrders.filter(o => o.createdAt && o.createdAt.startsWith(targetDate));
  const validOrders = dayOrders.filter(o => o.status !== 'Cancelled');
  const totalRevenue = validOrders.reduce((sum, o) => sum + (o.total || o.subtotal || 0), 0);

  const statusCounts = {
    total: dayOrders.length,
    completed: dayOrders.filter(o => o.status === 'Completed').length,
    ready: dayOrders.filter(o => o.status === 'Ready to Serve').length,
    preparing: dayOrders.filter(o => o.status === 'Preparing').length,
    received: dayOrders.filter(o => o.status === 'Received').length,
    cancelled: dayOrders.filter(o => o.status === 'Cancelled').length
  };

  const isTerraceOrder = o => o.floor === 'Terrace' || o.floor === 'Upstairs' || (o.tableId && o.tableId.startsWith('Top'));
  const terraceOrders = validOrders.filter(isTerraceOrder);
  const groundOrders = validOrders.filter(o => !isTerraceOrder(o));

  const terraceRevenue = terraceOrders.reduce((s, o) => s + (o.total || 0), 0);
  const groundRevenue = groundOrders.reduce((s, o) => s + (o.total || 0), 0);

  const itemMap = {};
  validOrders.forEach(o => {
    (o.items || []).forEach(item => {
      const id = item.id || item.name;
      if (!itemMap[id]) {
        itemMap[id] = {
          id,
          name: item.name,
          quantity: 0,
          unitPrice: item.price || 0,
          totalRevenue: 0
        };
      }
      itemMap[id].quantity += (item.quantity || 1);
      itemMap[id].totalRevenue += ((item.price || 0) * (item.quantity || 1));
    });
  });

  const itemSales = Object.values(itemMap).sort((a, b) => b.quantity - a.quantity);
  const totalItemsSold = itemSales.reduce((sum, i) => sum + i.quantity, 0);

  const waiterCalls = await getWaiterCalls();
  const dayWaiterCalls = waiterCalls.filter(c => c.timestamp && c.timestamp.startsWith(targetDate));

  const existingRecord = await getDailySalesRecord(targetDate);
  const recordSummary = existingRecord ? (existingRecord.summary_data || existingRecord) : {};

  return {
    date: targetDate,
    totalRevenue,
    totalOrders: dayOrders.length,
    validOrdersCount: validOrders.length,
    totalItemsSold,
    statusCounts,
    floorBreakdown: {
      terrace: {
        orderCount: terraceOrders.length,
        revenue: terraceRevenue,
        percentage: totalRevenue > 0 ? Math.round((terraceRevenue / totalRevenue) * 100) : 0
      },
      upstairs: {
        orderCount: terraceOrders.length,
        revenue: terraceRevenue,
        percentage: totalRevenue > 0 ? Math.round((terraceRevenue / totalRevenue) * 100) : 0
      },
      ground: {
        orderCount: groundOrders.length,
        revenue: groundRevenue,
        percentage: totalRevenue > 0 ? Math.round((groundRevenue / totalRevenue) * 100) : 0
      }
    },
    paymentSummary: {
      mode: 'Pay at Counter',
      counterSettled: totalRevenue
    },
    itemSales,
    topItems: itemSales.slice(0, 5),
    waiterCallsCount: dayWaiterCalls.length,
    isShiftClosed: Boolean(recordSummary.isShiftClosed || existingRecord?.is_shift_closed),
    closedAt: recordSummary.closedAt || existingRecord?.closed_at || null,
    closedBy: recordSummary.closedBy || existingRecord?.closed_by || null,
    staffNotes: recordSummary.staffNotes || existingRecord?.staff_notes || '',
    generatedAt: new Date().toISOString()
  };
}

// ==========================================
// API ENDPOINTS
// ==========================================

// Config endpoint: Exposes Supabase public URL and anon key to client for direct Realtime subscriptions
app.get('/api/config', (req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL || null,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || null,
    isSupabase: isSupabaseConfigured
  });
});

app.get('/api/tables', async (req, res) => {
  try {
    const tables = await getTables();
    res.json(tables);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tables' });
  }
});

app.get('/api/menu', async (req, res) => {
  try {
    const menu = await getMenuItems();
    res.json(menu);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch menu' });
  }
});

app.post('/api/menu/stock-toggle', async (req, res) => {
  try {
    const { itemId, inStock } = req.body;
    const updated = await toggleMenuItemStock(itemId, inStock);
    if (!updated) {
      return res.status(404).json({ error: 'Item not found' });
    }
    invalidateMenuCache();
    broadcast('STOCK_UPDATE', { itemId: updated.id, inStock: updated.inStock, name: updated.name });
    res.json({ success: true, item: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle stock status' });
  }
});

// Admin Menu Management Endpoints (Strictly requires Admin Role)
app.put('/api/menu/:id', requireAdminRole, async (req, res) => {
  try {
    const itemId = req.params.id;
    const updates = req.body;
    const updated = await updateMenuItem(itemId, updates);
    if (!updated) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    broadcast('MENU_UPDATE', { action: 'UPDATE', item: updated });
    invalidateMenuCache();
    res.json({ success: true, item: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update menu item' });
  }
});

app.post('/api/menu', requireAdminRole, async (req, res) => {
  try {
    const created = await addMenuItem(req.body);
    if (!created) {
      return res.status(400).json({ error: 'Failed to create menu item' });
    }
    invalidateMenuCache();
    broadcast('MENU_UPDATE', { action: 'ADD', item: created });
    res.status(201).json({ success: true, item: created });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create menu item' });
  }
});

app.delete('/api/menu/:id', requireAdminRole, async (req, res) => {
  try {
    const itemId = req.params.id;
    const deleted = await deleteMenuItem(itemId);
    if (!deleted) {
      return res.status(404).json({ error: 'Item not found' });
    }
    broadcast('MENU_UPDATE', { action: 'DELETE', itemId });
    res.json({ success: true, itemId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete menu item' });
  }
});

app.get('/api/orders', async (req, res) => {
  try {
    const orders = await getOrders();
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

app.get('/api/orders/:id', async (req, res) => {
  try {
    const order = await getOrderById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const { tableId, floor, items, instructions, paymentMode, paymentStatus, customerName, customerPhone, orderMode, packagingCharge } = req.body;
    if (!tableId || !items || !items.length) {
      return res.status(400).json({ error: 'Table and items are required' });
    }

    const menuItems = await getFastMenuItems();
    const calculatedItems = items.map(cartItem => {
      const menuItem = menuItems.find(m => m.id === cartItem.id) || cartItem;
      const cat = (cartItem.category || menuItem?.category || '').toUpperCase();
      const mode = cartItem.mode || (orderMode === 'Parcel' ? 'Takeaway' : 'Dine-In');
      const quantity = Math.max(1, Number(cartItem.quantity) || 1);

      return {
        id: cartItem.id,
        name: menuItem.name || cartItem.name,
        category: cat,
        price: menuItem.price || cartItem.price,
        quantity: quantity,
        mode: mode,
        note: cartItem.note || '',
        isSpecial: Boolean(menuItem.isSpecial)
      };
    });

    const subtotal = calculatedItems.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);

    // Calculate packaging charges only for items marked as Takeaway
    // Separate containers per distinct tea & coffee beverage (up to 5 cups per container, Rs.25 each)
    const bevMap = {};
    let foodCount = 0;
    let drinkCount = 0;
    let hasTakeaway = false;
    let hasDineIn = false;

    calculatedItems.forEach(item => {
      if (item.mode === 'Takeaway') {
        hasTakeaway = true;
        const cat = (item.category || '').toUpperCase();
        const qty = item.quantity || 1;
        if (cat === 'TEA' || cat === 'COFFEE') {
          const key = item.id || item.name;
          if (!bevMap[key]) {
            bevMap[key] = { id: key, name: item.name, qty: 0 };
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

    // Artisan Tea & Fresh Coffee: Rs.25 container charge covers up to 5 cups of that specific beverage
    let teaCoffeeContainers = 0;
    Object.values(bevMap).forEach(b => {
      teaCoffeeContainers += Math.ceil(b.qty / 5);
    });

    const calculatedPackaging = (teaCoffeeContainers * 25) + (foodCount * 10) + (drinkCount * 10);

    const computedOrderMode = (hasTakeaway && hasDineIn) 
      ? 'Mixed' 
      : (hasTakeaway ? 'Takeaway' : 'Dine-In');

    const total = subtotal + calculatedPackaging;
    const latestNum = await getLatestOrderNumber();
    const orderNumber = (latestNum + 1).toString().padStart(4, '0');

    let modePrefix = '';
    if (computedOrderMode === 'Takeaway') {
      modePrefix = '[🥡 TAKEAWAY / PARCEL] ';
    } else if (computedOrderMode === 'Mixed') {
      modePrefix = '[🍽️ + 🥡 MIXED ORDER] ';
    }
    const formattedInstructions = `${modePrefix}${instructions || ''}`.trim();

    const newOrder = {
      id: `JB-${orderNumber}`,
      orderNumber,
      tableId,
      floor: floor || (tableId.startsWith('Top') ? 'Terrace' : 'Ground Floor'),
      items: calculatedItems,
      orderMode: computedOrderMode,
      packagingCharge: calculatedPackaging,
      generalInstructions: formattedInstructions,
      subtotal,
      total,
      paymentMode: paymentMode || 'Pay at Counter',
      paymentStatus: paymentStatus || 'Pending (Pay at Counter)',
      status: 'Received',
      customerName: customerName || 'Guest',
      customerPhone: customerPhone ? customerPhone.trim() : '',
      createdAt: new Date().toISOString(),
      statusHistory: [
        { status: 'Received', timestamp: new Date().toISOString() }
      ]
    };

    await createOrder(newOrder);
    broadcast('NEW_ORDER', newOrder);
    res.status(201).json(newOrder);
  } catch (err) {
    console.error('Error creating order:', err);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

app.patch('/api/orders/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['Received', 'Preparing', 'Ready to Serve', 'Completed', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updated = await updateOrderStatus(req.params.id, status);
    if (!updated) {
      return res.status(404).json({ error: 'Order not found' });
    }

    broadcast('ORDER_STATUS_UPDATE', {
      orderId: updated.id,
      orderNumber: updated.orderNumber,
      tableId: updated.tableId,
      floor: updated.floor,
      status: updated.status,
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, order: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

app.get('/api/call-waiter', async (req, res) => {
  try {
    const calls = await getWaiterCalls();
    res.json(calls);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch waiter calls' });
  }
});

app.post('/api/call-waiter', async (req, res) => {
  try {
    const { tableId, floor, reason } = req.body;
    if (!tableId) return res.status(400).json({ error: 'tableId is required' });

    const call = {
      id: `CALL-${Date.now().toString().slice(-5)}`,
      tableId,
      floor: floor || (tableId.startsWith('Top') ? 'Terrace' : 'Ground Floor'),
      reason: reason || 'Assistance requested',
      timestamp: new Date().toISOString(),
      resolved: false
    };

    await createWaiterCall(call);
    broadcast('CALL_WAITER', call);
    res.status(201).json(call);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create waiter call' });
  }
});

app.patch('/api/call-waiter/:id/resolve', async (req, res) => {
  try {
    const resolved = await resolveWaiterCall(req.params.id);
    if (!resolved) return res.status(404).json({ error: 'Call not found' });
    broadcast('WAITER_CALL_RESOLVED', { id: resolved.id, tableId: resolved.tableId });
    res.json({ success: true, call: resolved });
  } catch (err) {
    res.status(500).json({ error: 'Failed to resolve call' });
  }
});

// KDS Authentication
app.post('/api/kds/login', (req, res) => {
  const { pin, username, password } = req.body;
  let isValid = false;
  let operatorRole = 'Kitchen Dispatcher';
  let role = 'Staff';

  if (pin && String(pin).trim() === KDS_DEFAULT_PIN) {
    isValid = true;
    operatorRole = 'Kitchen Dispatch Station';
    role = 'Staff';
  } else if (username && password) {
    if (String(username).trim().toLowerCase() === KDS_CREDENTIALS.username.toLowerCase() &&
        String(password) === KDS_CREDENTIALS.password) {
      isValid = true;
      operatorRole = 'Floor Manager';
      role = 'Admin';
    }
  }

  if (!isValid) {
    return res.status(401).json({
      success: false,
      error: 'Invalid Authorization PIN or Credentials. Default Station PIN is 2006.'
    });
  }

  const token = `kds_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  const userSession = {
    name: operatorRole,
    role: role,
    authenticatedAt: new Date().toISOString()
  };
  activeSessions.set(token, userSession);

  res.json({
    success: true,
    token,
    user: userSession
  });
});

app.get('/api/kds/auth-check', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : req.query.token;

  if (token && activeSessions.has(token)) {
    return res.json({ authenticated: true, user: activeSessions.get(token) });
  }
  return res.json({ authenticated: false });
});

app.post('/api/kds/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : req.body?.token;
  if (token) {
    activeSessions.delete(token);
  }
  res.json({ success: true, message: 'KDS session terminated.' });
});

// Daily Sales Summary
app.get('/api/kds/sales-summary', async (req, res) => {
  try {
    const dateStr = req.query.date || new Date().toISOString().split('T')[0];
    const summary = await calculateDailySummary(dateStr);
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate sales summary' });
  }
});

// 7-Day Sales History
app.get('/api/kds/sales-history', async (req, res) => {
  try {
    const requestedDays = parseInt(req.query.days, 10) || 7;
    const history = [];
    const today = new Date();
    const recordedDates = new Set();

    for (let i = 0; i < requestedDays; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const summary = await calculateDailySummary(dateStr);
      history.push({
        date: dateStr,
        totalRevenue: summary.totalRevenue,
        totalOrders: summary.totalOrders,
        validOrdersCount: summary.validOrdersCount,
        totalItemsSold: summary.totalItemsSold,
        isShiftClosed: summary.isShiftClosed,
        topItem: summary.topItems[0] ? summary.topItems[0].name : '—'
      });
      recordedDates.add(dateStr);
    }

    history.sort((a, b) => b.date.localeCompare(a.date));

    res.json({
      count: history.length,
      retentionDaysGuaranteed: 7,
      history
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sales history' });
  }
});

// Close Shift & Settle Day Ledger
app.post('/api/kds/close-shift', async (req, res) => {
  try {
    const { date, closedBy, staffNotes } = req.body;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const summary = await calculateDailySummary(targetDate);
    summary.isShiftClosed = true;
    summary.closedAt = new Date().toISOString();
    summary.closedBy = closedBy || 'Kitchen Staff';
    summary.staffNotes = staffNotes || 'Shift balanced and closed.';

    await saveDailySalesShiftClosure(targetDate, summary);

    broadcast('KDS_SHIFT_CLOSED', {
      date: targetDate,
      totalRevenue: summary.totalRevenue,
      totalOrders: summary.totalOrders,
      closedAt: summary.closedAt
    });

    res.json({
      success: true,
      message: `Shift for ${targetDate} finalized and saved to permanent database.`,
      summary
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to close shift' });
  }
});

app.get('/kds', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'kds.html'));
});

// Only listen directly when not executed in a serverless environment (e.g. Vercel)
if (!process.env.VERCEL) {
  server.listen(PORT, () => {
    console.log(`☕ Joe's Brew Server running on http://localhost:${PORT}`);
    console.log(`📡 WebSocket server active on ws://localhost:${PORT}`);
  });
}

export default app;
