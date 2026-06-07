from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import auth, analyses, stripe_payments, websocket

import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="MCPulse API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_url,
        "https://mcpulsesaas.github.io",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(analyses.router, prefix="/api/analyses", tags=["analyses"])
app.include_router(stripe_payments.router, prefix="/api/stripe", tags=["stripe"])
app.include_router(websocket.router, prefix="/ws", tags=["websocket"])


@app.on_event("startup")
async def startup_event():
    logger.info("MCPulse API starting up...")
    logger.info(f"Supabase URL set: {bool(settings.supabase_url)}")
    logger.info(f"Encryption key set: {bool(settings.encryption_key)}")
    logger.info(f"JWT secret set: {bool(settings.supabase_jwt_secret)}")
    logger.info(f"Stripe configured: {bool(settings.stripe_secret_key)}")


@app.get("/health")
def health():
    return {"status": "ok", "service": "mcpulse-api"}
