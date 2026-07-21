/* TextLab unified offline exporter for the core engine and extra games pack */
(() => {
  "use strict";

  const button = document.querySelector("#btnDownload");
  if (!button) return;

  const escapeInlineScript = (source) => String(source).replace(/<\/script/gi, "<\\/script");
  const escapeInlineStyle = (source) => String(source).replace(/<\/style/gi, "<\\/style");
  const safeFilename = (value) => String(value || "activity")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70) || "activity";

  const notify = (message, type = "success") => {
    if (typeof showLibraryAlert === "function") {
      showLibraryAlert(message, type);
      return;
    }
    const alert = document.querySelector("#libraryAlert");
    if (!alert) return;
    alert.textContent = message;
    alert.dataset.type = type;
    alert.classList.remove("hidden");
    setTimeout(() => alert.classList.add("hidden"), 3500);
  };

  const stripBuilderStartup = (source) => {
    const marker = 'document.addEventListener("DOMContentLoaded"';
    const index = source.lastIndexOf(marker);
    if (index < 0) throw new Error("Không tìm thấy điểm khởi động của TextLab.");
    return source.slice(0, index).trimEnd();
  };

  const readSource = async (filename) => {
    const url = new URL(filename, window.location.href);
    url.searchParams.set("offline-export", String(Date.now()));
    const response = await fetch(url, { cache: "no-store", credentials: "same-origin" });
    if (!response.ok) throw new Error(`Không thể đọc ${filename} (${response.status}).`);
    return response.text();
  };

  const buildBootstrap = (templateId, raw, title) => `
;(() => {
  const __ID__ = ${JSON.stringify(templateId)};
  const __RAW__ = ${JSON.stringify(raw)};
  const __TITLE__ = ${JSON.stringify(title)};
  const __stage = document.getElementById("stage");
  const __fail = (error) => {
    const message = error && error.message ? error.message : String(error || "Unknown error");
    __stage.innerHTML = '<section data-offline-error style="padding:24px;color:#8b1e2d;background:#fff4f5;border:1px solid #f2c6cc;border-radius:18px"><h2 style="margin-top:0">Không thể mở hoạt động</h2><p>' + String(message).replace(/[&<>\"]/g, (character) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[character])) + '</p></section>';
    document.documentElement.dataset.offlineReady = "false";
  };
  window.addEventListener("error", (event) => { if (!__stage.children.length) __fail(event.error || event.message); });
  window.addEventListener("unhandledrejection", (event) => { if (!__stage.children.length) __fail(event.reason); });
  try {
    selectedTemplate = TEMPLATES.find((template) => template.id === __ID__) || { id: __ID__, name: __TITLE__ };
    const data = parseData(__ID__, __RAW__);
    __stage.className = "activity-stage";
    renderActivity(__stage, __ID__, data, { title: __TITLE__, mode: "ready" });
    if (!__stage.children.length && !__stage.textContent.trim()) throw new Error("Hoạt động không tạo được nội dung hiển thị.");
    document.documentElement.dataset.offlineReady = "true";
  } catch (error) {
    __fail(error);
  }
})();`;

  const buildHtml = async (options = {}) => {
    const raw = String(document.querySelector("#contentInput")?.value || "").trim();
    const templateId = selectedTemplate?.id || "activity";
    const title = String(options.titleOverride || selectedTemplate?.name || "Brian Activity").trim();
    const [appSource, extraSource] = await Promise.all([
      readSource("app.js"),
      readSource("extra-games.js")
    ]);
    const script = `${stripBuilderStartup(appSource)}\n${extraSource}\n${buildBootstrap(templateId, raw, title)}`;
    new Function(script);
    const css = typeof EXPORT_CSS !== "undefined"
      ? EXPORT_CSS
      : "body{font-family:system-ui,sans-serif;margin:0;padding:24px;background:#eef6ff}.standalone{max-width:1100px;margin:auto}.activity-stage{background:#fff;border-radius:20px;padding:22px}";
    const safeTitle = String(title).replace(/[&<>\"]/g, (character) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[character]));
    return `<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${safeTitle} - Brian Activity</title><style>${escapeInlineStyle(css)}</style></head><body><main class="standalone"><section class="activity-stage" id="stage" aria-live="polite"></section></main><script>${escapeInlineScript(script)}<\/script></body></html>`;
  };

  const validate = (html) => new Promise((resolve, reject) => {
    const frame = document.createElement("iframe");
    frame.style.cssText = "position:fixed;width:2px;height:2px;opacity:0;pointer-events:none;left:-9999px;top:-9999px";
    let settled = false;
    const finish = (error) => {
      if (settled) return;
      settled = true;
      frame.remove();
      error ? reject(error) : resolve();
    };
    const timeout = setTimeout(() => finish(new Error("Bản offline không khởi động đúng thời gian.")), 6000);
    frame.addEventListener("load", () => {
      setTimeout(() => {
        try {
          const doc = frame.contentDocument;
          const stage = doc?.querySelector("#stage");
          const errorBox = stage?.querySelector("[data-offline-error]");
          const ready = doc?.documentElement?.dataset?.offlineReady;
          clearTimeout(timeout);
          if (errorBox) return finish(new Error(errorBox.textContent.trim()));
          if (!stage || ready !== "true" || (!stage.children.length && !stage.textContent.trim())) {
            return finish(new Error("Bản offline vẫn tạo ra vùng hiển thị trống."));
          }
          finish();
        } catch (error) {
          clearTimeout(timeout);
          finish(error);
        }
      }, 450);
    }, { once: true });
    frame.srcdoc = html;
    document.body.appendChild(frame);
  });

  const buildVerifiedHtml = async (options = {}) => {
    const html = await buildHtml(options);
    await validate(html);
    return html;
  };

  window.BrianTextLabExport = Object.freeze({
    buildHtml,
    validate,
    buildVerifiedHtml,
    safeFilename,
  });

  button.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    const input = document.querySelector("#contentInput");
    if (!input?.value.trim()) return notify("Hãy nhập nội dung trước khi tải hoạt động.", "error");

    const original = button.textContent;
    button.disabled = true;
    button.textContent = "Đang đóng gói 38 template...";
    try {
      const html = await buildVerifiedHtml();
      const filename = `brian-${safeFilename(selectedTemplate?.name || selectedTemplate?.id)}.html`;
      const blob = new Blob(["\uFEFF", html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      notify(`Đã tải ${filename}. File đã được chạy thử trước khi tải.`);
    } catch (error) {
      console.error("Unified offline export failed", error);
      notify(`Chưa thể tạo HTML offline: ${error.message || "lỗi không xác định"}.`, "error");
    } finally {
      button.disabled = false;
      button.textContent = original;
    }
  }, true);
})();
