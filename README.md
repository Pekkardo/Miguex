# Tableros de Admisiones

Stack completo dockerizado con **dos reportes** seleccionables desde la navbar:

- **Tablero 0800 — Admisiones** (llamadas del 0800)
- **Tablero WhatsApp — Admisiones** (chats WAD)

```
Navegador ──> nginx (Angular + proxy) ──> backend Spring Boot ──> MySQL
```

## Componentes

| Servicio | Tecnología            | Rol                                                            |
|----------|-----------------------|----------------------------------------------------------------|
| `nginx`  | nginx 1.27            | Sirve la SPA Angular (build) y hace reverse proxy de `/api`.    |
| `backend`| Java 21 + Spring Boot | API REST: parsea el Excel (Apache POI) y guarda en MySQL.      |
| `mysql`  | MySQL 8.4             | Persistencia de llamadas y matrículas.                          |

El frontend es una app **Angular 19** (`frontend-angular/`) que se compila dentro
de la imagen de nginx (build multi-stage con Node).

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
npm start          # ng serve en http://localhost:4200, proxy /api -> :8686
```

## Cómo levantarlo

Requisitos: Docker + Docker Compose.

```bash
# (opcional) configurar variables
cp .env.example .env

# construir y levantar
docker compose up --build -d
```

Luego abrí: **http://localhost:8686**

## Uso

1. Elegí el reporte en el **selector de la navbar** (0800 o WhatsApp).
2. Hacé clic en **"Subir Excel"** y elegí el archivo del reporte:
   - 0800: `EJECUTIVO 0800 *.xlsx` (hojas `info` y `MATRICULAS`).
   - WAD: Excel con hoja `Detalle1`.
3. El backend lo procesa con Apache POI, lo guarda en MySQL y el tablero se
   actualiza. Los datos quedan persistidos para próximas visitas.
4. Usá los filtros (fecha, hora, agente, día, etc.) para segmentar.

## API

| Método | Ruta              | Descripción                                       |
|--------|-------------------|---------------------------------------------------|
| POST   | `/api/upload`     | Sube y procesa el Excel del 0800.                 |
| GET    | `/api/data`       | Llamadas del 0800 en formato del frontend.        |
| POST   | `/api/wad/upload` | Sube y procesa el Excel WAD (hoja `Detalle1`).    |
| GET    | `/api/wad/data`   | Chats WAD en formato del frontend.                |
| GET    | `/api/health`     | Estado del backend.                               |

## Comandos útiles

```bash
docker compose logs -f backend     # ver logs del backend
docker compose ps                  # estado de los servicios
docker compose down                # detener
docker compose down -v             # detener y borrar datos de MySQL
```
