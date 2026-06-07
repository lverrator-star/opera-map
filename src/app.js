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
        if ((d1a < 5 && d1b < 5) || (d2a < 5 && d2b < 5)) {
          return coords.map(c => [c[1], c[0]]); // GeoJSON→Leaflet [lat, lng]
        }
      }
    }
    // 没找到匹配路线，返回直线
    return [[from.coords[0], from.coords[1]], [to.coords[0], to.coords[1]]];
  }

  function dist(a, b) {
    return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2);
  }

  // ── 核心操作 ──
  function selectLocation(locId) {
    if (state.activeLocationId === locId) return;
    state.activeLocationId = locId;
    state.activeSceneId = null;
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
    emit('scene:selected', sceneId);
  }

  function setView(view) {
    if (state.view === view) return;
    state.view = view;
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

  // ── 初始化 ──
  async function init() {
    const ok = await loadData();
    if (!ok) return;

    document.getElementById('loading-overlay')?.classList.add('hidden');

    // 初始化各组件（依赖顺序：地图→路线→面板→时间轴→特殊页面）
    MapComponent.init(state);
    RoutesComponent.init(state);
    PanelComponent.init(state);
    TimelineComponent.init(state);
    if (typeof SpecialPages !== 'undefined') SpecialPages.init(state);
    if (typeof KnowledgeGraph !== 'undefined') KnowledgeGraph.init(state);
    if (typeof ToneLab !== 'undefined') ToneLab.init(state);
    if (typeof FilterComponent !== 'undefined') FilterComponent.init(state);
    if (typeof AudioComponent !== 'undefined') AudioComponent.init(state);

    bindUI();
    setTimeout(() => selectLocation('xiangshan'), 500);
    setTimeout(showGuide, 1500);
    console.log('[App] 初始化完成');
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

    // ESC 关闭面板和浮层
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        document.getElementById('side-panel')?.classList.remove('open');
        document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden'));
        clearFilters();
      }
    });
  }

  // ── Toast 提示 ──
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
    showToast,
  };
})();
