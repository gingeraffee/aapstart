from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware  # noqa: F401
from app.config import get_settings
from app.database.connection import init_db
from app.content.loader import load_all_content
from app.auth.router import router as auth_router
from app.modules.router import router as modules_router
from app.progress.router import router as progress_router
from app.resources.router import router as resources_router
from app.admin.router import router as admin_router
from app.notes.router import router as notes_router
from app.search.router import router as search_router
from fastapi.middleware.cors import CORSMiddleware

settings = get_settings()

ALLOWED_ORIGINS = {
    settings.frontend_url,
    "https://aap-start-frontend.onrender.com",
    "https://www.aapstart.com",
    "https://aapstart.com",
    "http://localhost:3000", "http://localhost:3001", "http://localhost:3002",
    "http://127.0.0.1:3000", "http://127.0.0.1:3001", "http://127.0.0.1:3002",
}

app = FastAPI(
    title="AAP Start API",
    description="Backend for the AAP HR Onboarding Portal",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url=None,
)


# ── CORS (manual middleware) ──────────────────────────────────────────────────
def _add_cors_headers(response, origin: str):
    response.headers["Access-Control-Allow-Origin"] = origin
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Accept, Origin, X-Requested-With"
    response.headers["Access-Control-Max-Age"] = "600"


@app.middleware("http")
async def cors_middleware(request: Request, call_next):
    origin = request.headers.get("origin", "")
    matched_origin = origin if origin in ALLOWED_ORIGINS else None

    if request.method == "OPTIONS":
        response = JSONResponse(content={}, status_code=200)
        if matched_origin:
            _add_cors_headers(response, matched_origin)
        return response

    response = await call_next(request)
    if matched_origin:
        _add_cors_headers(response, matched_origin)
    return response

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(modules_router)
app.include_router(progress_router)
app.include_router(resources_router)
app.include_router(admin_router)
app.include_router(notes_router)
app.include_router(search_router)

# ── Static files (serves videos/media from backend/static/downloads/) ────────
_DOWNLOADS_DIR = Path(__file__).parent.parent / "static" / "downloads"
if _DOWNLOADS_DIR.exists():
    app.mount("/downloads", StaticFiles(directory=str(_DOWNLOADS_DIR)), name="downloads")


# ── Startup ───────────────────────────────────────────────────────────────────
@app.on_event("startup")
def startup():
    from app.content.loader import _modules_cache
    init_db()
    load_all_content()
    print(f"[OK] Database ready")
    print(f"[OK] Content loaded — {len(_modules_cache)} modules found")


@app.get("/api/health")
def health():
    return {"status": "ok"}
