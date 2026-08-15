# Zentro Facebook and Messenger setup

## Production endpoints

- Website: `https://zentrocapitalgroup.com`
- Messenger webhook: `https://scm-okjs.onrender.com/api/zentro/facebook/webhook`
- Admin: `Facebook` menu inside the Zentro ERP

## Required Render environment variables

```txt
ZENTRO_FB_GRAPH_VERSION=v25.0
ZENTRO_FB_PAGE_ID=<Facebook Page ID>
ZENTRO_FB_PAGE_ACCESS_TOKEN=<long-lived Page access token>
ZENTRO_FB_VERIFY_TOKEN=<strong random value>
ZENTRO_META_APP_SECRET=<Meta App secret>
PUBLIC_API_BASE_URL=https://scm-okjs.onrender.com
```

Do not store these secrets in Git, Vercel client variables, or the admin web config.

## Meta configuration

1. Create or select the official `Zentro Prime Capital` Facebook Page.
2. Create a Business app in Meta for Developers and add Messenger.
3. Connect the Facebook Page to the app.
4. Request a Page access token with these permissions:
   - `pages_messaging`
   - `pages_manage_metadata`
   - `pages_manage_posts`
   - `pages_read_engagement`
5. Add the production webhook URL and use the exact same value as `ZENTRO_FB_VERIFY_TOKEN`.
6. Subscribe to `messages`, `messaging_postbacks`, and `messaging_referrals`.
7. Add the Render variables and redeploy the backend.
8. Open Zentro ERP -> Facebook -> Connection, test the connection, then click `Messenger webhook холбох`.
9. Enter the public Facebook Page and `m.me` links in the same admin page and save.

App Review and Business Verification may be required before people outside the app's admin/tester roles can use Messenger or before Page publishing permissions work in Live mode.

## Automation behavior

- Messenger replies use current Zentro products, rates, terms, address, phone, and custom FAQ answers from the admin panel.
- A Messenger application collects name, phone, product, amount, term, and collateral, then creates a `ZentroLoanRequest` with `source=facebook`.
- Daily posts rotate approved templates and current product images.
- Each local calendar day has a unique schedule key, so restarts or multiple checks cannot publish the same daily post twice.
- The backend checks every five minutes and catches up after a restart if the configured time has already passed. The Render service must remain available for exact-time posting.

## Security

- Incoming webhook payloads require a valid `X-Hub-Signature-256` generated with the Meta App secret.
- Messenger event IDs are retained per conversation to ignore Meta delivery retries.
- Tokens are only read from backend environment variables and are never returned by the status API.

