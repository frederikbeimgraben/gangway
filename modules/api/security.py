import os

from fastapi import HTTPException, Security, status
from fastapi.security.api_key import APIKeyHeader

API_KEY_NAME = "X-API-Key"

api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)


async def get_api_key(api_key_from_header: str = Security(api_key_header)):
    """
    Dependency that can be injected into an endpoint to protect it.
    It reads the server's API key from the environment at request time.
    """
    server_api_key = os.getenv("API_KEY")
    if not server_api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="API Key not configured on the server.",
        )

    if api_key_from_header == server_api_key:
        return api_key_from_header
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Invalid API Key"
        )
