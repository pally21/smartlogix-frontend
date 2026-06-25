import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi } from '../services/api';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res   = await authApi.login({ username, password });
      const token = res.data?.token;
      if (!token) throw new Error('Credenciales incorrectas');
      localStorage.setItem('token',    token);
      localStorage.setItem('role',     'admin');
      localStorage.setItem('username', username);
      toast.success('Bienvenido al sistema');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Error de autenticación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      background:'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
    }}>
      <div style={{
        background:'white', borderRadius:16, padding:'2.5rem',
        width:'100%', maxWidth:420, boxShadow:'0 20px 60px rgba(0,0,0,0.3)',
      }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:'2rem' }}>
          <div style={{ fontSize:'2.5rem', marginBottom:'0.5rem' }}>📦</div>
          <h1 style={{ fontSize:'1.75rem', fontWeight:900, color:'#1e293b' }}>
            Smart<span style={{ color:'#2563eb' }}>Logix</span>
          </h1>
          <p style={{ color:'#64748b', fontSize:'0.85rem', marginTop:4 }}>
            Plataforma de Gestión Logística
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Usuario</label>
            <input
              required
              autoFocus
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="admin"
            />
          </div>
          <div className="form-group">
            <label>Contraseña</label>
            <input
              required
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width:'100%', padding:'0.75rem', fontSize:'0.95rem', marginTop:'0.5rem' }}
          >
            {loading ? 'Ingresando…' : '🔐 Ingresar'}
          </button>
          <p style={{ fontSize:'0.78rem', color:'#94a3b8', textAlign:'center', marginTop:'0.75rem' }}>
            Usuario: <strong>admin</strong> · Contraseña: <strong>password</strong>
          </p>
        </form>

        <div style={{ marginTop:'1.5rem', padding:'0.875rem', background:'#f8fafc', borderRadius:8, fontSize:'0.78rem', color:'#64748b' }}>
          <strong style={{ color:'#374151' }}>DSY1106 — Desarrollo Fullstack III</strong><br />
          Microservicios · React · Node.js · PostgreSQL · Docker
        </div>
      </div>
    </div>
  );
}
