# Brian Metro Next — UI V2 Blueprint

Status: **Shadow development only**  
Branch: `ui-v2-shadow`  
Production UI: **unchanged**

## 1. Objective

Redesign Brian English end-to-end without destabilizing the current production interface. UI V2 must reuse the same authentication, permissions, Supabase data, business logic, routes and tool contracts wherever possible.

Core principle:

> UI changes; behaviour does not.

## 2. Release model

- `main` keeps the current production UI.
- `ui-v2-shadow` contains Brian Metro Next.
- Private preview entry: `/preview-ui-v2.html`.
- No public route or production feature flag is enabled yet.
- Final release happens only after visual QA, functional regression QA and owner approval.
- Rollback remains a branch/flag switch instead of a data migration.

## 3. Design language: Brian Metro Next

Brian Metro Next combines:

- Metro/Swiss hierarchy: flat surfaces, strong typography, obvious information structure.
- Fluent-style command/navigation patterns.
- iPad-style workspace density and large touch targets where needed.
- Reduced decoration: fewer gradients, fewer oversized rounded cards, less visual noise.
- Consistent neutral surfaces: pure white + cool blue-gray, no cream tint.
- Motion used for state continuity, not decoration.

### Visual principles

1. Typography before decoration.
2. One dominant action per workspace.
3. Navigation is quiet; content is prominent.
4. Data screens prioritize scan speed.
5. Tools share one shell but may keep their own functional personality.
6. Desktop, tablet, mobile and TV are designed intentionally—not only resized.

## 4. Foundations

The V2 token layer lives in `src/ui/v2/tokens.css` and controls:

- typography scale;
- spacing scale;
- border/radius system;
- neutral and semantic color ramps;
- elevation;
- motion timing;
- responsive shell dimensions.

No V1 CSS override should be used as the design foundation for V2.

## 5. V2 component architecture

Target primitives and patterns:

### Shell
- BrianV2Shell
- SideRail
- TopBar
- GlobalCommandSearch
- ProfileMenu
- WorkspaceContainer

### Navigation
- NavGroup
- NavItem
- Breadcrumb
- Tabs
- SegmentedControl
- CommandBar

### Actions
- Button
- IconButton
- SplitButton
- FloatingAction

### Surfaces
- Tile
- Card
- Panel
- MetricTile
- Callout

### Forms
- TextField
- SearchField
- TextArea
- Select
- Checkbox
- Switch
- Slider
- FileDropzone

### Data
- DataTable
- DataGrid
- FilterBar
- BulkActionBar
- Pagination
- StatusBadge
- Progress

### Overlays
- Dialog
- Drawer
- BottomSheet
- Popover
- Tooltip
- Toast

### States
- Loading
- Skeleton
- EmptyState
- ErrorState
- OfflineState
- PermissionState

### Domain patterns
- ClassCard
- StudentCard
- TeacherCard
- TeachingToolTile
- WeeklyPracticeCard
- ExamRoomCard

## 6. Information architecture target

V2 may reorganize navigation visually while preserving permission IDs and route contracts.

Suggested groups:

### TEACH
- Trang chủ
- Ứng dụng
- Teaching tools
- Trò chơi
- Kho học liệu

### MANAGE
- Chủ nhiệm
- Lớp học
- Học sinh

### WORK
- Dashboard
- Báo cáo
- Công việc

### SYSTEM
- Quản trị
- Cài đặt

Exact mapping is frozen only after route/permission audit.

## 7. Migration sequence

### Phase A — Inventory and foundations
- catalog routes, components, modal/drawer/table patterns;
- freeze tokens;
- create private preview entry;
- establish App Shell V2.

### Phase B — Core primitives
- buttons, fields, tabs, cards, overlays, tables;
- accessibility and density standards;
- responsive rules.

### Phase C — High-frequency workspaces
- Home;
- Apps;
- Teaching Tool Hub;
- Homeroom;
- Dashboard;
- Classes.

### Phase D — Data-heavy screens
- student lists;
- gradebook;
- reports;
- weekly practice manager;
- admin tables.

### Phase E — Tools
- Seating Chart Studio;
- Teaching Launcher;
- future Exam Studio;
- legacy tool shell compatibility.

### Phase F — Edge states
- auth;
- permissions;
- empty/error/loading/offline;
- drawers/modals;
- mobile/tablet/TV;
- print states.

### Phase G — Validation and release
- visual regression;
- feature regression;
- accessibility;
- performance;
- owner preview period;
- controlled V2 release;
- instant V1 rollback path.

## 8. Stability rules

V2 work must not:

- alter Supabase schema unless a feature genuinely requires it;
- duplicate production data;
- change permission semantics merely for UI reasons;
- add unnecessary Vercel Functions;
- fork business logic into separate V1/V2 versions;
- rely on growing stacks of global CSS overrides.

When a shared function already exists, V2 consumes it.

## 9. QA gates before public release

Each migrated page must pass:

- functional parity;
- desktop 1366/1440/1920 review;
- iPad portrait/landscape;
- mobile 390–430px;
- TV/presentation mode where relevant;
- keyboard navigation;
- no accidental horizontal overflow;
- no cream surfaces;
- no unwanted selection halos;
- no layout shift during lazy loading;
- no material performance regression.

## 10. Current implementation

Completed in the shadow branch:

- V2 design tokens;
- V2 App Shell scaffold;
- V2 Home preview scaffold;
- standalone preview entry `/preview-ui-v2.html`;
- production remains untouched.

Next implementation target: **shared V2 primitives + real Home data adapter**, followed by Teaching Tool Hub migration.
