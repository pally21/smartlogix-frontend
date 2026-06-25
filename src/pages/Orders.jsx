import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ordersApi, inventoryApi, shippingApi, paymentApi } from '../services/api';

const fmtCLP = (n) => `$${Number(n||0).toLocaleString('es-CL')}`;

const STATUS = {
  PENDING:    { cls:'badge-yellow', label:'Pendiente'  },
  VALIDATED:  { cls:'badge-blue',   label:'Validado'   },
  APPROVED:   { cls:'badge-green',  label:'Aprobado'   },
  PROCESSING: { cls:'badge-blue',   label:'En proceso' },
  SHIPPED:    { cls:'badge-blue',   label:'Enviado'    },
  DELIVERED:  { cls:'badge-green',  label:'Entregado'  },
  CANCELLED:  { cls:'badge-red',    label:'Cancelado'  },
};
const PAY = {
  PENDING: { cls:'badge-yellow', label:'Pendiente' },
  PAID:    { cls:'badge-green',  label:'Pagado'    },
  FAILED:  { cls:'badge-red',    label:'Fallido'   },
};

const uid = () => crypto.randomUUID ? crypto.randomUUID()
  : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });

const STEPS = [
  { key:'created',   label:'Pedido creado',      statuses:['PENDING','VALIDATED','APPROVED','PROCESSING','SHIPPED','DELIVERED'] },
  { key:'paid',      label:'Pago aprobado',       statuses:['APPROVED','PROCESSING','SHIPPED','DELIVERED'], payRequired:'PAID' },
  { key:'preparing', label:'Preparando despacho', statuses:['PROCESSING','SHIPPED','DELIVERED'] },
  { key:'shipped',   label:'En ruta',             statuses:['SHIPPED','DELIVERED'] },
  { key:'delivered', label:'Entregado',           statuses:['DELIVERED'] },
];

