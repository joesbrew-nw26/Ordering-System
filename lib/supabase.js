import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false }
    })
  : null;

if (isSupabaseConfigured) {
  console.log('⚡ Connected to Supabase Cloud Database:', SUPABASE_URL);
} else {
  console.log('📁 Supabase environment variables not found — using local JSON persistence mode.');
}

// Fallback Local File Paths
const menuFilePath = path.join(rootDir, 'data', 'menu.json');
const ordersFilePath = path.join(rootDir, 'data', 'orders.json');
const dailySalesFilePath = path.join(rootDir, 'data', 'daily_sales.json');

// --- Helper for Local JSON Reading & Writing ---
function readLocalJson(filePath, defaultValue) {
  if (fs.existsSync(filePath)) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
      return defaultValue;
    }
  }
  return defaultValue;
}

function writeLocalJson(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(`Failed to write local file ${filePath}:`, e);
  }
}

// ==========================================
// 1. TABLES
// ==========================================
const DEFAULT_TABLES = [
  { id: 'Ground-01', floor: 'Ground Floor', label: 'Ground - Table 1' },
  { id: 'Ground-02', floor: 'Ground Floor', label: 'Ground - Table 2' },
  { id: 'Ground-03', floor: 'Ground Floor', label: 'Ground - Table 3' },
  { id: 'Top-01', floor: 'Terrace', label: 'Terrace - Table 1' },
  { id: 'Top-02', floor: 'Terrace', label: 'Terrace - Table 2' },
  { id: 'Top-03', floor: 'Terrace', label: 'Terrace - Table 3' },
  { id: 'Top-04', floor: 'Terrace', label: 'Terrace - Table 4' }
];

export async function getTables() {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('tables').select('*').order('id');
    if (!error && data && data.length > 0) return data;
  }
  return DEFAULT_TABLES;
}

// ==========================================
// 2. MENU ITEMS
// ==========================================
export async function getMenuItems() {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('menu_items').select('*').order('id');
    if (!error && data) {
      return data.map(item => ({
        id: item.id,
        name: item.name,
        category: item.category,
        price: Number(item.price),
        isSpecial: Boolean(item.is_special),
        description: item.description,
        inStock: Boolean(item.in_stock),
        badge: item.badge,
        type: item.type
      }));
    }
  }
  return readLocalJson(menuFilePath, []);
}

export async function toggleMenuItemStock(itemId, inStock) {
  if (isSupabaseConfigured) {
    const { data: existing } = await supabase.from('menu_items').select('*').eq('id', itemId).single();
    if (!existing) return null;

    const newStock = (inStock !== undefined) ? Boolean(inStock) : !existing.in_stock;
    const { data, error } = await supabase
      .from('menu_items')
      .update({ in_stock: newStock, updated_at: new Date().toISOString() })
      .eq('id', itemId)
      .select()
      .single();

    if (error || !data) return null;
    return {
      id: data.id,
      name: data.name,
      inStock: data.in_stock
    };
  }

  // Local JSON fallback
  const items = readLocalJson(menuFilePath, []);
  const item = items.find(i => i.id === itemId);
  if (!item) return null;
  item.inStock = (inStock !== undefined) ? Boolean(inStock) : !item.inStock;
  writeLocalJson(menuFilePath, items);
  return { id: item.id, name: item.name, inStock: item.inStock };
}

