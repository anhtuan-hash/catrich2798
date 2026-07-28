"use client";

import {
  useEffect,
  useMemo,
  useRef,
  type PointerEvent as ReactPointerEvent,
} from "react";

export type WidgetType =
  | "clock"
  | "visualTimer"
  | "stopwatch"
  | "trafficLight"
  | "workSymbol"
  | "randomizer"
  | "groupMaker"
  | "scoreboard"
  | "poll"
  | "dice"
  | "soundLevel"
  | "timetable"
  | "countdown"
  | "qrLink";

export type WidgetData = Record<string, unknown>;

export type WidgetInstance = {
  id: string;
  type: WidgetType;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  zIndex: number;
  locked?: boolean;
  pinned?: boolean;
  data: WidgetData;
};

export type WidgetCommand =
  | "clock-toggle"
  | "timer-toggle"
  | "timer-reset"
  | "timer-preset"
  | "stopwatch-toggle"
  | "stopwatch-reset"
  | "stopwatch-lap"
  | "cycle-traffic"
  | "set-traffic"
  | "cycle-work"
  | "set-work"
  | "randomize"
  | "make-groups"
  | "group-count"
  | "score"
  | "poll-vote"
  | "poll-clear"
  | "poll-reveal"
  | "roll-dice"
  | "sound-toggle"
  | "sound-nudge"
  | "timetable-next"
  | "copy-link";

type WidgetCatalogItem = {
  type: WidgetType;
  label: string;
  shortLabel: string;
  emoji: string;
  description: string;
};

type WidgetImportResult = {
  widgets: WidgetInstance[];
  warnings: string[];
};

type DragState = {
  id: string;
  mode: "move" | "resize";
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  canvasWidth: number;
  canvasHeight: number;
};

type WidgetLayerProps = {
  widgets: WidgetInstance[];
  selectedWidgetId: string;
  activeTool: string;
  now: Date;
  classNames: string[];
  onSelect: (id: string) => void;
  onLayoutChange: (id: string, patch: Partial<WidgetInstance>) => void;
  onDataChange: (
    id: string,
    updater: (data: WidgetData) => WidgetData,
  ) => void;
  onCommand: (
    widget: WidgetInstance,
    command: WidgetCommand,
    payload?: unknown,
  ) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onToggleLock: (id: string) => void;
  onTogglePin: (id: string) => void;
};

