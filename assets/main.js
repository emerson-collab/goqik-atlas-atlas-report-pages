async function loadReports() {
  const loadingEl = document.getElementById("loading");
  const errorEl = document.getElementById("error");
  const listEl = document.getElementById("report-list");
  const summaryEl = document.getElementById("summary-count");

  loadingEl.style.display = "block";
  errorEl.hidden = true;
  listEl.innerHTML = "";

  try {
    const resp = await fetch("data/reports.json?_=" + Date.now());
    if (!resp.ok) throw new Error("HTTP " + resp.status);
    const items = await resp.json();

    window.__REPORTS__ = items;
    loadingEl.style.display = "none";
    summaryEl.textContent = `共 ${items.length} 条演化记录`;
    renderReports(items);
  } catch (e) {
    console.error(e);
    loadingEl.style.display = "none";
    errorEl.hidden = false;
  }
}

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
    const pass = r.gate_status === "pass" || (score != null && threshold != null && Number(score) >= Number(threshold));

    const card = document.createElement("article");
    card.className = "card";

    const left = document.createElement("div");
    const right = document.createElement("div");
    right.className = "card-right";

    left.innerHTML = `
      <div class="card-main-title">${escapeHtml(r.title || r.id)}</div>
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

    right.innerHTML = `
      <div>Law：<code>${escapePath(r.law_file)}</code></div>
      <div>QSPEC：<code>${escapePath(r.qspec_file)}</code></div>
      <div>QEVR：<code>${escapePath(r.qevr_file)}</code></div>
    `;

    const links = document.createElement("div");
    links.className = "card-links";

    if (r.report_html) {
      const a = document.createElement("a");
      a.href = r.report_html;
      a.target = "_blank";
      a.rel = "noopener";
      a.className = "link-btn";
      a.textContent = "查看 HTML 报告";
      links.appendChild(a);
    }

    const a2 = document.createElement("a");
    a2.href = "#";
    a2.className = "link-btn";
    a2.textContent = "上传新草案（预留接口）";
    a2.addEventListener("click", (e) => {
      e.preventDefault();
      alert("上传接口会对接你的私有 API，这里只是预留按钮。");
    });
    links.appendChild(a2);

    right.appendChild(links);

    card.appendChild(left);
    card.appendChild(right);
    listEl.appendChild(card);
  }
}

function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapePath(str) {
  if (!str) return "-";
  return escapeHtml(str.replace(/^.*SS\//, "SS/"));
}

function applyFilters() {
  const all = window.__REPORTS__ || [];
  const domainVal = document.getElementById("filter-domain").value.trim().toLowerCase();
  const gateVal = document.getElementById("filter-gate").value;
  const scoreVal = document.getElementById("filter-score").value.trim();

  let filtered = all.slice();

  if (domainVal) {
    filtered = filtered.filter(r =>
      (r.domain || "").toLowerCase().includes(domainVal) ||
      (r.title || "").toLowerCase().includes(domainVal)
    );
  }

  if (gateVal) {
    filtered = filtered.filter(r => (r.gate_status || "").toLowerCase() === gateVal.toLowerCase());
  }

  if (scoreVal) {
    const min = Number(scoreVal);
    if (!Number.isNaN(min)) {
      filtered = filtered.filter(r => Number(r.overall_score || 0) >= min);
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

window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("filter-domain").addEventListener("input", applyFilters);
  document.getElementById("filter-gate").addEventListener("change", applyFilters);
  document.getElementById("filter-score").addEventListener("input", applyFilters);
  document.getElementById("btn-reset").addEventListener("click", resetFilters);

  loadReports();
});
