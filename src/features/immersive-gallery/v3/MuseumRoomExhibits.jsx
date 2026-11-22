import React, { useId } from 'react';
import { Check, Image as ImageIcon } from 'lucide-react';

export default function MuseumRoomExhibits({ exhibits, visited, disabled, onInspect, language }) {
  const listId = useId();
  const tr = (vi, en) => language === 'en' ? en : vi;
  return (
    <ul className="bml-swiss-3d-exhibits" aria-label={tr('Tác phẩm', 'Exhibits')}>
      {exhibits.map((exhibit, index) => {
        const title = String(exhibit.title ?? '').slice(0, 120);
        return (
          <li key={exhibit.id??index}>
            <button type="button" disabled={disabled} onClick={() => onInspect(exhibit.id)}
              aria-label={tr('Xem tác phẩm ', 'Inspect ') + title}
              aria-describedby={visited.has(exhibit.id) ? `${listId}-viewed-${index}` : undefined}>
              <span className="bml-room-exhibit-index">{String(index + 1).padStart(2, '0')}</span>
              <span className="bml-room-exhibit-thumb" aria-hidden="true">
                <ImageIcon size={15} />
                {exhibit.image_url && (
                  <img key={exhibit.image_url} src={exhibit.image_url} alt=""
                    loading="lazy" decoding="async" referrerPolicy="no-referrer"
                    onError={event => { event.currentTarget.hidden = true; }} />
                )}
              </span>
              <span className="bml-room-exhibit-title">{title}</span>
              {visited.has(exhibit.id) && (
                <>
                  <Check className="bml-room-exhibit-visited" size={15} aria-hidden="true" />
                  <span id={`${listId}-viewed-${index}`} hidden>{tr('Đã xem', 'Viewed')}</span>
                </>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
