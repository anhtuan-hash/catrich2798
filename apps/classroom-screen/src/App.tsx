import React, { useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import { ThemeMode } from './types';
import { useDeckStore } from './stores/useDeckStore';
import { useSettingsStore } from './stores/useSettingsStore';
import { useWorkspaceStore } from './stores/useWorkspaceStore';
import { useStudentListStore } from './stores/useStudentListStore';

import { TopBar } from './components/layout/TopBar';
import { LeftScreenDrawer } from './components/layout/LeftScreenDrawer';
import { BottomWidgetDock } from './components/layout/BottomWidgetDock';
import { RightInspector } from './components/inspector/RightInspector';
import { CenterCanvas } from './components/canvas/CenterCanvas';
import { DashboardView } from './components/dashboard/DashboardView';
import { ProjectorView } from './components/projector/ProjectorView';

import { SettingsModal } from './components/dialogs/SettingsModal';
import { ExportImportModal } from './components/dialogs/ExportImportModal';
import { StudentListModal } from './components/dialogs/StudentListModal';

export function App() {
  // Read URL query params
  const urlParams = new URLSearchParams(window.location.search);
  const isProjectorMode = urlParams.get('mode') === 'projector';
  const projectorDeckId = urlParams.get('deckId') || '';

  if (isProjectorMode) {
    return <ProjectorView deckId={projectorDeckId} />;
  }

  // Stores
  const {
    decks,
    activeDeck,
    activeScreen,
    activeScreenWidgets,
    saveStatus,
    canUndo,
    canRedo,
    selectDeck,
    createDeck,
    addScreen,
    deleteScreen,
    selectScreen,
    updateScreen,
    addWidget,
    updateWidget,
    deleteWidgets,
    duplicateWidget,
    moveToTrash,
    undo,
    redo,
  } = useDeckStore();

  const { settings, updateSettings } = useSettingsStore();

  const {
    viewMode,
    setViewMode,
    isPresenting,
    setIsPresenting,
    selectedWidgetIds,
    selectWidget,
    clearSelection,
    zoomLevel,
    showGrid,
    showSafeArea,
    spotlightWidgetId,
    activeModal,
    setActiveModal,
  } = useWorkspaceStore();

  const {
    studentLists,
    activeList,
    saveList,
    deleteList,
    toggleStudentAbsent,
  } = useStudentListStore();

  // Selected Widget Objects
  const selectedWidgets = activeScreenWidgets.filter((w) => selectedWidgetIds.includes(w.id));

  // Open Projector View Window
  const handleOpenProjectorWindow = () => {
    if (!activeDeck) return;
    const url = `${window.location.origin}${window.location.pathname}?mode=projector&deckId=${activeDeck.id}`;
    window.open(url, '_blank', 'width=1280,height=720');
  };

  // Toggle Theme
  const handleToggleTheme = () => {
    const themeOrder: ThemeMode[] = ['light', 'dark', 'cosmic'];
    const currentIndex = themeOrder.indexOf(settings.theme);
    const nextTheme = themeOrder[(currentIndex + 1) % themeOrder.length] || 'light';
    updateSettings({ theme: nextTheme });
  };

  // Apply theme classes to html element
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'cosmic', 'high-contrast');
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else if (settings.theme === 'cosmic') {
      root.classList.add('dark', 'cosmic');
    } else if (settings.theme === 'high-contrast') {
      root.classList.add('high-contrast');
    }
  }, [settings.theme]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if typing in input/textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        redo();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedWidgetIds.length > 0) {
          deleteWidgets(selectedWidgetIds);
          clearSelection();
        }
      } else if (e.key === 'p' || e.key === 'P') {
        setIsPresenting(!isPresenting);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedWidgetIds, isPresenting, undo, redo, deleteWidgets, clearSelection, setIsPresenting]);

  if (viewMode === 'dashboard') {
    return (
      <DashboardView
        decks={decks}
        folders={[]}
        studentLists={studentLists}
        settings={settings}
        onSelectDeck={(id) => {
          selectDeck(id);
          setViewMode('workspace');
        }}
        onCreateDeck={async (title) => {
          const deck = await createDeck(title);
          selectDeck(deck.id);
          setViewMode('workspace');
        }}
        onMoveToTrash={moveToTrash}
        onOpenSettings={() => setActiveModal('settings')}
        onOpenExportImport={() => setActiveModal('exportImport')}
        onOpenStudentLists={() => setActiveModal('studentList')}
      />
    );
  }

  return (
    <div className="w-screen h-screen bg-slate-100 dark:bg-slate-950 flex flex-col overflow-hidden font-sans select-none">
      {/* Top Bar */}
      <TopBar
        deck={activeDeck}
        activeScreen={activeScreen}
        saveStatus={saveStatus}
        canUndo={canUndo}
        canRedo={canRedo}
        language={settings.language}
        theme={settings.theme}
        isPresenting={isPresenting}
        onUndo={undo}
        onRedo={redo}
        onTogglePresent={() => setIsPresenting(!isPresenting)}
        onOpenProjectorWindow={handleOpenProjectorWindow}
        onToggleLanguage={() => updateSettings({ language: settings.language === 'vi' ? 'en' : 'vi' })}
        onToggleTheme={handleToggleTheme}
        onOpenSettings={() => setActiveModal('settings')}
        onBackToDashboard={() => setViewMode('dashboard')}
      />

      {/* Main Workspace Stage */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Screen Drawer */}
        <AnimatePresence>
          {!isPresenting && (
            <LeftScreenDrawer
              key="left-screen-drawer"
              screens={activeDeck?.screens || []}
              activeScreenId={activeScreen?.id || null}
              onSelectScreen={selectScreen}
              onAddScreen={() => addScreen('Màn hình mới')}
              onDeleteScreen={deleteScreen}
            />
          )}
        </AnimatePresence>

        {/* Center Presentation Stage */}
        <div className="flex-1 h-full relative">
          <CenterCanvas
            screen={activeScreen}
            widgets={activeScreenWidgets}
            selectedWidgetIds={selectedWidgetIds}
            spotlightWidgetId={spotlightWidgetId}
            zoomLevel={zoomLevel}
            showGrid={showGrid}
            showSafeArea={showSafeArea}
            readOnly={isPresenting}
            onSelectWidget={selectWidget}
            onClearSelection={clearSelection}
            onUpdateWidget={updateWidget}
            onDeleteWidget={(id) => deleteWidgets([id])}
            onDuplicateWidget={duplicateWidget}
          />
        </div>

        {/* Right Properties Inspector */}
        <AnimatePresence>
          {!isPresenting && (
            <RightInspector
              key="right-inspector"
              selectedWidgets={selectedWidgets}
              screen={activeScreen}
              onUpdateWidget={updateWidget}
              onUpdateScreen={(partial) => activeScreen && updateScreen(activeScreen.id, partial)}
              onDeleteWidgets={deleteWidgets}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Widget Dock */}
      <AnimatePresence>
        {!isPresenting && (
          <BottomWidgetDock
            key="bottom-widget-dock"
            onAddWidget={addWidget}
            activeScreenId={activeScreen?.id || null}
          />
        )}
      </AnimatePresence>

      {/* Dialog Modals */}
      <SettingsModal
        settings={settings}
        isOpen={activeModal === 'settings'}
        onClose={() => setActiveModal(null)}
        onUpdate={updateSettings}
      />

      <ExportImportModal
        isOpen={activeModal === 'exportImport'}
        onClose={() => setActiveModal(null)}
        onImportComplete={() => window.location.reload()}
      />

      <StudentListModal
        isOpen={activeModal === 'studentList'}
        studentLists={studentLists}
        activeList={activeList}
        onClose={() => setActiveModal(null)}
        onSaveList={saveList}
        onDeleteList={deleteList}
        onToggleAbsent={toggleStudentAbsent}
      />
    </div>
  );
}
