# Frontend — SmartLogix

Proyecto React + Vite para la UI.

Instalación y ejecución en desarrollo:

```bash
cd frontend
npm install
npm run dev   # abre en localhost:3000
```

Build para producción:

```bash
npm run build
# Salida en dist/
```

Tests: este proyecto no incluye tests unitarios por defecto (use frameworks como Vitest si desea añadirlos).
# SmartLogix Frontend

Interfaz de usuario para el sistema de gestión logística SmartLogix. Desarrollada con React 18 y Vite, empaquetada como componente NPM.

## Tecnologías

- React 18
- Vite 5
- Axios
- React Router DOM 6
- Recharts (gráficos)
- React Hot Toast (notificaciones)

## Requisitos previos

- Node.js 18 o superior
- npm 9 o superior

## Instalación

```bash
npm install
```

## Scripts disponibles

| Comando | Descripción |
|---|---|
| `npm start` | Inicia servidor de desarrollo en puerto 3000 |
| `npm run build` | Genera build de producción en `/dist` |
| `npm run preview` | Previsualiza el build de producción |

## Variables de entorno

Crear archivo `.env` en la raíz del proyecto:

```env
VITE_API_URL=http://localhost:8080/api
```

Si no se define `VITE_API_URL`, el frontend detecta automáticamente:
- Puerto `3001` → apunta a `http://localhost:8080/api` (gateway)
- Cualquier otro → usa ruta relativa `/api`

## Ejecución con Docker

```bash
docker build -t smartlogix-frontend .
docker run -p 3001:3000 smartlogix-frontend
```

## Ejecución completa (Docker Compose)

Desde la raíz del proyecto:

```bash
docker compose up --build
```

La app queda disponible en: http://localhost:3001

## Estructura del proyecto

```
frontend/
├── src/
│   ├── pages/
│   │   ├── Dashboard.jsx     # Panel principal con KPIs
│   │   ├── Inventory.jsx     # Gestión de productos y stock
│   │   ├── Orders.jsx        # Gestión de pedidos
│   │   ├── Warehouses.jsx    # Gestión de bodegas
│   │   ├── Shipping.jsx      # Seguimiento de envíos
│   │   └── Checkout.jsx      # Proceso de compra
│   ├── services/
│   │   └── api.js            # Cliente HTTP centralizado (Axios)
│   ├── App.jsx               # Rutas y layout principal
│   └── main.jsx              # Entry point
├── public/
├── package.json
├── vite.config.js
└── Dockerfile
```

## Vistas disponibles

- `/` — Dashboard con KPIs y resumen
- `/inventory` — Productos, stock y bodegas
- `/orders` — Listado y creación de pedidos
- `/warehouses` — Administración de bodegas
- `/shipping` — Seguimiento de envíos
- `/checkout` — Flujo de compra con pago
