import axios from 'axios';

const resolveApiBase = () => {
  const envBase = import.meta.env.VITE_API_URL;
  if (envBase) return envBase;
  return 'http://localhost:8082/api';
};

const API_BASE = resolveApiBase();

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Interceptor de respuesta: desenvuelve { success, data } automáticamente
// y maneja errores globalmente
api.interceptors.response.use(
  (res) => {
    // Si el backend devuelve { success: true, data: [...] }, normalizamos
    // para que los componentes siempre reciban res.data como el array/objeto real
    if (res.data && typeof res.data === 'object' && 'data' in res.data) {
      return { ...res, data: res.data.data };
    }
    return res;
  },
  (err) => {
    const data = err.response?.data;
    const validation = Array.isArray(data?.errors)
      ? data.errors.map((e) => e.msg || e.message).filter(Boolean).join(', ')
      : '';
    const msg = data?.error || validation || data?.message || err.message || 'Error de red';
    return Promise.reject(new Error(msg));
  }
);

// Adjunta token JWT si existe
api.interceptors.request.use((config) => {
  const token =
    typeof globalThis !== 'undefined' &&
    globalThis.localStorage &&
    (globalThis.localStorage.getItem('token') || globalThis.localStorage.getItem('authToken'));
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const authApi = {
  login: (creds) => api.post('/auth/login', creds),
};

// Inventory
export const inventoryApi = {
  getProducts:     (params) => api.get('/inventory/products', { params }),
  getProduct:      (id)     => api.get(`/inventory/products/${id}`),
  createProduct:   (data)   => api.post('/inventory/products', data),
  updateProduct:   (id, data) => api.put(`/inventory/products/${id}`, data),
  deleteProduct:   (id)     => api.delete(`/inventory/products/${id}`),
  getStock:        (id)     => api.get(`/inventory/products/${id}/stock`),
  updateStock:     (id, data) => api.post(`/inventory/products/${id}/stock`, data),
  getWarehouses:   ()       => api.get('/inventory/warehouses'),
  createWarehouse: (data)   => api.post('/inventory/warehouses', data),
  deleteWarehouse: (id)     => api.delete(`/inventory/warehouses/${id}`),
};

// Orders
export const ordersApi = {
  getOrders:      (params) => api.get('/orders', { params }),
  getOrder:       (id)     => api.get(`/orders/${id}`),
  createOrder:    (data)   => api.post('/orders', data),
  updateStatus:   (id, status) => api.put(`/orders/${id}/status`, { status }),
  confirmPayment: (id, data)   => api.post(`/orders/${id}/confirm-payment`, data),
};

// Shipping
export const shippingApi = {
  getShipments:   (params) => api.get('/shipping', { params }),
  getShipment:    (id)     => api.get(`/shipping/${id}`),
  track:          (tn)     => api.get(`/shipping/track/${tn}`),
  createShipment: (data)   => api.post('/shipping', data),
  updateStatus:   (id, status) => api.put(`/shipping/${id}/status`, { status }),
};

// Payment
export const paymentApi = {
  createIntent: (data)         => api.post('/payment/create-intent', data),
  getStatus:    (payId)        => api.get(`/payment/${payId}/status`),
  refund:       (payId, amount) => api.post(`/payment/${payId}/refund`, { amount }),
};

// Dashboard
export const dashboardApi = {
  getSummary: () => api.get('/dashboard/summary'),
};
