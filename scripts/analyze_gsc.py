from __future__ import annotations

import csv
import math
import re
import sys
from collections import Counter
from pathlib import Path
from typing import Any

from seo_common import (
    DATA_DIR,
    GSC_DATA_DIR,
    OUTREACH_DIR,
    REPORTS_DIR,
    ROOT,
    SITE_URL,
    clean_url,
    counter_to_markdown,
    ensure_dirs,
    extract_html_meta,
    load_games,
    load_map_data,
    read_json,
    slug_from_url,
    totals_by_game,
    utc_now,
    week_id,
    write_json,
    write_text,
)


def latest_gsc_dir() -> Path | None:
    current = GSC_DATA_DIR / week_id()
    if current.exists():
        return current
    return None


def by_key(rows: list[dict[str, Any]], key: str) -> dict[str, dict[str, Any]]:
    return {str(row.get(key) or ""): row for row in rows}


def growth(current: float, previous: float) -> float:
    if previous <= 0 and current > 0:
        return 1.0
    if previous <= 0:
        return 0.0
    return (current - previous) / previous


def expected_ctr(position: float) -> float:
    if position <= 1:
        return 0.28
    if position <= 3:
        return 0.12
    if position <= 5:
        return 0.07
    if position <= 10:
        return 0.035
    if position <= 20:
        return 0.015
    return 0.005


def opportunity_score(row: dict[str, Any], previous_7: dict[str, Any], previous_28: dict[str, Any]) -> tuple[float, str, str]:
    impressions = float(row.get("impressions") or 0)
    clicks = float(row.get("clicks") or 0)
    position = float(row.get("position") or 99)
    ctr = float(row.get("ctr") or 0)
    growth_7 = growth(impressions, float(previous_7.get("impressions") or 0))
    growth_28 = growth(impressions, float(previous_28.get("impressions") or 0))
    pos_factor = 1.5 if 4 <= position <= 10 else 1.15 if 11 <= position <= 20 else 0.6
    ctr_gap = max(expected_ctr(position) - ctr, 0)
    score = math.log1p(impressions) * pos_factor + ctr_gap * 120 + max(growth_7, 0) * 2 + max(growth_28, 0) * 3 + math.log1p(clicks)
    if 4 <= position <= 10:
        action = "Improve title, meta description, intro clarity, and internal links to target top 3."
    elif 11 <= position <= 20:
        action = "Strengthen page relevance and internal links to target top 10."
    elif ctr_gap > 0.03 and impressions >= 50:
        action = "Test a clearer title/meta description because CTR is below the expected range."
    else:
        action = "Monitor; no automatic page change recommended this week."
    reason = f"impressions={impressions:.0f}, position={position:.1f}, ctr={ctr:.2%}, growth_7d={growth_7:.1%}, growth_28d={growth_28:.1%}"
    return round(score, 2), action, reason


def analyze_opportunities(gsc_dir: Path) -> list[dict[str, Any]]:
    rows_28 = read_json(gsc_dir / "28d" / "queries.json", [])
    prev_7 = by_key(read_json(gsc_dir / "previous-7d" / "queries.json", []), "query")
    prev_28 = by_key(read_json(gsc_dir / "previous-28d" / "queries.json", []), "query")
    opportunities = []
    for row in rows_28:
        query = str(row.get("query") or "")
        score, action, reason = opportunity_score(row, prev_7.get(query, {}), prev_28.get(query, {}))
        opportunities.append(
            {
                "query": query,
                "page": row.get("page", ""),
                "clicks": row.get("clicks", 0),
                "impressions": row.get("impressions", 0),
                "ctr": row.get("ctr", 0),
                "position": row.get("position", 0),
                "growth_7d": growth(float(row.get("impressions") or 0), float(prev_7.get(query, {}).get("impressions") or 0)),
                "growth_28d": growth(float(row.get("impressions") or 0), float(prev_28.get(query, {}).get("impressions") or 0)),
                "priority_score": score,
                "recommended_action": action,
                "reason": reason,
            }
        )
    opportunities.sort(key=lambda item: item["priority_score"], reverse=True)
    write_json(DATA_DIR / "opportunities.json", opportunities[:100])
    return opportunities


