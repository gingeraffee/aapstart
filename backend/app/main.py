from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.database.connection import init_db
from app.content.loader import load_all_content
from app.auth.router import router as auth_router
from app.modules.router import router as modules_router
from app.progress.router import router as progress_router
from app.resources.router import router as resources_router

settings = get_settings()

app = FastAPI(
    title="AAP Start API",
    description="Backend for the AAP HR Onboarding Portal",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url=None,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,   # Required for cookies to work cross-origin
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(modules_router)
app.include_router(progress_router)
app.include_router(resources_router)


# ── Startup ───────────────────────────────────────────────────────────────────
@app.on_event("startup")
def startup():
    init_db()
    load_all_content()
    print("✓ Database ready")
    print("✓ Content loaded")


@app.get("/api/health")
def health():
    return {"status": "ok"}
