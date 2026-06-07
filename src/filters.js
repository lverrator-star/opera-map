/* ═══════════════════════════════════════════
   filters.js — 多维度筛选（类别、人物、时期、主题）
   ═══════════════════════════════════════════ */

const FilterComponent = (() => {
  'use strict';

  const FILTER_CONFIG = {
    category: {
      label: '类别',
      options: [
        { value: '故乡', label: '故乡', color: '#8B7355' },
        { value: '求学', label: '求学', color: '#8B7355' },
        { value: '执教', label: '执教', color: '#7A1818' },
        { value: '留学', label: '留学', color: '#3D5273' },
        { value: '旅途', label: '旅途', color: '#5C7A6B' },
        { value: '采风', label: '采风', color: '#3D6B5D' },
        { value: '长眠', label: '长眠', color: '#45403B' },
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

  let activeFilters = { category: [], period: null, theme: null, person: null, locationIds: null };

  function init(state) {
    buildFilterUI();
    console.log('[Filters] 筛选组件就绪');
  }

  // 匹配主题关键词的地点 ID 集合
  function getThemeLocationIds(themeValue) {
    const themeConfig = FILTER_CONFIG.theme.options.find(t => t.value === themeValue);
    if (!themeConfig || !themeConfig.keywords) return null;
    const ids = [];
    App.state.locations.forEach(loc => {
      const haystack = [
        loc.summary, loc.historical_note, loc.category, loc.name,
        ...(loc.works || []).map(w => `${w.title} ${w.note}`),
        ...(loc.opera_scenes || []).map(s => `${s.scene} ${s.desc}`),
        ...(loc.people || []),
      ].join(' ').toLowerCase();
      const matches = themeConfig.keywords.some(kw => haystack.includes(kw.toLowerCase()));
      if (matches) ids.push(loc.id);
    });
    return ids;
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
    html += `<button class="filter-clear" id="btn-clear-filters">清除筛选</button>`;
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
      activeFilters = { category: [], period: null, theme: null, person: null, locationIds: null };
      App.clearFilters();
    });
  }

  function applyFilters() {
    const chips = document.querySelectorAll('.filter-chip.active');
    const filters = { category: [], period: null, theme: null, locationIds: null };

    chips.forEach(chip => {
      const key = chip.dataset.filter;
      const value = chip.dataset.value;
      if (key === 'category') filters.category.push(value);
      else if (key === 'period') filters.period = filters.period || value;
      else if (key === 'theme') filters.theme = filters.theme || value;
    });

    // 主题筛选 → 计算匹配的地点 ID
    if (filters.theme) {
      filters.locationIds = getThemeLocationIds(filters.theme);
    }

    // 时期筛选 → 匹配地点
    if (filters.period) {
      const periodCfg = FILTER_CONFIG.period.options.find(p => p.value === filters.period);
      if (periodCfg && periodCfg.range) {
        const periodIds = [];
        App.state.locations.forEach(loc => {
          if (loc.years && loc.years.length >= 2) {
            const [s, e] = loc.years;
            if (s <= periodCfg.range[1] && e >= periodCfg.range[0]) periodIds.push(loc.id);
          }
        });
        if (filters.locationIds) {
          filters.locationIds = filters.locationIds.filter(id => periodIds.includes(id));
        } else {
          filters.locationIds = periodIds;
        }
      }
    }

    activeFilters = { ...filters, person: activeFilters.person };
    App.emit('filter:changed', activeFilters);
  }

  return { init, applyFilters };
})();
