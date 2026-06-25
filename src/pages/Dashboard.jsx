import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { dashboardApi, inventoryApi, ordersApi, shippingApi } from '../services/api';

const fmtCLP = (n) => `$${Number(n || 0).toLocaleString('es-CL')}`;
const COLORS = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed'];

const STATUS_BADGE = {
  PENDING:    { cls: 'badge-yellow', label: 'Pendiente' },
  VALIDATED:  { cls: 'badge-blue',   label: 'Validado'  },
  APPROVED:   { cls: 'badge-blue',   label: 'Aprobado'  },
  PROCESSING: { cls: 'badge-blue',   label: 'En proceso'},
  SHIPPED:    { cls: 'badge-blue',   label: 'Enviado'   },
  DELIVERED:  { cls: 'badge-green',  label: 'Entregado' },
  CANCELLED:  { cls: 'badge-red',    label: 'Cancelado' },
};

// Genera datos de pedidos por día (últimos 7 días) a partir de los pedidos reales
function buildOrdersByDay(orders) {
  const days = {};
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric' });
    days[key] = { name: key, pedidos: 0, ventas: 0 };
  }
  for (const o of orders) {
    const d = new Date(o.createdAt);
    const key = d.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric' });
    if (days[key]) {
      days[key].pedidos += 1;
      days[key].ventas += Number(o.totalAmount || 0);
    }
  }
  return Object.values(days);
}

// Productos más vendidos (top 5 por cantidad total en items)
function buildTopProducts(orders) {
  const map = {};
  for (const o of orders) {
    for (const item of (o.items || [])) {
      const name = item.productName || item.productId?.slice(0, 8) || 'Desconocido';
      map[name] = (map[name] || 0) + Number(item.quantity || 0);
    }
  }
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, cantidad]) => ({ name, cantidad }));
}

// Estado de envíos para pie chart
function buildShipmentStatus(shipments) {
  const map = {};
  for (const s of shipments) {
    const label = { PENDING: 'Pendiente', PICKED_UP: 'Recogido', IN_TRANSIT: 'En tránsito',
      OUT_FOR_DELIVERY: 'En reparto', DELIVERED: 'Entregado', FAILED: 'Fallido' }[s.status] || s.status;
    map[label] = (map[label] || 0) + 1;
  }
  return Object.entries(map).map(([name, value]) => ({ name, value }));
}

