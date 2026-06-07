from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import auth, analyses, stripe_payments, websocket

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


@app.get("/health")
def health():
    return {"status": "ok", "service": "mcpulse-api"}