const widgetUid = () =>
  `widget-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const asNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const asString = (value: unknown, fallback = "") =>
  typeof value === "string" && value.trim() ? value : fallback;

const asBool = (value: unknown, fallback = false) =>
  typeof value === "boolean" ? value : fallback;

const asArray = <T,>(value: unknown, fallback: T[]) =>
  Array.isArray(value) ? (value as T[]) : fallback;

const deepClone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export const WIDGET_CATALOG: WidgetCatalogItem[] = [
  {
    type: "clock",
    label: "Đồng hồ",
    shortLabel: "Clock",
    emoji: "🕘",
    description: "Mặt đồng hồ analog + flip clock số.",
  },
  {
    type: "visualTimer",
    label: "Visual Timer",
    shortLabel: "Timer",
    emoji: "⏳",
    description: "Vòng đếm ngược có nhịp cảnh báo.",
  },
  {
    type: "stopwatch",
    label: "Stopwatch",
    shortLabel: "Stop",
    emoji: "⏱️",
    description: "Đồng hồ bấm giờ, lap và reset.",
  },
  {
    type: "trafficLight",
    label: "Traffic light",
    shortLabel: "Traffic",
    emoji: "🚦",
    description: "Đèn lớp học đổi trạng thái bằng chạm.",
  },
  {
    type: "workSymbol",
    label: "Work symbols",
    shortLabel: "Work",
    emoji: "🤝",
    description: "Biểu tượng cách làm việc: cá nhân, cặp, nhóm.",
  },
  {
    type: "randomizer",
    label: "Randomizer",
    shortLabel: "Pick",
    emoji: "🎡",
    description: "Vòng quay gọi tên có kết quả và lịch sử.",
  },
  {
    type: "groupMaker",
    label: "Group maker",
    shortLabel: "Group",
    emoji: "🧩",
    description: "Chia nhóm bằng thẻ học sinh bay vào ô nhóm.",
  },
  {
    type: "scoreboard",
    label: "Scoreboard",
    shortLabel: "Score",
    emoji: "🏟️",
    description: "Bảng điểm sân vận động cho hoạt động nhóm.",
  },
  {
    type: "poll",
    label: "Poll",
    shortLabel: "Poll",
    emoji: "📊",
    description: "Bình chọn tại lớp bằng cột kết quả động.",
  },
  {
    type: "dice",
    label: "Dice",
    shortLabel: "Dice",
    emoji: "🎲",
    description: "Xúc xắc có hiệu ứng lắc và mặt chấm.",
  },
  {
    type: "soundLevel",
    label: "Sound level",
    shortLabel: "Noise",
    emoji: "🎚️",
    description: "Đồng hồ âm lượng, ngưỡng và cảnh báo.",
  },
  {
    type: "timetable",
    label: "Timetable",
    shortLabel: "Time",
    emoji: "📅",
    description: "Dòng thời gian tiết học có mốc hiện tại.",
  },
  {
    type: "countdown",
    label: "Event countdown",
    shortLabel: "Event",
    emoji: "🎉",
    description: "Đếm ngày/giờ đến sự kiện lớp học.",
  },
  {
    type: "qrLink",
    label: "QR / Link",
    shortLabel: "QR",
    emoji: "🔗",
    description: "Thẻ link lớn kèm ma trận QR đồ hoạ.",
  },
];

const DEFAULT_LAYOUT: Record<
  WidgetType,
  Pick<WidgetInstance, "x" | "y" | "width" | "height">
> = {
  clock: { x: 75, y: 5, width: 20, height: 19 },
  visualTimer: { x: 70, y: 70, width: 24, height: 24 },
  stopwatch: { x: 71, y: 47, width: 23, height: 20 },
  trafficLight: { x: 4, y: 63, width: 14, height: 30 },
  workSymbol: { x: 4, y: 5, width: 23, height: 20 },
  randomizer: { x: 65, y: 27, width: 30, height: 37 },
  groupMaker: { x: 4, y: 50, width: 34, height: 38 },
  scoreboard: { x: 56, y: 5, width: 38, height: 22 },
  poll: { x: 52, y: 42, width: 41, height: 36 },
  dice: { x: 40, y: 70, width: 20, height: 22 },
  soundLevel: { x: 5, y: 72, width: 28, height: 21 },
  timetable: { x: 4, y: 30, width: 32, height: 39 },
  countdown: { x: 39, y: 5, width: 24, height: 20 },
  qrLink: { x: 78, y: 55, width: 17, height: 34 },
};

const DEFAULT_DATA: Record<WidgetType, WidgetData> = {
  clock: { mode: "analog" },
  visualTimer: { duration: 300, remaining: 300, running: false },
  stopwatch: { elapsed: 0, running: false, laps: [] },
  trafficLight: { state: "green" },
  workSymbol: { mode: "solo" },
  randomizer: { result: "", history: [], spinning: false },
  groupMaker: { groupCount: 3, groups: [] },
  scoreboard: {
    teams: [
      { name: "Blue", score: 0, color: "#69aee8" },
      { name: "Mint", score: 0, color: "#63c7cf" },
    ],
  },
  poll: {
    prompt: "Mức độ hiểu bài?",
    reveal: true,
    options: [
      { label: "Rất rõ", count: 0, color: "#69aee8" },
      { label: "Cần ví dụ", count: 0, color: "#9ccfff" },
      { label: "Chưa chắc", count: 0, color: "#899cf5" },
    ],
  },
  dice: { values: [1, 4], rolling: false },
  soundLevel: { level: 28, threshold: 65, listening: false, violations: 0 },
  timetable: {
    active: 0,
    items: [
      { time: "07:30", label: "Warm-up", symbol: "Solo" },
      { time: "07:40", label: "Practice", symbol: "Pairs" },
      { time: "07:55", label: "Share", symbol: "Groups" },
    ],
  },
  countdown: { event: "Mini test", target: "2026-09-05T07:30" },
  qrLink: { label: "Class task", url: "https://example.com/class-task" },
};

export function createWidget(
  type: WidgetType,
  overrides: Partial<WidgetInstance> = {},
): WidgetInstance {
  const catalog = WIDGET_CATALOG.find((item) => item.type === type);
  const layout = DEFAULT_LAYOUT[type];
  return {
    id: overrides.id || widgetUid(),
    type,
    title: overrides.title || catalog?.label || "Widget",
    x: overrides.x ?? layout.x,
    y: overrides.y ?? layout.y,
    width: overrides.width ?? layout.width,
    height: overrides.height ?? layout.height,
    rotation: overrides.rotation ?? 0,
    zIndex: overrides.zIndex ?? 20,
    locked: overrides.locked ?? false,
    pinned: overrides.pinned ?? false,
    data: { ...deepClone(DEFAULT_DATA[type]), ...(overrides.data || {}) },
  };
}

function parseDelimited(raw: string) {
  const lines = raw
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return null;

  let explicitSeparator = "";
  if (/^sep=./i.test(lines[0])) {
    explicitSeparator = lines.shift()?.slice(4, 5) || "";
  }

  const separators = ["\t", "|", ";", ","];
  const countOutsideQuotes = (line: string, token: string) => {
    let quoted = false;
    let count = 0;
    for (let index = 0; index < line.length; index += 1) {
      if (line[index] === '"') {
        if (quoted && line[index + 1] === '"') index += 1;
        else quoted = !quoted;
      } else if (!quoted && line[index] === token) {
        count += 1;
      }
    }
    return count;
  };

  const separator =
    explicitSeparator ||
    separators
      .map((token) => ({ token, count: countOutsideQuotes(lines[0], token) }))
      .sort((a, b) => b.count - a.count)[0]?.token ||
    ",";

  const parseRow = (line: string) => {
    const cells: string[] = [];
    let cell = "";
    let quoted = false;
    for (let index = 0; index < line.length; index += 1) {
      const character = line[index];
      if (character === '"') {
        if (quoted && line[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = !quoted;
        }
      } else if (character === separator && !quoted) {
        cells.push(cell.trim());
        cell = "";
      } else {
        cell += character;
      }
    }
    cells.push(cell.trim());
    return cells;
  };

  const rows = lines.map(parseRow);
  const headers = rows[0].map((header) =>
    header.replace(/^\uFEFF/, "").toLowerCase().replace(/[\s_-]/g, ""),
  );
  return { headers, rows: rows.slice(1) };
}

const findColumn = (headers: string[], patterns: RegExp[]) =>
  headers.findIndex((header) => patterns.some((pattern) => pattern.test(header)));

function normalizeWidgetType(value: string): WidgetType | null {
  const key = value.toLowerCase().replace(/[\s_-]/g, "");
  if (/^(poll|vote|binhchon|bìnhchọn)$/.test(key)) return "poll";
  if (/^(timetable|schedule|agenda|lichtiet|lịchtiết)$/.test(key)) {
    return "timetable";
  }
  if (/^(scoreboard|score|diem|điểm)$/.test(key)) return "scoreboard";
  if (/^(countdown|event|eventcountdown|sukien|sựkiện)$/.test(key)) {
    return "countdown";
  }
  if (/^(qr|qrlink|link|hyperlink)$/.test(key)) return "qrLink";
  if (/^(group|groups|groupmaker|chianhom|chianhóm)$/.test(key)) {
    return "groupMaker";
  }
  if (/^(random|randomizer|picker|goiten|gọitên)$/.test(key)) {
    return "randomizer";
  }
  return null;
}

export function parseWidgetTable(raw: string): WidgetImportResult {
  const table = parseDelimited(raw);
  if (!table) return { widgets: [], warnings: [] };
  const typeIndex = findColumn(table.headers, [/^(type|widget|kind|loại|loai)$/]);
  if (typeIndex < 0) return { widgets: [], warnings: [] };

  const titleIndex = findColumn(table.headers, [/^(title|prompt|event|tên|ten)$/]);
  const labelIndex = findColumn(table.headers, [/^(label|option|team|time|name|nhãn|nhan)$/]);
  const valueIndex = findColumn(table.headers, [/^(value|count|score|url|activity|target|giátrị|giatri)$/]);
  const extraIndex = findColumn(table.headers, [/^(extra|color|symbol|note|ghichu|ghichú)$/]);

  const groups = new Map<
    string,
    {
      type: WidgetType;
      title: string;
      rows: string[][];
    }
  >();
  const warnings: string[] = [];

  table.rows.forEach((row, index) => {
    const type = normalizeWidgetType(row[typeIndex] || "");
    if (!type) {
      warnings.push(`Dòng ${index + 2}: chưa nhận diện được loại widget.`);
      return;
    }
    const title =
      titleIndex >= 0 && row[titleIndex] ? row[titleIndex] : WIDGET_CATALOG.find((item) => item.type === type)?.label || type;
    const key = `${type}::${title}`;
    const group = groups.get(key) || { type, title, rows: [] };
    group.rows.push(row);
    groups.set(key, group);
  });

  const widgets: WidgetInstance[] = [];
  Array.from(groups.values()).forEach((group, groupIndex) => {
    const base = createWidget(group.type, {
      title: group.title,
      x: 5 + ((groupIndex * 7) % 48),
      y: 7 + ((groupIndex * 9) % 46),
      zIndex: 35 + groupIndex,
    });
    const rows = group.rows;
    const get = (row: string[], index: number) => (index >= 0 ? row[index] || "" : "");

    if (group.type === "poll") {
      base.data = {
        ...base.data,
        prompt: group.title,
        options: rows.map((row, index) => ({
          label: get(row, labelIndex) || `Option ${index + 1}`,
          count: asNumber(get(row, valueIndex), 0),
          color: get(row, extraIndex) || ["#69aee8", "#9ccfff", "#899cf5", "#63c7cf"][index % 4],
        })),
      };
    }

    if (group.type === "scoreboard") {
      base.data = {
        ...base.data,
        teams: rows.map((row, index) => ({
          name: get(row, labelIndex) || `Team ${index + 1}`,
          score: asNumber(get(row, valueIndex), 0),
          color: get(row, extraIndex) || ["#69aee8", "#63c7cf", "#899cf5", "#9ccfff"][index % 4],
        })),
      };
    }

    if (group.type === "timetable") {
      base.data = {
        ...base.data,
        items: rows.map((row) => ({
          time: get(row, labelIndex) || "00:00",
          label: get(row, valueIndex) || "Activity",
          symbol: get(row, extraIndex) || "Class",
        })),
      };
    }

    if (group.type === "countdown") {
      const first = rows[0];
      base.data = {
        ...base.data,
        event: get(first, labelIndex) || group.title,
        target: get(first, valueIndex) || get(first, extraIndex) || "2026-09-05T07:30",
      };
    }

    if (group.type === "qrLink") {
      const first = rows[0];
      base.data = {
        ...base.data,
        label: get(first, labelIndex) || group.title,
        url: get(first, valueIndex) || "https://example.com",
      };
    }

    if (group.type === "groupMaker") {
      const grouped = new Map<string, string[]>();
      rows.forEach((row) => {
        const groupName = get(row, labelIndex) || "Group";
        const student = get(row, valueIndex);
        if (!student) return;
        grouped.set(groupName, [...(grouped.get(groupName) || []), student]);
      });
      base.data = {
        ...base.data,
        groupCount: Math.max(2, grouped.size || 3),
        groups: Array.from(grouped.entries()).map(([name, students]) => ({
          name,
          students,
        })),
      };
    }

    if (group.type === "randomizer") {
      base.data = {
        ...base.data,
        items: rows.map((row) => get(row, labelIndex) || get(row, valueIndex)).filter(Boolean),
      };
    }

    widgets.push(base);
  });

  return { widgets, warnings };
}

export function formatWidgetTime(seconds: number) {
  const value = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(value / 60);
  return `${String(minutes).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

function formatStopwatch(seconds: number) {
  const value = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(value / 60);
  const remaining = value % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
}

function stopPointer(event: ReactPointerEvent<HTMLElement>) {
  event.stopPropagation();
}

export function WidgetLayer({
  widgets,
  selectedWidgetId,
  activeTool,
  now,
  classNames,
  onSelect,
  onLayoutChange,
  onDataChange,
  onCommand,
  onDelete,
  onDuplicate,
  onToggleLock,
  onTogglePin,
}: WidgetLayerProps) {
  const dragRef = useRef<DragState | null>(null);

  const beginDrag = (
    event: ReactPointerEvent<HTMLElement>,
    widget: WidgetInstance,
    mode: "move" | "resize",
  ) => {
    if (activeTool !== "pointer" || widget.locked) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const canvas = event.currentTarget.closest(".stage-canvas");
    const rect = canvas?.getBoundingClientRect();
    if (!rect) return;
    onSelect(widget.id);
    dragRef.current = {
      id: widget.id,
      mode,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: widget.x,
      startY: widget.y,
      startWidth: widget.width,
      startHeight: widget.height,
      canvasWidth: rect.width,
      canvasHeight: rect.height,
    };
  };

  const continueDrag = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    event.stopPropagation();
    const dx = ((event.clientX - drag.startClientX) / drag.canvasWidth) * 100;
    const dy = ((event.clientY - drag.startClientY) / drag.canvasHeight) * 100;
    if (drag.mode === "move") {
      const widget = widgets.find((item) => item.id === drag.id);
      onLayoutChange(drag.id, {
        x: clamp(drag.startX + dx, 0, 100 - (widget?.width || drag.startWidth)),
        y: clamp(drag.startY + dy, 0, 100 - (widget?.height || drag.startHeight)),
      });
      return;
    }
    onLayoutChange(drag.id, {
      width: clamp(drag.startWidth + dx, 10, 70),
      height: clamp(drag.startHeight + dy, 10, 70),
    });
  };

  const endDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if (dragRef.current) event.stopPropagation();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
  };

  return (
    <div className="widget-layer" aria-label="Classroomscreen style widgets">
      {widgets.map((widget) => {
        const selected = selectedWidgetId === widget.id;
        return (
          <section
            key={widget.id}
            className={`stage-widget widget-${widget.type} ${
              selected ? "is-selected" : ""
            } ${widget.locked ? "is-locked" : ""} ${
              widget.pinned ? "is-pinned" : ""
            }`}
            style={
              {
                left: `${widget.x}%`,
                top: `${widget.y}%`,
                width: `${widget.width}%`,
                height: `${widget.height}%`,
                zIndex: widget.zIndex,
                transform: `rotate(${widget.rotation || 0}deg)`,
              } as React.CSSProperties
            }
            onPointerDown={(event) => {
              if (
                (event.target as HTMLElement).closest(
                  "button,input,a,.widget-resize-handle,.widget-drag-grip",
                )
              )
                return;
              if (activeTool === "pointer") onSelect(widget.id);
            }}
          >
            <div
              className="widget-drag-grip"
              onPointerDown={(event) => beginDrag(event, widget, "move")}
              onPointerMove={continueDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            >
              <span>{widget.title}</span>
              <small>{widget.locked ? "locked" : widget.pinned ? "pinned" : "drag"}</small>
            </div>

            <div className="widget-body">
              <WidgetContent
                widget={widget}
                now={now}
                classNames={classNames}
                onDataChange={onDataChange}
                onCommand={onCommand}
              />
            </div>

            {selected && (
              <div className="widget-toolbar" onPointerDown={stopPointer}>
                <button type="button" onClick={() => onTogglePin(widget.id)}>
                  {widget.pinned ? "Bỏ ghim" : "Ghim"}
                </button>
                <button type="button" onClick={() => onToggleLock(widget.id)}>
                  {widget.locked ? "Mở khóa" : "Khóa"}
                </button>
                <button type="button" onClick={() => onDuplicate(widget.id)}>
                  Nhân bản
                </button>
                <button type="button" className="danger" onClick={() => onDelete(widget.id)}>
                  Xóa
                </button>
              </div>
            )}

            {selected && !widget.locked && (
              <span
                className="widget-resize-handle"
                aria-hidden="true"
                onPointerDown={(event) => beginDrag(event, widget, "resize")}
                onPointerMove={continueDrag}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
              />
            )}
          </section>
        );
      })}
    </div>
  );
}

