import React from 'react';
import { ClassroomWidget, StudentList } from '../types';
import {
  ClockWidget,
  TimerWidget,
  VisualTimerWidget,
  StopwatchWidget,
  CountdownWidget,
  CalendarWidget,
  TimetableWidget,
} from './components/TimeWidgets';
import {
  TrafficLightWidget,
  WorkSymbolsWidget,
  SoundLevelWidget,
  AttentionSignalWidget,
  ScoreboardWidget,
  RandomizerWidget,
  GroupMakerWidget,
} from './components/ClassroomWidgets';
import {
  PollWidget,
  DiceWidget,
  CoinTossWidget,
  SpinnerWidget,
  TextWidget,
  StickyNoteWidget,
  ChecklistWidget,
  QRCodeWidget,
  DrawWidget,
  StickerWidget,
} from './components/InteractiveWidgets';
import {
  ImageWidget,
  PdfWidget,
  VideoWidget,
  AudioWidget,
  WebcamWidget,
  EmbedWidget,
  BrowserCardWidget,
} from './components/MediaWidgets';
import {
  SeatingPickerWidget,
  NumberGeneratorWidget,
  HyperlinkWidget,
} from './components/AdvancedWidgets';
import {
  WordPuzzleWidget,
  FlashcardWidget,
  TrueFalseRaceWidget,
  TicTacToeWidget,
} from './components/GamesWidgets';

interface WidgetFactoryProps {
  widget: ClassroomWidget;
  onUpdate: (partial: Partial<ClassroomWidget>) => void;
  studentLists?: StudentList[];
}

export const WidgetFactory: React.FC<WidgetFactoryProps> = ({ widget, onUpdate, studentLists }) => {
  switch (widget.type) {
    // Time Category
    case 'clock':
      return <ClockWidget widget={widget} onUpdate={onUpdate} />;
    case 'timer':
      return <TimerWidget widget={widget} onUpdate={onUpdate} />;
    case 'visual-timer':
      return <VisualTimerWidget widget={widget} onUpdate={onUpdate} />;
    case 'stopwatch':
      return <StopwatchWidget widget={widget} onUpdate={onUpdate} />;
    case 'countdown':
      return <CountdownWidget widget={widget} onUpdate={onUpdate} />;
    case 'calendar':
      return <CalendarWidget widget={widget} onUpdate={onUpdate} />;
    case 'timetable':
      return <TimetableWidget widget={widget} onUpdate={onUpdate} />;

    // Classroom Management Category
    case 'traffic-light':
      return <TrafficLightWidget widget={widget} onUpdate={onUpdate} />;
    case 'work-symbols':
      return <WorkSymbolsWidget widget={widget} onUpdate={onUpdate} />;
    case 'sound-level':
      return <SoundLevelWidget widget={widget} onUpdate={onUpdate} />;
    case 'attention-signal':
      return <AttentionSignalWidget widget={widget} onUpdate={onUpdate} />;
    case 'scoreboard':
      return <ScoreboardWidget widget={widget} onUpdate={onUpdate} />;

    // Students Category
    case 'randomizer':
      return <RandomizerWidget widget={widget} onUpdate={onUpdate} studentLists={studentLists} />;
    case 'group-maker':
      return <GroupMakerWidget widget={widget} onUpdate={onUpdate} studentLists={studentLists} />;
    case 'seating-picker':
      return <SeatingPickerWidget widget={widget} onUpdate={onUpdate} studentLists={studentLists} />;

    // Interactive & Games Category
    case 'poll':
      return <PollWidget widget={widget} onUpdate={onUpdate} />;
    case 'dice':
      return <DiceWidget widget={widget} onUpdate={onUpdate} />;
    case 'coin-toss':
      return <CoinTossWidget widget={widget} onUpdate={onUpdate} />;
    case 'spinner':
      return <SpinnerWidget widget={widget} onUpdate={onUpdate} />;
    case 'number-generator':
      return <NumberGeneratorWidget widget={widget} onUpdate={onUpdate} />;
    case 'word-puzzle':
      return <WordPuzzleWidget widget={widget} onUpdate={onUpdate} />;
    case 'flashcard':
      return <FlashcardWidget widget={widget} onUpdate={onUpdate} />;
    case 'true-false-race':
      return <TrueFalseRaceWidget widget={widget} onUpdate={onUpdate} />;
    case 'tic-tac-toe':
      return <TicTacToeWidget widget={widget} onUpdate={onUpdate} />;

    // Content Category
    case 'text':
      return <TextWidget widget={widget} onUpdate={onUpdate} />;
    case 'sticky-note':
      return <StickyNoteWidget widget={widget} onUpdate={onUpdate} />;
    case 'checklist':
      return <ChecklistWidget widget={widget} onUpdate={onUpdate} />;
    case 'qr-code':
      return <QRCodeWidget widget={widget} onUpdate={onUpdate} />;
    case 'hyperlink':
      return <HyperlinkWidget widget={widget} onUpdate={onUpdate} />;

    // Media Category
    case 'image':
      return <ImageWidget widget={widget} onUpdate={onUpdate} />;
    case 'pdf':
      return <PdfWidget widget={widget} onUpdate={onUpdate} />;
    case 'video':
      return <VideoWidget widget={widget} onUpdate={onUpdate} />;
    case 'audio':
      return <AudioWidget widget={widget} onUpdate={onUpdate} />;
    case 'webcam':
      return <WebcamWidget widget={widget} onUpdate={onUpdate} />;
    case 'embed':
      return <EmbedWidget widget={widget} onUpdate={onUpdate} />;
    case 'browser-card':
      return <BrowserCardWidget widget={widget} onUpdate={onUpdate} />;

    // Decoration Category
    case 'draw':
      return <DrawWidget widget={widget} onUpdate={onUpdate} />;
    case 'sticker':
      return <StickerWidget widget={widget} onUpdate={onUpdate} />;

    default:
      return (
        <div className="w-full h-full flex flex-col items-center justify-center p-3 text-slate-500 text-xs">
          <span className="font-bold capitalize">{widget.type}</span>
        </div>
      );
  }
};
