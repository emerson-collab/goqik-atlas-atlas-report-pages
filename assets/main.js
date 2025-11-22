let allReports = [];
let currentUploadTarget = null;

/** 初始化：加载数据、绑定事件、注入 Modal + 上传控件 */
window.addEventListener("DOMContentLoaded", () => {
  injectModalAndUploadControls();
  bindFilterEvents();
  loadReports();
});

/** 动态注入：预览 Modal + 隐藏文件上传 input */
function injectModalAndUploadControls() {
  const markup = `
    <input id="draft-upload-input" type="file"
           accept=".txt,.md,.qson,.json,.yaml,.yml"
           hidden />
    <div id="modal-backdrop" class="modal-backdrop" hidden>
      <div class="modal">
        <div class="modal-header">
          <span id="modal-title" class="modal-header-title"></span>
          <button id="modal-close" class="modal-close" title="关闭">&times;</button>
        </div>
        <iframe id="modal-iframe" class="modal-iframe" src="about:blank"></iframe>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", markup);

  const backdrop = document.getElementById("modal-backdrop");
  const btnClose = document.getElementById("modal-close");
  const uploadInput = document.getElementById("draft-upload-input");

  btnClose.addEventListener("click", closeModal);
  backdrop.addEventListener("click", (e) => {
    if (e.target.id === "modal-backdrop") {
      closeModal();
    }
  });

  uploadInput.addEventListener("change", () => {
    if (!uploadInput.files.length || !currentUploadTarget) return;
    const file = uploadInput.files[0];
    uploadDraft(file, currentUploadTarget);
    uploadInput.value = "";
  });
}

/** 载入 reports/index.json（在公开仓里叫 data/reports.json） */
async function loadReports() {
  const loadingEl = document.getElementById("loading");
  const errorEl = document.getElementById("error");
  const summaryEl = document.getElementById("summary-count");

  loadingEl.style.display = "block";
  errorEl.hidden = true;

  try {
    const resp = await fetch("data/reports.json?_=" + Date.now());
    if (!resp.ok) throw new Error("HTTP " + resp.status);
    const items = await resp.json();

    allReports = items || [];
    loadingEl.style.display = "none";
    summaryEl.textContent = `共 ${allReports.length} 条演化记录`;
    renderReports(allReports);
  } catch (e) {
    console.error(e);
    loadingEl.style.display = "none";
    errorEl.hidden = false;
  }
}

/** 渲染列表 */
function renderReports(items) {
  const listEl = document.getElementById("report-list");
  listEl.innerHTML = "";

  if (!items || !items.length) {
    listEl.innerHTML = "<div class='muted'>暂无演化记录。</div>";
    return;
  }

  for (const r of items) {
    const score = r.overall_score;
    const threshold = r.threshold;
    const pass = (r.gate_status || "").toLowerCase() === "pass" ||
      (score != null && threshold != null && Number(score) >= Number(threshold));

    const card = document.createElement("article");
    card.className = "card";

    const left = document.createElement("div");
    const right = document.createElement("div");
    right.className = "card-right";

    left.innerHTML = `
      <div class="card-main-title">${escapeHtml(r.title || r.id || "")}</div>
      <div class="card-meta">
        域：<code>${escapeHtml(r.domain || "-")}</code> ·
        版本：<code>${escapeHtml(r.id || "-")}</code><br/>
        最近更新：<span>${escapeHtml(r.updated_at || "-")}</span>
      </div>
      <div class="card-tags">
        <span class="tag-pill ${pass ? "pass" : "fail"}">
          Gate：${pass ? "通过" : "未通过"}
        </span>
        <span class="tag-pill">
          Score：<span class="score-value ${pass ? "score-pass" : "score-fail"}">
            ${score != null ? score : "-"}
          </span> / ${threshold != null ? threshold : "-"}
        </span>
      </div>
    `;

    const lawPath = escapePath(r.law_file);
    const qspecPath = escapePath(r.qspec_file);
    const qevrPath = escapePath(r.qevr_file);

    right.innerHTML = `
      <div>Law：<code>${lawPath}</code></div>
      <div>QSPEC：<code>${qspecPath}</code></div>
      <div>QEVR：<code>${qevrPath}</code></div>
    `;

    const links = document.createElement("div");
    links.className = "card-links";

    // 1）查看 HTML 报告：用 Modal 预览（失败则退回新窗口）
    if (r.report_html) {
      const btnView = document.createElement("button");
      btnView.type = "button";
      btnView.className = "link-btn";
      btnView.textContent = "查看 HTML 报告";
      btnView.addEventListener("click", () => {
        openReportPreview(r.report_html, r.title || r.id || r.report_html);
      });
      links.appendChild(btnView);
    }

    // 2）上传新草案：触发文件选择 + 调用后端 API
    const btnUpload = document.createElement("button");
    btnUpload.type = "button";
    btnUpload.className = "link-btn";
    btnUpload.textContent = "上传新草案（预留接口）";
    btnUpload.addEventListener("click", () => {
      currentUploadTarget = r;
      const input = document.getElementById("draft-upload-input");
      if (!input) {
        alert("未找到上传控件，请检查 main.js 初始化。");
        return;
      }
      input.click();
    });
    links.appendChild(btnUpload);

    right.appendChild(links);
    card.appendChild(left);
    card.appendChild(right);
    listEl.appendChild(card);
  }
}

/** 打开报告预览 Modal */
function openReportPreview(url, title) {
  if (!url) return;

  const backdrop = document.getElementById("modal-backdrop");
  const iframe = document.getElementById("modal-iframe");
  const titleEl = document.getElementById("modal-title");

  // 如果 Modal 没注入成功，退回用新窗口打开
  if (!backdrop || !iframe || !titleEl) {
    window.open(url, "_blank", "noopener");
    return;
  }

  titleEl.textContent = title || url;
  iframe.src = url;
  backdrop.hidden = false;
}

/** 关闭 Modal */
function closeModal() {
  const backdrop = document.getElementById("modal-backdrop");
  const iframe = document.getElementById("modal-iframe");
  if (backdrop) backdrop.hidden = true;
  if (iframe) iframe.src = "about:blank";
}

/** 上传草案：这里是前端占位逻辑，真正接入时只改 endpoint 即可 */
function uploadDraft(file, report) {
  // TODO: 把这个地址换成你私有域的上传 API，比如：
  // const endpoint = "https://your-internal-api.example.com/upload-law";
  const endpoint = "https://YOUR_UPLOAD_API_ENDPOINT/upload-law";

  // 先给出直观反馈，确认选到了什么文件 + 对应哪条报告
  alert(
    [
      "已选择草案文件： " + file.name,
      "将用于演化的报告 ID： " + (report.id || ""),
      "",
      "前端会向后端发送 multipart/form-data 请求。",
      "当前 endpoint 只是占位，需要你在 main.js 中替换为真实接口地址。",
    ].join("\n")
  );

  // 下面是真正的请求逻辑，现阶段你可以先保留/注释，等有后端再打开
  const form = new FormData();
  form.append("file", file);
  form.append("report_id", report.id || "");
  form.append("domain", report.domain || "");
  form.append("title", report.title || "");

  // 示例：直接发请求（没有真实 endpoint 会报错，这是预期的）
  fetch(endpoint, {
    method: "POST",
    body: form,
  })
    .then((resp) => {
      if (!resp.ok) {
        throw new Error("HTTP " + resp.status);
      }
      return resp.json().catch(() => ({}));
    })
    .then((data) => {
      console.log("upload response:", data);
      // 可以约定后端返回 { message, new_report_id, new_report_html } 等
      alert("草案已上传。后端会自动执行演化。\n（具体状态以后端实现为准）");
    })
    .catch((err) => {
      console.error(err);
      // 静态站这边只能提示：请求失败；真正的错误排查要看后端日志
      // 这里不再重复 alert，避免双重打扰
    });
}

/** 过滤相关 */
function bindFilterEvents() {
  const fDomain = document.getElementById("filter-domain");
  const fGate = document.getElementById("filter-gate");
  const fScore = document.getElementById("filter-score");
  const btnReset = document.getElementById("btn-reset");

  if (fDomain) fDomain.addEventListener("input", applyFilters);
  if (fGate) fGate.addEventListener("change", applyFilters);
  if (fScore) fScore.addEventListener("input", applyFilters);
  if (btnReset) btnReset.addEventListener("click", resetFilters);
}

function applyFilters() {
  const domainVal = (document.getElementById("filter-domain").value || "")
    .trim()
    .toLowerCase();
  const gateVal = (document.getElementById("filter-gate").value || "").trim();
  const scoreVal = (document.getElementById("filter-score").value || "").trim();

  let filtered = allReports.slice();

  if (domainVal) {
    filtered = filtered.filter((r) => {
      const d = (r.domain || "").toLowerCase();
      const t = (r.title || "").toLowerCase();
      const id = (r.id || "").toLowerCase();
      return d.includes(domainVal) || t.includes(domainVal) || id.includes(domainVal);
    });
  }

  if (gateVal) {
    filtered = filtered.filter(
      (r) => (r.gate_status || "").toLowerCase() === gateVal.toLowerCase()
    );
  }

  if (scoreVal) {
    const min = Number(scoreVal);
    if (!Number.isNaN(min)) {
      filtered = filtered.filter((r) => Number(r.overall_score || 0) >= min);
    }
  }

  document.getElementById("summary-count").textContent = `当前显示 ${filtered.length} 条记录`;
  renderReports(filtered);
}

function resetFilters() {
  document.getElementById("filter-domain").value = "";
  document.getElementById("filter-gate").value = "";
  document.getElementById("filter-score").value = "";
  applyFilters();
}

/** 小工具：转义 HTML / 美化路径 */
function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapePath(str) {
  if (!str) return "-";
  return escapeHtml(String(str).replace(/^.*SS\//, "SS/"));
}