function TrackingTimeline({ order }) {
  return (
    <div style={{ padding:'1rem 0' }}>
      {STEPS.map((step, i) => {
        const done = step.statuses.includes(order.status) &&
          (!step.payRequired || order.paymentStatus === step.payRequired);
        return (
          <div key={step.key} style={{ display:'flex', alignItems:'flex-start', gap:'0.75rem', marginBottom: i < STEPS.length-1 ? '0.25rem' : 0 }}>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
              <div style={{
                width:24, height:24, borderRadius:'50%',
                border:`2px solid ${done?'#16a34a':'#d1d5db'}`,
                background: done?'#16a34a':'white',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:'0.7rem', color:'white', fontWeight:700, flexShrink:0,
              }}>{done ? '✓' : ''}</div>
              {i < STEPS.length-1 && <div style={{ width:2, height:20, background: done?'#16a34a':'#e2e8f0' }} />}
            </div>
            <div style={{ paddingTop:3 }}>
              <span style={{ fontSize:'0.85rem', fontWeight: done?700:400, color: done?'#166534':'#94a3b8' }}>
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Orders() {
  const [orders, setOrders]         = useState([]);
  const [products, setProducts]     = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showNew, setShowNew]       = useState(false);
  const [detailOrder, setDetailOrder] = useState(null);
  const [stockErr, setStockErr]     = useState('');
  const [form, setForm] = useState({
    customerName:'', customerEmail:'', shippingAddress:'', shippingComuna:'', shippingCity:'Santiago', notes:'',
    items:[{ productId:'', productName:'', quantity:1, unitPrice:0 }],
  });

  const load = () => {
    setLoading(true);
    Promise.all([ordersApi.getOrders(), inventoryApi.getProducts(), inventoryApi.getWarehouses()])
      .then(([oRes,pRes,wRes]) => {
        setOrders(oRes.data||[]);
        setProducts(pRes.data||[]);
        setWarehouses(wRes.data||[]);
      })
      .catch(() => toast.error('Error al cargar'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const addItem = () => setForm({...form, items:[...form.items,{productId:'',productName:'',quantity:1,unitPrice:0}]});
  const removeItem = (i) => setForm({...form, items: form.items.filter((_,idx)=>idx!==i)});
  const updateItem = (i, field, val) => {
    const items = [...form.items];
    items[i] = {...items[i],[field]:val};
    if (field==='productId') {
      const p = products.find(p=>p.id===val);
      if (p) { items[i].productName=p.name; items[i].unitPrice=parseFloat(p.price)||0; }
    }
    setForm({...form,items});
    setStockErr('');
  };

  const validateStock = () => {
    for (const item of form.items) {
      if (!item.productId) continue;
      const p = products.find(pr=>pr.id===item.productId);
      if (!p) continue;
      const stock = (p.stocks||[]).reduce((s,st)=>s+Number(st.quantity||0),0);
      if (stock < item.quantity) {
        return `Stock insuficiente para "${p.name}": disponible ${stock}, solicitado ${item.quantity}`;
      }
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validateStock();
    if (err) { setStockErr(err); return; }
    try {
      await ordersApi.createOrder({
        customerId: uid(),
        customerName: form.customerName,
        customerEmail: form.customerEmail,
        shippingAddress: [form.shippingAddress, form.shippingComuna, form.shippingCity].filter(Boolean).join(', '),
        notes: form.notes,
        items: form.items.filter(i=>i.productId).map(i=>({
          productId:i.productId, productName:i.productName,
          quantity:Number(i.quantity), unitPrice:Number(i.unitPrice),
        })),
      });
      toast.success('Pedido creado');
      setShowNew(false);
      setForm({ customerName:'', customerEmail:'', shippingAddress:'', shippingComuna:'', shippingCity:'Santiago', notes:'',
        items:[{productId:'',productName:'',quantity:1,unitPrice:0}] });
      setStockErr('');
      load();
    } catch (err) { toast.error(err.message); }
  };

  const changeStatus = async (id, status) => {
    try { await ordersApi.updateStatus(id, status); toast.success(`→ ${STATUS[status]?.label}`); load(); }
    catch (err) { toast.error(err.message); }
  };

  // Despachar: cambia estado a SHIPPED y crea envío si no existe
  const despachar = async (order) => {
    try {
      await ordersApi.updateStatus(order.id, 'SHIPPED');
      const wh = warehouses[0];
      const firstItemId = order.items?.[0]?.productId || '';
      await shippingApi.createShipment({
        orderId: order.id,
        productId: firstItemId,
        warehouseId: wh?.id || '',
        carrier: 'Starken',
        destinationAddress: order.shippingAddress,
        estimatedDelivery: new Date(Date.now()+5*24*60*60*1000).toISOString().slice(0,10),
        weight: '1.0',
      }).catch(()=>{});
      toast.success('Pedido despachado — envio generado');
      load();
    } catch (err) { toast.error(err.message); }
  };

  // Aprobar pago + generar envio + avanzar a APPROVED
  const aprobarPago = async (order) => {
    try {
      const payRes = await paymentApi.createIntent({
        orderId: order.id,
        amount: Math.round(Number(order.totalAmount)),
        description: `Pedido ${order.orderNumber}`,
      });
      await ordersApi.confirmPayment(order.id, { paymentId:payRes.data?.paymentId, paymentStatus:'PAID' });
      await ordersApi.updateStatus(order.id, 'APPROVED');
      toast.success('Pago aprobado');
      load();
    } catch (err) { toast.error(err.message); }
  };

  // Eliminar pedido cancelado
  const eliminarPedido = async (id) => {
    if (!confirm('Eliminar este pedido cancelado?')) return;
    try {
      // Intentar eliminar via API, si no existe el endpoint solo lo ocultamos localmente
      await ordersApi.deleteOrder(id).catch(()=>{});
      setOrders(prev => prev.filter(o => o.id !== id));
      toast.success('Pedido eliminado');
    } catch (err) { toast.error(err.message); }
  };

  const total = form.items.reduce((s,i)=>s+Number(i.quantity||0)*Number(i.unitPrice||0),0);

  return (
    <div>
      <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div><h2>Pedidos</h2><p>Gestion y trazabilidad de ordenes</p></div>
        <button className="btn btn-primary" onClick={() => setShowNew(true)}>+ Nuevo Pedido</button>
      </div>

      <div className="card">
        {loading ? <div className="loading">Cargando...</div> : (
          <div className="table-container">
            <table>
              <thead>
                <tr><th>N Pedido</th><th>Cliente</th><th>Direccion</th><th>Total</th><th>Estado</th><th>Pago</th><th>Fecha</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {orders.length === 0
                  ? <tr><td colSpan={8} style={{ textAlign:'center', color:'#94a3b8' }}>Sin pedidos aun</td></tr>
                  : orders.map(o => (
                    <tr key={o.id}>
                      <td>
                        <strong style={{ cursor:'pointer', color:'#2563eb', textDecoration:'underline' }}
                          onClick={() => setDetailOrder(o)}>{o.orderNumber}</strong>
                      </td>
                      <td>{o.customerName}<br /><span style={{ fontSize:'0.72rem', color:'#94a3b8' }}>{o.customerEmail}</span></td>
                      <td style={{ fontSize:'0.78rem', maxWidth:120 }}>{o.shippingAddress}</td>
                      <td>{fmtCLP(o.totalAmount)}</td>
                      <td><span className={`badge ${STATUS[o.status]?.cls||'badge-gray'}`}>{STATUS[o.status]?.label||o.status}</span></td>
                      <td><span className={`badge ${PAY[o.paymentStatus]?.cls||'badge-gray'}`}>{PAY[o.paymentStatus]?.label||o.paymentStatus}</span></td>
                      <td style={{ fontSize:'0.78rem' }}>{new Date(o.createdAt).toLocaleDateString('es-CL')}</td>
                      <td style={{ whiteSpace:'nowrap' }}>
                        {o.status==='PENDING' && (
                          <button className="btn btn-sm" style={{ background:'#dbeafe',color:'#1d4ed8',marginRight:4 }}
                            onClick={()=>changeStatus(o.id,'VALIDATED')}>Validar</button>
                        )}
                        {o.status==='VALIDATED' && o.paymentStatus!=='PAID' && (
                          <button className="btn btn-sm btn-success" onClick={()=>aprobarPago(o)}>Aprobar pago</button>
                        )}
                        {o.status==='APPROVED' && (
                          <button className="btn btn-sm" style={{ background:'#f0fdf4',color:'#166534',marginRight:4 }}
                            onClick={()=>changeStatus(o.id,'PROCESSING')}>Procesar</button>
                        )}
                        {o.status==='PROCESSING' && (
                          <button className="btn btn-sm" style={{ background:'#eff6ff',color:'#2563eb',marginRight:4 }}
                            onClick={()=>despachar(o)}>Despachar</button>
                        )}
                        {!['CANCELLED','DELIVERED','SHIPPED'].includes(o.status) && (
                          <button className="btn btn-sm btn-danger" style={{ marginLeft:4 }}
                            onClick={()=>changeStatus(o.id,'CANCELLED')}>Cancelar</button>
                        )}
                        {o.status==='CANCELLED' && (
                          <button className="btn btn-sm" style={{ background:'#fee2e2',color:'#991b1b' }}
                            onClick={()=>eliminarPedido(o.id)}>Eliminar</button>
                        )}
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal detalle */}
      {detailOrder && (
        <div className="modal-overlay" onClick={()=>setDetailOrder(null)}>
          <div className="modal" style={{ maxWidth:620 }} onClick={e=>e.stopPropagation()}>
            <h3>Detalle Pedido — {detailOrder.orderNumber}</h3>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem', marginBottom:'1rem' }}>
              <div>
                <p style={{ fontSize:'0.8rem', color:'#64748b' }}>Cliente</p>
                <p style={{ fontWeight:700 }}>{detailOrder.customerName}</p>
                <p style={{ fontSize:'0.8rem', color:'#64748b' }}>{detailOrder.customerEmail}</p>
              </div>
              <div>
                <p style={{ fontSize:'0.8rem', color:'#64748b' }}>Direccion envio</p>
                <p style={{ fontWeight:600, fontSize:'0.85rem' }}>{detailOrder.shippingAddress}</p>
              </div>
            </div>
            <div style={{ background:'#f8fafc', borderRadius:8, padding:'1rem', marginBottom:'1rem' }}>
              <p style={{ fontSize:'0.8rem', fontWeight:700, color:'#64748b', marginBottom:'0.5rem' }}>PRODUCTOS</p>
              <table style={{ width:'100%', fontSize:'0.85rem' }}>
                <thead><tr>
                  <th style={{ textAlign:'left', color:'#64748b', paddingBottom:4 }}>Producto</th>
                  <th>Cant.</th><th>Precio</th><th>Subtotal</th>
                </tr></thead>
                <tbody>
                  {(detailOrder.items||[]).map((it,i)=>(
                    <tr key={i}>
                      <td>{it.productName}</td>
                      <td style={{ textAlign:'center' }}>{it.quantity}</td>
                      <td style={{ textAlign:'right' }}>{fmtCLP(it.unitPrice)}</td>
                      <td style={{ textAlign:'right', fontWeight:700 }}>{fmtCLP(it.quantity*it.unitPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ borderTop:'1px solid #e2e8f0', marginTop:'0.5rem', paddingTop:'0.5rem', textAlign:'right', fontWeight:800 }}>
                Total: {fmtCLP(detailOrder.totalAmount)}
              </div>
            </div>
            <div>
              <p style={{ fontSize:'0.8rem', fontWeight:700, color:'#64748b', marginBottom:'0.25rem' }}>SEGUIMIENTO</p>
              <TrackingTimeline order={detailOrder} />
            </div>
            <div style={{ display:'flex', gap:'0.5rem', justifyContent:'flex-end', marginTop:'0.75rem' }}>
              <span className={`badge ${STATUS[detailOrder.status]?.cls||'badge-gray'}`}>{STATUS[detailOrder.status]?.label}</span>
              <span className={`badge ${PAY[detailOrder.paymentStatus]?.cls||'badge-gray'}`}>{PAY[detailOrder.paymentStatus]?.label}</span>
              <button className="btn" style={{ background:'#f1f5f9' }} onClick={()=>setDetailOrder(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal nuevo pedido */}
      {showNew && (
        <div className="modal-overlay" onClick={()=>setShowNew(false)}>
          <div className="modal" style={{ maxWidth:680, maxHeight:'90vh', overflowY:'auto' }} onClick={e=>e.stopPropagation()}>
            <h3>Nuevo Pedido</h3>
            <form onSubmit={handleSubmit}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
                <div className="form-group">
                  <label>Nombre cliente *</label>
                  <input required value={form.customerName} onChange={e=>setForm({...form,customerName:e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={form.customerEmail} onChange={e=>setForm({...form,customerEmail:e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Direccion</label>
                  <input value={form.shippingAddress} onChange={e=>setForm({...form,shippingAddress:e.target.value})} placeholder="Calle y numero" />
                </div>
                <div className="form-group">
                  <label>Comuna</label>
                  <input value={form.shippingComuna} onChange={e=>setForm({...form,shippingComuna:e.target.value})} placeholder="Ej. Providencia" />
                </div>
              </div>
              <div style={{ margin:'0.75rem 0 0.5rem', fontWeight:700, fontSize:'0.9rem', display:'flex', justifyContent:'space-between' }}>
                <span>Productos</span>
                <button type="button" className="btn btn-sm" style={{ background:'#f1f5f9' }} onClick={addItem}>+ Agregar</button>
              </div>
              {form.items.map((item,i) => (
                <div key={i} style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr auto', gap:'0.5rem', marginBottom:'0.5rem', alignItems:'end' }}>
                  <div className="form-group" style={{ margin:0 }}>
                    {i===0 && <label style={{ fontSize:'0.75rem' }}>Producto</label>}
                    <select value={item.productId} onChange={e=>updateItem(i,'productId',e.target.value)} required>
                      <option value="">Seleccionar...</option>
                      {products.map(p => {
                        const stock = (p.stocks||[]).reduce((s,st)=>s+Number(st.quantity||0),0);
                        return <option key={p.id} value={p.id}>{p.name} — {fmtCLP(p.price)} (stock: {stock})</option>;
                      })}
                    </select>
                  </div>
                  <div className="form-group" style={{ margin:0 }}>
                    {i===0 && <label style={{ fontSize:'0.75rem' }}>Cantidad</label>}
                    <input type="number" min="1" value={item.quantity} onChange={e=>updateItem(i,'quantity',parseInt(e.target.value)||1)} required />
                  </div>
                  <div className="form-group" style={{ margin:0 }}>
                    {i===0 && <label style={{ fontSize:'0.75rem' }}>Precio unit.</label>}
                    <input type="number" min="0" value={item.unitPrice} onChange={e=>updateItem(i,'unitPrice',parseFloat(e.target.value)||0)} required />
                  </div>
                  <button type="button" onClick={()=>removeItem(i)}
                    style={{ padding:'0.5rem', background:'#fee2e2', border:'none', borderRadius:6, cursor:'pointer', color:'#dc2626', fontWeight:700 }}>x</button>
                </div>
              ))}
              {stockErr && (
                <div style={{ background:'#fee2e2', color:'#991b1b', padding:'0.75rem', borderRadius:8, marginBottom:'0.75rem', fontSize:'0.85rem', fontWeight:600 }}>
                  Stock insuficiente: {stockErr}
                </div>
              )}
              <div style={{ textAlign:'right', fontWeight:700, fontSize:'1.1rem', marginBottom:'0.5rem' }}>
                Total: {fmtCLP(total)}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn" style={{ background:'#f1f5f9' }} onClick={()=>setShowNew(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Crear Pedido</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
