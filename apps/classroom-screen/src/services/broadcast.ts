// BroadcastChannel service for sync between Teacher Control & Projector Window
const CHANNEL_NAME = 'brian_classroom_screen_channel';

export type BroadcastMessage =
  | { type: 'STATE_UPDATE'; activeDeckId: string; activeScreenId: string; widgets: any[]; screenNotes?: string }
  | { type: 'SCREEN_CHANGE'; payload: { screen: any; widgets: any[] } }
  | { type: 'WIDGET_UPDATE'; payload: { id: string; partial: any } }
  | { type: 'TIMER_SYNC'; widgetId: string; remainingSeconds: number; isRunning: boolean }
  | { type: 'SCORE_SYNC'; widgetId: string; scores: Record<string, number> }
  | { type: 'SPOTLIGHT_CHANGE'; widgetId: string | null }
  | { type: 'PROJECTOR_READY' };

let channel: BroadcastChannel | null = null;

export function getBroadcastChannel(): BroadcastChannel {
  if (!channel) {
    channel = new BroadcastChannel(CHANNEL_NAME);
  }
  return channel;
}

export function sendBroadcast(message: BroadcastMessage): void {
  try {
    const ch = getBroadcastChannel();
    ch.postMessage(message);
  } catch (err) {
    console.warn('Broadcast send error:', err);
  }
}

export function listenBroadcast(callback: (msg: BroadcastMessage) => void): () => void {
  const ch = getBroadcastChannel();
  const handler = (event: MessageEvent<BroadcastMessage>) => {
    callback(event.data);
  };
  ch.addEventListener('message', handler);
  return () => {
    ch.removeEventListener('message', handler);
  };
}

export class BroadcastSyncService {
  private unsubscribe: () => void;

  constructor(onMessage: (msg: BroadcastMessage) => void) {
    this.unsubscribe = listenBroadcast(onMessage);
  }

  public close() {
    this.unsubscribe();
  }
}
