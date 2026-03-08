#!/usr/bin/env python3
from __future__ import annotations

import argparse
import ssl
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin
from urllib.request import Request, urlopen

REQUIRED_HEADERS: dict[str, str] = {
    "strict-transport-security": "max-age=",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "referrer-policy": "strict-origin-when-cross-origin",
    "permissions-policy": "geolocation=(self)",
    "content-security-policy": "default-src 'self'",
}


def fetch_headers(url: str, *, insecure: bool, timeout: float) -> tuple[int, dict[str, str]]:
    request = Request(url, method="GET")

    context = None
    if url.startswith("https://"):
        context = ssl.create_default_context()
        if insecure:
            context.check_hostname = False
            context.verify_mode = ssl.CERT_NONE

    try:
        with urlopen(request, context=context, timeout=timeout) as response:
            return response.status, _normalize_headers(response.headers.items())
    except HTTPError as exc:
        return exc.code, _normalize_headers(exc.headers.items())
    except URLError as exc:
        raise RuntimeError(f"Could not connect to {url}: {exc}") from exc


def _normalize_headers(items: list[tuple[str, str]]) -> dict[str, str]:
    normalized: dict[str, str] = {}
    for key, value in items:
        normalized[key.lower()] = value
    return normalized


def validate_headers(endpoint_url: str, headers: dict[str, str]) -> list[str]:
    errors: list[str] = []
    for header_name, expected_fragment in REQUIRED_HEADERS.items():
        actual_value = headers.get(header_name)
        if actual_value is None:
            errors.append(f"{endpoint_url}: missing header '{header_name}'")
            continue
        if expected_fragment.lower() not in actual_value.lower():
            errors.append(
                f"{endpoint_url}: header '{header_name}' does not include '{expected_fragment}' "
                f"(actual: '{actual_value}')"
            )
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Check Nginx security headers on root and health endpoints."
    )
    parser.add_argument(
        "--base-url",
        default="https://localhost",
        help="Base URL to inspect (default: https://localhost)",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=10,
        help="Request timeout in seconds (default: 10)",
    )
    parser.add_argument(
        "--insecure",
        action="store_true",
        help="Disable TLS certificate verification for self-signed certs.",
    )
    args = parser.parse_args()

    endpoints = ["/", "/health"]
    all_errors: list[str] = []

    for endpoint in endpoints:
        endpoint_url = urljoin(args.base_url.rstrip("/") + "/", endpoint.lstrip("/"))
        status_code, headers = fetch_headers(
            endpoint_url,
            insecure=args.insecure,
            timeout=args.timeout,
        )

        print(f"[check] {endpoint_url} -> HTTP {status_code}")
        errors = validate_headers(endpoint_url, headers)
        if errors:
            all_errors.extend(errors)
        else:
            print(f"[ok] {endpoint_url} includes required security headers")

    if all_errors:
        print("\nSecurity header validation failed:")
        for error in all_errors:
            print(f"- {error}")
        return 1

    print("\nSecurity header validation passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