def analyze_game_scores(gsc_dir: Path) -> list[dict[str, Any]]:
    rows = read_json(gsc_dir / "28d" / "queries.json", [])
    totals = totals_by_game(rows)
    games = {game["slug"]: game for game in load_games()}
    scores = []
    for slug, total in totals.items():
        game = games.get(slug, {})
        marker_count = float(game.get("markerCount") or 0)
        freshness = 1.0 if game.get("updated") else 0.4
        score = (
            math.log1p(total["impressions"]) * 2.5
            + math.log1p(total["clicks"]) * 2
            + total["ranking_queries"] * 0.4
            + max(30 - total["avg_position"], 0) * 0.25
            + min(marker_count / 1000, 8)
            + freshness
        )
        scores.append(
            {
                "game": slug,
                "title": game.get("title", slug),
                "clicks": round(total["clicks"], 2),
                "impressions": round(total["impressions"], 2),
                "ranking_queries": int(total["ranking_queries"]),
                "average_position": round(total["avg_position"], 2),
                "ctr": round(total["avg_ctr"], 4),
                "marker_count": int(marker_count),
                "priority_score": round(score, 2),
            }
        )
    scores.sort(key=lambda item: item["priority_score"], reverse=True)
    write_json(DATA_DIR / "game-scores.json", scores)
    return scores


def technical_audit() -> dict[str, Any]:
    issues: list[dict[str, str]] = []
    titles = Counter()
    descriptions = Counter()
    page_count = 0
    for path in sorted((ROOT / "pages").glob("**/index.html")) + [ROOT / "index.html"]:
        if not path.exists():
            continue
        page_count += 1
        meta = extract_html_meta(path)
        rel = path.relative_to(ROOT).as_posix()
        if not meta["title"]:
            issues.append({"file": rel, "issue": "Missing title", "priority": "High"})
        if not meta["description"]:
            issues.append({"file": rel, "issue": "Missing meta description", "priority": "High"})
        if meta["h1_count"] != 1:
            issues.append({"file": rel, "issue": f"Expected one H1, found {meta['h1_count']}", "priority": "Medium"})
        if meta["word_count"] < 220:
            issues.append({"file": rel, "issue": f"Thin visible text ({meta['word_count']} words)", "priority": "Medium"})
        if not meta["canonical"] or not meta["canonical"].startswith(SITE_URL):
            issues.append({"file": rel, "issue": "Missing or non-production canonical", "priority": "High"})
        titles[meta["title"]] += 1
        descriptions[meta["description"]] += 1
    duplicate_titles = {title: count for title, count in titles.items() if title and count > 1}
    duplicate_descriptions = {desc: count for desc, count in descriptions.items() if desc and count > 1}
    return {
        "generatedAt": utc_now().isoformat(),
        "pageCount": page_count,
        "issues": issues[:250],
        "duplicateTitles": duplicate_titles,
        "duplicateDescriptions": duplicate_descriptions,
    }


def internal_link_audit() -> str:
    sitemap = (ROOT / "sitemap.xml").read_text(encoding="utf-8", errors="ignore") if (ROOT / "sitemap.xml").exists() else ""
    urls = re.findall(r"<loc>(https://wandergamemap.com[^<]+)</loc>", sitemap)
    html_files = list((ROOT / "pages").glob("**/index.html")) + [ROOT / "index.html"]
    link_counts = Counter()
    for path in html_files:
        html = path.read_text(encoding="utf-8", errors="ignore")
        for href in re.findall(r'href=["\']([^"\']+)["\']', html, flags=re.I):
            if href.startswith("/"):
                link_counts[clean_url(SITE_URL + href)] += 1
            elif href.startswith(SITE_URL):
                link_counts[clean_url(href)] += 1
    low = [url for url in urls if "/maps/" in url and link_counts[clean_url(url)] <= 1][:50]
    lines = [
        "# Internal Link Report",
        "",
        f"Generated: {utc_now().date().isoformat()}",
        "",
        f"Reviewed sitemap URLs: {len(urls)}",
        "",
        "## Low Incoming Link Candidates",
    ]
    if low:
        lines += [f"- {url}" for url in low]
    else:
        lines.append("- No low incoming link candidates found.")
    lines += [
        "",
        "## Safe Linking Rule",
        "- Add at most 20-50 contextual links per week, prioritizing Search Console pages with positions 4-20 and real related maps or categories.",
    ]
    return "\n".join(lines)