function WidgetContent({
  widget,
  now,
  classNames,
  onDataChange,
  onCommand,
}: {
  widget: WidgetInstance;
  now: Date;
  classNames: string[];
  onDataChange: WidgetLayerProps["onDataChange"];
  onCommand: WidgetLayerProps["onCommand"];
}) {
  switch (widget.type) {
    case "clock":
      return <ClockWidget widget={widget} now={now} onDataChange={onDataChange} />;
    case "visualTimer":
      return <VisualTimerWidget widget={widget} onCommand={onCommand} />;
    case "stopwatch":
      return <StopwatchWidget widget={widget} onCommand={onCommand} />;
    case "trafficLight":
      return <TrafficLightWidget widget={widget} onCommand={onCommand} />;
    case "workSymbol":
      return <WorkSymbolWidget widget={widget} onCommand={onCommand} />;
    case "randomizer":
      return (
        <RandomizerWidget
          widget={widget}
          classNames={classNames}
          onCommand={onCommand}
        />
      );
    case "groupMaker":
      return <GroupMakerWidget widget={widget} onCommand={onCommand} />;
    case "scoreboard":
      return <ScoreboardWidget widget={widget} onCommand={onCommand} />;
    case "poll":
      return <PollWidget widget={widget} onCommand={onCommand} />;
    case "dice":
      return <DiceWidget widget={widget} onCommand={onCommand} />;
    case "soundLevel":
      return (
        <SoundLevelWidget
          widget={widget}
          onDataChange={onDataChange}
          onCommand={onCommand}
        />
      );
    case "timetable":
      return <TimetableWidget widget={widget} onCommand={onCommand} />;
    case "countdown":
      return <CountdownWidget widget={widget} now={now} />;
    case "qrLink":
      return <QrLinkWidget widget={widget} onCommand={onCommand} />;
    default:
      return null;
  }
}

