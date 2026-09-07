from __future__ import annotations

import subprocess
import sys

from seo_common import REPORTS_DIR, ensure_dirs, summarize_marketingskills, utc_now, week_id, write_text


def run(command: list[str], allow_failure: bool = False) -> int:
    print("+", " ".join(command))
    result = subprocess.run(command, text=True)
    if result.returncode and not allow_failure:
        raise SystemExit(result.returncode)
    return result.returncode


def weekly() -> int:
    ensure_dirs()
    loaded, review = summarize_marketingskills()
    write_text(REPORTS_DIR / f"{week_id()}-marketingskills-review.md", review)
    if not loaded:
        print("MARKETINGSKILLS_NOT_AVAILABLE")

    run([sys.executable, "scripts/gsc_fetch.py"])
    run([sys.executable, "scripts/analyze_gsc.py"])

    # Regenerate deterministic SEO support files and the deployable static output.
    run(["node", "scripts/seo-enhance.mjs"], allow_failure=True)
    run(["node", "scripts/build-pages.mjs"], allow_failure=True)
    run([sys.executable, "scripts/link_check.py"], allow_failure=True)

    write_text(
        REPORTS_DIR / f"{week_id()}-operator-run.md",
        "\n".join(
            [
                "# SEO Operator Run",
                "",
                f"Generated: {utc_now().isoformat()}",
                "",
                "Weekly operator completed. Review generated reports before relying on any content, title, meta, backlink, or community recommendation.",
            ]
        ),
    )
    return 0


def main() -> int:
    command = sys.argv[1] if len(sys.argv) > 1 else "weekly"
    if command != "weekly":
        print("Usage: python scripts/seo_operator.py weekly")
        return 2
    return weekly()


if __name__ == "__main__":
    sys.exit(main())
