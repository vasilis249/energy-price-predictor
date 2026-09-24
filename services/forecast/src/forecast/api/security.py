import hmac
from typing import Annotated

from fastapi import Depends, Header, HTTPException, status

from forecast.settings import Settings, get_settings


def require_internal_key(
    settings: Annotated[Settings, Depends(get_settings)],
    x_internal_api_key: Annotated[str | None, Header()] = None,
) -> None:
    """Internal endpoints are only callable by our own web app / scheduler."""
    if settings.internal_api_key is None:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="internal api disabled")
    expected = settings.internal_api_key.get_secret_value()
    if not x_internal_api_key or not hmac.compare_digest(x_internal_api_key, expected):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid internal api key")