function ClockWidget({
  widget,
  now,
  onDataChange,
}: {
  widget: WidgetInstance;
  now: Date;
  onDataChange: WidgetLayerProps["onDataChange"];
}) {
  const hours = now.getHours() % 12;
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  const hourAngle = hours * 30 + minutes * 0.5;
  const minuteAngle = minutes * 6;
  const secondAngle = seconds * 6;
  const digital = now.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <button
      type="button"
      className="clock-face-widget"
      onPointerDown={stopPointer}
      onClick={() =>
        onDataChange(widget.id, (data) => ({
          ...data,
          mode: data.mode === "digital" ? "analog" : "digital",
        }))
      }
    >
      <div className="analog-clock" aria-hidden="true">
        <span className="clock-pin" />
        <span className="clock-hand hour" style={{ rotate: `${hourAngle}deg` }} />
        <span className="clock-hand minute" style={{ rotate: `${minuteAngle}deg` }} />
        <span className="clock-hand second" style={{ rotate: `${secondAngle}deg` }} />
        {[0, 1, 2, 3].map((index) => (
          <i key={index} style={{ rotate: `${index * 90}deg` }} />
        ))}
      </div>
      <div className="flip-clock">
        {digital.split(":").map((part, index) => (
          <span key={`${part}-${index}`}>{part}</span>
        ))}
      </div>
    </button>
  );
}

