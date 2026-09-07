from __future__ import annotations

import json
import os
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
SITE_URL = "https://wandergamemap.com"
REPORTS_DIR = ROOT / "seo" / "reports"
DATA_DIR = ROOT / "seo" / "data"
GSC_DATA_DIR = DATA_DIR / "gsc"
OUTREACH_DIR = ROOT / "seo" / "outreach"


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def week_id(dt: datetime | None = None) -> str:
    dt = dt or utc_now()
    year, week, _ = dt.isocalendar()
    return f"{year}-W{week:02d}"


def ensure_dirs() -> None:
    for path in [
        REPORTS_DIR,
        DATA_DIR,
        GSC_DATA_DIR,
        OUTREACH_DIR,
        OUTREACH_DIR / "community-drafts",
    ]:
        path.mkdir(parents=True, exist_ok=True)


def read_json(path: Path, default: Any = None) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return default
    except json.JSONDecodeError:
        return default


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content.rstrip() + "\n", encoding="utf-8")


def load_games() -> list[dict[str, Any]]:
    games = read_json(ROOT / "data" / "site-games.json", [])
    return games if isinstance(games, list) else []


def load_map_data() -> dict[str, dict[str, Any]]:
    maps: dict[str, dict[str, Any]] = {}
    data_dir = ROOT / "data"
    for path in sorted(data_dir.glob("*.json")):
        if path.name in {"site-games.json", "tile-sources.json", "low-competition-games.json"}:
            continue
        data = read_json(path, {})
        if isinstance(data, dict):
            maps[path.stem] = data
    return maps


def clean_url(url: str) -> str:
    return url.split("?")[0].split("#")[0].rstrip("/") + "/"


def slug_from_url(url: str) -> str:
    parts = [part for part in clean_url(url).replace(SITE_URL, "").split("/") if part]
    if len(parts) >= 2 and parts[0] == "maps":
        return parts[1]
    return ""


def text_from_html(path: Path) -> str:
    html = path.read_text(encoding="utf-8", errors="ignore")
    html = re.sub(r"<script[\s\S]*?</script>", " ", html, flags=re.I)
    html = re.sub(r"<style[\s\S]*?</style>", " ", html, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", html)
    return re.sub(r"\s+", " ", text).strip()


def extract_html_meta(path: Path) -> dict[str, Any]:
    html = path.read_text(encoding="utf-8", errors="ignore")
    title_match = re.search(r"<title>(.*?)</title>", html, flags=re.I | re.S)
    desc_match = re.search(r'<meta\s+name=["\']description["\']\s+content=["\'](.*?)["\']', html, flags=re.I | re.S)
    canon_match = re.search(r'<link\s+rel=["\']canonical["\']\s+href=["\'](.*?)["\']', html, flags=re.I | re.S)
    h1_count = len(re.findall(r"<h1[\s>]", html, flags=re.I))
    return {
        "title": re.sub(r"\s+", " ", title_match.group(1)).strip() if title_match else "",
        "description": re.sub(r"\s+", " ", desc_match.group(1)).strip() if desc_match else "",
        "canonical": canon_match.group(1).strip() if canon_match else "",
        "h1_count": h1_count,
        "jsonld_count": len(re.findall(r'application/ld\+json', html, flags=re.I)),
        "word_count": len(text_from_html(path).split()),
    }


def skill_paths() -> list[Path]:
    base = ROOT / ".agents" / "skills"
    user_base = Path.home() / ".agents" / "skills"
    candidates = [
        "ai-seo",
        "seo-audit",
        "programmatic-seo",
        "schema",
        "community-marketing",
        "directory-submissions",
        "competitor-profiling",
        "content-strategy",
        "cro",
    ]
    paths: list[Path] = []
    for root in [base, user_base]:
        for name in candidates:
            path = root / name / "SKILL.md"
            if path.exists() and path not in paths:
                paths.append(path)
    return paths


def summarize_marketingskills() -> tuple[bool, str]:
    paths = skill_paths()
    if not paths:
        return False, "MARKETINGSKILLS_NOT_AVAILABLE"
    lines = [
        "# Marketingskills Review",
        "",
        f"Generated: {utc_now().date().isoformat()}",
        "",
        "## Skills Loaded",
    ]
    for path in paths:
        content = path.read_text(encoding="utf-8", errors="ignore")
        name_match = re.search(r"^name:\s*(.+)$", content, flags=re.M)
        desc_match = re.search(r"^description:\s*(.+)$", content, flags=re.M)
        name = (name_match.group(1).strip().strip('"') if name_match else path.parent.name)
        desc = (desc_match.group(1).strip().strip('"') if desc_match else "")
        lines.append(f"- {name}: {desc[:240]}")
    lines += [
        "",
        "## Issues",
        "- Do not create new landing pages without Search Console evidence and real marker data.",
        "- Avoid scaled content patterns: no one-marker pages, no generic AI-only pages, no doorway pages.",
        "- Keep AI/GEO files extractable, but keep human pages useful first.",
        "",
        "## Opportunities",
        "- Prioritize pages with Search Console impressions in positions 4-20.",
        "- Improve titles and descriptions only when CTR is clearly weak and log each change.",
        "- Build internal links from game hubs to high-opportunity map pages and marker categories.",
        "- Generate helpful community reply drafts for real player questions; never auto-post.",
        "",
        "## Priority",
        "1. Search Console backed on-page improvements.",
        "2. Technical SEO fixes that unblock crawling and indexing.",
        "3. Internal links for important pages with weak discovery.",
        "4. Human-reviewed community and backlink opportunities.",
        "",
        "## Recommended Action",
        "- Run the weekly operator, inspect generated opportunities, then approve only changes backed by data.",
        "",
        "## Expected Impact",
        "- Better crawl discovery, clearer AI extractability, safer AdSense compliance, and more focused organic growth.",
    ]
    return True, "\n".join(lines)


def totals_by_game(rows: list[dict[str, Any]]) -> dict[str, dict[str, float]]:
    totals: dict[str, dict[str, float]] = {}
    query_count: dict[str, set[str]] = {}
    for row in rows:
        page = str(row.get("page") or "")
        game = slug_from_url(page)
        if not game:
            continue
        bucket = totals.setdefault(game, {"clicks": 0.0, "impressions": 0.0, "position_sum": 0.0, "rows": 0.0, "ctr_sum": 0.0})
        bucket["clicks"] += float(row.get("clicks") or 0)
        bucket["impressions"] += float(row.get("impressions") or 0)
        bucket["position_sum"] += float(row.get("position") or 0)
        bucket["ctr_sum"] += float(row.get("ctr") or 0)
        bucket["rows"] += 1
        query_count.setdefault(game, set()).add(str(row.get("query") or ""))
    for game, bucket in totals.items():
        rows_count = max(bucket["rows"], 1)
        bucket["avg_position"] = bucket["position_sum"] / rows_count
        bucket["avg_ctr"] = bucket["ctr_sum"] / rows_count
        bucket["ranking_queries"] = float(len(query_count.get(game, set())))
    return totals


def counter_to_markdown(title: str, counter: Counter[str], limit: int = 20) -> str:
    lines = [f"## {title}", ""]
    if not counter:
        lines.append("- No issues found in this run.")
        return "\n".join(lines)
    for key, count in counter.most_common(limit):
        lines.append(f"- {key}: {count}")
    return "\n".join(lines)
