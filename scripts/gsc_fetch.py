from __future__ import annotations

import os
import sys
from datetime import timedelta
from typing import Any

from seo_common import GSC_DATA_DIR, ensure_dirs, utc_now, week_id, write_json, write_text, REPORTS_DIR


DIMENSION_SETS = {
    "queries": ["query", "page"],
    "pages": ["page"],
    "countries": ["country"],
    "devices": ["device"],
}


def date_range(days: int, offset_days: int = 2) -> tuple[str, str]:
    end = utc_now().date() - timedelta(days=offset_days)
    start = end - timedelta(days=days - 1)
    return start.isoformat(), end.isoformat()


def build_service():
    raw = os.environ.get("GSC_SERVICE_ACCOUNT_JSON", "").strip()
    if not raw:
        raise RuntimeError("Missing GSC_SERVICE_ACCOUNT_JSON")

    try:
        from google.oauth2 import service_account
        from googleapiclient.discovery import build
    except Exception as exc:  # pragma: no cover - depends on CI deps
        raise RuntimeError(f"Google API libraries are not installed: {exc}") from exc

    try:
        import json

        info = json.loads(raw)
    except Exception as exc:
        raise RuntimeError("GSC_SERVICE_ACCOUNT_JSON is not valid JSON") from exc

    credentials = service_account.Credentials.from_service_account_info(
        info, scopes=["https://www.googleapis.com/auth/webmasters.readonly"]
    )
    return build("searchconsole", "v1", credentials=credentials, cache_discovery=False)


def fetch_dimension(service: Any, property_url: str, dimensions: list[str], days: int, previous: bool = False) -> list[dict[str, Any]]:
    if previous:
        end_offset = days + 2
    else:
        end_offset = 2
    start, end = date_range(days, end_offset)
    request = {
        "startDate": start,
        "endDate": end,
        "dimensions": dimensions,
        "rowLimit": 25000,
        "startRow": 0,
    }
    rows: list[dict[str, Any]] = []
    while True:
        response = service.searchanalytics().query(siteUrl=property_url, body=request).execute()
        batch = response.get("rows", [])
        for item in batch:
            keys = item.get("keys", [])
            row = {dim: keys[idx] if idx < len(keys) else "" for idx, dim in enumerate(dimensions)}
            row.update(
                {
                    "clicks": item.get("clicks", 0),
                    "impressions": item.get("impressions", 0),
                    "ctr": item.get("ctr", 0),
                    "position": item.get("position", 0),
                    "startDate": start,
                    "endDate": end,
                }
            )
            rows.append(row)
        if len(batch) < request["rowLimit"]:
            break
        request["startRow"] += request["rowLimit"]
    return rows


def main() -> int:
    ensure_dirs()
    property_url = os.environ.get("GSC_PROPERTY", "").strip() or "sc-domain:wandergamemap.com"
    current_week = week_id()
    out_dir = GSC_DATA_DIR / current_week
    try:
        service = build_service()
    except Exception as exc:
        write_text(
            REPORTS_DIR / "gsc-error.md",
            "\n".join(
                [
                    "# Google Search Console Fetch Error",
                    "",
                    f"Generated: {utc_now().isoformat()}",
                    "",
                    f"Error: {exc}",
                    "",
                    "Data-driven website modifications were skipped. Add GitHub Secrets `GSC_SERVICE_ACCOUNT_JSON` and `GSC_PROPERTY`, then rerun.",
                ]
            ),
        )
        return 0

    summary: dict[str, Any] = {"property": property_url, "generatedAt": utc_now().isoformat(), "week": current_week, "ranges": {}}
    for days in [7, 28, 90]:
        label = f"{days}d"
        summary["ranges"][label] = {}
        for name, dimensions in DIMENSION_SETS.items():
            rows = fetch_dimension(service, property_url, dimensions, days)
            write_json(out_dir / label / f"{name}.json", rows)
            summary["ranges"][label][name] = {
                "rows": len(rows),
                "clicks": sum(float(row.get("clicks", 0)) for row in rows),
                "impressions": sum(float(row.get("impressions", 0)) for row in rows),
            }
            if days in {7, 28} and name in {"queries", "pages"}:
                previous_rows = fetch_dimension(service, property_url, dimensions, days, previous=True)
                write_json(out_dir / f"previous-{label}" / f"{name}.json", previous_rows)

    write_json(out_dir / "summary.json", summary)
    return 0


if __name__ == "__main__":
    sys.exit(main())