def outreach_files(opportunities: list[dict[str, Any]], game_scores: list[dict[str, Any]]) -> None:
    top_games = game_scores[:10]
    csv_path = OUTREACH_DIR / "backlink-opportunities.csv"
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    with csv_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=["platform", "url", "game", "topic", "question", "matching_url", "priority", "opportunity_type", "status"],
        )
        writer.writeheader()
        for game in top_games:
            for platform in ["Reddit", "Steam Community"]:
                writer.writerow(
                    {
                        "platform": platform,
                        "url": "",
                        "game": game["title"],
                        "topic": f"{game['title']} interactive map",
                        "question": f"Players asking for {game['title']} map locations, loot, collectibles, or resources.",
                        "matching_url": f"{SITE_URL}/maps/{game['game']}/",
                        "priority": "High" if game["priority_score"] >= 20 else "Medium",
                        "opportunity_type": "helpful-resource",
                        "status": "RESEARCH_REQUIRED",
                    }
                )
    drafts_dir = OUTREACH_DIR / "community-drafts"
    for item in opportunities[:10]:
        game = slug_from_url(str(item.get("page") or ""))
        if not game:
            continue
        draft = [
            "# Community Reply Draft",
            "",
            "Status: READY_FOR_REVIEW",
            "",
            f"Query evidence: {item.get('query')}",
            f"Relevant page: {item.get('page')}",
            "",
            "Draft:",
            "",
            "If you are trying to find these locations, the fastest approach is to filter the map by the specific marker type first, then zoom into the named area and check nearby related markers. I put together a structured interactive map here as a reference:",
            "",
            str(item.get("page") or ""),
            "",
            "Use this only when it directly answers the player question. Do not post duplicate replies or keyword-stuffed anchors.",
        ]
        write_text(drafts_dir / f"{game}-{re.sub(r'[^a-z0-9]+', '-', str(item.get('query', '')).lower()).strip('-')[:60]}.md", "\n".join(draft))


def weekly_report(gsc_dir: Path | None, opportunities: list[dict[str, Any]], game_scores: list[dict[str, Any]], tech: dict[str, Any]) -> None:
    wid = week_id()
    summary = read_json(gsc_dir / "summary.json", {}) if gsc_dir else {}
    ranges = summary.get("ranges", {}) if isinstance(summary, dict) else {}
    lines = [
        f"# Weekly SEO Operator Report {wid}",
        "",
        f"Generated: {utc_now().date().isoformat()}",
        "",
        "## Google Search Console Summary",
    ]
    if ranges:
        for label in ["7d", "28d", "90d"]:
            q = ranges.get(label, {}).get("queries", {})
            lines.append(f"- {label}: clicks {q.get('clicks', 0):.0f}, impressions {q.get('impressions', 0):.0f}, query rows {q.get('rows', 0)}")
    else:
        lines.append("- No Search Console data available. Data-driven page modifications were skipped.")
    lines += [
        "",
        "## Top 10 SEO Opportunities",
    ]
    lines += [
        f"- {item['query']} -> {item['page']} | score {item['priority_score']} | {item['recommended_action']}"
        for item in opportunities[:10]
    ] or ["- No opportunities generated."]
    lines += ["", "## Top Games To Invest In"]
    lines += [
        f"- {item['title']}: score {item['priority_score']}, impressions {item['impressions']}, clicks {item['clicks']}, markers {item['marker_count']}"
        for item in game_scores[:10]
    ] or ["- No game scores generated."]
    lines += [
        "",
        "## Technical SEO Problems",
        f"- Reviewed pages: {tech.get('pageCount', 0)}",
        f"- Issues found: {len(tech.get('issues', []))}",
        f"- Duplicate titles: {len(tech.get('duplicateTitles', {}))}",
        f"- Duplicate descriptions: {len(tech.get('duplicateDescriptions', {}))}",
        "",
        "## Actions Completed",
        "- Generated Search Console data snapshots when credentials were available.",
        "- Generated opportunity scores, game scores, technical audit, internal link report, outreach CSV, and community drafts.",
        "- Kept risky changes as recommendations unless supported by Search Console data and safe rules.",
        "",
        "## Actions Rejected",
        "- No automatic mass landing page creation.",
        "- No automatic forum, Reddit, wiki, or backlink posting.",
        "- No URL migrations, bulk noindex, or page deletion.",
        "",
        "## Next Week Priorities",
        "- Review top opportunities and manually approve title/meta/internal link tests.",
        "- Add real screenshots or walkthrough content to thin map pages before requesting AdSense review again.",
        "- Submit sitemap in Search Console after deployment and monitor indexing status.",
    ]
    write_text(REPORTS_DIR / f"{wid}-weekly-report.md", "\n".join(lines))
    write_text(ROOT / "seo" / "NEXT-WEEK.md", "\n".join(lines[-6:]))


def main() -> int:
    ensure_dirs()
    gsc_dir = latest_gsc_dir()
    opportunities: list[dict[str, Any]] = []
    game_scores: list[dict[str, Any]] = []
    if gsc_dir:
        opportunities = analyze_opportunities(gsc_dir)
        game_scores = analyze_game_scores(gsc_dir)
    else:
        write_json(DATA_DIR / "opportunities.json", [])
        write_json(DATA_DIR / "game-scores.json", [])
    tech = technical_audit()
    write_json(DATA_DIR / "technical-audit.json", tech)
    write_text(REPORTS_DIR / "internal-link-report.md", internal_link_audit())
    outreach_files(opportunities, game_scores)
    weekly_report(gsc_dir, opportunities, game_scores, tech)
    return 0


if __name__ == "__main__":
    sys.exit(main())
