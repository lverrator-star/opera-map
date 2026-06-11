/* ═══════════════════════════════════════════
   app.js — 全局应用状态、事件总线、数据加载
   协调整合所有组件
   ═══════════════════════════════════════════ */

const App = (() => {
  'use strict';

  const state = {
    view: 'world',
    locations: [],
    scenes: [],
    routes: null,
    activeLocationId: null,
    activeSceneId: null,
    activeYear: null,
    isPlaying: false,
    playTimer: null,
    playQueue: [],
    playQueueIdx: 0,
    filters: { category: [], person: null, period: null },
  };

  // ── 事件总线 ──
  const listeners = {};
  function on(event, fn) { (listeners[event] ??= []).push(fn); }
  function off(event, fn) {
    const arr = listeners[event];
    if (arr) { const i = arr.indexOf(fn); if (i !== -1) arr.splice(i, 1); }
  }
  function emit(event, data) {
    (listeners[event] || []).forEach(fn => { try { fn(data); } catch (e) { console.error('[Event]', event, e); } });
  }

  // ── 数据加载 ──
  async function loadJSON(path) {
    const resp = await fetch(path);
    if (!resp.ok) throw new Error(`${path} (${resp.status})`);
    return resp.json();
  }

  async function loadData() {
    try {
      const [locations, scenes, routes] = await Promise.all([
        loadJSON('locations.json'),
        loadJSON('scenes.json'),
        loadJSON('data/journey-routes.geojson')
      ]);
      state.locations = locations;
      state.scenes = scenes;
      state.routes = routes;
      console.log(`[App] 数据加载: ${locations.length} 地点, ${scenes.length} 场次, ${routes.features.length} 路线`);
      return true;
    } catch (err) {
      console.error('[App] 加载失败:', err);
      alert('数据加载失败，请通过 HTTP 服务器打开（如 python -m http.server 8000）\n\n' + err.message);
      return false;
    }
  }

  // ── 辅助函数 ──
  function getLocation(id) { return state.locations.find(l => l.id === id); }
  function getScene(id) { return state.scenes.find(s => s.id === id); }
  function getScenesByLocation(locId) {
    const loc = getLocation(locId);
    if (!loc || !loc.scenes) return [];
    return loc.scenes.map(id => getScene(id)).filter(Boolean);
  }
  function getLocationByScene(sceneId) {
    const sc = getScene(sceneId);
    if (!sc || !sc.location_ids) return null;
    return getLocation(sc.location_ids[0]);
  }

  // ── 路线数据辅助 ──
  function getRouteCoordsBetween(fromLocId, toLocId) {
    const from = getLocation(fromLocId);
    const to = getLocation(toLocId);
    if (!from || !to) return [];

    // GeoJSON 是 [lng, lat]，locations.json 是 [lat, lng]，需统一格式比较
    if (state.routes && state.routes.features) {
      for (const feat of state.routes.features) {
        const coords = feat.geometry.coordinates;
        // GeoJSON first/last: [lng, lat] → 转为 [lat, lng] 以便与 locations.coords 比较
        const first = [coords[0][1], coords[0][0]];
        const last = [coords[coords.length - 1][1], coords[coords.length - 1][0]];
        const d1a = dist(first, from.coords), d1b = dist(last, to.coords);
        const d2a = dist(first, to.coords), d2b = dist(last, from.coords);
        if ((d1a < 50 && d1b < 50) || (d2a < 50 && d2b < 50)) {
          return coords.map(c => [c[1], c[0]]); // GeoJSON→Leaflet [lat, lng]
        }
      }
    }
    // 没找到匹配路线，返回直线
    return [[from.coords[0], from.coords[1]], [to.coords[0], to.coords[1]]];
  }

  function dist(a, b) {
    // Haversine 公式：准确计算球面距离 (km)
    const R = 6371;
    const dLat = (b[0] - a[0]) * Math.PI / 180;
    const dLon = (b[1] - a[1]) * Math.PI / 180;
    const lat1 = a[0] * Math.PI / 180;
    const lat2 = b[0] * Math.PI / 180;
    const sinDLat = Math.sin(dLat / 2);
    const sinDLon = Math.sin(dLon / 2);
    const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
    return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }

  // ── 核心操作 ──
  function selectLocation(locId) {
    if (state.activeLocationId === locId) return;
    state.activeLocationId = locId;
    state.activeSceneId = null;
    updateHash();
    emit('location:selected', locId);
  }

  function selectScene(sceneId) {
    if (state.activeSceneId === sceneId) return;
    state.activeSceneId = sceneId;
    const loc = getLocationByScene(sceneId);
    if (loc) {
      state.activeLocationId = loc.id;
      emit('location:selected', loc.id);
    }
    updateHash();
    emit('scene:selected', sceneId);
  }

  function setView(view) {
    if (state.view === view) return;
    state.view = view;
    updateHash();
    emit('view:changed', view);
  }

  function setYear(year) {
    if (state.activeYear === year) return;
    state.activeYear = year;
    emit('year:changed', year);
  }

  // ── 筛选 ──
  function setFilter(key, value) {
    state.filters[key] = value;
    emit('filter:changed', state.filters);
  }

  function clearFilters() {
    state.filters = { category: [], person: null, period: null, locationIds: null };
    emit('filter:changed', state.filters);
  }

  // ── 增强播放全程（Layer 2：含路线动画） ──
  const TOUR_SEQUENCE = [
    { locId: 'xiangshan', sceneId: 'scene-prologue' },
    { locId: 'beijing-beida', sceneId: 'scene-1' },
    { locId: 'london', sceneId: 'scene-2' },
    { locId: 'london', sceneId: 'scene-3' },
    { locId: 'paris', sceneId: 'scene-4' },
    { locId: 'paris', sceneId: 'scene-5' },
    { locId: 'beijing-return', sceneId: 'scene-6' },
    { locId: 'beijing-return', sceneId: 'scene-7' },
    { locId: 'suiyuan', sceneId: 'scene-8' },
    { locId: 'xiangshan', sceneId: 'scene-9' },
  ];

  function togglePlayTour() {
    state.isPlaying ? stopTour() : startTour();
  }

  function startTour() {
    state.isPlaying = true;
    state.playQueueIdx = 0;
    const btn = document.getElementById('btn-play-tour');
    btn.textContent = '停止';
    btn.classList.add('playing');
    showProgress();
    advanceTour();
  }

  function stopTour() {
    state.isPlaying = false;
    if (state.playTimer) clearTimeout(state.playTimer);
    const btn = document.getElementById('btn-play-tour');
    btn.textContent = '播放';
    btn.classList.remove('playing');
    hideProgress();
    emit('tour:stopped');
  }

  function showProgress() {
    let bar = document.getElementById('tour-progress');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'tour-progress';
      bar.innerHTML = '<span class="tp-label"></span><span class="tp-bar-wrap"><span class="tp-bar"></span></span>';
      document.body.appendChild(bar);
    }
    bar.classList.remove('hidden');
  }

  function hideProgress() {
    document.getElementById('tour-progress')?.classList.add('hidden');
  }

  function updateProgress() {
    const bar = document.getElementById('tour-progress');
    if (!bar || !state.isPlaying) return;
    const idx = state.playQueueIdx;
    const total = TOUR_SEQUENCE.length;
    const step = TOUR_SEQUENCE[Math.min(idx, total - 1)];
    const label = bar.querySelector('.tp-label');
    const fill = bar.querySelector('.tp-bar');
    if (label && step) {
      const sc = getScene(step.sceneId);
      label.textContent = `${idx + 1}/${total}  ${sc ? sc.title + ' · ' + sc.subtitle : ''}`;
    }
    if (fill) fill.style.width = `${(idx / total) * 100}%`;
  }

  function advanceTour() {
    if (!state.isPlaying || state.playQueueIdx >= TOUR_SEQUENCE.length) {
      stopTour();
      return;
    }

    updateProgress();
    const step = TOUR_SEQUENCE[state.playQueueIdx];
    const prevStep = state.playQueueIdx > 0 ? TOUR_SEQUENCE[state.playQueueIdx - 1] : null;

    // 如果地点变了，先飞地图
    if (!prevStep || prevStep.locId !== step.locId) {
      // 地点变了 → 飞地图 + 路线动画
      if (prevStep) {
        const routeCoords = getRouteCoordsBetween(prevStep.locId, step.locId);
        if (routeCoords.length > 2) {
          // 有路线数据，做动画
          emit('tour:animate-route', routeCoords);
          // 等动画走完再继续
          state.playTimer = setTimeout(() => {
            selectScene(step.sceneId);
            state.playQueueIdx++;
            state.playTimer = setTimeout(advanceTour, 3500);
          }, Math.min(routeCoords.length * 50, 3000));
          return;
        }
      }
      // 直接飞
      MapComponent.flyToLocation(step.locId);
    }

    selectScene(step.sceneId);
    state.playQueueIdx++;
    state.playTimer = setTimeout(advanceTour, 3500);
  }

  // ── URL Hash 状态管理 ──
  function updateHash() {
    const parts = [];
    if (state.activeLocationId) parts.push('loc=' + state.activeLocationId);
    if (state.activeSceneId) parts.push('scene=' + state.activeSceneId);
    if (state.view !== 'world') parts.push('view=' + state.view);
    const hash = parts.length ? '#' + parts.join('&') : '';
    if (window.location.hash !== hash) {
      history.replaceState(null, '', hash || window.location.pathname);
    }
  }

  function restoreFromHash() {
    const raw = window.location.hash.replace(/^#/, '');
    if (!raw) return false;
    const params = {};
    raw.split('&').forEach(p => {
      const [k, v] = p.split('=');
      if (k && v) params[k] = decodeURIComponent(v);
    });
    if (params.view) setView(params.view);
    if (params.scene) { selectScene(params.scene); return true; }
    if (params.loc) { selectLocation(params.loc); return true; }
    return false;
  }

  window.addEventListener('hashchange', () => restoreFromHash());
  async function init() {
    const ok = await loadData();
    if (!ok) return;

    document.getElementById('loading-overlay')?.classList.add('hidden');

    // 初始化各组件（依赖顺序：地图→路线→面板→时间轴→特殊页面）
    // 每个组件独立 try-catch，单个失败不影响其他
    const initModule = (name, fn) => {
      try { fn(state); console.log(`[App] ${name} 就绪`); }
      catch (e) { console.error(`[App] ${name} 初始化失败:`, e); }
    };
    initModule('Map', MapComponent.init);
    initModule('Routes', RoutesComponent.init);
    initModule('Panel', PanelComponent.init);
    initModule('Timeline', TimelineComponent.init);
    if (typeof SpecialPages !== 'undefined') initModule('SpecialPages', SpecialPages.init);
    if (typeof KnowledgeGraph !== 'undefined') initModule('KnowledgeGraph', KnowledgeGraph.init);
    if (typeof ToneLab !== 'undefined') initModule('ToneLab', ToneLab.init);
    if (typeof FilterComponent !== 'undefined') initModule('Filters', FilterComponent.init);
    if (typeof AudioComponent !== 'undefined') initModule('Audio', AudioComponent.init);

    bindUI();
    const restored = restoreFromHash();
    if (!restored) {
      setTimeout(() => selectLocation('xiangshan'), 500);
      // 初始展示刘半农肖像
      setTimeout(() => emit('person:clicked', '刘半农'), 800);
    }
    setTimeout(showGuide, 1500);
    console.log('[App] 初始化完成');

    // ── 防伪水印 ──
    console.log(
      '%c 教我如何不想她 · 刘半农生平地理叙事 %c数字伴生作品\n' +
      '%c制作者：李司略\n' +
      '北京大学歌剧研究院 25 级硕士 | 香港大学经济管理学院 24 级硕士 | 中山大学岭南学院 20 级本科\n\n' +
      '%c未经授权禁止转载、复制或用于商业用途。',
      'font-family:"Noto Serif SC",serif;font-size:16px;color:#B22222;',
      'font-size:12px;color:#9C948C;',
      'font-size:12px;color:#1C1A18;',
      'font-size:9px;color:#9C948C;letter-spacing:1px;'
    );
  }

  // ── 首次引导 ──
  function showGuide() {
    const guides = [
      '点击地图上的汉字标记查看地点详情',
      '点击左侧「序 – 玖」按场次浏览歌剧',
      '点击底部时间轴跳转到不同年份',
    ];
    let i = 0;
    showToast(guides[0]);
    const timer = setInterval(() => {
      i++;
      if (i >= guides.length) { clearInterval(timer); return; }
      showToast(guides[i]);
    }, 3500);
  }

  // ── UI 事件绑定 ──
  function bindUI() {
    // 视图切换
    document.querySelectorAll('.view-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.view-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        setView(btn.dataset.view);
      });
    });

    // 播放全程
    document.getElementById('btn-play-tour')?.addEventListener('click', togglePlayTour);

    // 关于
    const aboutBtn = document.getElementById('btn-about');
    const aboutOverlay = document.getElementById('about-overlay');
    if (aboutBtn && aboutOverlay) {
      aboutBtn.addEventListener('click', () => aboutOverlay.classList.remove('hidden'));
      aboutOverlay.querySelector('.btn-overlay-close')?.addEventListener('click', () => aboutOverlay.classList.add('hidden'));
      aboutOverlay.addEventListener('click', e => { if (e.target === aboutOverlay) aboutOverlay.classList.add('hidden'); });
    }

    // 场次导航
    document.querySelectorAll('.scene-nav-item').forEach(btn => {
      btn.addEventListener('click', () => selectScene(btn.dataset.scene));
    });

    // 场景选中高亮
    on('scene:selected', sceneId => {
      document.querySelectorAll('.scene-nav-item').forEach(b => b.classList.remove('active'));
      document.querySelector(`.scene-nav-item[data-scene="${sceneId}"]`)?.classList.add('active');
    });

    on('location:selected', locId => {
      document.querySelectorAll('.scene-nav-item').forEach(b => b.classList.remove('active'));
      const loc = getLocation(locId);
      if (loc && loc.scenes && loc.scenes.length > 0) {
        document.querySelector(`.scene-nav-item[data-scene="${loc.scenes[0]}"]`)?.classList.add('active');
      }
    });

    // 人物点击
    on('person:clicked', personName => {
      setFilter('person', personName);
      // 弹提示
      showToast(`已筛选与「${personName}」相关的节点`);
    });

    // 人物浮层关闭（点击遮罩）
    const personOverlay = document.getElementById('person-overlay');
    if (personOverlay) {
      personOverlay.addEventListener('click', e => {
        if (e.target === personOverlay) personOverlay.classList.add('hidden');
      });
    }

    // ESC 关闭面板和浮层
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        document.getElementById('side-panel')?.classList.remove('open');
        document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden'));
        document.getElementById('search-results')?.classList.add('hidden');
        document.getElementById('portrait-card')?.classList.add('hidden');
        clearFilters();
      }
    });

    // 肖像卡片关闭按钮
    document.getElementById('btn-portrait-close')?.addEventListener('click', () => {
      document.getElementById('portrait-card')?.classList.add('hidden');
    });

    // 点击肖像卡片 → 打开详细人物浮层
    document.getElementById('portrait-card')?.addEventListener('click', (e) => {
      if (e.target.id === 'btn-portrait-close') return;
      const nameEl = document.getElementById('portrait-name');
      if (!nameEl) return;
      const name = nameEl.textContent;
      // 显示旧的人物详情浮层（含高亮按钮）
      showPersonOverlay(name);
    });

    // 点击地图空白区域关闭肖像卡片
    document.getElementById('map')?.addEventListener('click', () => {
      document.getElementById('portrait-card')?.classList.add('hidden');
    });

    // 地点搜索
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    if (searchInput && searchResults) {
      searchInput.addEventListener('input', () => {
        const q = searchInput.value.trim().toLowerCase();
        if (!q) { searchResults.classList.add('hidden'); return; }
        const matches = state.locations.filter(loc =>
          loc.name.includes(q) || loc.name_en?.toLowerCase().includes(q) ||
          loc.category.includes(q) || loc.summary.includes(q) ||
          (loc.people || []).some(p => p.includes(q))
        );
        if (matches.length === 0) {
          searchResults.innerHTML = '<div class="search-no-result">无匹配地点</div>';
        } else {
          searchResults.innerHTML = matches.map(loc => `
            <div class="search-result-item" data-loc="${loc.id}">
              <span class="sr-period">${loc.period}</span>
              <div class="sr-name">${loc.name}</div>
              <div class="sr-meta">${loc.category}</div>
            </div>`).join('');
        }
        searchResults.classList.remove('hidden');
      });
      searchResults.addEventListener('click', e => {
        const item = e.target.closest('.search-result-item');
        if (item) {
          selectLocation(item.dataset.loc);
          searchResults.classList.add('hidden');
          searchInput.value = '';
        }
      });
      searchInput.addEventListener('blur', () => {
        setTimeout(() => searchResults.classList.add('hidden'), 200);
      });
      searchInput.addEventListener('focus', () => {
        if (searchInput.value.trim()) searchResults.classList.remove('hidden');
      });
    }
  }

  // ── 人物详情浮层 ──
  function showPersonOverlay(personName) {
    const overlay = document.getElementById('person-overlay');
    const content = overlay?.querySelector('.overlay-content');
    if (!overlay || !content) return;

    const loc = state.locations.find(l => (l.people || []).includes(personName));
    const locName = loc ? loc.name : '';

    content.innerHTML = `
      <button class="btn-overlay-close" onclick="document.getElementById('person-overlay').classList.add('hidden')">×</button>
      <h2>${personName}</h2>
      ${locName ? `<p style="color:var(--ink-light);font-size:12px;letter-spacing:1px">关联地点：${locName}</p>` : ''}
      <button style="margin-top:12px;padding:6px 16px;border:1px solid var(--vermillion);background:transparent;color:var(--vermillion);cursor:pointer;font-family:var(--font-serif);font-size:12px;letter-spacing:2px"
              onclick="App.setFilter('person','${personName}');document.getElementById('person-overlay').classList.add('hidden');document.getElementById('portrait-card').classList.add('hidden')">
        在地图上高亮与「${personName}」相关的地点
      </button>
    `;
    overlay.classList.remove('hidden');
  }
  function showToast(msg) {
    let toast = document.getElementById('toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), 2500);
  }

  return {
    init, on, off, emit,
    get state() { return state; },
    getLocation, getScene, getScenesByLocation, getLocationByScene,
    getRouteCoordsBetween,
    selectLocation, selectScene, setView, setYear,
    setFilter, clearFilters,
    togglePlayTour, startTour, stopTour,
    showToast, showPersonOverlay,
  };
})();
