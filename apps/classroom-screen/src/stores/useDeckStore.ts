import { useState, useEffect, useCallback, useRef } from 'react';
import { ClassroomDeck, ClassroomScreen, ClassroomWidget, Folder, LayoutPreset } from '../types';
import {
  getAllDecks,
  saveDeck,
  deleteDeckFromDB,
  getScreensForDeck,
  saveScreen,
  deleteScreenFromDB,
  getWidgetsForScreen,
  saveWidget,
  saveWidgetsBatch,
  deleteWidgetFromDB,
  getAllFolders,
  saveFolder,
  deleteFolderFromDB,
} from '../services/db';
import { BUILTIN_LAYOUTS, getCustomLayouts, saveCustomLayoutToStorage, deleteCustomLayoutFromStorage } from '../services/layouts';
import { createSampleDeck } from '../services/sampleData';
import { sendBroadcast } from '../services/broadcast';

interface HistoryState {
  screens: ClassroomScreen[];
  widgets: ClassroomWidget[];
}

export function useDeckStore() {
  const [decks, setDecks] = useState<ClassroomDeck[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [activeDeck, setActiveDeck] = useState<ClassroomDeck | null>(null);
  const [screens, setScreens] = useState<ClassroomScreen[]>([]);
  const [activeScreenId, setActiveScreenId] = useState<string | null>(null);
  const [widgets, setWidgets] = useState<ClassroomWidget[]>([]);
  const [customLayouts, setCustomLayouts] = useState<LayoutPreset[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'failed'>('saved');

  // Undo / Redo stacks
  const historyRef = useRef<HistoryState[]>([]);
  const historyPointerRef = useRef<number>(-1);

  // Helper to record history snapshot
  const pushHistory = useCallback((newScreens: ClassroomScreen[], newWidgets: ClassroomWidget[]) => {
    const currentSnapshot: HistoryState = {
      screens: JSON.parse(JSON.stringify(newScreens)),
      widgets: JSON.parse(JSON.stringify(newWidgets)),
    };

    const updated = historyRef.current.slice(0, historyPointerRef.current + 1);
    updated.push(currentSnapshot);
    if (updated.length > 100) updated.shift(); // Max 100 steps

    historyRef.current = updated;
    historyPointerRef.current = updated.length - 1;
  }, []);

  // Initial load
  useEffect(() => {
    async function initData() {
      setIsLoading(true);
      try {
        let loadedDecks = await getAllDecks();
        let loadedFolders = await getAllFolders();
        setCustomLayouts(getCustomLayouts());

        // Seed with sample deck if empty!
        if (loadedDecks.length === 0) {
          const sample = createSampleDeck();
          await saveDeck(sample.deck);
          for (const sc of sample.screens) await saveScreen(sc);
          for (const wg of sample.widgets) await saveWidget(wg);
          loadedDecks = [sample.deck];
        }

        setDecks(loadedDecks.filter((d) => !d.inTrash));
        setFolders(loadedFolders);

        // Open last opened or first deck
        const targetDeck = loadedDecks.find((d) => !d.inTrash) || null;
        if (targetDeck) {
          await selectDeck(targetDeck.id, loadedDecks);
        }
      } catch (err) {
        console.error('Failed to initialize deck data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    initData();
  }, []);

  // Select active deck
  const selectDeck = async (deckId: string, currentDecksList = decks) => {
    const deck = currentDecksList.find((d) => d.id === deckId);
    if (!deck) return;

    setActiveDeck(deck);
    const loadedScreens = await getScreensForDeck(deck.id);
    setScreens(loadedScreens);

    const firstScreenId = loadedScreens[0]?.id || null;
    setActiveScreenId(firstScreenId);

    if (firstScreenId) {
      const loadedWidgets = await getWidgetsForScreen(firstScreenId);
      setWidgets(loadedWidgets);

      historyRef.current = [{ screens: loadedScreens, widgets: loadedWidgets }];
      historyPointerRef.current = 0;
    } else {
      setWidgets([]);
    }

    const updatedDeck = { ...deck, lastOpenedAt: Date.now() };
    await saveDeck(updatedDeck);
  };

  // Select screen inside active deck
  const selectScreen = async (screenId: string) => {
    if (!activeDeck || screenId === activeScreenId) return;
    setActiveScreenId(screenId);

    const loadedWidgets = await getWidgetsForScreen(screenId);
    setWidgets(loadedWidgets);

    const currentScreen = screens.find((s) => s.id === screenId);
    sendBroadcast({
      type: 'STATE_UPDATE',
      activeDeckId: activeDeck.id,
      activeScreenId: screenId,
      widgets: loadedWidgets,
      screenNotes: currentScreen?.notes,
    });
  };

  // Create new deck
  const createDeck = async (title: string, description?: string, folderId?: string): Promise<ClassroomDeck> => {
    const now = Date.now();
    const newDeckId = `deck_${now}_${Math.random().toString(36).substr(2, 5)}`;
    const newScreenId = `screen_${now}_1`;

    const newScreen: ClassroomScreen = {
      id: newScreenId,
      deckId: newDeckId,
      title: '1. Màn hình đầu tiên',
      order: 0,
      background: { type: 'color', value: '#ffffff' },
      transition: 'fade',
      widgetIds: [],
      createdAt: now,
      updatedAt: now,
    };

    const newDeck: ClassroomDeck = {
      id: newDeckId,
      title,
      description,
      folderId,
      tags: [],
      favorite: false,
      createdAt: now,
      updatedAt: now,
      lastOpenedAt: now,
      settings: { aspectRatio: '16:9', autoSave: true, safeArea: true },
      screenIds: [newScreenId],
    };

    await saveDeck(newDeck);
    await saveScreen(newScreen);

    setDecks((prev) => [newDeck, ...prev]);
    await selectDeck(newDeckId, [newDeck, ...decks]);
    return newDeck;
  };

  // Add Widget
  const addWidget = async (widget: ClassroomWidget) => {
    if (!activeScreenId) return;
    setSaveStatus('saving');

    const newWidgets = [...widgets, widget];
    setWidgets(newWidgets);

    await saveWidget(widget);

    const updatedScreens = screens.map((s) =>
      s.id === activeScreenId ? { ...s, widgetIds: [...s.widgetIds, widget.id], updatedAt: Date.now() } : s
    );
    setScreens(updatedScreens);

    pushHistory(updatedScreens, newWidgets);
    setSaveStatus('saved');

    sendBroadcast({
      type: 'STATE_UPDATE',
      activeDeckId: activeDeck?.id || '',
      activeScreenId,
      widgets: newWidgets,
    });
  };

  // Update Widget
  const updateWidget = async (widgetId: string, partial: Partial<ClassroomWidget>) => {
    setSaveStatus('saving');
    const updatedWidgets = widgets.map((w) => (w.id === widgetId ? { ...w, ...partial, updatedAt: Date.now() } : w));
    setWidgets(updatedWidgets);

    const targetWidget = updatedWidgets.find((w) => w.id === widgetId);
    if (targetWidget) {
      await saveWidget(targetWidget);
    }

    setSaveStatus('saved');

    sendBroadcast({
      type: 'STATE_UPDATE',
      activeDeckId: activeDeck?.id || '',
      activeScreenId: activeScreenId || '',
      widgets: updatedWidgets,
    });
  };

  // Duplicate Widget
  const duplicateWidget = async (widget: ClassroomWidget) => {
    const now = Date.now();
    const duplicated: ClassroomWidget = {
      ...JSON.parse(JSON.stringify(widget)),
      id: `widget_${widget.type}_${now}_${Math.random().toString(36).substr(2, 4)}`,
      x: widget.x + 20,
      y: widget.y + 20,
      createdAt: now,
      updatedAt: now,
    };
    await addWidget(duplicated);
  };

  // Delete Widget
  const deleteWidgets = async (widgetIds: string[]) => {
    setSaveStatus('saving');
    const remaining = widgets.filter((w) => !widgetIds.includes(w.id));
    setWidgets(remaining);

    for (const id of widgetIds) {
      await deleteWidgetFromDB(id);
    }

    const updatedScreens = screens.map((s) =>
      s.id === activeScreenId ? { ...s, widgetIds: s.widgetIds.filter((id) => !widgetIds.includes(id)) } : s
    );
    setScreens(updatedScreens);

    pushHistory(updatedScreens, remaining);
    setSaveStatus('saved');
  };

  // Add Screen to Deck
  const addScreen = async (title?: string) => {
    if (!activeDeck) return;
    const now = Date.now();
    const newScreenId = `screen_${now}_${Math.random().toString(36).substr(2, 4)}`;

    const newScreen: ClassroomScreen = {
      id: newScreenId,
      deckId: activeDeck.id,
      title: title || `${screens.length + 1}. Màn hình mới`,
      order: screens.length,
      background: { type: 'color', value: '#ffffff' },
      transition: 'fade',
      widgetIds: [],
      createdAt: now,
      updatedAt: now,
    };

    await saveScreen(newScreen);
    const updatedScreens = [...screens, newScreen];
    setScreens(updatedScreens);

    const updatedDeck = { ...activeDeck, screenIds: [...activeDeck.screenIds, newScreenId], updatedAt: now };
    setActiveDeck(updatedDeck);
    await saveDeck(updatedDeck);

    await selectScreen(newScreenId);
  };

  // Update Screen
  const updateScreen = async (screenId: string, partial: Partial<ClassroomScreen>) => {
    const updatedScreens = screens.map((s) =>
      s.id === screenId ? { ...s, ...partial, updatedAt: Date.now() } : s
    );
    setScreens(updatedScreens);
    const target = updatedScreens.find((s) => s.id === screenId);
    if (target) await saveScreen(target);
  };

  // Delete Screen
  const deleteScreen = async (screenId: string) => {
    if (!activeDeck || screens.length <= 1) return;
    await deleteScreenFromDB(screenId);

    const remainingScreens = screens.filter((s) => s.id !== screenId).map((s, idx) => ({ ...s, order: idx }));
    setScreens(remainingScreens);

    const updatedDeck = {
      ...activeDeck,
      screenIds: activeDeck.screenIds.filter((id) => id !== screenId),
      updatedAt: Date.now(),
    };
    setActiveDeck(updatedDeck);
    await saveDeck(updatedDeck);

    if (activeScreenId === screenId) {
      await selectScreen(remainingScreens[0].id);
    }
  };

  // Undo / Redo
  const canUndo = historyPointerRef.current > 0;
  const canRedo = historyPointerRef.current < historyRef.current.length - 1;

  const undo = useCallback(async () => {
    if (!canUndo) return;
    historyPointerRef.current -= 1;
    const state = historyRef.current[historyPointerRef.current];
    if (state) {
      setScreens(state.screens);
      setWidgets(state.widgets);
      for (const wg of state.widgets) await saveWidget(wg);
    }
  }, [canUndo]);

  const redo = useCallback(async () => {
    if (!canRedo) return;
    historyPointerRef.current += 1;
    const state = historyRef.current[historyPointerRef.current];
    if (state) {
      setScreens(state.screens);
      setWidgets(state.widgets);
      for (const wg of state.widgets) await saveWidget(wg);
    }
  }, [canRedo]);

  // Trash Deck
  const moveDeckToTrash = async (deckId: string) => {
    const deck = decks.find((d) => d.id === deckId);
    if (!deck) return;

    const trashedDeck: ClassroomDeck = { ...deck, inTrash: true, trashedAt: Date.now() };
    await saveDeck(trashedDeck);
    setDecks((prev) => prev.filter((d) => d.id !== deckId));

    if (activeDeck?.id === deckId) {
      const remaining = decks.filter((d) => d.id !== deckId && !d.inTrash);
      if (remaining.length > 0) {
        await selectDeck(remaining[0].id, remaining);
      } else {
        setActiveDeck(null);
      }
    }
  };

  // Layout Library Actions
  const applyLayout = async (preset: LayoutPreset, mode: 'replace' | 'append' = 'replace') => {
    if (!activeScreenId) return;
    setSaveStatus('saving');

    // If replacing, remove current widgets for active screen
    if (mode === 'replace') {
      for (const wg of widgets) {
        if (!wg.pinned) {
          await deleteWidgetFromDB(wg.id);
        }
      }
    }

    const now = Date.now();
    const existingWidgets = mode === 'append' ? widgets : widgets.filter((w) => w.pinned);

    const generatedWidgets: ClassroomWidget[] = preset.widgets.map((tmpl, idx) => ({
      id: `widget_${tmpl.type}_${now}_${idx}_${Math.random().toString(36).substring(2, 5)}`,
      type: tmpl.type,
      screenId: activeScreenId,
      x: tmpl.x,
      y: tmpl.y,
      width: tmpl.width,
      height: tmpl.height,
      rotation: 0,
      zIndex: existingWidgets.length + idx + 1,
      opacity: 1,
      locked: false,
      hidden: false,
      pinned: false,
      style: tmpl.style || {},
      settings: tmpl.settings || {},
      createdAt: now,
      updatedAt: now,
    }));

    const finalWidgets = [...existingWidgets, ...generatedWidgets];
    setWidgets(finalWidgets);
    await saveWidgetsBatch(generatedWidgets);

    // Update screen background if preset defines one
    let updatedScreens = screens;
    if (preset.background) {
      updatedScreens = screens.map((s) =>
        s.id === activeScreenId ? { ...s, background: preset.background!, updatedAt: now } : s
      );
      setScreens(updatedScreens);
      const activeScreenObj = updatedScreens.find((s) => s.id === activeScreenId);
      if (activeScreenObj) await saveScreen(activeScreenObj);
    }

    pushHistory(updatedScreens, finalWidgets);
    setSaveStatus('saved');

    sendBroadcast({
      type: 'STATE_UPDATE',
      activeDeckId: activeDeck?.id || '',
      activeScreenId,
      widgets: finalWidgets,
    });
  };

  const applyLayoutToNewScreen = async (preset: LayoutPreset) => {
    if (!activeDeck) return;
    const now = Date.now();
    const newScreenId = `screen_${now}_${Math.random().toString(36).substring(2, 4)}`;

    const newScreen: ClassroomScreen = {
      id: newScreenId,
      deckId: activeDeck.id,
      title: `${preset.icon} ${preset.name}`,
      order: screens.length,
      background: preset.background || { type: 'color', value: '#ffffff' },
      transition: 'fade',
      widgetIds: [],
      createdAt: now,
      updatedAt: now,
    };

    await saveScreen(newScreen);
    const updatedScreens = [...screens, newScreen];
    setScreens(updatedScreens);

    const updatedDeck = { ...activeDeck, screenIds: [...activeDeck.screenIds, newScreenId], updatedAt: now };
    setActiveDeck(updatedDeck);
    await saveDeck(updatedDeck);

    setActiveScreenId(newScreenId);

    // Create preset widgets
    const generatedWidgets: ClassroomWidget[] = preset.widgets.map((tmpl, idx) => ({
      id: `widget_${tmpl.type}_${now}_${idx}_${Math.random().toString(36).substring(2, 5)}`,
      type: tmpl.type,
      screenId: newScreenId,
      x: tmpl.x,
      y: tmpl.y,
      width: tmpl.width,
      height: tmpl.height,
      rotation: 0,
      zIndex: idx + 1,
      opacity: 1,
      locked: false,
      hidden: false,
      pinned: false,
      style: tmpl.style || {},
      settings: tmpl.settings || {},
      createdAt: now,
      updatedAt: now,
    }));

    setWidgets(generatedWidgets);
    await saveWidgetsBatch(generatedWidgets);

    pushHistory(updatedScreens, generatedWidgets);
    setSaveStatus('saved');
  };

  const saveCurrentAsLayout = (name: string, description: string = '', icon: string = '📌'): LayoutPreset => {
    const activeScreenObj = screens.find((s) => s.id === activeScreenId);
    const presetWidgets = widgets.map((w) => ({
      type: w.type,
      x: w.x,
      y: w.y,
      width: w.width,
      height: w.height,
      style: w.style,
      settings: w.settings,
    }));

    const newPreset: LayoutPreset = {
      id: `custom_layout_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      name,
      description,
      category: 'custom',
      icon,
      background: activeScreenObj?.background,
      widgets: presetWidgets,
      createdAt: Date.now(),
    };

    const updated = saveCustomLayoutToStorage(newPreset);
    setCustomLayouts(updated);
    return newPreset;
  };

  const deleteCustomLayout = (id: string) => {
    const updated = deleteCustomLayoutFromStorage(id);
    setCustomLayouts(updated);
  };

  return {
    decks,
    folders,
    activeDeck,
    screens,
    activeScreenId,
    activeScreen: screens.find((s) => s.id === activeScreenId) || null,
    widgets,
    activeScreenWidgets: widgets,
    builtinLayouts: BUILTIN_LAYOUTS,
    customLayouts,
    allLayouts: [...BUILTIN_LAYOUTS, ...customLayouts],
    isLoading,
    saveStatus,
    canUndo,
    canRedo,
    undo,
    redo,
    selectDeck,
    selectScreen,
    createDeck,
    addScreen,
    updateScreen,
    deleteScreen,
    addWidget,
    updateWidget,
    duplicateWidget,
    deleteWidgets,
    applyLayout,
    applyLayoutToNewScreen,
    saveCurrentAsLayout,
    deleteCustomLayout,
    moveDeckToTrash,
    moveToTrash: moveDeckToTrash,
    pushHistory,
  };
}
