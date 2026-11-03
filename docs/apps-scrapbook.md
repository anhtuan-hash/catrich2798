# Apps Scrapbook

The Apps directory has an independent, admin-controlled paper presentation based on the supplied blue/pink mockup. Enable **Ứng dụng · Scrapbook** in **Settings → Điều hướng**. Turning it off removes the scope attribute and restores the existing CSS cascade. Home and Dashboard keep their own settings.

The singleton `bes_navigation_theme_settings.apps_scrapbook_enabled` defaults to false. Apply `20261102232903_apps_scrapbook_theme.sql` before releasing the frontend. Only an authenticated, approved admin/administrator may call `bes_set_apps_scrapbook_enabled(boolean)`. No client-side role check grants database access. A missing migration or rejected write leaves the previous confirmed presentation intact and exposes a reload action.

The store shares one realtime subscription and polls visible tabs every 30 seconds. Focus, reconnect and storage events refresh from the server; local storage cannot authorize enabling the skin. The scope belongs to `GlobalFlatNavigation` and only activates on route `apps`. The shared footer and desktop/mobile navigation suppress Halloween chrome on that route while Apps Scrapbook is enabled.

`WebAppsRedesign`, its cards, app data, permissions, launch handlers, filters and launcher configuration are reused. Counts remain live. Generated decorative artwork is local, transparent WebP (~104 KB); text and controls remain HTML. All presentation rules are scoped, with responsive 5/3/2/1-column layouts, focus outlines and reduced-motion support.

Validation: `node --test scripts/test-apps-scrapbook.mjs`; `node scripts/test-apps-scrapbook-browser.mjs`; `node scripts/build-brian-vercel-release.mjs`. The Apps Scrapbook workflow tests real components with a test-only transport, including missing-schema recovery, rejected saves, realtime updates, exact OFF restoration, route isolation, native filters/launch/pin/save, role restrictions and responsive screenshots. It never writes to production.