export async function updateMenuItem(itemId, updates) {
  if (isSupabaseConfigured) {
    const payload = { updated_at: new Date().toISOString() };
    if (updates.name !== undefined) payload.name = updates.name.trim();
    if (updates.category !== undefined) payload.category = updates.category.toUpperCase().trim();
    if (updates.price !== undefined) payload.price = Math.max(0, Number(updates.price));
    if (updates.description !== undefined) payload.description = updates.description.trim();
    if (updates.type !== undefined) payload.type = updates.type;
    if (updates.inStock !== undefined) payload.in_stock = Boolean(updates.inStock);
    if (updates.isSpecial !== undefined) {
      payload.is_special = Boolean(updates.isSpecial);
      payload.badge = payload.is_special ? (updates.badge || "Joe's Brew Special") : null;
    }

    const { data, error } = await supabase
      .from('menu_items')
      .update(payload)
      .eq('id', itemId)
      .select()
      .single();

    if (error || !data) return null;
    return {
      id: data.id,
      name: data.name,
      category: data.category,
      price: Number(data.price),
      isSpecial: Boolean(data.is_special),
      description: data.description,
      inStock: Boolean(data.in_stock),
      badge: data.badge,
      type: data.type
    };
  }

  // Local JSON fallback
  const items = readLocalJson(menuFilePath, []);
  const idx = items.findIndex(i => i.id === itemId);
  if (idx === -1) return null;

  const item = items[idx];
  if (updates.name !== undefined) item.name = updates.name.trim();
  if (updates.category !== undefined) item.category = updates.category.toUpperCase().trim();
  if (updates.price !== undefined) item.price = Math.max(0, Number(updates.price));
  if (updates.description !== undefined) item.description = updates.description.trim();
  if (updates.type !== undefined) item.type = updates.type;
  if (updates.inStock !== undefined) item.inStock = Boolean(updates.inStock);
  if (updates.isSpecial !== undefined) {
    item.isSpecial = Boolean(updates.isSpecial);
    item.badge = item.isSpecial ? (updates.badge || "Joe's Brew Special") : null;
  }

  writeLocalJson(menuFilePath, items);
  return item;
}

export async function addMenuItem(itemData) {
  const cat = (itemData.category || 'SNACKS').toUpperCase().trim();
  const name = (itemData.name || 'New Creation').trim();
  const price = Math.max(0, Number(itemData.price) || 0);
  const isSpecial = Boolean(itemData.isSpecial);
  const description = (itemData.description || '').trim();
  const inStock = itemData.inStock !== undefined ? Boolean(itemData.inStock) : true;
  
  // Determine beverage / food packaging type
  let type = itemData.type;
  if (!type) {
    if (cat === 'TEA' || cat === 'COFFEE' || cat === 'MELT') type = 'hot';
    else if (cat === 'DRINKS') type = 'cold';
    else type = 'snack';
  }

  // Generate unique ID slug
  const prefixMap = {
    TEA: 'tea',
    COFFEE: 'coffee',
    MELT: 'melt',
    COOKIES: 'cookie',
    DRINKS: 'drink',
    SNACKS: 'snack',
    EATS: 'eat'
  };
  const prefix = prefixMap[cat] || 'item';
  const id = itemData.id || `${prefix}-${Date.now().toString().slice(-4)}`;

  const newItem = {
    id,
    name,
    category: cat,
    price,
    isSpecial,
    description,
    inStock,
    badge: isSpecial ? "Joe's Brew Special" : null,
    type
  };

  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('menu_items')
      .insert({
        id: newItem.id,
        name: newItem.name,
        category: newItem.category,
        price: newItem.price,
        is_special: newItem.isSpecial,
        description: newItem.description,
        in_stock: newItem.inStock,
        badge: newItem.badge,
        type: newItem.type
      })
      .select()
      .single();

    if (error || !data) return null;
    return newItem;
  }

  // Local JSON fallback
  const items = readLocalJson(menuFilePath, []);
  items.push(newItem);
  writeLocalJson(menuFilePath, items);
  return newItem;
}

export async function deleteMenuItem(itemId) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', itemId)
      .select()
      .single();

    if (error) return false;
    return true;
  }

  // Local JSON fallback
  const items = readLocalJson(menuFilePath, []);
  const filtered = items.filter(i => i.id !== itemId);
  if (filtered.length === items.length) return false;
  writeLocalJson(menuFilePath, filtered);
  return true;
}

// ==========================================
// 3. ORDERS
// ==========================================
export async function getOrders() {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .neq('status', 'Archived')
      .order('created_at', { ascending: false });

    if (!error && data) {
      return data.map(o => ({
        id: o.id,
        orderNumber: o.order_number,
        tableId: o.table_id,
        floor: o.floor,
        items: o.items || [],
        orderMode: o.order_mode || o.orderMode || (o.general_instructions?.includes('TAKEAWAY / PARCEL') ? 'Parcel' : 'Dine-In'),
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
      }));
    }
  }
  return readLocalJson(ordersFilePath, []).filter(o => o.status !== 'Archived');
}

