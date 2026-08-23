import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import get_settings
from .db import DatabaseUnavailableError, close_driver
from .routers import health, investors, matches, network, sectors, startups

logging.basicConfig(level=logging.INFO)

app = FastAPI(
    title="IntroGraph API",
    description="Startup <-> investor matchmaking and warm-introduction finder, backed by CognoDB.",
    version="1.0.0",
)

settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(DatabaseUnavailableError)
async def database_unavailable_handler(request: Request, exc: DatabaseUnavailableError) -> JSONResponse:
    """Any route that can't reach CognoDB returns a clean, predictable 503
    instead of leaking a driver stack trace to the client."""
    return JSONResponse(
        status_code=503,
        content={
            "detail": "The graph database is currently unreachable. Please try again shortly.",
            "error": str(exc),
        },
    )


@app.on_event("shutdown")
def shutdown() -> None:
    close_driver()


app.include_router(health.router)
app.include_router(sectors.router)
app.include_router(startups.router)
app.include_router(investors.router)
app.include_router(matches.router)
app.include_router(network.router)


@app.get("/")
def root() -> dict:
    return {"name": "IntroGraph API", "docs": "/docs", "health": "/health"}
