import React, { useEffect, useState } from 'react';
import { ClassroomScreen, ClassroomWidget } from '../../types';
import { BroadcastSyncService } from '../../services/broadcast';
import { CanvasWidgetWrapper } from '../canvas/CanvasWidgetWrapper';

interface ProjectorProps {
  deckId: string;
}

export const ProjectorView: React.FC<ProjectorProps> = ({ deckId }) => {
  const [activeScreen, setActiveScreen] = useState<ClassroomScreen | null>(null);
  const [widgets, setWidgets] = useState<ClassroomWidget[]>([]);

  useEffect(() => {
    const sync = new BroadcastSyncService((event) => {
      if (event.type === 'SCREEN_CHANGE') {
        setActiveScreen(event.payload.screen);
        setWidgets(event.payload.widgets || []);
      } else if (event.type === 'WIDGET_UPDATE') {
        setWidgets((prev) =>
          prev.map((w) => (w.id === event.payload.id ? { ...w, ...event.payload.partial } : w))
        );
      }
    });

    return () => sync.close();
  }, []);

  const bgStyle = activeScreen?.background || { type: 'color', value: '#ffffff' };

  return (
    <div className="w-screen h-screen bg-slate-950 flex items-center justify-center overflow-hidden select-none">
      <div
        style={{
          width: '1280px',
          height: '720px',
          background: bgStyle.type === 'gradient' ? bgStyle.value : bgStyle.value,
        }}
        className="relative shadow-2xl rounded-2xl overflow-hidden border border-slate-800"
      >
        {widgets.map((widget) => (
          <CanvasWidgetWrapper
            key={widget.id}
            widget={widget}
            isSelected={false}
            isSpotlighted={false}
            readOnly={true}
            onSelect={() => {}}
            onUpdate={() => {}}
            onDelete={() => {}}
            onDuplicate={() => {}}
            onBringForward={() => {}}
            onSendBackward={() => {}}
          />
        ))}
      </div>
    </div>
  );
};