function VisualTimerWidget({
  widget,
  onCommand,
}: {
  widget: WidgetInstance;
  onCommand: WidgetLayerProps["onCommand"];
}) {
  const duration = asNumber(widget.data.duration, 300);
  const remaining = asNumber(widget.data.remaining, duration);
  const running = asBool(widget.data.running);
  const progress = duration > 0 ? remaining / duration : 0;
  const dash = Math.max(0, Math.min(283, progress * 283));

  return (
    <div className={`visual-timer-widget ${remaining <= 10 ? "is-warning" : ""}`}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle className="timer-track" cx="50" cy="50" r="45" />
        <circle
          className="timer-progress"
          cx="50"
          cy="50"
          r="45"
          strokeDasharray={`${dash} 283`}
        />
      </svg>
      <div className="timer-center">
        <strong>{formatWidgetTime(remaining)}</strong>
        <span>{running ? "đang chạy" : "tạm dừng"}</span>
      </div>
      <div className="widget-mini-controls" onPointerDown={stopPointer}>
        {[60, 180, 300].map((seconds) => (
          <button
            type="button"
            key={seconds}
            onClick={() => onCommand(widget, "timer-preset", seconds)}
          >
            {seconds / 60}m
          </button>
        ))}
        <button type="button" onClick={() => onCommand(widget, "timer-toggle")}>
          {running ? "Pause" : "Start"}
        </button>
        <button type="button" onClick={() => onCommand(widget, "timer-reset")}>
          Reset
        </button>
      </div>
    </div>
  );
}

function StopwatchWidget({
  widget,
  onCommand,
}: {
  widget: WidgetInstance;
  onCommand: WidgetLayerProps["onCommand"];
}) {
  const elapsed = asNumber(widget.data.elapsed, 0);
  const running = asBool(widget.data.running);
  const laps = asArray<number>(widget.data.laps, []);
  return (
    <div className={`stopwatch-widget ${running ? "is-running" : ""}`}>
      <div className="stopwatch-dial">
        <span className="stopwatch-hand" style={{ rotate: `${(elapsed % 60) * 6}deg` }} />
        <strong>{formatStopwatch(elapsed)}</strong>
      </div>
      <div className="lap-strip">
        {laps.slice(0, 3).map((lap, index) => (
          <span key={`${lap}-${index}`}>{formatStopwatch(lap)}</span>
        ))}
        {!laps.length && <span>Lap list</span>}
      </div>
      <div className="widget-mini-controls" onPointerDown={stopPointer}>
        <button type="button" onClick={() => onCommand(widget, "stopwatch-toggle")}>
          {running ? "Pause" : "Start"}
        </button>
        <button type="button" onClick={() => onCommand(widget, "stopwatch-lap")}>
          Lap
        </button>
        <button type="button" onClick={() => onCommand(widget, "stopwatch-reset")}>
          Reset
        </button>
      </div>
    </div>
  );
}

