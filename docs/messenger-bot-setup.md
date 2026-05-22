# Facebook Messenger bot setup

This backend exposes the same SCM chatbot through Facebook Messenger.

## Production webhook

Use this callback URL in Meta Developers:

```txt
https://scm-okjs.onrender.com/api/messenger/webhook
```

## Required environment variables

Set these on the Render backend service:

```txt
FB_VERIFY_TOKEN=<any strong random string you choose>
FB_PAGE_ACCESS_TOKEN=<Facebook Page access token>
FB_GRAPH_VERSION=v20.0
PUBLIC_API_BASE_URL=https://scm-okjs.onrender.com
```

`FB_VERIFY_TOKEN` must exactly match the Verify Token entered in the Meta webhook setup screen.

## Meta app setup checklist

1. Create or open the Meta app in Meta Developers.
2. Add Messenger product.
3. Generate a Page access token for the SCM Facebook Page.
4. Set the Render environment variables above and redeploy the backend.
5. In Messenger webhook settings, add the callback URL and verify token.
6. Subscribe the Page to `messages` and `messaging_postbacks`.
7. Send a test message to the Facebook Page.

## Notes

- The Messenger webhook reuses `/api/chat`, so web chat and Messenger share the same product, calculator, and contact logic.
- If the chatbot returns a web-only action such as opening `/loan-request`, Messenger replies with the direct URL instead.
- Quick replies are generated from the existing `[OPTIONS: ...]` response format.
