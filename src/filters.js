/* ═══════════════════════════════════════════
   filters.js — 多维度筛选（类别、人物、时期、主题）
   ═══════════════════════════════════════════ */

const FilterComponent = (() => {
  'use strict';

  const FILTER_CONFIG = {
    category: {
      label: '类别',
      options: [
        { value: '故乡', label: '故乡', color: '#8B4513' },
        { value: '求学', label: '求学', color: '#8B4513' },
        { value: '执教', label: '执教', color: '#8B0000' },
        { value: '留学', label: '留学', color: '#4169E1' },
        { value: '旅途', label: '旅途', color: '#008B8B' },
        { value: '采风', label: '采风', color: '#556B2F' },
        { value: '长眠', label: '长眠', color: '#4A4A4A' },
      ]
    },
    period: {
      label: '时期',
      options: [
        { value: 'pre-1917', label: '留学前 (1891–1917)', range: [1891, 1917] },
        { value: 'europe', label: '欧洲五年 (1920–1925)', range: [1920, 1925] },
        { value: 'post-1925', label: '回国后 (1925–1934)', range: [1925, 1934] },
      ]
    },
    theme: {
      label: '主题',
      options: [
        { value: 'linguistics', label: '语言学', keywords: ['语音', '实验语音', '四声', '音律', '方言', '国语统一'] },
        { value: 'new-culture', label: '新文化运动', keywords: ['新青年', '文学革命', '白话文', '文学改良'] },
        { value: 'family', label: '家庭情感', keywords: ['朱惠', '刘小蕙', '三兄弟', '刘天华', '团圆'] },
        { value: 'fieldwork', label: '民间采风', keywords: ['采风', '民歌', '号子', '山曲', '方言'] },
      ]
    }
  };

  let activeFilters = { category: [], period: null, theme: null, person: null };

  function init(state) {
    buildFilterUI();
    console.log('[Filters] 筛选组件就绪');
  }

  function buildFilterUI() {
    const container = document.getElementById('filter-bar');
    if (!container) return;

    let html = '<div class="filter-inner">';

    // 类别筛选
    html += '<div class="filter-group"><span class="filter-label">类别</span>';
    FILTER_CONFIG.category.options.forEach(opt => {
      html += `<button class="filter-chip" data-filter="category" data-value="${opt.value}" style="--chip-color:${opt.color}">${opt.label}</button>`;
    });
    html += '</div>';

    // 时期筛选
    html += '<div class="filter-group"><span class="filter-label">时期</span>';
    FILTER_CONFIG.period.options.forEach(opt => {
      html += `<button class="filter-chip" data-filter="period" data-value="${opt.value}">${opt.label}</button>`;
    });
    html += '</div>';

    // 主题筛选
    html += '<div class="filter-group"><span class="filter-label">主题</span>';
    FILTER_CONFIG.theme.options.forEach(opt => {
      html += `<button class="filter-chip" data-filter="theme" data-value="${opt.value}">${opt.label}</button>`;
    });
    html += '</div>';

    // 清除按钮
    html += `<button class="filter-clear" id="btn-clear-filters">✕ 清除筛选</button>`;
    html += '</div>';

    container.innerHTML = html;

    // 绑定事件
    container.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        chip.classList.toggle('active');
        applyFilters();
      });
    });

    document.getElementById('btn-clear-filters')?.addEventListener('click', () => {
      container.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      activeFilters = { category: [], period: null, theme: null, person: null };
      App.clearFilters();
    });
  }

  function applyFilters() {
    const chips = document.querySelectorAll('.filter-chip.active');
    const filters = { category: [], period: null, theme: null };

    chips.forEach(chip => {
      const key = chip.dataset.filter;
      const value = chip.dataset.value;
      if (key === 'category') filters.category.push(value);
      else if (key === 'period') filters.period = filters.period || value;
      else if (key === 'theme') filters.theme = filters.theme || value;
    });

    // Theme filter → convert to category filter logic downstream
    if (filters.theme) {
      const themeConfig = FILTER_CONFIG.theme.options.find(t => t.value === filters.theme);
      if (themeConfig) {
        // Filter locations by keyword match
        App.state.locations.forEach(loc => {
          const text = JSON.stringify(loc).toLowerCase();
          const matches = themeConfig.keywords.some(kw => text.includes(kw.toLowerCase()));
          // We'll handle this via the filter:changed event
        });
      }
    }

    activeFilters = { ...filters, person: activeFilters.person };

    // Emit custom event so MapComponent can filter markers
    App.emit('filter:changed', activeFilters);
  }

  return { init, applyFilters };
})();
