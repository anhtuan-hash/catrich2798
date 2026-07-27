import { openDB, DBSchema, IDBPDatabase } from 'idb';
import {
  ClassroomDeck,
  ClassroomScreen,
  ClassroomWidget,
  StudentList,
  Folder,
  AppSettings,
} from '../types';

interface BrianClassroomDB extends DBSchema {
  decks: {
    key: string;
    value: ClassroomDeck;
    indexes: { 'by-updated': number; 'by-folder': string };
  };
  screens: {
    key: string;
    value: ClassroomScreen;
    indexes: { 'by-deck': string };
  };
  widgets: {
    key: string;
    value: ClassroomWidget;
    indexes: { 'by-screen': string };
  };
  studentLists: {
    key: string;
    value: StudentList;
  };
  folders: {
    key: string;
    value: Folder;
  };
  mediaBlobs: {
    key: string;
    value: { id: string; blob: Blob; filename: string; mimeType: string; createdAt: number };
  };
}

const DB_NAME = 'brian_classroom_screen_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<BrianClassroomDB>> | null = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<BrianClassroomDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('decks')) {
          const deckStore = db.createObjectStore('decks', { keyPath: 'id' });
          deckStore.createIndex('by-updated', 'updatedAt');
          deckStore.createIndex('by-folder', 'folderId');
        }

        if (!db.objectStoreNames.contains('screens')) {
          const screenStore = db.createObjectStore('screens', { keyPath: 'id' });
          screenStore.createIndex('by-deck', 'deckId');
        }

        if (!db.objectStoreNames.contains('widgets')) {
          const widgetStore = db.createObjectStore('widgets', { keyPath: 'id' });
          widgetStore.createIndex('by-screen', 'screenId');
        }

        if (!db.objectStoreNames.contains('studentLists')) {
          db.createObjectStore('studentLists', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('folders')) {
          db.createObjectStore('folders', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('mediaBlobs')) {
          db.createObjectStore('mediaBlobs', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

// Decks CRUD
export async function getAllDecks(): Promise<ClassroomDeck[]> {
  const db = await getDB();
  return db.getAllFromIndex('decks', 'by-updated');
}

export async function getDeckById(id: string): Promise<ClassroomDeck | undefined> {
  const db = await getDB();
  return db.get('decks', id);
}

export async function saveDeck(deck: ClassroomDeck): Promise<void> {
  const db = await getDB();
  await db.put('decks', deck);
}

export async function deleteDeckFromDB(id: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['decks', 'screens', 'widgets'], 'readwrite');
  
  const screens = await tx.objectStore('screens').index('by-deck').getAllKeys(id);
  for (const screenId of screens) {
    const widgets = await tx.objectStore('widgets').index('by-screen').getAllKeys(screenId);
    for (const widgetId of widgets) {
      await tx.objectStore('widgets').delete(widgetId);
    }
    await tx.objectStore('screens').delete(screenId);
  }
  
  await tx.objectStore('decks').delete(id);
  await tx.done;
}

// Screens CRUD
export async function getAllScreens(): Promise<ClassroomScreen[]> {
  const db = await getDB();
  return db.getAll('screens');
}

export async function getScreensForDeck(deckId: string): Promise<ClassroomScreen[]> {
  const db = await getDB();
  const screens = await db.getAllFromIndex('screens', 'by-deck', deckId);
  return screens.sort((a, b) => a.order - b.order);
}

export async function saveScreen(screen: ClassroomScreen): Promise<void> {
  const db = await getDB();
  await db.put('screens', screen);
}

export async function deleteScreenFromDB(screenId: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['screens', 'widgets'], 'readwrite');
  const widgets = await tx.objectStore('widgets').index('by-screen').getAllKeys(screenId);
  for (const widgetId of widgets) {
    await tx.objectStore('widgets').delete(widgetId);
  }
  await tx.objectStore('screens').delete(screenId);
  await tx.done;
}

// Widgets CRUD
export async function getAllWidgets(): Promise<ClassroomWidget[]> {
  const db = await getDB();
  return db.getAll('widgets');
}

export async function getWidgetsForScreen(screenId: string): Promise<ClassroomWidget[]> {
  const db = await getDB();
  return db.getAllFromIndex('widgets', 'by-screen', screenId);
}

export async function saveWidget(widget: ClassroomWidget): Promise<void> {
  const db = await getDB();
  await db.put('widgets', widget);
}

export async function saveWidgetsBatch(widgets: ClassroomWidget[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('widgets', 'readwrite');
  for (const widget of widgets) {
    await tx.store.put(widget);
  }
  await tx.done;
}

export async function deleteWidgetFromDB(widgetId: string): Promise<void> {
  const db = await getDB();
  await db.delete('widgets', widgetId);
}

// Student Lists CRUD
export async function getAllStudentLists(): Promise<StudentList[]> {
  const db = await getDB();
  return db.getAll('studentLists');
}

export async function saveStudentList(list: StudentList): Promise<void> {
  const db = await getDB();
  await db.put('studentLists', list);
}

export async function deleteStudentListFromDB(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('studentLists', id);
}

// Folders CRUD
export async function getAllFolders(): Promise<Folder[]> {
  const db = await getDB();
  return db.getAll('folders');
}

export async function saveFolder(folder: Folder): Promise<void> {
  const db = await getDB();
  await db.put('folders', folder);
}

export async function deleteFolderFromDB(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('folders', id);
}

// Settings in LocalStorage
const SETTINGS_KEY = 'brian_classroom_settings_v1';

export const DEFAULT_SETTINGS: AppSettings = {
  language: 'vi',
  theme: 'light',
  primaryColor: '#1a73e8',
  autoSaveDebounce: 800,
  enableSound: true,
  soundVolume: 0.8,
  shortcutsEnabled: true,
  safeAreaByDefault: true,
  hideCursorInPresent: true,
  autoTrashCleanDays: 30,
};

export function loadStoredSettings(): AppSettings {
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function getSettings(): Promise<AppSettings> {
  return Promise.resolve(loadStoredSettings());
}

export function saveStoredSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save settings to localStorage:', err);
  }
}

export function saveSettings(settings: AppSettings): Promise<void> {
  saveStoredSettings(settings);
  return Promise.resolve();
}
