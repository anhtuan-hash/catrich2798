import { BackupData, ClassroomDeck, ClassroomScreen, ClassroomWidget, StudentList, Folder, AppSettings } from '../types';
import { getAllDecks, getAllScreens, getAllWidgets, getAllStudentLists, getAllFolders, getSettings, saveDeck, saveScreen, saveWidget, saveStudentList, saveFolder, saveSettings } from './db';

export function exportBackupJSON(
  decks: ClassroomDeck[],
  screens: ClassroomScreen[],
  widgets: ClassroomWidget[],
  studentLists: StudentList[],
  folders: Folder[],
  settings: AppSettings
): void {
  const backup: BackupData = {
    version: '1.0.0',
    exportedAt: Date.now(),
    decks,
    screens,
    widgets,
    studentLists,
    folders,
    settings,
  };

  const jsonStr = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `brian_classroom_backup_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportAllDataAsJSON(): Promise<void> {
  const decks = await getAllDecks();
  const screens = await getAllScreens();
  const widgets = await getAllWidgets();
  const studentLists = await getAllStudentLists();
  const folders = await getAllFolders();
  const settings = await getSettings();

  exportBackupJSON(decks, screens, widgets, studentLists, folders, settings);
}

export async function importDataFromJSON(jsonText: string): Promise<boolean> {
  try {
    const data: BackupData = JSON.parse(jsonText);
    if (!data || !Array.isArray(data.decks) || !Array.isArray(data.screens) || !Array.isArray(data.widgets)) {
      return false;
    }

    for (const d of data.decks) await saveDeck(d);
    for (const s of data.screens) await saveScreen(s);
    for (const w of data.widgets) await saveWidget(w);
    if (Array.isArray(data.studentLists)) {
      for (const sl of data.studentLists) await saveStudentList(sl);
    }
    if (Array.isArray(data.folders)) {
      for (const f of data.folders) await saveFolder(f);
    }
    if (data.settings) await saveSettings(data.settings);

    return true;
  } catch {
    return false;
  }
}

export function exportToCSV(filename: string, headers: string[], rows: (string | number)[][]): void {
  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel UTF-8
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function parseImportJSON(file: File): Promise<BackupData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content) as BackupData;
        if (!data || !Array.isArray(data.decks) || !Array.isArray(data.screens) || !Array.isArray(data.widgets)) {
          throw new Error('Cấu trúc file backup không hợp lệ');
        }
        resolve(data);
      } catch (err: any) {
        reject(err?.message || 'Không thể đọc file JSON');
      }
    };
    reader.onerror = () => reject('Lỗi khi đọc file');
    reader.readAsText(file);
  });
}
