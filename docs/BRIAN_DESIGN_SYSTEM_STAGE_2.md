# Brian Design System — Stage 2 Core Components

Stage 2 introduces a new shared primitive layer under `src/components/ui/`.

## Goals

- provide one accessible, token-driven UI vocabulary for new Brian work;
- avoid mass replacement of historical route components;
- keep selectors isolated with the `.bui-*` namespace;
- use only semantic tokens from Stage 1 for color, spacing, typography, radius, elevation, focus and motion;
- keep the current Brian light-only appearance contract.

## Public exports

Import from:

```js
import {
  Button,
  IconButton,
  Input,
  Select,
  Checkbox,
  Radio,
  Toggle,
  Badge,
  Tooltip,
  Tabs,
  Modal,
  ToastProvider,
  useToast,
  Loader,
  Spinner,
  Skeleton,
  Progress,
} from '../components/ui/index.js';
```

## Actions

### Button

Variants: `primary`, `secondary`, `subtle`, `danger`.

Sizes: `sm`, `md`, `lg`.

Supports `loading`, `disabled`, `startIcon`, `endIcon` and normal button props.

```jsx
<Button variant="primary" loading={saving} onClick={save}>Lưu</Button>
```

### IconButton

Always provide `label`, `aria-label`, or `title`. A fallback label exists only as a last safety guard.

```jsx
<IconButton label="Đóng"><CloseIcon /></IconButton>
```

## Fields

`Input` and `Select` accept `label`, `hint`, `error`, and `required`. IDs and `aria-describedby` relationships are generated automatically when an explicit ID is not provided.

```jsx
<Input label="Họ tên" error={errors.name} value={name} onChange={handleName} />
```

`Checkbox`, `Radio`, and `Toggle` support a label plus an optional description. `Toggle` uses native checkbox semantics plus `role="switch"`.

## Status and feedback

### Badge

Variants: `neutral`, `accent`, `success`, `warning`, `danger`, `info`.

### Tooltip

Placements: `top`, `bottom`, `left`, `right`. The tooltip is available on hover and keyboard focus.

### Loader / Spinner

`Loader` is an alias of `Spinner`. Sizes: `sm`, `md`, `lg`.

### Skeleton

Skeletons are intentionally static. Brian does not use decorative shimmer motion.

### Progress

Accessible progressbar with clamped values and optional percentage display.

## Tabs

`Tabs` uses an item model:

```jsx
<Tabs
  ariaLabel="Hồ sơ học sinh"
  items={[
    { value: 'overview', label: 'Tổng quan', content: <Overview /> },
    { value: 'conduct', label: 'Rèn luyện', content: <Conduct /> },
  ]}
/>
```

Keyboard contract:

- Left / Right Arrow: move and activate the previous or next enabled tab;
- Home: first enabled tab;
- End: last enabled tab.

Controlled usage is available through `value` + `onValueChange`; uncontrolled usage uses `defaultValue`.

## Modal

The shared modal:

- renders through a React portal;
- traps keyboard focus inside the dialog;
- closes on Escape by default;
- can close when the backdrop is clicked;
- locks document body scrolling;
- restores focus to the previously active control after closing;
- supports `sm`, `md`, `lg`, `xl` widths.

```jsx
<Modal
  open={open}
  onClose={() => setOpen(false)}
  title="Xác nhận"
  footer={<Button onClick={confirm}>Tiếp tục</Button>}
>
  Nội dung xác nhận
</Modal>
```

## Toast

Mount `ToastProvider` once around the relevant application shell, then use `useToast()`.

```jsx
const toast = useToast();

toast.push({
  variant: 'success',
  title: 'Đã lưu',
  message: 'Dữ liệu đã được cập nhật.',
});
```

Variants: `neutral`, `accent`, `info`, `success`, `warning`, `danger`.

The provider supports placement and a maximum visible-toast limit.

## Migration policy

Stage 2 does **not** rewrite historical controls in bulk.

For each later app migration:

1. use `src/components/ui/index.js` for new controls;
2. replace route-local primitives only when that route is actively redesigned;
3. do not copy `.bui-*` CSS into route files;
4. do not introduce new raw palette values when a Stage 1 semantic token exists;
5. retain business logic, permissions, data behavior, exports and routing during visual migration;
6. verify keyboard focus, disabled states, validation states and mobile touch targets before completing the migration.

## Stage 3 handoff

Stage 3 should compose these primitives into shared structural components such as PageHeader, Toolbar, Search/Filter Bar, Card/Section shells, Empty State, Data Table framing, Drawer and standard form layouts.
