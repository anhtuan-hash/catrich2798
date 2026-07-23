# Global Shell Notifications

## Visual direction

Brian uses one restrained floating shell instead of stacked toolbars:

- one compact glass navigation bar
- pill-style primary navigation
- centered application launcher on desktop
- floating notification and account panels
- full-width bottom sheets on small phones
- app accent colors used mainly for state and emphasis

Native applications must not create a second permanent top navigation, app menu, notification bell, account switcher, or theme controller.

Brian exposes one notification surface for every native application. Apps should publish through `src/utils/globalNotifications.js`; they should not create a separate global drawer or write directly to another app's storage.

## Publish a notification

```js
import { publishGlobalNotification } from '../utils/globalNotifications.js';

publishGlobalNotification({
  id: `task:${task.id}:assigned`,
  title: 'Bạn có nhiệm vụ mới',
  message: task.title,
  source: 'Hub Chuyên môn',
  kind: 'task',
  target: '#/tool/professional-hub',
});
```

Supported fields:

- `id`: stable identifier used to replace a duplicate event.
- `title`: required user-facing heading.
- `message`: optional supporting text.
- `source`: application or workflow name.
- `kind`: safe lowercase visual category such as `task`, `record`, `meeting`, `transfer`, `success`, or `warning`.
- `target`: an internal `#/...` route or an `http/https` URL. Other protocols are ignored.
- `createdAt`: ISO timestamp; defaults to the current time.
- `read`: optional initial read state.

## Publish only once in a browser session

Use this for events that may be rediscovered by component refreshes or BroadcastChannel updates:

```js
import { publishGlobalNotificationOnce } from '../utils/globalNotifications.js';

publishGlobalNotificationOnce(
  `transfer:${user.id}:${transfer.id}`,
  {
    id: `transfer:${transfer.id}`,
    title: 'Có nội dung mới được gửi tới',
    source: transfer.sourceTitle,
    kind: 'transfer',
    target: '#/tool/textcare',
  },
);
```

Pass `{ storage: 'local' }` as the third argument only when the deduplication marker should survive browser restarts.

## Open the notification center

```js
import { openGlobalNotificationCenter } from '../utils/globalNotifications.js';

openGlobalNotificationCenter(buttonElement);
```

The panel returns keyboard focus to the supplied trigger after it closes.

## Storage and account isolation

The shell stores at most 100 notification items under a key derived from the current Brian user ID or email. Switching accounts does not copy or overwrite another user's list. Storage events synchronize the list between open tabs.

## Professional Hub cloud boundary

The Phase 2 Professional Hub schema includes `professional_hub_notifications`, with recipient-only reads and controlled `read_at` updates. This PR does not query or mutate that table because the migration has not yet been applied. Phase 3 should bridge authorized cloud rows into this same shell contract instead of introducing a second notification panel.