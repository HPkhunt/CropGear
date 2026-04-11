from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        is_docs_route = request.url.path.startswith("/docs") or request.url.path.startswith(
            "/redoc"
        )
        script_src = "script-src 'self'"
        style_src = "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com"

        if is_docs_route:
            script_src = "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net"
            style_src = "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net"

        csp = "; ".join(
            [
                "default-src 'self'",
                "base-uri 'self'",
                "object-src 'none'",
                "frame-ancestors 'none'",
                "img-src 'self' data: blob: https:",
                "font-src 'self' data: https://fonts.gstatic.com",
                style_src,
                script_src,
                "connect-src 'self' https: http:",
            ]
        )
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = csp
        return response