export default function Dashboard() {
  const [loading, setLoading]     = useState(true);
  const [orders, setOrders]       = useState([]);
  const [products, setProducts]   = useState([]);
  const [shipments, setShipments] = useState([]);
  const [summary, setSummary]     = useState(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      dashboardApi.getSummary().catch(() => null),
      ordersApi.getOrders().catch(() => ({ data: [] })),
      inventoryApi.getProducts().catch(() => ({ data: [] })),
      shippingApi.getShipments().catch(() => ({ data: [] })),
    ]).then(([sumRes, ordRes, prodRes, shipRes]) => {
      setSummary(sumRes?.data || null);
      setOrders(ordRes.data || []);
      setProducts(prodRes.data || []);
      setShipments(shipRes.data || []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Cargando dashboard…</div>;

  // KPIs calculados desde datos reales
  const hoy = new Date().toDateString();
  const pedidosHoy     = orders.filter(o => new Date(o.createdAt).toDateString() === hoy && o.status !== 'CANCELLED').length;
  const pedidosPend    = orders.filter(o => o.status === 'PENDING').length;
  const enviosEnRuta   = shipments.filter(s => ['IN_TRANSIT','OUT_FOR_DELIVERY','PICKED_UP'].includes(s.status)).length;
  const ventasHoy      = orders.filter(o => new Date(o.createdAt).toDateString() === hoy && o.status !== 'CANCELLED').reduce((s,o) => s + Number(o.totalAmount||0), 0);
  const stockCritico   = products.filter(p => {
    const total = (p.stocks||[]).reduce((s,st)=>s+Number(st.quantity||0),0);
    return total <= (p.minStock || 0);
  }).length;

  const kpis = summary?.kpis || {};
  const ordersByDay    = buildOrdersByDay(orders);
  const topProducts    = buildTopProducts(orders);
  const shipmentStatus = buildShipmentStatus(shipments);

  // Distribución de stock por producto (top 6)
  const stockData = products
    .map(p => ({
      name: p.name?.slice(0, 14),
      stock: (p.stocks||[]).reduce((s,st)=>s+Number(st.quantity||0),0),
    }))
    .sort((a,b) => b.stock - a.stock)
    .slice(0, 6);

  return (
    <div>
      <div className="page-header">
        <h2>Dashboard Ejecutivo</h2>
        <p>Resumen en tiempo real de la operación logística — SmartLogix</p>
      </div>

      {/* KPIs */}
      <div className="kpi-grid">
        <div className="kpi-card blue">
          <div className="label">Pedidos hoy</div>
          <div className="value">{pedidosHoy}</div>
          <div className="sub">Órdenes recibidas hoy</div>
        </div>
        <div className="kpi-card yellow">
          <div className="label">Pedidos pendientes</div>
          <div className="value">{pedidosPend}</div>
          <div className="sub">Requieren atención</div>
        </div>
        <div className="kpi-card">
          <div className="label">Envíos en ruta</div>
          <div className="value">{enviosEnRuta}</div>
          <div className="sub">En tránsito ahora</div>
        </div>
        <div className="kpi-card red">
          <div className="label">Stock crítico</div>
          <div className="value">{stockCritico}</div>
          <div className="sub">Productos bajo mínimo</div>
        </div>
        <div className="kpi-card green">
          <div className="label">Ventas del día</div>
          <div className="value" style={{ fontSize: '1.3rem' }}>{fmtCLP(ventasHoy)}</div>
          <div className="sub">Total facturado hoy</div>
        </div>
      </div>

      {/* Gráficos fila 1 */}
      <div className="two-col" style={{ marginBottom: '1.5rem' }}>
        <div className="card">
          <h3 style={{ marginBottom: '1rem', fontSize: '0.9rem', fontWeight: 700, color: '#374151' }}>
            📈 Pedidos por día (últimos 7 días)
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={ordersByDay}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip formatter={(v) => [v, 'Pedidos']} />
              <Line type="monotone" dataKey="pedidos" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3 style={{ marginBottom: '1rem', fontSize: '0.9rem', fontWeight: 700, color: '#374151' }}>
            🏆 Productos más vendidos
          </h3>
          {topProducts.length === 0
            ? <div className="empty" style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Sin ventas aún</div>
            : <ResponsiveContainer width="100%" height={200}>
                <BarChart data={topProducts} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={90} />
                  <Tooltip />
                  <Bar dataKey="cantidad" fill="#16a34a" radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
          }
        </div>
      </div>

      {/* Gráficos fila 2 */}
      <div className="two-col" style={{ marginBottom: '1.5rem' }}>
        <div className="card">
          <h3 style={{ marginBottom: '1rem', fontSize: '0.9rem', fontWeight: 700, color: '#374151' }}>
            🚚 Estado de envíos
          </h3>
          {shipmentStatus.length === 0
            ? <div className="empty" style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Sin envíos</div>
            : <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={shipmentStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                    {shipmentStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
          }
        </div>
        <div className="card">
          <h3 style={{ marginBottom: '1rem', fontSize: '0.9rem', fontWeight: 700, color: '#374151' }}>
            📦 Distribución de stock
          </h3>
          {stockData.length === 0
            ? <div className="empty" style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Sin stock</div>
            : <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stockData}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="stock" fill="#7c3aed" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
          }
        </div>
      </div>

      {/* Tabla últimos pedidos */}
      <div className="card">
        <h3 style={{ marginBottom: '1rem', fontSize: '0.9rem', fontWeight: 700, color: '#374151' }}>
          🛒 Últimos pedidos
        </h3>
        <div className="table-container">
          <table>
            <thead>
              <tr><th>N° Pedido</th><th>Cliente</th><th>Total</th><th>Estado</th><th>Pago</th><th>Fecha</th></tr>
            </thead>
            <tbody>
              {orders.length === 0
                ? <tr><td colSpan={6} style={{ textAlign:'center', color:'#94a3b8' }}>Sin pedidos aún</td></tr>
                : orders.slice(0,8).map(o => (
                  <tr key={o.id}>
                    <td><strong>{o.orderNumber}</strong></td>
                    <td>{o.customerName}</td>
                    <td>{fmtCLP(o.totalAmount)}</td>
                    <td><span className={`badge ${STATUS_BADGE[o.status]?.cls||'badge-gray'}`}>{STATUS_BADGE[o.status]?.label||o.status}</span></td>
                    <td><span className={`badge ${o.paymentStatus==='PAID'?'badge-green':o.paymentStatus==='FAILED'?'badge-red':'badge-yellow'}`}>
                      {o.paymentStatus==='PAID'?'Pagado':o.paymentStatus==='FAILED'?'Fallido':'Pendiente'}
                    </span></td>
                    <td style={{ fontSize:'0.8rem' }}>{new Date(o.createdAt).toLocaleDateString('es-CL')}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* Alerta stock crítico */}
      {products.filter(p => (p.stocks||[]).reduce((s,st)=>s+Number(st.quantity||0),0) <= (p.minStock||0)).length > 0 && (
        <div className="card" style={{ marginTop:'1.5rem', borderLeft:'4px solid #dc2626' }}>
          <h3 style={{ marginBottom:'1rem', fontSize:'0.9rem', fontWeight:700, color:'#dc2626' }}>
            ⚠️ Productos con stock crítico
          </h3>
          <div className="table-container">
            <table>
              <thead><tr><th>SKU</th><th>Producto</th><th>Categoría</th><th>Stock actual</th><th>Stock mínimo</th></tr></thead>
              <tbody>
                {products.filter(p => (p.stocks||[]).reduce((s,st)=>s+Number(st.quantity||0),0) <= (p.minStock||0)).map(p => {
                  const stock = (p.stocks||[]).reduce((s,st)=>s+Number(st.quantity||0),0);
                  return (
                    <tr key={p.id}>
                      <td><code>{p.sku}</code></td>
                      <td>{p.name}</td>
                      <td>{p.category}</td>
                      <td><span className="badge badge-red">{stock} {p.unit||'und'}</span></td>
                      <td>{p.minStock}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
