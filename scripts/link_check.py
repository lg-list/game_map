from __future__ import annotations

import re
import sys
from pathlib import Path

from seo_common import ROOT, SITE_URL, ensure_dirs, write_text


def local_path_for_href(href: str) -> Path | None:
    href = href.split("#")[0].split("?")[0]
    if href.startswith(SITE_URL):
        href = href[len(SITE_URL) :]
    if not href.startswith("/"):
        return None
    if href == "/":
        return ROOT / "index.html"
    if href.startswith("/maps/"):
        candidate = ROOT / "pages" / href.strip("/")
        if href.endswith("/"):
            return candidate / "index.html"
        if candidate.suffix:
            return candidate
        return candidate / "index.html"
    candidate = ROOT / href.strip("/")
    if href.endswith("/"):
        return candidate / "index.html"
    if candidate.suffix:
        return candidate
    return candidate / "index.html"


def main() -> int:
    ensure_dirs()
    broken: list[str] = []
    for html_file in [ROOT / "index.html", *sorted((ROOT / "pages").glob("**/index.html"))]:
        html = html_file.read_text(encoding="utf-8", errors="ignore")
        for href in re.findall(r'href=["\']([^"\']+)["\']', html, flags=re.I):
            if href.startswith(("mailto:", "tel:", "#", "javascript:", "http://", "https://")) and not href.startswith(SITE_URL):
                continue
            target = local_path_for_href(href)
            if target and not target.exists():
                broken.append(f"{html_file.relative_to(ROOT).as_posix()} -> {href}")
    lines = ["# Link Check", "", f"Broken internal links: {len(broken)}", ""]
    lines.extend(f"- {item}" for item in broken[:200])
    write_text(ROOT / "seo" / "reports" / "link-check.md", "\n".join(lines))
    if broken:
        print(f"Broken internal links found: {len(broken)}")
        return 1
    print("No broken internal links found.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
