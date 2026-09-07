# Google Search Console Integration Setup

This site uses a weekly SEO operator that reads Google Search Console data through the Search Analytics API.

## Required GitHub Secrets

Add these repository secrets in GitHub:

- `GSC_SERVICE_ACCOUNT_JSON`: the full Google Cloud service account key JSON.
- `GSC_PROPERTY`: `sc-domain:wandergamemap.com`

## Google Cloud Setup

1. Open Google Cloud Console.
2. Create or select a project for Wander Game Map SEO automation.
3. Enable the Google Search Console API.
4. Create a service account named `wander-game-map-seo-operator`.
5. Create a JSON key for that service account.
6. Copy the full JSON into the GitHub secret `GSC_SERVICE_ACCOUNT_JSON`.

Do not commit the JSON key to the repository.

## Search Console Permission

1. Open Search Console for `wandergamemap.com`.
2. Go to Settings, then Users and permissions.
3. Add the service account email from the JSON key.
4. Grant at least Restricted read access. Full access is acceptable if you want future sitemap submission automation.

## Test

Run:

```bash
python scripts/seo_operator.py weekly
```

When configured, the operator writes current data into:

- `seo/data/gsc/YYYY-WW/7d/`
- `seo/data/gsc/YYYY-WW/28d/`
- `seo/data/gsc/YYYY-WW/90d/`

If credentials are missing or invalid, it writes `seo/reports/gsc-error.md` and skips data-driven website changes.
