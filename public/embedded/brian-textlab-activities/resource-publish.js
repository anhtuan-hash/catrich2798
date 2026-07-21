/* Publish a verified TextLab activity to Brian Resource Library */
(() => {
  "use strict";

  const button = document.querySelector("#btnSaveLibrary");
  const dialog = document.querySelector("#resourcePublishModal");
  const form = document.querySelector("#resourcePublishForm");
  const status = document.querySelector("#resourcePublishStatus");
  const submit = document.querySelector("#resourcePublishSubmit");
  if (!button || !dialog || !form || !submit) return;

  const field = (name) => form.elements.namedItem(name);
  let publishing = false;

  const notify = (message, type = "success") => {
    if (typeof showLibraryAlert === "function") showLibraryAlert(message, type);
  };

  const setStatus = (message = "", type = "info") => {
    if (!status) return;
    status.textContent = message;
    status.dataset.type = type;
    status.hidden = !message;
  };

  const selectedSkills = () => [...form.querySelectorAll("[data-resource-skill].active")]
    .map((item) => item.dataset.resourceSkill)
    .filter(Boolean);

  const itemCountOf = (data) => {
    if (Array.isArray(data)) return data.length;
    if (Array.isArray(data?.answers)) return data.answers.length;
    if (Array.isArray(data?.items)) return data.items.length;
    return Number(data?.total || 0);
  };

  const openDialog = (event) => {
    event?.preventDefault?.();
    event?.stopImmediatePropagation?.();
    if (!document.querySelector("#contentInput")?.value.trim()) {
      notify("Hãy nhập nội dung trước khi thêm vào Kho học liệu.", "error");
      return;
    }
    field("title").value = selectedTemplate?.name || "TextLab Activity";
    field("description").value = `Hoạt động tương tác ${selectedTemplate?.name || "TextLab"}, có thể chạy trực tiếp trong Kho học liệu.`;
    field("category").value = "worksheet";
    field("grade").value = "";
    field("schoolYear").value = "2026–2027";
    field("unitName").value = "";
    field("cefr").value = "B1–C1";
    field("tags").value = `textlab, ${selectedTemplate?.tag || "interactive"}`;
    field("allowDownload").checked = false;
    form.querySelectorAll("[data-resource-skill]").forEach((item) => item.classList.remove("active"));
    setStatus("Hoạt động sẽ được đóng gói thành HTML tự chứa và chạy thử trước khi gửi.", "info");
    dialog.showModal();
  };

  button.addEventListener("click", openDialog, true);

  dialog.querySelectorAll("[data-resource-publish-close]").forEach((closeButton) => {
    closeButton.addEventListener("click", () => {
      if (!publishing) dialog.close();
    });
  });

  form.querySelectorAll("[data-resource-skill]").forEach((skillButton) => {
    skillButton.addEventListener("click", () => skillButton.classList.toggle("active"));
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (publishing) return;
    const title = String(field("title").value || "").trim();
    if (!title) {
      setStatus("Hãy nhập tên học liệu.", "error");
      field("title").focus();
      return;
    }
    if (window.parent === window) {
      setStatus("Hãy mở TextLab bên trong Brian để chia sẻ vào Kho học liệu.", "error");
      return;
    }
    if (!window.BrianTextLabExport?.buildVerifiedHtml) {
      setStatus("Bộ đóng gói HTML chưa sẵn sàng. Hãy tải lại ứng dụng.", "error");
      return;
    }

    publishing = true;
    submit.disabled = true;
    submit.textContent = "Đang đóng gói và kiểm tra…";
    setStatus("Đang tạo HTML tự chứa và chạy thử hoạt động…", "info");

    try {
      const raw = String(document.querySelector("#contentInput")?.value || "").trim();
      const activity = parseData(selectedTemplate.id, raw);
      const standaloneHtml = await window.BrianTextLabExport.buildVerifiedHtml({ titleOverride: title });
      setStatus("HTML đã chạy thử thành công. Đang gửi lên Kho học liệu…", "info");
      window.parent.postMessage({
        type: "BTL_PUBLISH_RESOURCE",
        payload: {
          title,
          description: String(field("description").value || "").trim(),
          category: String(field("category").value || "worksheet"),
          grade: String(field("grade").value || "").trim(),
          schoolYear: String(field("schoolYear").value || "").trim(),
          unitName: String(field("unitName").value || "").trim(),
          cefr: String(field("cefr").value || "").trim(),
          tags: String(field("tags").value || "").split(",").map((value) => value.trim()).filter(Boolean),
          skills: selectedSkills(),
          allowDownload: Boolean(field("allowDownload").checked),
          copyright: "self",
          templateId: selectedTemplate.id,
          templateName: selectedTemplate.name,
          content: raw,
          activity,
          itemCount: itemCountOf(activity),
          standaloneHtml,
        },
      }, "*");
    } catch (error) {
      publishing = false;
      submit.disabled = false;
      submit.textContent = "Thêm vào Kho học liệu";
      setStatus(`Không thể chuẩn bị hoạt động: ${error.message || "lỗi không xác định"}.`, "error");
    }
  });

  window.addEventListener("message", (event) => {
    const data = event.data || {};
    if (data.type === "BTL_RESOURCE_PUBLISH_STATE" && data.state === "uploading") {
      setStatus("Đang lưu HTML lên Google Drive và đồng bộ Kho học liệu…", "info");
      return;
    }
    if (data.type !== "BTL_RESOURCE_PUBLISH_RESULT") return;
    publishing = false;
    submit.disabled = false;
    submit.textContent = "Thêm vào Kho học liệu";
    if (!data.ok) {
      setStatus(data.message || "Không thể thêm hoạt động vào Kho học liệu.", "error");
      return;
    }
    setStatus(data.message || "Đã thêm hoạt động vào Kho học liệu.", "success");
    notify(data.message || "Đã thêm hoạt động vào Kho học liệu.");
    window.setTimeout(() => dialog.close(), 1400);
  });
})();
