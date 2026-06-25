import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { inventoryApi } from '../services/api';

const fmtCLP = (n) => `$${Number(n || 0).toLocaleString('es-CL')}`;

export default function Inventory() {
  const [products, setProducts]           = useState([]);
  const [warehouses, setWarehouses]       = useState([]);
  const [loading, setLoading]             = useState(true);
  const [showModal, setShowModal]         = useState(false);
  const [showWarehouseModal, setShowWarehouseModal] = useState(false);
  const [editing, setEditing]             = useState(null);
  const [tab, setTab]                     = useState('productos');
  const [form, setForm] = useState({
    name:'', sku:'', category:'', price:'', description:'',
    minStock:5, warehouseId:'', stockQuantity:'',
  });
  const [whForm, setWhForm] = useState({ name:'', location:'', capacity:'' });

  const resetForm = (whs = warehouses) => {
    setForm({ name:'', sku:'', category:'', price:'', description:'', minStock:5,
      warehouseId: whs[0]?.id||'', stockQuantity:'' });
    setEditing(null);
  };

  const load = () => {
    setLoading(true);
    Promise.all([inventoryApi.getProducts(), inventoryApi.getWarehouses()])
      .then(([pRes, wRes]) => {
        const whs = wRes.data || [];
        setProducts(pRes.data || []);
        setWarehouses(whs);
        setForm(f => ({ ...f, warehouseId: f.warehouseId || whs[0]?.id || '' }));
      })
      .catch(() => toast.error('Error al cargar'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openEdit = (p) => {
    const wId = p.stocks?.[0]?.warehouseId || warehouses[0]?.id || '';
    const qty  = p.stocks?.find(s => s.warehouseId === wId)?.quantity ?? '';
    setEditing(p);
    setForm({ name:p.name||'', sku:p.sku||'', category:p.category||'', price:p.price||'',
      description:p.description||'', minStock:p.minStock??5, warehouseId:wId, stockQuantity:qty });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { name:form.name, sku:form.sku, category:form.category, price:form.price,
        minStock:Number(form.minStock), description:form.description };
      let pid = editing?.id;
      if (editing) {
        await inventoryApi.updateProduct(editing.id, payload);
        toast.success('Producto actualizado');
      } else {
        const res = await inventoryApi.createProduct(payload);
        pid = res.data?.id;
        toast.success('Producto creado');
      }
      if (pid && form.warehouseId && form.stockQuantity !== '') {
        await inventoryApi.updateStock(pid, { warehouseId:form.warehouseId, quantity:Number(form.stockQuantity) });
      }
      setShowModal(false); resetForm(); load();
    } catch (err) { toast.error(err.message); }
  };

  const handleDelete = async (p) => {
    if (!confirm(`¿Eliminar "${p.name}"?`)) return;
    try { await inventoryApi.deleteProduct(p.id); toast.success('Eliminado'); load(); }
    catch (err) { toast.error(err.message); }
  };

  const handleCreateWarehouse = async (e) => {
    e.preventDefault();
    try {
      await inventoryApi.createWarehouse({
        name: whForm.name,
        location: whForm.location,
        capacity: Number(whForm.capacity) || 1000,
      });
      toast.success('Bodega creada');
      setShowWarehouseModal(false);
      setWhForm({ name:'', location:'', capacity:'' });
      load();
    } catch (err) { toast.error(err.message); }
  };

  const getStock = (p) => (p.stocks||[]).reduce((s,st)=>s+Number(st.quantity||0),0);

  const stockMatrix = warehouses.map(w => ({
    ...w,
    items: products.map(p => ({
      id:p.id, name:p.name, sku:p.sku,
      qty:(p.stocks||[]).find(s=>s.warehouseId===w.id)?.quantity || 0,
    })).filter(i => i.qty > 0),
    total: products.reduce((s,p) => s + Number((p.stocks||[]).find(st=>st.warehouseId===w.id)?.quantity||0), 0),
  }));

  return (
    <div>
      <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <h2>Inventario</h2>
          <p>Productos, bodegas y stock por bodega</p>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>+ Nuevo Producto</button>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:'0.5rem', marginBottom:'1.5rem' }}>
        {[['productos','📦 Productos'],['stock','🏬 Stock por Bodega']].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            padding:'0.5rem 1.25rem', borderRadius:8, border:'none', cursor:'pointer', fontWeight:700,
            background: tab===k ? '#2563eb' : '#e2e8f0', color: tab===k ? 'white' : '#475569',
          }}>{l}</button>
        ))}
      </div>

      {/* TAB: Productos */}
      {tab === 'productos' && (
        <div className="card">
          {loading ? <div className="loading">Cargando…</div> : (
            <div className="table-container">
              <table>
                <thead>
                  <tr><th>SKU</th><th>Nombre</th><th>Descripción</th><th>Categoría</th><th>Precio</th><th>Stock Total</th><th>Estado</th><th>Acciones</th></tr>
                </thead>
                <tbody>
                  {products.length === 0
                    ? <tr><td colSpan={8} style={{ textAlign:'center', color:'#94a3b8' }}>Sin productos. Agrega el primero.</td></tr>
                    : products.map(p => {
                        const stock = getStock(p);
                        const low   = stock <= (p.minStock||0);
                        return (
                          <tr key={p.id}>
                            <td><code style={{ fontSize:'0.78rem' }}>{p.sku}</code></td>
                            <td><strong>{p.name}</strong></td>
                            <td style={{ fontSize:'0.78rem', color:'#64748b', maxWidth:160 }}>{p.description?.slice(0,60)}</td>
                            <td>{p.category || '—'}</td>
                            <td>{fmtCLP(p.price)}</td>
                            <td>
                              <span className={`badge ${low?'badge-red':'badge-green'}`}>{stock} und</span>
                              {low && <span style={{ display:'block', fontSize:'0.68rem', color:'#dc2626' }}>⚠ stock bajo</span>}
                            </td>
                            <td><span className={`badge ${p.isActive!==false?'badge-green':'badge-gray'}`}>{p.isActive!==false?'Activo':'Inactivo'}</span></td>
                            <td style={{ whiteSpace:'nowrap' }}>
                              <button className="btn btn-sm" style={{ background:'#dbeafe', color:'#1d4ed8', marginRight:4 }} onClick={() => openEdit(p)}>Editar</button>
                              <button className="btn btn-sm btn-danger" onClick={() => handleDelete(p)}>Eliminar</button>
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
      )}

      {/* TAB: Stock por Bodega */}
      {tab === 'stock' && (
        <div style={{ display:'flex', flexDirection:'column', gap:'1.5rem' }}>
          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            <button className="btn btn-primary" onClick={() => setShowWarehouseModal(true)}>+ Nueva Bodega</button>
          </div>
          {loading ? <div className="loading">Cargando…</div> :
            stockMatrix.length === 0
              ? <div className="card" style={{ textAlign:'center', padding:'2rem', color:'#94a3b8' }}>
                  No hay bodegas registradas. Crea la primera con el botón de arriba.
                </div>
              : stockMatrix.map(w => (
                <div key={w.id} className="card">
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.75rem' }}>
                    <div>
                      <h3 style={{ fontWeight:700, color:'#1e293b' }}>🏬 {w.name}</h3>
                      <span style={{ fontSize:'0.78rem', color:'#64748b' }}>{w.location}</span>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontWeight:800, fontSize:'1.5rem', color:'#2563eb' }}>{w.total}</div>
                      <div style={{ fontSize:'0.72rem', color:'#94a3b8' }}>unidades totales</div>
                    </div>
                  </div>
                  {w.items.length === 0
                    ? <p style={{ color:'#94a3b8', fontSize:'0.85rem' }}>Sin stock asignado a esta bodega</p>
                    : <div className="table-container">
                        <table>
                          <thead><tr><th>SKU</th><th>Producto</th><th>Cantidad</th></tr></thead>
                          <tbody>
                            {w.items.map(i => (
                              <tr key={i.id}>
                                <td><code style={{ fontSize:'0.78rem' }}>{i.sku}</code></td>
                                <td>{i.name}</td>
                                <td><span className="badge badge-blue">{i.qty} und</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                  }
                </div>
              ))
          }
        </div>
      )}

      {/* Modal crear/editar producto */}
      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="modal" style={{ maxWidth:600 }} onClick={e => e.stopPropagation()}>
            <h3>{editing ? 'Editar Producto' : 'Nuevo Producto'}</h3>
            <form onSubmit={handleSubmit}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
                <div className="form-group">
                  <label>Nombre *</label>
                  <input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Nombre del producto" />
                </div>
                <div className="form-group">
                  <label>SKU</label>
                  <input value={form.sku} onChange={e=>setForm({...form,sku:e.target.value})} placeholder="Auto-generado si vacío" />
                </div>
                <div className="form-group">
                  <label>Categoría</label>
                  <input value={form.category} onChange={e=>setForm({...form,category:e.target.value})} placeholder="ej. Electrónica" />
                </div>
                <div className="form-group">
                  <label>Precio (CLP) *</label>
                  <input required type="number" min="0" value={form.price} onChange={e=>setForm({...form,price:e.target.value})} placeholder="0" />
                </div>
                <div className="form-group">
                  <label>Stock mínimo</label>
                  <input type="number" min="0" value={form.minStock} onChange={e=>setForm({...form,minStock:e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label>Descripción</label>
                <textarea rows={2} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Descripción del producto" style={{ resize:'vertical' }} />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
                <div className="form-group">
                  <label>Bodega para stock</label>
                  {warehouses.length === 0
                    ? <div style={{ fontSize:'0.8rem', color:'#dc2626', padding:'0.5rem', background:'#fee2e2', borderRadius:6 }}>
                        ⚠ No hay bodegas. Ve a "Stock por Bodega" y crea una primero.
                      </div>
                    : <select value={form.warehouseId} onChange={e=>{
                        const wId=e.target.value;
                        const qty=editing?.stocks?.find(s=>s.warehouseId===wId)?.quantity??'';
                        setForm({...form,warehouseId:wId,stockQuantity:qty});
                      }}>
                        <option value="">Seleccionar bodega…</option>
                        {warehouses.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}
                      </select>
                  }
                </div>
                <div className="form-group">
                  <label>Stock en bodega</label>
                  <input type="number" min="0" value={form.stockQuantity} onChange={e=>setForm({...form,stockQuantity:e.target.value})} placeholder="ej. 20" disabled={!form.warehouseId} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn" style={{ background:'#f1f5f9' }} onClick={() => { setShowModal(false); resetForm(); }}>Cancelar</button>
                <button type="submit" className="btn btn-primary">{editing ? 'Guardar Cambios' : 'Crear Producto'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal nueva bodega */}
      {showWarehouseModal && (
        <div className="modal-overlay" onClick={() => setShowWarehouseModal(false)}>
          <div className="modal" style={{ maxWidth:480 }} onClick={e => e.stopPropagation()}>
            <h3>Nueva Bodega</h3>
            <form onSubmit={handleCreateWarehouse}>
              <div className="form-group">
                <label>Nombre *</label>
                <input required value={whForm.name} onChange={e=>setWhForm({...whForm,name:e.target.value})} placeholder="ej. Bodega Central Santiago" />
              </div>
              <div className="form-group">
                <label>Ubicación</label>
                <input value={whForm.location} onChange={e=>setWhForm({...whForm,location:e.target.value})} placeholder="ej. Av. Américo Vespucio 1234, Pudahuel" />
              </div>
              <div className="form-group">
                <label>Capacidad (unidades)</label>
                <input type="number" min="1" value={whForm.capacity} onChange={e=>setWhForm({...whForm,capacity:e.target.value})} placeholder="ej. 5000" />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn" style={{ background:'#f1f5f9' }} onClick={() => setShowWarehouseModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Crear Bodega</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
