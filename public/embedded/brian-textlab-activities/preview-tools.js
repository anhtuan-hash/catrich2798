/* Brian TextLab preview fullscreen and verified single-file HTML export */
(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const previewPanel = $(".preview-panel");
  const fullscreenButton = $("#btnPreviewFullscreen");
  const downloadButton = $("#btnDownload");
  let fallbackFullscreen = false;

  function notify(message, type = "success") {
    if (typeof showLibraryAlert === "function") {
      showLibraryAlert(message, type);
      return;
    }

    const alert = $("#libraryAlert");
    if (!alert) return;
    alert.textContent = message;
    alert.dataset.type = type;
    alert.classList.remove("hidden");
    window.setTimeout(() => alert.classList.add("hidden"), 2800);
  }

  function currentFullscreenElement() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
  }

  function isPreviewFullscreen() {
    return currentFullscreenElement() === previewPanel || fallbackFullscreen;
  }

  function updateFullscreenButton() {
    if (!fullscreenButton) return;
    const active = isPreviewFullscreen();
    const icon = $(".preview-fullscreen-icon", fullscreenButton);
    const label = $(".preview-fullscreen-label", fullscreenButton);

    if (icon) icon.textContent = active ? "✕" : "⛶";
    if (label) label.textContent = active ? "Thoát toàn màn hình" : "Toàn màn hình";
    fullscreenButton.setAttribute(
      "aria-label",
      active ? "Thoát chế độ toàn màn hình" : "Mở Activity Preview toàn màn hình"
    );
    fullscreenButton.setAttribute("aria-pressed", active ? "true" : "false");
  }

  function enterFallbackFullscreen() {
    fallbackFullscreen = true;
    previewPanel?.classList.add("preview-fallback-fullscreen");
    document.body.classList.add("preview-fallback-lock");
    updateFullscreenButton();
  }

  function exitFallbackFullscreen() {
    fallbackFullscreen = false;
    previewPanel?.classList.remove("preview-fallback-fullscreen");
    document.body.classList.remove("preview-fallback-lock");
    updateFullscreenButton();
  }

  async function togglePreviewFullscreen() {
    if (!previewPanel) return;

    if (fallbackFullscreen) {
      exitFallbackFullscreen();
      return;
    }

    if (currentFullscreenElement() === previewPanel) {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (exit) await exit.call(document);
      return;
    }

    const request = previewPanel.requestFullscreen || previewPanel.webkitRequestFullscreen;
    if (!request) {
      enterFallbackFullscreen();
      return;
    }

    try {
      await request.call(previewPanel, { navigationUI: "hide" });
    } catch (error) {
      console.warn("Native fullscreen unavailable; using workspace fullscreen fallback.", error);
      enterFallbackFullscreen();
    }
  }

  function safeFilename(value) {
    return String(value || "activity")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 70) || "activity";
  }

  /*
   * Function.prototype.toString() returns object-method syntax for renderers
   * declared as `quiz(data, options) { ... }`. The previous exporter placed
   * that source after a property colon, producing invalid JavaScript such as:
   *   "quiz":quiz(data, options) { ... }
   * Convert method syntax to a real function expression before serialising.
   */
  function toExportableFunctionSource(fn) {
    const source = Function.prototype.toString.call(fn).trim();

    if (/^(?:async\s+)?function\b/.test(source)) return source;
    if (/^(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/.test(source)) return source;

    const asyncMethod = source.match(/^async\s+([A-Za-z_$][\w$]*)\s*\(/);
    if (asyncMethod) {
      return source.replace(
        /^async\s+([A-Za-z_$][\w$]*)\s*\(/,
        "async function $1("
      );
    }

    if (/^[A-Za-z_$][\w$]*\s*\(/.test(source)) {
      return `function ${source}`;
    }

    return source;
  }

  function serializeExportObject(object) {
    const entries = Object.entries(object).map(([key, value]) => {
      const serialized = typeof value === "function"
        ? toExportableFunctionSource(value)
        : JSON.stringify(value);
      return `${JSON.stringify(key)}:${serialized}`;
    });

    return `{\n${entries.join(",\n")}\n}`;
  }

  function installOfflineExportSerializer() {
    window.objectToSource = serializeExportObject;
  }

  function validateStandaloneHtml(html) {
    const parsed = new DOMParser().parseFromString(html, "text/html");
    const stage = parsed.querySelector("#stage");
    const scripts = [...parsed.querySelectorAll("script")];

    if (!stage) throw new Error("Tệp xuất thiếu vùng hiển thị hoạt động.");
    if (!scripts.length) throw new Error("Tệp xuất thiếu mã JavaScript hoạt động.");
    if (parsed.querySelector("script[src], link[rel='stylesheet']")) {
      throw new Error("Tệp xuất vẫn còn phụ thuộc vào tệp bên ngoài.");
    }

    scripts.forEach((script) => {
      const source = script.textContent || "";
      if (source.trim()) new Function(source);
    });
  }

  function downloadSingleHtml(event) {
    event.preventDefault();
    event.stopImmediatePropagation();

    const contentInput = $("#contentInput");
    if (!contentInput?.value.trim()) {
      notify("Hãy nhập nội dung trước khi tải hoạt động.", "error");
      return;
    }

    if (typeof standaloneSingleHtml !== "function") {
      notify("Không thể tạo tệp HTML ngoại tuyến.", "error");
      return;
    }

    try {
      installOfflineExportSerializer();
      const html = standaloneSingleHtml();
      validateStandaloneHtml(html);

      const templateName = typeof selectedTemplate !== "undefined"
        ? selectedTemplate?.name
        : "activity";
      const templateId = typeof selectedTemplate !== "undefined"
        ? selectedTemplate?.id
        : "activity";
      const filename = `brian-${safeFilename(templateName || templateId)}.html`;
      const blob = new Blob(["\uFEFF", html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1200);
      notify(`Đã tải ${filename}. Tệp đã được kiểm tra và có thể mở trực tiếp để chạy offline.`);
    } catch (error) {
      console.error("Single HTML export failed", error);
      notify(`Không thể tạo tệp HTML chạy offline: ${error.message || "lỗi không xác định"}.`, "error");
    }
  }

  installOfflineExportSerializer();
  fullscreenButton?.addEventListener("click", togglePreviewFullscreen);
  downloadButton?.addEventListener("click", downloadSingleHtml, true);

  document.addEventListener("fullscreenchange", updateFullscreenButton);
  document.addEventListener("webkitfullscreenchange", updateFullscreenButton);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && fallbackFullscreen) exitFallbackFullscreen();
  });

  updateFullscreenButton();
})();