export async function getLatestOrderNumber() {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('order_number, id')
        .neq('status', 'Archived')
        .order('created_at', { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0) {
        const raw = data[0].order_number || data[0].id || '';
        const n = parseInt(String(raw).replace(/\D/g, ''), 10);
        if (!isNaN(n) && n > 0) return n;
      }
    } catch (e) {
      // Local fallback
    }
  }

  const orders = readLocalJson(ordersFilePath, []).filter(o => o.status !== 'Archived');
  let max = orders.length;
  orders.forEach(o => {
    const raw = o.orderNumber || o.order_number || o.id || '';
    const n = parseInt(String(raw).replace(/\D/g, ''), 10);
    if (!isNaN(n) && n > max) max = n;
  });
  return max;
}

export async function resetOrdersAndSales() {
  if (isSupabaseConfigured) {
    try {
      await supabase.from('orders').delete().neq('id', '___');
    } catch (e) {}
    try {
      await supabase.from('orders').update({ status: 'Archived' }).neq('status', 'Archived');
    } catch (e) {}
    try {
      await supabase.from('daily_sales').delete().neq('date', '___');
    } catch (e) {}
    try {
      await supabase.from('waiter_calls').delete().neq('id', '___');
    } catch (e) {}
  }
  writeLocalJson(ordersFilePath, []);
  writeLocalJson(dailySalesFilePath, {});
  localWaiterCalls = [];
}

export async function getOrderById(orderId) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (!error && data) {
      return {
        id: data.id,
        orderNumber: data.order_number,
        tableId: data.table_id,
        floor: data.floor,
        items: data.items || [],
        orderMode: data.order_mode || (data.general_instructions?.includes('TAKEAWAY / PARCEL') ? 'Parcel' : 'Dine-In'),
        packagingCharge: Number(data.packaging_charge || 0),
        generalInstructions: data.general_instructions || '',
        subtotal: Number(data.subtotal),
        total: Number(data.total),
        paymentMode: data.payment_mode,
        paymentStatus: data.payment_status,
        status: data.status,
        customerName: data.customer_name,
        customerPhone: data.customer_phone,
        statusHistory: data.status_history || [],
        createdAt: data.created_at
      };
    }
    return null;
  }

  const orders = readLocalJson(ordersFilePath, []);
  return orders.find(o => o.id === orderId) || null;
}

export async function createOrder(orderData) {
  if (isSupabaseConfigured) {
    const baseRow = {
      id: orderData.id,
      order_number: orderData.orderNumber,
      table_id: orderData.tableId,
      floor: orderData.floor,
      items: orderData.items,
      general_instructions: orderData.generalInstructions,
      subtotal: orderData.subtotal,
      total: orderData.total,
      payment_mode: orderData.paymentMode,
      payment_status: orderData.paymentStatus,
      status: orderData.status,
      customer_name: orderData.customerName,
      customer_phone: orderData.customerPhone,
      status_history: orderData.statusHistory,
      created_at: orderData.createdAt
    };

    // Try full insert with order_mode & packaging_charge
    try {
      const fullRow = {
        ...baseRow,
        order_mode: orderData.orderMode || 'Dine-In',
        packaging_charge: orderData.packagingCharge || 0
      };
      const { data, error } = await supabase.from('orders').insert(fullRow).select().single();
      if (!error && data) {
        return orderData;
      }
    } catch (e) {
      // Ignored: fallback below
    }

    // Fallback to baseRow if schema column migration is pending
    const { data: baseData, error: baseErr } = await supabase.from('orders').insert(baseRow).select().single();
    if (baseErr) {
      console.error('Supabase createOrder error:', baseErr);
      throw baseErr;
    }
    return orderData;
  }

  // Local JSON fallback
  const orders = readLocalJson(ordersFilePath, []);
  orders.unshift(orderData);
  writeLocalJson(ordersFilePath, orders);
  return orderData;
}