function TrafficLightWidget({
  widget,
  onCommand,
}: {
  widget: WidgetInstance;
  onCommand: WidgetLayerProps["onCommand"];
}) {
  const state = asString(widget.data.state, "green");
  return (
    <button
      type="button"
      className={`traffic-widget state-${state}`}
      onPointerDown={stopPointer}
      onClick={() => onCommand(widget, "cycle-traffic")}
    >
      {["red", "yellow", "green"].map((light) => (
        <span key={light} className={`traffic-bulb ${state === light ? "is-on" : ""}`} />
      ))}
      <strong>
        {state === "green" ? "Go" : state === "yellow" ? "Focus" : "Stop"}
      </strong>
    </button>
  );
}

const WORK_MODES = [
  { id: "solo", label: "Làm cá nhân", emoji: "👤", hint: "silent work" },
  { id: "pair", label: "Làm cặp", emoji: "👥", hint: "ask partner" },
  { id: "team", label: "Làm nhóm", emoji: "👨‍👩‍👧‍👦", hint: "team talk" },
  { id: "teacher", label: "Nghe GV", emoji: "🎧", hint: "eyes here" },
];

function WorkSymbolWidget({
  widget,
  onCommand,
}: {
  widget: WidgetInstance;
  onCommand: WidgetLayerProps["onCommand"];
}) {
  const mode = asString(widget.data.mode, "solo");
  const active = WORK_MODES.find((item) => item.id === mode) || WORK_MODES[0];
  return (
    <button
      type="button"
      className={`work-symbol-widget mode-${active.id}`}
      onPointerDown={stopPointer}
      onClick={() => onCommand(widget, "cycle-work")}
    >
      <span className="work-illustration">{active.emoji}</span>
      <strong>{active.label}</strong>
      <small>{active.hint}</small>
    </button>
  );
}

function RandomizerWidget({
  widget,
  classNames,
  onCommand,
}: {
  widget: WidgetInstance;
  classNames: string[];
  onCommand: WidgetLayerProps["onCommand"];
}) {
  const items = asArray<string>(widget.data.items, classNames).filter(Boolean);
  const names = items.length ? items : classNames;
  const result = asString(widget.data.result, "");
  const spinning = asBool(widget.data.spinning);
  const wheelNames = (names.length ? names : ["A", "B", "C", "D"]).slice(0, 8);
  const colors = ["#69aee8", "#9ccfff", "#899cf5", "#63c7cf", "#b8d5ff", "#8fc7ff"];
  const gradient = `conic-gradient(${wheelNames
    .map((_, index) => {
      const start = (index / wheelNames.length) * 360;
      const end = ((index + 1) / wheelNames.length) * 360;
      return `${colors[index % colors.length]} ${start}deg ${end}deg`;
    })
    .join(", ")})`;

  return (
    <div className={`randomizer-widget ${spinning ? "is-spinning" : ""}`}>
      <div className="wheel-wrap">
        <span className="wheel-pointer" />
        <div className="name-wheel" style={{ background: gradient }}>
          {wheelNames.map((name, index) => (
            <span
              key={`${name}-${index}`}
              style={{ rotate: `${(index / wheelNames.length) * 360 + 20}deg` }}
            >
              {name.split(" ").slice(-1)[0]}
            </span>
          ))}
        </div>
      </div>
      <div className="random-result">
        <small>Kết quả</small>
        <strong>{result || "Chưa quay"}</strong>
      </div>
      <button type="button" onPointerDown={stopPointer} onClick={() => onCommand(widget, "randomize")}>
        Quay chọn tên
      </button>
    </div>
  );
}

function GroupMakerWidget({
  widget,
  onCommand,
}: {
  widget: WidgetInstance;
  onCommand: WidgetLayerProps["onCommand"];
}) {
  const groupCount = asNumber(widget.data.groupCount, 3);
  const groups = asArray<{ name: string; students: string[] }>(widget.data.groups, []);
  return (
    <div className={`group-maker-widget ${groups.length ? "has-groups" : ""}`}>
      <div className="group-stage">
        {groups.length ? (
          groups.map((group, groupIndex) => (
            <section key={group.name} className="group-zone">
              <strong>{group.name}</strong>
              <div>
                {group.students.slice(0, 5).map((student, index) => (
                  <span
                    key={`${student}-${index}`}
                    style={{ animationDelay: `${(groupIndex + index) * 55}ms` }}
                  >
                    {student}
                  </span>
                ))}
              </div>
            </section>
          ))
        ) : (
          <div className="student-card-pile">
            <span />
            <span />
            <span />
            <strong>Shuffle cards</strong>
          </div>
        )}
      </div>
      <div className="group-controls" onPointerDown={stopPointer}>
        <button type="button" onClick={() => onCommand(widget, "group-count", -1)}>
          −
        </button>
        <strong>{groupCount} nhóm</strong>
        <button type="button" onClick={() => onCommand(widget, "group-count", 1)}>
          +
        </button>
        <button type="button" onClick={() => onCommand(widget, "make-groups")}>
          Chia lại
        </button>
      </div>
    </div>
  );
}

