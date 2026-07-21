/* Brian TextLab preview fullscreen and robust single-file offline export */
(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const previewPanel = $(".preview-panel");
  const fullscreenButton = $("#btnPreviewFullscreen");
  const downloadButton = $("#btnDownload");
  let fallbackFullscreen = false;
  let cachedAppSource = "";

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
    window.setTimeout(() => alert.classList.add("hidden"), 3200);
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

  function escapeInlineScript(source) {
    return String(source).replace(/<\/script/gi, "<\\/script");
  }

  function escapeInlineStyle(source) {
    return String(source).replace(/<\/style/gi, "<\\/style");
  }

  function removeBuilderStartup(source) {
    const marker = 'document.addEventListener("DOMContentLoaded"';
    const index = source.lastIndexOf(marker);
    if (index < 0) {
      throw new Error("Không tìm thấy điểm khởi động của TextLab để tạo bản offline.");
    }
    return source.slice(0, index).trimEnd();
  }

  async function getAppSource() {
    if (cachedAppSource) return cachedAppSource;

    const appUrl = new URL("app.js", window.location.href);
    appUrl.searchParams.set("offline-export", String(Date.now()));
    const response = await fetch(appUrl, { cache: "no-store", credentials: "same-origin" });
    if (!response.ok) {
      throw new Error(`Không thể đọc bộ máy hoạt động (${response.status}).`);
    }

    const source = await response.text();
    if (!source.includes("const TEMPLATES") || !source.includes("renderActivity")) {
      throw new Error("Bộ máy TextLab tải về không đầy đủ.");
    }

    cachedAppSource = removeBuilderStartup(source);
    return cachedAppSource;
  }

  function buildOfflineBootstrap(templateId, raw, title) {
    return `
;(() => {
  const __OFFLINE_ID__ = ${JSON.stringify(templateId)};
  const __OFFLINE_RAW__ = ${JSON.stringify(raw)};
  const __OFFLINE_TITLE__ = ${JSON.stringify(title)};
  const __stage = document.getElementById("stage");

  const __showOfflineError = (error) => {
    const message = error && error.message ? error.message : String(error || "Unknown error");
    __stage.className = "activity-stage offline-error-stage";
    __stage.innerHTML = '<section data-offline-error style="padding:24px;color:#8b1e2d;background:#fff4f5;border:1px solid #f2c6cc;border-radius:18px"><h2 style="margin-top:0">Không thể mở hoạt động</h2><p>' + String(message).replace(/[&<>\"]/g, (character) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[character])) + '</p></section>';
  };

  window.addEventListener("error", (event) => {
    if (!__stage.children.length) __showOfflineError(event.error || event.message);
  });
  window.addEventListener("unhandledrejection", (event) => {
    if (!__stage.children.length) __showOfflineError(event.reason);
  });

  try {
    selectedTemplate = TEMPLATES.find((template) => template.id === __OFFLINE_ID__) || {
      id: __OFFLINE_ID__,
      name: __OFFLINE_TITLE__
    };
    const __data = parseData(__OFFLINE_ID__, __OFFLINE_RAW__);
    __stage.className = "activity-stage";
    renderActivity(__stage, __OFFLINE_ID__, __data, {
      title: __OFFLINE_TITLE__,
      mode: "ready"
    });
    if (!__stage.children.length && !__stage.textContent.trim()) {
      throw new Error("Hoạt động không tạo được nội dung hiển thị.");
    }
    document.documentElement.dataset.offlineReady = "true";
  } catch (error) {
    __showOfflineError(error);
    document.documentElement.dataset.offlineReady = "false";
  }
})();`;
  }

  async function buildStandaloneHtml() {
    const contentInput = $("#contentInput");
    const raw = contentInput?.value.trim() || "";
    const templateId = typeof selectedTemplate !== "undefined"
      ? selectedTemplate?.id || "activity"
      : "activity";
    const title = typeof selectedTemplate !== "undefined"
      ? selectedTemplate?.name || "Brian Activity"
      : "Brian Activity";
    const appSource = await getAppSource();
    const bootstrap = buildOfflineBootstrap(templateId, raw, title);
    const completeScript = `${appSource}\n${bootstrap}`;

    new Function(completeScript);

    const css = typeof EXPORT_CSS !== "undefined"
      ? EXPORT_CSS
      : "body{font-family:system-ui,sans-serif;margin:0;padding:24px;background:#eef6ff}.standalone{max-width:1100px;margin:auto}.activity-stage{background:#fff;border-radius:20px;padding:22px}";

    return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${String(title).replace(/[&<>\"]/g, (character) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[character]))} - Brian Activity</title>
  <style>${escapeInlineStyle(css)}</style>
</head>
<body>
  <main class="standalone">
    <section class="activity-stage" id="stage" aria-live="polite"></section>
  </main>
  <script>${escapeInlineScript(completeScript)}<\/script>
</body>
</html>`;
  }

  function validateStandaloneRuntime(html) {
    return new Promise((resolve, reject) => {
      const frame = document.createElement("iframe");
      frame.setAttribute("aria-hidden", "true");
      frame.style.position = "fixed";
      frame.style.width = "1px";
      frame.style.height = "1px";
      frame.style.opacity = "0";
      frame.style.pointerEvents = "none";
      frame.style.left = "-9999px";
      frame.style.top = "-9999px";

      let settled = false;
      const cleanup = () => {
        frame.remove();
      };
      const fail = (error) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(error instanceof Error ? error : new Error(String(error)));
      };
      const pass = () => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve();
      };
      const timeout = window.setTimeout(() => {
        fail(new Error("Bản offline không hoàn tất khởi động trong thời gian cho phép."));
      }, 5000);

      frame.addEventListener("load", () => {
        window.setTimeout(() => {
          try {
            const doc = frame.contentDocument;
            const stage = doc?.querySelector("#stage");
            const errorBox = stage?.querySelector("[data-offline-error]");
            const readyState = doc?.documentElement?.dataset?.offlineReady;

            if (errorBox) {
              window.clearTimeout(timeout);
              fail(new Error(errorBox.textContent.trim() || "Bản offline báo lỗi khi chạy thử."));
              return;
            }
            if (!stage || readyState !== "true" || (!stage.children.length && !stage.textContent.trim())) {
              window.clearTimeout(timeout);
              fail(new Error("Bản offline vẫn tạo ra vùng hiển thị trống."));
              return;
            }

            window.clearTimeout(timeout);
            pass();
          } catch (error) {
            window.clearTimeout(timeout);
            fail(error);
          }
        }, 350);
      }, { once: true });

      frame.srcdoc = html;
      document.body.appendChild(frame);
    });
  }

  async function downloadSingleHtml(event) {
    event.preventDefault();
    event.stopImmediatePropagation();

    const contentInput = $("#contentInput");
    if (!contentInput?.value.trim()) {
      notify("Hãy nhập nội dung trước khi tải hoạt động.", "error");
      return;
    }

    const originalText = downloadButton?.textContent || "⇩ Download my work (.html)";
    if (downloadButton) {
      downloadButton.disabled = true;
      downloadButton.textContent = "Đang tạo và kiểm tra HTML...";
    }

    try {
      const html = await buildStandaloneHtml();
      await validateStandaloneRuntime(html);

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
      window.setTimeout(() => URL.revokeObjectURL(url), 1500);
      notify(`Đã tải ${filename}. Hệ thống đã chạy thử tệp trước khi tải xuống.`);
    } catch (error) {
      console.error("Verified offline HTML export failed", error);
      notify(`Chưa thể tạo HTML offline: ${error.message || "lỗi không xác định"}.`, "error");
    } finally {
      if (downloadButton) {
        downloadButton.disabled = false;
        downloadButton.textContent = originalText;
      }
    }
  }

  fullscreenButton?.addEventListener("click", togglePreviewFullscreen);
  downloadButton?.addEventListener("click", downloadSingleHtml, true);

  document.addEventListener("fullscreenchange", updateFullscreenButton);
  document.addEventListener("webkitfullscreenchange", updateFullscreenButton);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && fallbackFullscreen) exitFallbackFullscreen();
  });

  updateFullscreenButton();
})();
