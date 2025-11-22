(() => {
  const state = {
    reports: [],
  };

  const els = {};

  function qs(id) {
    return document.getElementById(id);
  }

  function initDom() {
    // 过滤器控件，尽量兼容你之前可能用的不同 id
    els.domain   = qs('filter-domain')     || qs('domain-filter');
    els.gate     = qs('filter-gate')       || qs('gate-filter') || qs('gate-status');
    els.minScore = qs('filter-min-score')  || qs('min-score');
    els.reset    = qs('btn-reset-filters') || qs('reset-filters');

    // 列表区域
    els.list  = qs('report-list')  || qs('evol-list');
    els.count = qs('record-count') || qs('evol-count');

    // Modal 相关
    els.modal      = qs('html-modal');
    els.modalFrame = qs('html-report-frame') || qs('html-modal-iframe');
    els.modalClose = qs('html-modal-close')  || qs('modal-close');

    // 保护：没有这些元素就直接返回，避免报错
    if (!els.list) {
      console.error('[GoQik Atlas] 找不到 report-list 容器，请检查 index.html');
      return;
    }

    // 过滤器事件
    if (els.domain) {
      ['input', 'change'].forEach(evt =>
        els.domain.addEventListener(evt, render)
      );
    }

    if (els.gate) {
      ['input', 'change'].forEach(evt =>
        els.gate.addEventListener(evt, render)
      );
    }

    if (els.minScore) {
      ['input', 'change'].forEach(evt =>
        els.minScore.addEventListener(evt, render)
      );
    }

    if (els.reset) {
      els.reset.addEventListener('click', () => {
        if (els.domain)   els.domain.value   = '';
        if (els.gate)     els.gate.value     = 'all';
        if (els.minScore) els.minScore.value = '0.00';
        render();
      });
    }

    // Modal 事件
    if (els.modalClose) {
      els.modalClose.addEventListener('click', closeModal);
    }
    if (els.modal) {
      // 点击遮罩关闭
      els.modal.addEventListener('click', (e) => {
        if (e.target === els.modal || e.target.classList.contains('modal-backdrop')) {
          closeModal();
        }
      });
      // 确保初始是关闭状态
      closeModal();
    }
  }

  function openModal(url) {
    if (!els.modal) return;
    if (els.modalFrame && url) {
      els.modalFrame.src = url;
    }
    els.modal.classList.remove('hidden');
    // 即使没定义 .hidden，也强制 display
    els.modal.style.display = 'flex';
  }

  function closeModal() {
    if (!els.modal) return;
    if (els.modalFrame) {
      els.modalFrame.src = '';
    }
    els.modal.classList.add('hidden');
    els.modal.style.display = 'none';
  }

  function getFilters() {
    const domain = (els.domain && els.domain.value || '').trim().toLowerCase();
    const gate   = (els.gate && els.gate.value) || 'all';

    let minScore = 0;
    if (els.minScore) {
      const v = parseFloat(els.minScore.value);
      if (!Number.isNaN(v)) {
        minScore = v;
      }
    }
    return { domain, gate, minScore };
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function render() {
    if (!els.list) return;

    const { domain, gate, minScore } = getFilters();
    const frag = document.createDocumentFragment();

    const filtered = state.reports.filter(r => {
      const dom = String(r.domain || '').toLowerCase();
      if (domain && !dom.includes(domain)) return false;

      if (gate === 'pass' && r.gate_status !== 'pass') return false;
      if (gate === 'fail' && r.gate_status !== 'fail') return false;

      if (typeof r.overall_score === 'number' && r.overall_score < minScore) {
        return false;
      }
      return true;
    });

    filtered.forEach(r => {
      const card = document.createElement('article');
      card.className = 'report-card';

      const gateLabel = r.gate_status === 'pass' ? '已通过' : '未通过';
      const gateClass = r.gate_status === 'pass' ? 'tag-success' : 'tag-danger';

      const score = typeof r.overall_score === 'number' ? r.overall_score : 0;
      const threshold = typeof r.threshold === 'number' ? r.threshold : 0;

      card.innerHTML = `
        <div class="report-main">
          <h3 class="report-title">${escapeHtml(r.title || r.id || '')}</h3>
          <div class="report-meta">
            <span>域：${escapeHtml(r.domain || '-')}</span>
            <span>版本：${escapeHtml(r.id || '-')}</span>
            <span>最近更新：${escapeHtml(r.updated_at || '-')}</span>
          </div>
          <div class="report-status">
            <span class="tag ${gateClass}">Gate：${gateLabel}</span>
            <span class="tag">Score：${score.toFixed(2)} / ${threshold.toFixed(2)}</span>
          </div>
          <div class="report-files">
            <div>Law：${escapeHtml(r.law_file || '-')}</div>
            <div>QSPEC：${escapeHtml(r.qspec_file || '-')}</div>
            <div>QEVR：${escapeHtml(r.qevr_file || '-')}</div>
          </div>
        </div>
        <div class="report-actions">
          <button class="btn btn-primary" data-action="view-html">查看 HTML 报告</button>
          <button class="btn btn-secondary" data-action="upload-draft">上传新草案（预留接口）</button>
        </div>
      `;

      const viewBtn   = card.querySelector('[data-action="view-html"]');
      const uploadBtn = card.querySelector('[data-action="upload-draft"]');

      if (viewBtn) {
        viewBtn.addEventListener('click', () => {
          if (r.report_html) {
            openModal(r.report_html);
          } else {
            alert('该记录没有 report_html 路径。');
          }
        });
      }

      if (uploadBtn) {
        uploadBtn.addEventListener('click', () => {
          alert('上传接口会对接你的私有 API，这里只是预留按钮。');
        });
      }

      frag.appendChild(card);
    });

    els.list.innerHTML = '';
    els.list.appendChild(frag);

    if (els.count) {
      els.count.textContent = filtered.length
        ? `共 ${filtered.length} 条演化记录`
        : '暂无符合条件的演化记录';
    }
  }

  async function loadReports() {
    if (!els.list) return;
    try {
      const resp = await fetch('data/reports.json?_=' + Date.now());
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const data = await resp.json();
      state.reports = Array.isArray(data) ? data : [];
      render();
    } catch (err) {
      console.error('[GoQik Atlas] 加载 reports.json 失败', err);
      els.list.innerHTML = '<p class="error">无法加载 reports.json，请确认文件已生成并已同步到 GitHub Pages。</p>';
      if (els.count) els.count.textContent = '';
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    initDom();
    loadReports();
  });
})();
