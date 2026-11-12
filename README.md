# ResiBreak

Sistema de gestión de la alimentación de los becados (residentes): los residentes agendan sus pedidos de comida,
la administración gestiona turnos, becados y costos, y el proveedor reparte.


## Estructura

```
apps/
  api/      backend compartido · NestJS + TypeORM + PostgreSQL + JWT
  mobile/   app móvil · React Native + Expo (por ahora conectada: vistas del residente)
  web/      página web · React + Vite (login y proveedor conectados; pantallas de admin aún con datos de prueba)
  docker-compose.yml   bases de datos de desarrollo y de tests
```

## Requisitos

* Node.js
* pnpm

```
npm install -g pnpm
```

## Instalar dependencias
* En la carpeta raíz del proyecto, cmd:
```
pnpm install
```

## Ejecución local

### web
```
pnpm --dir apps/web dev
```

### mobile
```
pnpm --dir apps/mobile start
```

### Backend (api)
```
pnpm --dir apps/api start:dev
```