export async function updateOrder(orderId, updates) {
  const timestamp = new Date().toISOString();

  if (isSupabaseConfigured) {
    const { data: existing, error: fetchErr } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (fetchErr || !existing) return null;

    const rowUpdates = {
      updated_at: timestamp
    };

    if (updates.items !== undefined) rowUpdates.items = updates.items;
    if (updates.subtotal !== undefined) rowUpdates.subtotal = updates.subtotal;
    if (updates.total !== undefined) rowUpdates.total = updates.total;
    if (updates.packagingCharge !== undefined) rowUpdates.packaging_charge = updates.packagingCharge;
    if (updates.orderMode !== undefined) rowUpdates.order_mode = updates.orderMode;
    if (updates.generalInstructions !== undefined) rowUpdates.general_instructions = updates.generalInstructions;
    if (updates.paymentMode !== undefined) rowUpdates.payment_mode = updates.paymentMode;
    if (updates.paymentStatus !== undefined) rowUpdates.payment_status = updates.paymentStatus;
    if (updates.status !== undefined) rowUpdates.status = updates.status;

    let history = existing.status_history || [];
    if (updates.status && updates.status !== existing.status) {
      history = [...history, { status: updates.status, timestamp, paymentMode: updates.paymentMode || existing.payment_mode || '' }];
      rowUpdates.status_history = history;
    } else if (updates.statusHistory !== undefined) {
      rowUpdates.status_history = updates.statusHistory;
    }

    let updatedRow = null;
    try {
      const { data, error } = await supabase
        .from('orders')
        .update(rowUpdates)
        .eq('id', orderId)
        .select('*')
        .single();
      if (!error && data) updatedRow = data;
    } catch (e) {}

    // Fallback if schema doesn't have order_mode or packaging_charge columns
    if (!updatedRow) {
      delete rowUpdates.order_mode;
      delete rowUpdates.packaging_charge;
      const { data, error } = await supabase
        .from('orders')
        .update(rowUpdates)
        .eq('id', orderId)
        .select('*')
        .single();
      if (!error && data) updatedRow = data;
    }

    if (!updatedRow) return null;

    const formatted = {
      id: updatedRow.id,
      orderNumber: updatedRow.order_number,
      tableId: updatedRow.table_id,
      floor: updatedRow.floor,
      items: updatedRow.items || [],
      orderMode: updatedRow.order_mode || (updatedRow.general_instructions?.includes('TAKEAWAY / PARCEL') ? 'Parcel' : 'Dine-In'),
      packagingCharge: Number(updatedRow.packaging_charge || 0),
      generalInstructions: updatedRow.general_instructions || '',
      subtotal: Number(updatedRow.subtotal),
      total: Number(updatedRow.total),
      paymentMode: updatedRow.payment_mode,
      paymentStatus: updatedRow.payment_status,
      status: updatedRow.status,
      customerName: updatedRow.customer_name,
      customerPhone: updatedRow.customer_phone,
      statusHistory: updatedRow.status_history || [],
      createdAt: updatedRow.created_at,
      updatedAt: updatedRow.updated_at
    };

    // Keep local cache synchronized
    const orders = readLocalJson(ordersFilePath, []);
    const idx = orders.findIndex(o => o.id === orderId);
    if (idx !== -1) {
      orders[idx] = { ...orders[idx], ...formatted };
      writeLocalJson(ordersFilePath, orders);
    }

    return formatted;
  }

  // Local JSON fallback
  const orders = readLocalJson(ordersFilePath, []);
  const idx = orders.findIndex(o => o.id === orderId);
  if (idx === -1) return null;

  const order = orders[idx];
  if (updates.items !== undefined) order.items = updates.items;
  if (updates.subtotal !== undefined) order.subtotal = updates.subtotal;
  if (updates.total !== undefined) order.total = updates.total;
  if (updates.packagingCharge !== undefined) order.packagingCharge = updates.packagingCharge;
  if (updates.orderMode !== undefined) order.orderMode = updates.orderMode;
  if (updates.generalInstructions !== undefined) order.generalInstructions = updates.generalInstructions;
  if (updates.paymentMode !== undefined) order.paymentMode = updates.paymentMode;
  if (updates.paymentStatus !== undefined) order.paymentStatus = updates.paymentStatus;
  if (updates.status !== undefined) {
    if (updates.status !== order.status) {
      if (!order.statusHistory) order.statusHistory = [];
      order.statusHistory.push({ status: updates.status, timestamp, paymentMode: updates.paymentMode || order.paymentMode || '' });
    }
    order.status = updates.status;
  }
  order.updatedAt = timestamp;

  writeLocalJson(ordersFilePath, orders);
  return order;
}

