import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { shippingApi, ordersApi, inventoryApi } from '../services/api';

const STATUS_MAP = {
  PENDING:          { cls:'badge-gray',   label:'Pendiente',    next:'PICKED_UP'         },
  PICKED_UP:        { cls:'badge-blue',   label:'Recogido',     next:'IN_TRANSIT'        },
  IN_TRANSIT:       { cls:'badge-blue',   label:'En tránsito',  next:'OUT_FOR_DELIVERY'  },
  OUT_FOR_DELIVERY: { cls:'badge-yellow', label:'En reparto',   next:'DELIVERED'         },
  DELIVERED:        { cls:'badge-green',  label:'Entregado',    next:null                },
  FAILED:           { cls:'badge-red',    label:'Fallido',      next:null                },
};

// Timeline visual de seguimiento
function ShipmentTimeline({ status }) {
  const steps = [
    { key:'PENDING',          icon:'📋', label:'Pendiente'    },
    { key:'PICKED_UP',        icon:'📦', label:'Recogido'     },
    { key:'IN_TRANSIT',       icon:'🚚', label:'En ruta'      },
    { key:'OUT_FOR_DELIVERY', icon:'🏠', label:'En reparto'   },
    { key:'DELIVERED',        icon:'✅', label:'Entregado'    },
  ];
  const order = ['PENDING','PICKED_UP','IN_TRANSIT','OUT_FOR_DELIVERY','DELIVERED'];
  const current = order.indexOf(status);

  return (
    <div style={{ display:'flex', alignItems:'center', gap:0, padding:'0.5rem 0' }}>
      {steps.map((s, i) => {
        const done    = order.indexOf(s.key) <= current;
        const active  = s.key === status;
        return (
          <React.Fragment key={s.key}>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'0.25rem' }}>
              <div style={{
                width:36, height:36, borderRadius:'50%',
                background: done ? '#16a34a' : active ? '#2563eb' : '#e2e8f0',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:'1rem', border:`2px solid ${done?'#16a34a':active?'#2563eb':'#d1d5db'}`,
              }}>{s.icon}</div>
              <span style={{ fontSize:'0.65rem', color: done?'#166534':'#94a3b8', fontWeight: done?700:400, whiteSpace:'nowrap' }}>
                {s.label}
              </span>
            </div>
            {i < steps.length-1 && (
              <div style={{ flex:1, height:2, background: order.indexOf(steps[i+1].key) <= current ? '#16a34a' : '#e2e8f0', margin:'0 4px', marginBottom:18 }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default function Shipping() {
  const [shipments, setShipments]   = useState([]);
  const [orders, setOrders]         = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [trackInput, setTrackInput] = useState('');
  const [trackResult, setTrackResult] = useState(null);
  const [showModal, setShowModal]   = useState(false);
  const [detailShip, setDetailShip] = useState(null);
  const [form, setForm] = useState({
    orderId:'', productId:'', warehouseId:'', carrier:'Starken',
    destinationAddress:'', weight:'', estimatedDelivery:'',
  });

  const load = () => {
    setLoading(true);
    Promise.all([shippingApi.getShipments(), ordersApi.getOrders(), inventoryApi.getWarehouses(), inventoryApi.getProducts()])
      .then(([sRes,oRes,wRes,pRes]) => {
        setShipments(sRes.data||[]);
        setOrders(oRes.data||[]);
        setWarehouses(wRes.data||[]);
        setProducts(pRes.data||[]);
        const ws = wRes.data||[];
        const os = oRes.data||[];
        setForm(f=>({ ...f, warehouseId:f.warehouseId||ws[0]?.id||'', orderId:f.orderId||os[0]?.id||'' }));
      })
      .catch(()=>toast.error('Error al cargar'))
      .finally(()=>setLoading(false));
  };
  useEffect(()=>{ load(); },[]);

  const advance = async (id, next) => {
    if (!next) return;
    try { await shippingApi.updateStatus(id, next); toast.success(`→ ${STATUS_MAP[next]?.label}`); load(); }
    catch (err) { toast.error(err.message); }
  };

  const handleTrack = async () => {
    if (!trackInput.trim()) return;
    try {
      const res = await shippingApi.track(trackInput.trim());
      setTrackResult(res.data);
    } catch { toast.error('Tracking no encontrado'); setTrackResult(null); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await shippingApi.createShipment({
        ...form,
        weight: form.weight || '1.0',
        estimatedDelivery: form.estimatedDelivery || new Date(Date.now()+5*24*60*60*1000).toISOString().slice(0,10),
      });
      toast.success('Envío creado');
      setShowModal(false);
      setForm({ orderId:'', productId:'', warehouseId:warehouses[0]?.id||'', carrier:'Starken', destinationAddress:'', weight:'', estimatedDelivery:'' });
      load();
    } catch (err) { toast.error(err.message); }
  };

  const getOrder = (id) => orders.find(o=>o.id===id);
  const getWarehouse = (id) => warehouses.find(w=>w.id===id);

  return (
    <div>
      <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div><h2>Envíos</h2><p>Coordinación de despachos y seguimiento en tiempo real</p></div>
        <button className="btn btn-primary" onClick={()=>setShowModal(true)}>+ Nuevo Envío</button>
      </div>

      {/* Rastreador */}
      <div className="card" style={{ marginBottom:'1.5rem' }}>
        <h3 style={{ fontSize:'0.9rem', fontWeight:700, marginBottom:'0.75rem' }}>🔍 Rastrear Envío</h3>
        <div style={{ display:'flex', gap:'0.75rem' }}>
          <input style={{ flex:1, padding:'0.6rem', border:'1px solid #d1d5db', borderRadius:8, fontSize:'0.9rem' }}
            placeholder="Ingresa número de tracking (ej. SL-1234567890-0001)"
            value={trackInput} onChange={e=>setTrackInput(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&handleTrack()} />
          <button className="btn btn-primary" onClick={handleTrack}>Rastrear</button>
        </div>
        {trackResult && (
          <div style={{ marginTop:'1rem' }}>
            <div style={{ marginBottom:'0.75rem', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <strong>{trackResult.trackingNumber}</strong>
                <span style={{ marginLeft:'0.75rem' }}><span className={`badge ${STATUS_MAP[trackResult.status]?.cls}`}>{STATUS_MAP[trackResult.status]?.label}</span></span>
              </div>
              <span style={{ fontSize:'0.8rem', color:'#64748b' }}>🚚 {trackResult.carrier}</span>
            </div>
            <ShipmentTimeline status={trackResult.status} />
          </div>
        )}
      </div>

      {/* Tabla envíos */}
      <div className="card">
        {loading ? <div className="loading">Cargando…</div> : (
          <div className="table-container">
            <table>
              <thead>
                <tr><th>Tracking</th><th>Pedido</th><th>Destino</th><th>Transportista</th><th>Estado</th><th>Entrega est.</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {shipments.length === 0
                  ? <tr><td colSpan={7} style={{ textAlign:'center', color:'#94a3b8' }}>Sin envíos registrados</td></tr>
                  : shipments.map(s => {
                    const ord = getOrder(s.orderId);
                    const next = STATUS_MAP[s.status]?.next;
                    return (
                      <tr key={s.id}>
                        <td>
                          <code style={{ fontSize:'0.78rem', cursor:'pointer', color:'#2563eb', textDecoration:'underline' }}
                            onClick={()=>setDetailShip(s)}>{s.trackingNumber}</code>
                        </td>
                        <td style={{ fontSize:'0.8rem' }}>{ord?.orderNumber || s.orderId?.slice(0,8)+'…'}</td>
                        <td style={{ fontSize:'0.78rem', maxWidth:140 }}>{s.destinationAddress}</td>
                        <td>{s.carrier}</td>
                        <td><span className={`badge ${STATUS_MAP[s.status]?.cls||'badge-gray'}`}>{STATUS_MAP[s.status]?.label||s.status}</span></td>
                        <td style={{ fontSize:'0.8rem' }}>{s.estimatedDelivery ? new Date(s.estimatedDelivery).toLocaleDateString('es-CL') : '—'}</td>
                        <td style={{ whiteSpace:'nowrap' }}>
                          {next && (
                            <button className="btn btn-sm btn-success" onClick={()=>advance(s.id,next)}>
                              → {STATUS_MAP[next]?.label}
                            </button>
                          )}
                          {s.status !== 'DELIVERED' && s.status !== 'FAILED' && (
                            <button className="btn btn-sm btn-danger" style={{ marginLeft:4 }}
                              onClick={()=>shippingApi.updateStatus(s.id,'FAILED').then(()=>{toast.success('Marcado fallido');load();}).catch(e=>toast.error(e.message))}>
                              Fallido
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                }
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal detalle con timeline */}
      {detailShip && (
        <div className="modal-overlay" onClick={()=>setDetailShip(null)}>
          <div className="modal" style={{ maxWidth:580 }} onClick={e=>e.stopPropagation()}>
            <h3>Seguimiento — {detailShip.trackingNumber}</h3>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem', marginBottom:'1rem', fontSize:'0.85rem' }}>
              <div><span style={{ color:'#64748b' }}>Pedido:</span> <strong>{getOrder(detailShip.orderId)?.orderNumber||'—'}</strong></div>
              <div><span style={{ color:'#64748b' }}>Transportista:</span> <strong>{detailShip.carrier}</strong></div>
              <div><span style={{ color:'#64748b' }}>Bodega origen:</span> <strong>{getWarehouse(detailShip.warehouseId)?.name||'—'}</strong></div>
              <div><span style={{ color:'#64748b' }}>Entrega estimada:</span> <strong>{detailShip.estimatedDelivery ? new Date(detailShip.estimatedDelivery).toLocaleDateString('es-CL') : '—'}</strong></div>
              <div style={{ gridColumn:'1/-1' }}><span style={{ color:'#64748b' }}>Destino:</span> <strong>{detailShip.destinationAddress||'—'}</strong></div>
            </div>
            <div style={{ background:'#f8fafc', borderRadius:10, padding:'1rem', marginBottom:'1rem' }}>
              <ShipmentTimeline status={detailShip.status} />
            </div>
            {STATUS_MAP[detailShip.status]?.next && (
              <button className="btn btn-success" style={{ width:'100%' }}
                onClick={()=>{ advance(detailShip.id, STATUS_MAP[detailShip.status].next); setDetailShip(null); }}>
                → Avanzar a {STATUS_MAP[STATUS_MAP[detailShip.status].next]?.label}
              </button>
            )}
            <div style={{ textAlign:'right', marginTop:'0.75rem' }}>
              <button className="btn" style={{ background:'#f1f5f9' }} onClick={()=>setDetailShip(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal nuevo envío */}
      {showModal && (
        <div className="modal-overlay" onClick={()=>setShowModal(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <h3>Nuevo Envío</h3>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Pedido *</label>
                <select required value={form.orderId} onChange={e=>{
                  const o = orders.find(o=>o.id===e.target.value);
                  setForm({...form, orderId:e.target.value, destinationAddress:o?.shippingAddress||form.destinationAddress,
                    productId:o?.items?.[0]?.productId||form.productId});
                }}>
                  <option value="">Seleccionar pedido…</option>
                  {orders.map(o=><option key={o.id} value={o.id}>{o.orderNumber} — {o.customerName}</option>)}
                </select>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
                <div className="form-group">
                  <label>Producto</label>
                  <select value={form.productId} onChange={e=>setForm({...form,productId:e.target.value})}>
                    <option value="">Seleccionar…</option>
                    {products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Bodega origen</label>
                  <select value={form.warehouseId} onChange={e=>setForm({...form,warehouseId:e.target.value})}>
                    <option value="">Seleccionar…</option>
                    {warehouses.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Transportista</label>
                  <select value={form.carrier} onChange={e=>setForm({...form,carrier:e.target.value})}>
                    <option>Starken</option><option>Chilexpress</option><option>DHL</option><option>BlueExpress</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Peso (kg)</label>
                  <input type="number" step="0.1" value={form.weight} onChange={e=>setForm({...form,weight:e.target.value})} placeholder="1.0" />
                </div>
              </div>
              <div className="form-group">
                <label>Dirección destino</label>
                <input value={form.destinationAddress} onChange={e=>setForm({...form,destinationAddress:e.target.value})} placeholder="Dirección del cliente" />
              </div>
              <div className="form-group">
                <label>Entrega estimada</label>
                <input type="date" value={form.estimatedDelivery} onChange={e=>setForm({...form,estimatedDelivery:e.target.value})} />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn" style={{ background:'#f1f5f9' }} onClick={()=>setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Crear Envío</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
