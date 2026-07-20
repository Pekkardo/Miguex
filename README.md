# Tableros de Admisiones

Stack completo dockerizado con **cuatro reportes** seleccionables desde la navbar:

- **Tablero 0800 — Admisiones** (llamadas del 0800) — `/`
- **Tablero WhatsApp — Admisiones** (chats WAD) — `/wad`
- **Chats WhatsApp (Egg)** (gestión de chats) — `/egg`
- **Cruce Matrículas x Ventas** — `/cruce`

Todo el front es una única SPA Angular: no quedan páginas `.html` sueltas.

```
Navegador ──> nginx (Angular + proxy) ──> backend Spring Boot ──> MySQL
```

## Componentes

| Servicio | Tecnología            | Rol                                                            |
|----------|-----------------------|----------------------------------------------------------------|
| `nginx`  | nginx 1.27            | Sirve la SPA Angular (build) y hace reverse proxy de `/api`.    |
| `backend`| Java 21 + Spring Boot | API REST: parsea el Excel (Apache POI) y guarda en MySQL.      |
| `mysql`  | MySQL 8.4             | Persistencia de llamadas, chats, matrículas y usuarios.         |

El frontend es una app **Angular 19** (`frontend-angular/`) que se compila dentro
de la imagen de nginx (build multi-stage con Node). Cada tablero se carga lazy.

Para agregar un tablero nuevo alcanza con sumar una entrada en
`frontend-angular/src/app/pages.ts` (alimenta el router y el selector) y su ruta
en `app.routes.ts`.

### Puertos

| Acceso                     | Puerto |
|----------------------------|--------|
| Tablero (navegador)        | `8686` (host) → `86` (nginx interno) |
| Backend (interno)          | `8080` |
| MySQL (interno / host)     | `3306` / `3308` |

### Desarrollo del frontend

```bash
cd frontend-angular
npm install
npm start          # ng serve, proxy /api -> :8686
```

## Autenticación

El tablero está detrás de login. El JWT viaja en una **cookie httpOnly**
(`SameSite=Strict`), así que no es accesible desde JavaScript.

Hay dos roles:

| Rol      | Permisos                                              |
|----------|-------------------------------------------------------|
| `ADMIN`  | Todo: ver tableros, subir Excels y borrar datos.      |
| `VIEWER` | Sólo lectura de los tableros.                          |

El usuario admin inicial se crea al arrancar a partir de `ADMIN_USER` /
`ADMIN_PASSWORD`. Es idempotente: si el usuario ya existe no se toca, así que
rotar la contraseña a mano en la base no se pisa en el próximo reinicio.

Para crear un `VIEWER`, insertá la fila en la tabla `users` de la base
`dashboard` con el hash BCrypt de la contraseña y `role='VIEWER'`.

### Variables de entorno

Copiá `.env.example` a `.env` y completá:

| Variable            | Obligatoria | Notas                                                      |
|---------------------|-------------|------------------------------------------------------------|
| `JWT_SECRET`        | **sí**      | Mínimo 32 bytes. La app **no arranca** si falta o es corto. |
| `ADMIN_PASSWORD`    | **sí**      | Sin ella no se crea ningún usuario y no se puede entrar.    |
| `JWT_TTL_HOURS`     | no          | Duración de la sesión (por defecto 12).                     |
| `JWT_COOKIE_SECURE` | no          | Poner en `true` **sólo con HTTPS**: con `true` sobre HTTP el browser descarta la cookie y el login deja de funcionar. |
| `ADMIN_USER`        | no          | Por defecto `admin`.                                        |

Generá el secreto con `openssl rand -base64 48`.

## Cómo levantarlo

Requisitos: Docker + Docker Compose.

```bash
cp .env.example .env
# editar .env: definir JWT_SECRET y ADMIN_PASSWORD

docker compose up --build -d
```

Luego abrí **http://localhost:8686** e ingresá con el usuario admin.

## Uso

1. Elegí el reporte en el **selector de la navbar** (arriba a la derecha).
2. Como `ADMIN`, subí el Excel del reporte correspondiente:
   - 0800: `EJECUTIVO 0800 *.xlsx` (hojas `info` y `MATRICULAS`).
   - WAD: Excel con hoja `Detalle1`.
   - Egg: Excel de chats (Fecha real, Dia, Mes, Telefono, Resolucion V2, …).
   - Cruce: **dos** archivos (Nómina y Ventas). El backend detecta cuál es cuál
     por sus columnas.
3. El backend lo procesa con Apache POI, lo guarda en MySQL y el tablero se
   actualiza. Los datos quedan persistidos para próximas visitas.
4. Usá los filtros para segmentar.

## API

Todos los endpoints exigen sesión salvo los marcados como públicos.
Los `POST /upload` y el `DELETE` exigen además rol `ADMIN`.

| Método | Ruta                | Acceso  | Descripción                                    |
|--------|---------------------|---------|------------------------------------------------|
| POST   | `/api/auth/login`   | público | Inicia sesión y setea la cookie del JWT.       |
| POST   | `/api/auth/logout`  | sesión  | Cierra la sesión (vence la cookie).            |
| GET    | `/api/auth/me`      | sesión  | Usuario y rol actuales.                        |
| GET    | `/api/health`       | público | Estado del backend (lo usa el healthcheck).    |
| POST   | `/api/upload`       | admin   | Sube y procesa el Excel del 0800.              |
| GET    | `/api/data`         | sesión  | Llamadas del 0800.                             |
| POST   | `/api/wad/upload`   | admin   | Sube el Excel WAD (hoja `Detalle1`).           |
| GET    | `/api/wad/data`     | sesión  | Chats WAD.                                     |
| POST   | `/api/egg/upload`   | admin   | Sube el Excel de chats Egg.                    |
| GET    | `/api/egg/data`     | sesión  | Chats Egg.                                     |
| POST   | `/api/cruce/upload` | admin   | Sube Nómina o Ventas (se detecta solo).        |
| GET    | `/api/cruce/data`   | sesión  | Nómina + ventas guardadas.                     |
| DELETE | `/api/cruce/data`   | admin   | Vacía las dos tablas del cruce.                |

## Comandos útiles

```bash
docker compose logs -f backend     # ver logs del backend
docker compose ps                  # estado de los servicios
docker compose down                # detener
docker compose down -v             # detener y borrar datos de MySQL

# ver los usuarios cargados
docker exec miguex-mysql mysql -u dashboard -pdashboard \
  -e "select id, username, role from dashboard.users;"
```
