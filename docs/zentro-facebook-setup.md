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
   - `read_insights` — post view and click metrics
   - `pages_read_user_content` — post comment and share counts
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

## Post call-to-action buttons

Meta does not allow a call-to-action button on an organic Page post. The Graph API
silently drops unknown parameters, so a publish request can look successful while the
post carries no button. The backend therefore reads `call_to_action` back from the
published post and only reports `ctaApplied` when Meta actually returns one.

What the `Постын үйлдлийн товч` setting still does:

- `MESSAGE_PAGE` builds a per-post `m.me` link with a `zpc-post-<topic>-<id>` referral
  code, appends it to the post text, and routes the resulting chat into the matching
  Messenger conversation.
- `APPLY_NOW` appends the website application link with `?fb_post=<id>` so the loan
  funnel can attribute the request back to the post.
- Neither type renders a button on the organic post itself.

To get a real `Send Message` button, boost the post as a Click-to-Messenger ad:

1. Open the published post on the Page and press `Create ad`.
2. Goal: `Get more messages` (Objective `Engagement`, conversion location `Messaging apps`).
3. Messaging app `Messenger`, call to action `Send Message`.
4. Special Ad Category: `Credit` — required for loan advertising.
5. Confirm the existing post is selected, set audience and budget, then publish.

This needs Full control of the Page, `Manage campaigns` on an ad account, and a payment
method on that ad account. A separate, free option is the permanent Page cover button:
Page → `Edit action button` → `Send Message`. That button appears on the Page, not on posts.

## Security

- Incoming webhook payloads require a valid `X-Hub-Signature-256` generated with the Meta App secret.
- Messenger event IDs are retained per conversation to ignore Meta delivery retries.
- Tokens are only read from backend environment variables and are never returned by the status API.