export async function updateOrderStatus(orderId, newStatus, paymentMode = null) {
  const timestamp = new Date().toISOString();

  if (isSupabaseConfigured) {
    const { data: existing } = await supabase.from('orders').select('*').eq('id', orderId).single();
    if (!existing) return null;

    const history = existing.status_history || [];
    history.push({ status: newStatus, timestamp, paymentMode: paymentMode || existing.payment_mode || '' });

    const rowUpdates = {
      status: newStatus,
      status_history: history,
      updated_at: timestamp
    };

    if (paymentMode) {
      rowUpdates.payment_mode = paymentMode;
      rowUpdates.payment_status = `Paid (${paymentMode})`;
    }

    const { data, error } = await supabase
      .from('orders')
      .update(rowUpdates)
      .eq('id', orderId)
      .select('*')
      .single();

    if (error || !data) return null;
    return {
      id: data.id,
      orderNumber: data.order_number,
      tableId: data.table_id,
      floor: data.floor,
      items: data.items || [],
      orderMode: data.order_mode || 'Dine-In',
      packagingCharge: Number(data.packaging_charge || 0),
      generalInstructions: data.general_instructions || '',
      subtotal: Number(data.subtotal),
      total: Number(data.total),
      paymentMode: data.payment_mode,
      paymentStatus: data.payment_status,
      status: data.status,
      customerName: data.customer_name,
      customerPhone: data.customer_phone,
      statusHistory: data.status_history,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  // Local JSON fallback
  const orders = readLocalJson(ordersFilePath, []);
  const order = orders.find(o => o.id === orderId);
  if (!order) return null;

  order.status = newStatus;
  if (paymentMode) {
    order.paymentMode = paymentMode;
    order.paymentStatus = `Paid (${paymentMode})`;
  }
  if (!order.statusHistory) order.statusHistory = [];
  order.statusHistory.push({ status: newStatus, timestamp, paymentMode: paymentMode || order.paymentMode || '' });
  order.updatedAt = timestamp;
  writeLocalJson(ordersFilePath, orders);
  return order;
}

// ==========================================
// 4. WAITER CALLS
// ==========================================
let localWaiterCalls = [];

export async function getWaiterCalls() {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('waiter_calls')
      .select('*')
      .eq('resolved', false)
      .order('timestamp', { ascending: false });

    if (!error && data) {
      return data.map(c => ({
        id: c.id,
        tableId: c.table_id,
        floor: c.floor,
        reason: c.reason,
        timestamp: c.timestamp,
        resolved: c.resolved
      }));
    }
  }
  return localWaiterCalls.filter(c => !c.resolved);
}

export async function createWaiterCall(callData) {
  if (isSupabaseConfigured) {
    const row = {
      id: callData.id,
      table_id: callData.tableId,
      floor: callData.floor,
      reason: callData.reason,
      timestamp: callData.timestamp,
      resolved: false
    };

    const { data, error } = await supabase.from('waiter_calls').insert(row).select().single();
    if (error) throw error;
    return callData;
  }

  localWaiterCalls.unshift(callData);
  return callData;
}

export async function resolveWaiterCall(callId) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('waiter_calls')
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq('id', callId)
      .select()
      .single();

    if (error || !data) return null;
    return { id: data.id, tableId: data.table_id, resolved: true };
  }

  const call = localWaiterCalls.find(c => c.id === callId);
  if (!call) return null;
  call.resolved = true;
  return call;
}

// ==========================================
// 5. DAILY SALES & SHIFT CLOSING (7+ DAYS AUDIT)
// ==========================================
export async function getDailySalesRecord(dateStr) {
  if (isSupabaseConfigured) {
    const { data } = await supabase
      .from('daily_sales')
      .select('*')
      .eq('date', dateStr)
      .single();
    return data || null;
  }

  const sales = readLocalJson(dailySalesFilePath, {});
  return sales[dateStr] || null;
}

export async function saveDailySalesShiftClosure(dateStr, summary) {
  if (isSupabaseConfigured) {
    const row = {
      date: dateStr,
      summary_data: summary,
      is_shift_closed: Boolean(summary.isShiftClosed),
      closed_at: summary.closedAt,
      closed_by: summary.closedBy,
      staff_notes: summary.staffNotes,
      updated_at: new Date().toISOString()
    };

    await supabase.from('daily_sales').upsert(row, { onConflict: 'date' });
    return summary;
  }

  const sales = readLocalJson(dailySalesFilePath, {});
  sales[dateStr] = summary;
  writeLocalJson(dailySalesFilePath, sales);
  return summary;
}
