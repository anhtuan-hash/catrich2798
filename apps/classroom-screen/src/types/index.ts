export type Language = 'vi' | 'en';
export type ThemeMode = 'light' | 'dark' | 'cosmic' | 'high-contrast' | 'system';

export type WidgetCategory =
  | 'content'
  | 'time'
  | 'classroom'
  | 'students'
  | 'interactive'
  | 'games'
  | 'media'
  | 'decoration';

export type WidgetType =
  | 'clock'
  | 'timer'
  | 'visual-timer'
  | 'stopwatch'
  | 'countdown'
  | 'calendar'
  | 'timetable'
  | 'traffic-light'
  | 'work-symbols'
  | 'sound-level'
  | 'attention-signal'
  | 'scoreboard'
  | 'randomizer'
  | 'group-maker'
  | 'seating-picker'
  | 'poll'
  | 'dice'
  | 'coin-toss'
  | 'spinner'
  | 'number-generator'
  | 'text'
  | 'sticky-note'
  | 'checklist'
  | 'qr-code'
  | 'hyperlink'
  | 'image'
  | 'pdf'
  | 'video'
  | 'audio'
  | 'webcam'
  | 'embed'
  | 'browser-card'
  | 'draw'
  | 'sticker'
  | 'word-puzzle'
  | 'flashcard'
  | 'true-false-race'
  | 'tic-tac-toe';

export interface WidgetCapabilities {
  resizable: boolean;
  rotatable: boolean;
  pinnable: boolean;
  spotlightable: boolean;
  supportsFullscreen: boolean;
  usesMicrophone: boolean;
  usesCamera: boolean;
  usesNetwork: boolean;
}

export interface WidgetStyle {
  backgroundColor?: string;
  textColor?: string;
  fontSize?: number;
  fontFamily?: string;
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  borderStyle?: 'solid' | 'dashed' | 'dotted';
  boxShadow?: string;
  padding?: number;
  textAlign?: 'left' | 'center' | 'right';
  opacity?: number;
}

export interface ClassroomWidget {
  id: string;
  type: WidgetType;
  screenId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  opacity: number;
  locked: boolean;
  hidden: boolean;
  pinned: boolean; // Pinned across all screens in the same deck
  groupedWith?: string[];
  style: WidgetStyle;
  settings: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

export type ScreenTransition = 'none' | 'fade' | 'slide' | 'scale';

export interface BackgroundSettings {
  type: 'color' | 'gradient' | 'image' | 'pattern';
  value: string;
  opacity?: number;
  blur?: number;
  overlayColor?: string;
  overlayOpacity?: number;
}

export interface ClassroomScreen {
  id: string;
  deckId: string;
  title: string;
  order: number;
  background: BackgroundSettings;
  transition: ScreenTransition;
  widgetIds: string[];
  notes?: string; // Teacher control private notes
  createdAt: number;
  updatedAt: number;
}

export interface DeckSettings {
  aspectRatio: '16:9' | '4:3' | '16:10';
  defaultTheme?: string;
  autoSave: boolean;
  safeArea: boolean;
}

export interface ClassroomDeck {
  id: string;
  title: string;
  description?: string;
  folderId?: string;
  tags: string[];
  favorite: boolean;
  inTrash?: boolean;
  trashedAt?: number;
  createdAt: number;
  updatedAt: number;
  lastOpenedAt?: number;
  settings: DeckSettings;
  screenIds: string[];
}

export interface Folder {
  id: string;
  name: string;
  color: string;
  icon?: string;
  createdAt: number;
}

export interface Student {
  id: string;
  displayName: string;
  number?: string;
  avatar?: string;
  absent: boolean;
  excluded: boolean;
  groupTag?: string;
  metadata?: Record<string, string>;
}

export interface StudentList {
  id: string;
  name: string;
  students: Student[];
  createdAt: number;
  updatedAt: number;
}

export interface AppSettings {
  language: Language;
  theme: ThemeMode;
  primaryColor: string;
  autoSaveDebounce: number; // ms
  enableSound: boolean;
  soundVolume: number;
  shortcutsEnabled: boolean;
  safeAreaByDefault: boolean;
  hideCursorInPresent: boolean;
  autoTrashCleanDays: number;
}

export interface LayoutPresetWidgetTemplate {
  type: WidgetType;
  x: number;
  y: number;
  width: number;
  height: number;
  style?: WidgetStyle;
  settings?: Record<string, any>;
}

export interface LayoutPreset {
  id: string;
  name: string;
  description: string;
  category: 'builtin' | 'custom';
  icon: string;
  background?: BackgroundSettings;
  widgets: LayoutPresetWidgetTemplate[];
  createdAt?: number;
}

export interface BackupData {
  version: string;
  exportedAt: number;
  decks: ClassroomDeck[];
  screens: ClassroomScreen[];
  widgets: ClassroomWidget[];
  studentLists: StudentList[];
  folders: Folder[];
  settings: AppSettings;
}

export interface WidgetRegistryEntry {
  type: WidgetType;
  title: { vi: string; en: string };
  description: { vi: string; en: string };
  icon: string; // Lucide icon name or SVG tag
  category: WidgetCategory;
  defaultWidth: number;
  defaultHeight: number;
  capabilities: WidgetCapabilities;
  defaultSettings: Record<string, any>;
  defaultStyle?: WidgetStyle;
}
