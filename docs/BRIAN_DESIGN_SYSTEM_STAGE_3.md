# Brian Design System — Stage 3 Shared Layout Components

Stage 3 adds the shared composition layer that sits between Stage 2 primitives and Brian feature apps.

## Architecture

```text
Stage 1 · Design Tokens
        ↓
Stage 2 · Core UI Primitives
        ↓
Stage 3 · Shared Layout Components
        ↓
Stage 4+ · Brian App Migration
```

## Public components

### Page composition

- `PageShell` — authoritative content-width and page-gutter wrapper.
- `PageHeader` — editorial page heading with eyebrow, title, metadata, description, actions and optional aside.
- `Section` — reusable section heading/body contract with plain, surface and subtle variants.
- `Card` — general surface container with restrained default elevation.
- `Toolbar` — action/filter control row with optional sticky mode.
- `SearchFilterBar` — dedicated search + filters + result summary + actions composition.
- `EmptyState` — standard zero-data / zero-result state.
- `Stack` and `Grid` — low-level composition helpers using the Brian spacing scale.

### Data and forms

- `DataShell` — data viewport wrapper with toolbar/footer and loading/empty state slots.
- `TableShell` — responsive horizontal table viewport with optional sticky header.
- `DataSummary` — compact label/value summary strip.
- `FormLayout` — one/two/three-column responsive form grid.
- `FormSection` — semantic form grouping with heading and actions.
- `FormActions` — standard action row with optional sticky mode.
- `DetailList` — read-only structured label/value information grid.

### Overlay

- `Drawer` — left/right functional side panel with portal rendering, focus trap, Escape handling, scroll lock and focus restoration.

## Usage example

```jsx
import {
  PageShell,
  PageHeader,
  Section,
  SearchFilterBar,
  DataShell,
  TableShell,
  EmptyState,
  Button,
  Input,
} from '../components/ui';

export default function ExamplePage() {
  return (
    <PageShell>
      <PageHeader
        eyebrow="TTCM"
        title="Trung tâm công việc"
        description="Theo dõi thông báo, tài liệu và công việc của tổ chuyên môn."
        actions={<Button>Tạo thông báo</Button>}
      />

      <Section title="Công việc đang xử lý">
        <SearchFilterBar search={<Input aria-label="Tìm kiếm" />} />
        <DataShell empty emptyState={<EmptyState title="Chưa có công việc" />}>
          <TableShell>{/* table */}</TableShell>
        </DataShell>
      </Section>
    </PageShell>
  );
}
```

## Design contract

Stage 3 follows these constraints:

1. Consume `--brian-*` semantic tokens from Stage 1.
2. Use `.bui-*` namespace only.
3. Do not repaint the global document canvas.
4. Do not introduce app-specific colors into shared layout components.
5. Do not add decorative looping motion.
6. Keep mobile form/table usage functional before decorative polish.
7. Shared layout components own composition; feature components own business meaning.

## Editorial Material direction

Editorial character comes from hierarchy rather than effects:

- large, tight page titles;
- restrained eyebrow labels;
- clear rules/dividers;
- generous but predictable whitespace;
- white/cool-neutral paper-like surfaces;
- low elevation;
- one interaction accent;
- actions grouped deliberately rather than scattered around the page.

## Migration policy

Do not mass-replace historical layout selectors globally.

For each feature migration:

1. wrap the page in `PageShell`;
2. replace custom hero/title blocks with `PageHeader` where appropriate;
3. move page areas into `Section`;
4. use `SearchFilterBar` and `Toolbar` for controls;
5. place data surfaces in `DataShell` / `TableShell`;
6. use `EmptyState` for no-data/no-result cases;
7. use `FormLayout` / `FormSection` for editable panels;
8. use `Drawer` only for secondary workflows that should not replace the current route;
9. remove old CSS only after the migrated screen passes visual and functional regression checks.

## Stage 3 safety boundary

Stage 3 itself does not migrate feature pages. It only adds reusable infrastructure plus the public exports. This keeps business logic, permissions, exports, routing and Supabase behavior unchanged while preparing controlled app-by-app migration.
