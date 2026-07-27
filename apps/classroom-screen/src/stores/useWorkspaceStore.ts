import { useState, useCallback } from 'react';

export type ActiveModal = 'settings' | 'studentList' | 'exportImport' | 'trash' | 'templates' | null;

export function useWorkspaceStore() {
  const [viewMode, setViewMode] = useState<'dashboard' | 'workspace'>('workspace');
  const [isPresenting, setIsPresenting] = useState<boolean>(false);
  const [selectedWidgetIds, setSelectedWidgetIds] = useState<string[]>([]);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0); // 1.0 = 100%
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);
  const [showSafeArea, setShowSafeArea] = useState<boolean>(true);
  const [spotlightWidgetId, setSpotlightWidgetId] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  const selectWidget = useCallback((id: string, multiSelect = false) => {
    if (multiSelect) {
      setSelectedWidgetIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
    } else {
      setSelectedWidgetIds([id]);
    }
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedWidgetIds([]);
  }, []);

  const zoomIn = useCallback(() => setZoomLevel((z) => Math.min(2.0, z + 0.1)), []);
  const zoomOut = useCallback(() => setZoomLevel((z) => Math.max(0.4, z - 0.1)), []);
  const resetZoom = useCallback(() => {
    setZoomLevel(1.0);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  return {
    viewMode,
    setViewMode,
    isPresenting,
    setIsPresenting,
    selectedWidgetIds,
    setSelectedWidgetIds,
    selectWidget,
    clearSelection,
    zoomLevel,
    setZoomLevel,
    zoomIn,
    zoomOut,
    resetZoom,
    panOffset,
    setPanOffset,
    showGrid,
    setShowGrid,
    snapToGrid,
    setSnapToGrid,
    showSafeArea,
    setShowSafeArea,
    spotlightWidgetId,
    setSpotlightWidgetId,
    activeModal,
    setActiveModal,
  };
}
