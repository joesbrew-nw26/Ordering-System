import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Predefined tables definition
const TABLES = [
  { id: 'Ground-01', floor: 'Ground Floor', label: 'Ground - Table 1' },
  { id: 'Ground-02', floor: 'Ground Floor', label: 'Ground - Table 2' },
  { id: 'Ground-03', floor: 'Ground Floor', label: 'Ground - Table 3' },
  { id: 'Ground-04', floor: 'Ground Floor', label: 'Ground - Table 4' },
  { id: 'Ground-05', floor: 'Ground Floor', label: 'Ground - Table 5' },
  { id: 'Ground-06', floor: 'Ground Floor', label: 'Ground - Table 6' },
  { id: 'Top-01', floor: 'Upstairs', label: 'Upstairs - Table 1' },
  { id: 'Top-02', floor: 'Upstairs', label: 'Upstairs - Table 2' },
  { id: 'Top-03', floor: 'Upstairs', label: 'Upstairs - Table 3' },
  { id: 'Top-04', floor: 'Upstairs', label: 'Upstairs - Table 4' },
  { id: 'Top-05', floor: 'Upstairs', label: 'Upstairs - Table 5' },
  { id: 'Top-06', floor: 'Upstairs', label: 'Upstairs - Table 6' },
  { id: 'Top-07', floor: 'Upstairs', label: 'Upstairs - Table 7' },
  { id: 'Top-08', floor: 'Upstairs', label: 'Upstairs - Table 8' },
  { id: 'Top-09', floor: 'Upstairs', label: 'Upstairs - Table 9' },
  { id: 'Top-10', floor: 'Upstairs', label: 'Upstairs - Table 10' }
];

// Load and manage menu
const menuFilePath = path.join(__dirname, 'data', 'menu.json');
let menuItems = [];
try {
  const rawMenu = fs.readFileSync(menuFilePath, 'utf8');
  menuItems = JSON.parse(rawMenu);
} catch (err) {
  console.error('Error reading data/menu.json:', err);
}

// In-memory orders and waiter calls with file sync
const ordersFilePath = path.join(__dirname, 'data', 'orders.json');
let orders = [];
if (fs.existsSync(ordersFilePath)) {
  try {
    orders = JSON.parse(fs.readFileSync(ordersFilePath, 'utf8'));
  } catch (e) {
    orders = [];
  }
}

function persistOrders() {
  try {
    fs.writeFileSync(ordersFilePath, JSON.stringify(orders, null, 2));
  } catch (e) {
    console.error('Failed to write orders.json', e);
  }
}

function persistMenu() {
  try {
    fs.writeFileSync(menuFilePath, JSON.stringify(menuItems, null, 2));
  } catch (e) {
    console.error('Failed to write menu.json', e);
  }
}

let waiterCalls = [];

// WebSocket broadcast helper
function broadcast(eventType, payload) {
  const message = JSON.stringify({ type: eventType, data: payload, timestamp: new Date().toISOString() });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

wss.on('connection', (ws) => {
  // Send connection welcome with current counts
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
    } catch (e) {
      // ignore
    }
  });
});

// API Endpoints
app.get('/api/tables', (req, res) => {
  res.json(TABLES);
});

app.get('/api/menu', (req, res) => {
  res.json(menuItems);
});

app.post('/api/menu/stock-toggle', (req, res) => {
  const { itemId, inStock } = req.body;
  const item = menuItems.find(i => i.id === itemId);
  if (!item) {
    return res.status(404).json({ error: 'Item not found' });
  }
  item.inStock = (inStock !== undefined) ? Boolean(inStock) : !item.inStock;
  persistMenu();
  broadcast('STOCK_UPDATE', { itemId: item.id, inStock: item.inStock, name: item.name });
  res.json({ success: true, item });
});

app.get('/api/orders', (req, res) => {
  res.json(orders);
});

app.get('/api/orders/:id', (req, res) => {
  const order = orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
});

app.post('/api/orders', (req, res) => {
  const { tableId, floor, items, instructions, paymentMode, paymentStatus, customerName } = req.body;
  if (!tableId || !items || !items.length) {
    return res.status(400).json({ error: 'Table and items are required' });
  }

  // Calculate total
  const calculatedItems = items.map(cartItem => {
    const menuItem = menuItems.find(m => m.id === cartItem.id) || cartItem;
    return {
      id: cartItem.id,
      name: menuItem.name || cartItem.name,
      price: menuItem.price || cartItem.price,
      quantity: cartItem.quantity,
      note: cartItem.note || '',
      isSpecial: Boolean(menuItem.isSpecial)
    };
  });

  const subtotal = calculatedItems.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
  const orderNumber = (orders.length + 1).toString().padStart(4, '0');

  const newOrder = {
    id: `JB-${Date.now().toString().slice(-6)}`,
    orderNumber,
    tableId,
    floor: floor || (tableId.startsWith('Top') ? 'Upstairs' : 'Ground Floor'),
    items: calculatedItems,
    generalInstructions: instructions || '',
    subtotal,
    total: subtotal,
    paymentMode: paymentMode || 'UPI', // 'UPI' or 'PAY_LATER'
    paymentStatus: paymentStatus || (paymentMode === 'PAY_LATER' ? 'Pending (Pay at Counter)' : 'Paid via UPI'),
    status: 'Received', // 'Received' -> 'Preparing' -> 'Ready to Serve' -> 'Completed'
    customerName: customerName || 'Guest',
    createdAt: new Date().toISOString(),
    statusHistory: [
      { status: 'Received', timestamp: new Date().toISOString() }
    ]
  };

  orders.unshift(newOrder);
  persistOrders();

  broadcast('NEW_ORDER', newOrder);
  res.status(201).json(newOrder);
});

app.patch('/api/orders/:id/status', (req, res) => {
  const { status } = req.body;
  const order = orders.find(o => o.id === req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const validStatuses = ['Received', 'Preparing', 'Ready to Serve', 'Completed', 'Cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  order.status = status;
  order.statusHistory.push({ status, timestamp: new Date().toISOString() });
  persistOrders();

  broadcast('ORDER_STATUS_UPDATE', {
    orderId: order.id,
    orderNumber: order.orderNumber,
    tableId: order.tableId,
    floor: order.floor,
    status: order.status,
    timestamp: new Date().toISOString()
  });

  res.json({ success: true, order });
});

// Waiter calls
app.get('/api/call-waiter', (req, res) => {
  res.json(waiterCalls.filter(c => !c.resolved));
});

app.post('/api/call-waiter', (req, res) => {
  const { tableId, floor, reason } = req.body;
  if (!tableId) return res.status(400).json({ error: 'tableId is required' });

  const call = {
    id: `CALL-${Date.now().toString().slice(-5)}`,
    tableId,
    floor: floor || (tableId.startsWith('Top') ? 'Upstairs' : 'Ground Floor'),
    reason: reason || 'Assistance requested',
    timestamp: new Date().toISOString(),
    resolved: false
  };

  waiterCalls.unshift(call);
  broadcast('CALL_WAITER', call);
  res.status(201).json(call);
});

app.patch('/api/call-waiter/:id/resolve', (req, res) => {
  const call = waiterCalls.find(c => c.id === req.params.id);
  if (!call) return res.status(404).json({ error: 'Call not found' });
  call.resolved = true;
  broadcast('WAITER_CALL_RESOLVED', { id: call.id, tableId: call.tableId });
  res.json({ success: true, call });
});

app.get('/kds', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'kds.html'));
});

server.listen(PORT, () => {
  console.log(`☕ Joe's Brew Server running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket server active on ws://localhost:${PORT}`);
});
