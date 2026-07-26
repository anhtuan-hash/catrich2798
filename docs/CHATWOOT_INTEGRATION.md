# Independent Chatwoot support for Brian

This integration adds a separate **Technical support** launcher without replacing or modifying `SharedChatbotDrawer`.

## Architecture

- `SharedChatbotDrawer` remains owned by Brian.
- `ChatwootSupportWidget` is mounted from `externalAppsBootstrap.jsx` as a separate component.
- The Chatwoot SDK is loaded lazily after the signed-in user clicks the support launcher.
- The default Chatwoot bubble is hidden so it does not collide with Brian's utility controls.
- The current Brian user is sent to Chatwoot with name, email, avatar, school, role, app version, route and interface language.
- Logging out closes and resets the Chatwoot session.

## 1. Create a Website inbox

In Chatwoot, open **Settings > Inboxes > Add Inbox > Website**. Copy the Website token and note the Chatwoot base URL.

For Chatwoot Cloud, the base URL is `https://app.chatwoot.com`. For self-hosted Chatwoot, use the origin of that installation without a trailing slash.

## 2. Configure Vercel

Copy the variables from `.env.chatwoot.example` into the Vercel project settings.

Required:

- `VITE_CHATWOOT_ENABLED=true`
- `VITE_CHATWOOT_BASE_URL`
- `VITE_CHATWOOT_WEBSITE_TOKEN`

Keep `VITE_CHATWOOT_PRELOAD=false` to avoid loading the external Chatwoot SDK until the user opens support.

For the initial rollout, leave `VITE_CHATWOOT_IDENTITY_ENDPOINT` blank. Chatwoot still receives the signed-in Brian user's stable ID, name and email. A secure HMAC endpoint can be added later without changing the widget architecture.

## 3. Deploy Brian

Redeploy Brian after adding the environment variables. The launcher appears only for authenticated users and stays hidden on login, registration, setup, homeroom portal and classroom-join routes.

## Runtime diagnostics

In the browser console:

```js
window.BESChatwootSupport.status()
window.BESChatwootSupport.open()
window.BESChatwootSupport.close()
```

When `VITE_CHATWOOT_PRELOAD=false`, no Chatwoot SDK request is made until the support launcher is clicked.