function ScoreboardWidget({
  widget,
  onCommand,
}: {
  widget: WidgetInstance;
  onCommand: WidgetLayerProps["onCommand"];
}) {
  const teams = asArray<{ name: string; score: number; color: string }>(
    widget.data.teams,
    [],
  );
  return (
    <div className="scoreboard-widget">
      <div className="scoreboard-lights" aria-hidden="true">
        {Array.from({ length: 18 }, (_, index) => (
          <span key={index} />
        ))}
      </div>
      {teams.map((team, index) => (
        <section key={`${team.name}-${index}`} style={{ "--team-color": team.color } as React.CSSProperties}>
          <span>{team.name}</span>
          <strong>{team.score}</strong>
          <div onPointerDown={stopPointer}>
            <button type="button" onClick={() => onCommand(widget, "score", { index, delta: -1 })}>
              −
            </button>
            <button type="button" onClick={() => onCommand(widget, "score", { index, delta: 1 })}>
              +1
            </button>
          </div>
        </section>
      ))}
    </div>
  );
}

function PollWidget({
  widget,
  onCommand,
}: {
  widget: WidgetInstance;
  onCommand: WidgetLayerProps["onCommand"];
}) {
  const options = asArray<{ label: string; count: number; color: string }>(
    widget.data.options,
    [],
  );
  const prompt = asString(widget.data.prompt, widget.title);
  const reveal = asBool(widget.data.reveal, true);
  const total = Math.max(1, options.reduce((sum, option) => sum + asNumber(option.count, 0), 0));
  return (
    <div className="poll-widget">
      <div className="poll-heading">
        <strong>{prompt}</strong>
        <button type="button" onPointerDown={stopPointer} onClick={() => onCommand(widget, "poll-reveal")}>
          {reveal ? "Ẩn" : "Mở"}
        </button>
      </div>
      <div className="poll-bars">
        {options.map((option, index) => {
          const count = asNumber(option.count, 0);
          const percent = reveal ? Math.round((count / total) * 100) : 0;
          return (
            <button
              type="button"
              key={`${option.label}-${index}`}
              onPointerDown={stopPointer}
              onClick={() => onCommand(widget, "poll-vote", index)}
            >
              <span>{option.label}</span>
              <i style={{ width: `${percent}%`, background: option.color }} />
              <strong>{reveal ? count : "?"}</strong>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className="poll-clear"
        onPointerDown={stopPointer}
        onClick={() => onCommand(widget, "poll-clear")}
      >
        Xóa lượt bình chọn
      </button>
    </div>
  );
}

function DiceWidget({
  widget,
  onCommand,
}: {
  widget: WidgetInstance;
  onCommand: WidgetLayerProps["onCommand"];
}) {
  const values = asArray<number>(widget.data.values, [1, 4]);
  const rolling = asBool(widget.data.rolling);
  return (
    <button
      type="button"
      className={`dice-widget ${rolling ? "is-rolling" : ""}`}
      onPointerDown={stopPointer}
      onClick={() => onCommand(widget, "roll-dice")}
    >
      <DiceFace value={values[0] || 1} />
      <DiceFace value={values[1] || 1} />
      <span>Roll</span>
    </button>
  );
}

function DiceFace({ value }: { value: number }) {
  const dots: Record<number, number[]> = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  };
  return (
    <span className="dice-face">
      {Array.from({ length: 9 }, (_, index) => (
        <i key={index} className={(dots[value] || dots[1]).includes(index) ? "is-on" : ""} />
      ))}
    </span>
  );
}

function SoundLevelWidget({
  widget,
  onDataChange,
  onCommand,
}: {
  widget: WidgetInstance;
  onDataChange: WidgetLayerProps["onDataChange"];
  onCommand: WidgetLayerProps["onCommand"];
}) {
  const rafRef = useRef<number | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const level = asNumber(widget.data.level, 28);
  const threshold = asNumber(widget.data.threshold, 65);
  const listening = asBool(widget.data.listening);
  const danger = level >= threshold;

  useEffect(() => {
    if (!listening) {
      cleanupRef.current?.();
      cleanupRef.current = null;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    let stopped = false;
    let stream: MediaStream | null = null;
    let audioContext: AudioContext | null = null;
    let fallback: number | null = null;

    const writeLevel = (nextLevel: number) => {
      onDataChange(widget.id, (data) => {
        const oldLevel = asNumber(data.level, 0);
        const thresholdValue = asNumber(data.threshold, threshold);
        return {
          ...data,
          level: Math.round(nextLevel),
          violations:
            oldLevel < thresholdValue && nextLevel >= thresholdValue
              ? asNumber(data.violations, 0) + 1
              : data.violations,
        };
      });
    };

    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContext = new AudioContext();
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        audioContext.createMediaStreamSource(stream).connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          if (stopped) return;
          analyser.getByteFrequencyData(data);
          const average =
            data.reduce((sum, item) => sum + item, 0) / Math.max(1, data.length);
          writeLevel(clamp((average / 150) * 100, 0, 100));
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        fallback = window.setInterval(() => {
          writeLevel(clamp(28 + Math.sin(Date.now() / 360) * 22 + Math.random() * 28, 0, 100));
        }, 420);
      }
    };

    start();
    cleanupRef.current = () => {
      stopped = true;
      if (fallback) window.clearInterval(fallback);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      stream?.getTracks().forEach((track) => track.stop());
      audioContext?.close().catch(() => undefined);
    };

    return () => cleanupRef.current?.();
  }, [listening, onDataChange, threshold, widget.id]);

  return (
    <div className={`sound-widget ${danger ? "is-danger" : ""}`}>
      <div className="sound-gauge">
        <span style={{ height: `${clamp(level, 8, 100)}%` }} />
        <i style={{ bottom: `${threshold}%` }} />
      </div>
      <div className="sound-bars" aria-hidden="true">
        {Array.from({ length: 14 }, (_, index) => (
          <span
            key={index}
            style={{
              height: `${clamp(level * (0.35 + ((index % 5) + 1) / 8), 8, 100)}%`,
              animationDelay: `${index * 35}ms`,
            }}
          />
        ))}
      </div>
      <strong>{Math.round(level)}%</strong>
      <small>Ngưỡng {threshold}% · {asNumber(widget.data.violations, 0)} lần</small>
      <div className="widget-mini-controls" onPointerDown={stopPointer}>
        <button type="button" onClick={() => onCommand(widget, "sound-toggle")}>
          {listening ? "Dừng" : "Lắng nghe"}
        </button>
        <button type="button" onClick={() => onCommand(widget, "sound-nudge", -5)}>
          −
        </button>
        <button type="button" onClick={() => onCommand(widget, "sound-nudge", 5)}>
          +
        </button>
      </div>
    </div>
  );
}

function TimetableWidget({
  widget,
  onCommand,
}: {
  widget: WidgetInstance;
  onCommand: WidgetLayerProps["onCommand"];
}) {
  const items = asArray<{ time: string; label: string; symbol: string }>(
    widget.data.items,
    [],
  );
  const active = clamp(asNumber(widget.data.active, 0), 0, Math.max(0, items.length - 1));
  return (
    <div className="timetable-widget">
      <div className="timetable-rail">
        <span style={{ top: `${items.length > 1 ? (active / (items.length - 1)) * 100 : 0}%` }} />
      </div>
      <div className="timetable-items">
        {items.map((item, index) => (
          <button
            type="button"
            key={`${item.time}-${index}`}
            className={index === active ? "is-active" : ""}
            onPointerDown={stopPointer}
            onClick={() => onCommand(widget, "timetable-next")}
          >
            <small>{item.time}</small>
            <strong>{item.label}</strong>
            <em>{item.symbol}</em>
          </button>
        ))}
      </div>
    </div>
  );
}

function CountdownWidget({ widget, now }: { widget: WidgetInstance; now: Date }) {
  const event = asString(widget.data.event, widget.title);
  const target = new Date(asString(widget.data.target, "2026-09-05T07:30"));
  const diff = Math.max(0, target.getTime() - now.getTime());
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  return (
    <div className={`countdown-widget ${diff === 0 ? "is-complete" : ""}`}>
      <div className="countdown-ring">
        <strong>{days}</strong>
        <span>ngày</span>
      </div>
      <div>
        <small>Sự kiện</small>
        <strong>{event}</strong>
        <span>{hours} giờ nữa</span>
      </div>
    </div>
  );
}

function QrLinkWidget({
  widget,
  onCommand,
}: {
  widget: WidgetInstance;
  onCommand: WidgetLayerProps["onCommand"];
}) {
  const label = asString(widget.data.label, widget.title);
  const url = asString(widget.data.url, "https://example.com");
  return (
    <div className="qr-widget">
      <QrMatrix value={url} />
      <strong>{label}</strong>
      <span>{url.replace(/^https?:\/\//, "")}</span>
      <button type="button" onPointerDown={stopPointer} onClick={() => onCommand(widget, "copy-link")}>
        Copy link
      </button>
    </div>
  );
}

function QrMatrix({ value }: { value: string }) {
  const cells = useMemo(() => {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
      hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
    }
    return Array.from({ length: 169 }, (_, index) => {
      const x = index % 13;
      const y = Math.floor(index / 13);
      const finder =
        (x < 4 && y < 4) || (x > 8 && y < 4) || (x < 4 && y > 8);
      const innerFinder =
        (x === 1 || x === 2 || x === 10 || x === 11) &&
        (y === 1 || y === 2 || y === 10 || y === 11);
      const bit = ((hash >> ((x + y * 3) % 24)) + x * 7 + y * 11) % 3 !== 0;
      return { on: finder ? !innerFinder : bit, finder };
    });
  }, [value]);

  return (
    <span className="qr-matrix" aria-hidden="true">
      {cells.map((cell, index) => (
        <i
          key={index}
          className={`${cell.on ? "is-on" : ""} ${cell.finder ? "is-finder" : ""}`}
        />
      ))}
    </span>
  );
}
