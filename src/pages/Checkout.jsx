import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { paymentApi, ordersApi } from '../services/api';

const fmtCLP = (n) => `$${Number(n||0).toLocaleString('es-CL')}`;

const PAY_STATUS = {
  PENDING: { cls:'badge-yellow', label:'Pendiente' },
  PAID:    { cls:'badge-green',  label:'Pagado'    },
  FAILED:  { cls:'badge-red',    label:'Fallido'   },
};

export default function Checkout() {
  const [orders, setOrders]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [results, setResults]       = useState({});   // { orderId: pagoData }

  useEffect(() => {
    ordersApi.getOrders()
      .then(res => setOrders(res.data||[]))
      .catch(()=>toast.error('Error al cargar pedidos'))
      .finally(()=>setLoading(false));
  }, []);

  const reload = () => {
    ordersApi.getOrders().then(res=>setOrders(res.data||[])).catch(()=>{});
  };

  const procesarPago = async (order) => {
    setProcesando(order.id);
    try {
      const res = await paymentApi.createIntent({
        orderId: order.id,
        amount:  Math.round(Number(order.totalAmount)),
        description: `Pedido ${order.orderNumber}`,
      });
      // Confirmar pago en el pedido
      await ordersApi.confirmPayment(order.id, {
        paymentId:     res.data?.paymentId,
        paymentStatus: 'PAID',
      }).catch(()=>{});
      setResults(r=>({ ...r, [order.id]: res.data }));
      toast.success('✅ Pago procesado exitosamente');
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setProcesando(null);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>💳 Historial de Pagos</h2>
        <p>Gestión de pagos por pedido — modo {import.meta.env.VITE_PAYMENT_PROVIDER || 'sandbox'}</p>
      </div>

      <div style={{ background:'#fef9c3', border:'1px solid #fde68a', borderRadius:8, padding:'0.75rem 1rem', marginBottom:'1.5rem', fontSize:'0.85rem', color:'#92400e' }}>
        💡 <strong>Modo sandbox activo:</strong> Los pagos se procesan en simulación. No se realizan cargos reales.
        Configura <code>PAYMENT_PROVIDER</code> en <code>.env</code> para usar Stripe o MercadoPago.
      </div>

      {loading ? <div className="loading">Cargando…</div> : (
        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr><th>N° Pedido</th><th>Cliente</th><th>Monto</th><th>Estado Pago</th><th>ID Transacción</th><th>Fecha</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {orders.length === 0
                  ? <tr><td colSpan={7} style={{ textAlign:'center', color:'#94a3b8' }}>Sin pedidos</td></tr>
                  : orders.map(o => {
                    const res = results[o.id];
                    const isPaid = o.paymentStatus === 'PAID';
                    return (
                      <tr key={o.id}>
                        <td><strong>{o.orderNumber}</strong></td>
                        <td>
                          {o.customerName}
                          <br /><span style={{ fontSize:'0.72rem', color:'#94a3b8' }}>{o.customerEmail}</span>
                        </td>
                        <td style={{ fontWeight:700 }}>{fmtCLP(o.totalAmount)}</td>
                        <td>
                          <span className={`badge ${PAY_STATUS[o.paymentStatus]?.cls||'badge-gray'}`}>
                            {PAY_STATUS[o.paymentStatus]?.label||o.paymentStatus}
                          </span>
                        </td>
                        <td>
                          {res?.paymentId
                            ? <code style={{ fontSize:'0.72rem' }}>{res.paymentId}</code>
                            : <span style={{ color:'#94a3b8', fontSize:'0.8rem' }}>—</span>
                          }
                        </td>
                        <td style={{ fontSize:'0.8rem' }}>{new Date(o.createdAt).toLocaleDateString('es-CL')}</td>
                        <td>
                          {!isPaid
                            ? <button className="btn btn-sm btn-primary"
                                disabled={procesando === o.id}
                                onClick={()=>procesarPago(o)}>
                                {procesando===o.id ? 'Procesando…' : '💳 Pagar'}
                              </button>
                            : <span style={{ fontSize:'0.8rem', color:'#16a34a', fontWeight:700 }}>✓ Pagado</span>
                          }
                        </td>
                      </tr>
                    );
                  })
                }
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detalle del último resultado */}
      {Object.keys(results).length > 0 && (
        <div className="card" style={{ marginTop:'1.5rem' }}>
          <h3 style={{ fontSize:'0.9rem', fontWeight:700, marginBottom:'1rem', color:'#374151' }}>
            🧾 Comprobantes de pago
          </h3>
          <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
            {Object.entries(results).map(([orderId, pago]) => {
              const order = orders.find(o=>o.id===orderId);
              return (
                <div key={orderId} style={{ background:'#f0fdf4', borderRadius:8, padding:'0.875rem', border:'1px solid #bbf7d0', fontSize:'0.85rem' }}>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:'0.5rem' }}>
                    <div><span style={{ color:'#64748b' }}>Pedido:</span> <strong>{order?.orderNumber}</strong></div>
                    <div><span style={{ color:'#64748b' }}>Cliente:</span> <strong>{order?.customerName}</strong></div>
                    <div><span style={{ color:'#64748b' }}>Monto:</span> <strong>{fmtCLP(pago.amount||order?.totalAmount)}</strong></div>
                    <div><span style={{ color:'#64748b' }}>Proveedor:</span> <strong style={{ textTransform:'capitalize' }}>{pago.provider}</strong></div>
                    <div><span style={{ color:'#64748b' }}>Estado:</span> <span className="badge badge-green">{pago.status}</span></div>
                    <div style={{ gridColumn:'1/-1' }}><span style={{ color:'#64748b' }}>ID transacción:</span> <code style={{ fontSize:'0.75rem' }}>{pago.paymentId}</code></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
