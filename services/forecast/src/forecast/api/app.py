from datetime import UTC, datetime

from fastapi import Depends, FastAPI
from pydantic import BaseModel

from forecast import __version__
from forecast.api.security import require_internal_key


class Health(BaseModel):
    status: str
    version: str
    time_utc: datetime


def create_app() -> FastAPI:
    app = FastAPI(title="Forecast service", version=__version__)

    @app.get("/health", response_model=Health)
    def health() -> Health:
        return Health(status="ok", version=__version__, time_utc=datetime.now(UTC))

    @app.get("/internal/ping", dependencies=[Depends(require_internal_key)])
    def internal_ping() -> dict[str, str]:
        # Placeholder for internal endpoints (optimizer, job triggers) arriving in M2/M6.
        return {"status": "ok"}

    return app


app = create_app()
