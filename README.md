# Frontend de PropControl

Aplicación React + TypeScript + Vite servida por Nginx. En producción consume la API desde el mismo origen bajo `/api`.

## Desarrollo

```sh
npm ci
npm run dev
```

La única variable de compilación requerida es `VITE_API_URL`; en producción debe ser `/api`. La autenticación utiliza email, contraseña y cookies seguras administradas por el backend.

## Validación

```sh
npm run lint
npm run build
npm run e2e
```

Las rutas y acciones de negocio usan permisos entregados por el rol del usuario. Esto mejora la experiencia de navegación, pero la autorización definitiva siempre se realiza en el backend.
