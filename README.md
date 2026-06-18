# Tablero 0800 — Admisiones

Stack completo dockerizado para el tablero de llamadas del 0800.

```
Navegador ──> nginx (frontend + proxy) ──> backend Spring Boot ──> MySQL
                                                  │
                                                  └──> Anthropic API (chat IA, opcional)
```

## Componentes

| Servicio | Tecnología            | Rol                                                        |
|----------|-----------------------|------------------------------------------------------------|
| `nginx`  | nginx 1.27            | Sirve el frontend (HTML) y hace reverse proxy de `/api`.   |
| `backend`| Java 21 + Spring Boot | API REST: parsea el Excel (Apache POI) y guarda en MySQL.  |
| `mysql`  | MySQL 8.4             | Persistencia de llamadas y matrículas.                     |

## Cómo levantarlo

Requisitos: Docker + Docker Compose.

```bash
# (opcional) configurar variables
cp .env.example .env

# construir y levantar
docker compose up --build -d
```

Luego abrí: **http://localhost:8080**

## Uso

1. En el tablero, hacé clic en **"Subir Excel del día"** y elegí el archivo
   `EJECUTIVO 0800 *.xlsx`.
2. El backend lo procesa (hojas `info` y `MATRICULAS`), lo guarda en MySQL y el
   tablero se actualiza. Los datos quedan persistidos para próximas visitas.
3. Usá los filtros (fecha, hora, agente, día, matriculados) para segmentar.
4. El chat con IA queda habilitado si definís `ANTHROPIC_API_KEY` en `.env`.

## API

| Método | Ruta           | Descripción                                          |
|--------|----------------|------------------------------------------------------|
| POST   | `/api/upload`  | Sube y procesa el Excel (`multipart/form-data`).     |
| GET    | `/api/data`    | Devuelve todas las llamadas en formato del frontend. |
| POST   | `/api/chat`    | Proxy al modelo de IA (`{system, message}`).         |
| GET    | `/api/health`  | Estado del backend.                                  |

## Comandos útiles

```bash
docker compose logs -f backend     # ver logs del backend
docker compose ps                  # estado de los servicios
docker compose down                # detener
docker compose down -v             # detener y borrar datos de MySQL
```
