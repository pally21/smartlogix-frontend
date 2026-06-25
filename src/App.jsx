import React from 'react';
import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Orders    from './pages/Orders';
import Shipping  from './pages/Shipping';
import Checkout  from './pages/Checkout';
import Login     from './pages/Login';

export function getRole()  { return localStorage.getItem('role') || null; }
export function getUser()  { return localStorage.getItem('username') || null; }
export function logout()   {
  localStorage.removeItem('token');
  localStorage.removeItem('role');
  localStorage.removeItem('username');
}

const NAV = [
  { to:'/dashboard', label:'📊 Dashboard'  },
  { to:'/inventory', label:'📦 Inventario' },
  { to:'/orders',    label:'🛒 Pedidos'    },
  { to:'/shipping',  label:'🚚 Envíos'     },
  { to:'/checkout',  label:'💳 Pagos'      },
];

function AdminLayout() {
  const navigate = useNavigate();
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>SmartLogix</h1>
          <span>Gestión Logística</span>
        </div>
        <nav>
          {NAV.map(n => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => isActive ? 'active' : ''}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div style={{ padding:'1rem 1.5rem', borderTop:'1px solid #334155' }}>
          <div style={{ fontSize:'0.78rem', color:'#94a3b8', marginBottom:'0.5rem' }}>
            👤 {getUser() || 'admin'}
          </div>
          <button onClick={() => { logout(); navigate('/login'); }} style={{
            width:'100%', padding:'0.4rem', background:'#dc2626', color:'white',
            border:'none', borderRadius:6, fontSize:'0.8rem', cursor:'pointer', fontWeight:600,
          }}>
            Cerrar sesión
          </button>
        </div>
        <div style={{ padding:'0.5rem 1.5rem', fontSize:'0.7rem', color:'#475569' }}>
          DSY1106 — Fullstack III
        </div>
      </aside>
      <main className="main-content">
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/orders"    element={<Orders />}    />
          <Route path="/shipping"  element={<Shipping />}  />
          <Route path="/checkout"  element={<Checkout />}  />
          <Route path="*"          element={<Navigate to="/dashboard" />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  const role = getRole();
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/*" element={
        role === 'admin'
          ? <AdminLayout />
          : <Navigate to="/login" replace />
      } />
    </Routes>
  );
}
