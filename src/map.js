/* ═══════════════════════════════════════════
   map.js — Leaflet 双视图地图（世界 + 中国）
   支持标记聚类、动画飞行、分类图标
   ═══════════════════════════════════════════ */

const MapComponent = (() => {
  'use strict';

  let map = null;
  let markers = {};
  let currentView = 'world';
  let tileLayer = null;
  let animMarker = null;  // 路线动画标记

  // ── 视图配置 ──
  const views = {
    world: {
      center: [32, 55],
      zoom: 3,
      minZoom: 2,
      maxZoom: 14,
      tileUrl: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      tileAttrib: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
      visibleCategories: null,  // null = 全部可见
    },
    china: {
      center: [37.5, 110],
      zoom: 5,
      minZoom: 4,
      maxZoom: 17,
      tileUrl: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      tileAttrib: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
      // 中国视图下只显示这些类别
      visibleCategories: ['故乡', '求学', '执教', '采风', '长眠'],
    }
  };

  // ── 分类图标 ──
  function getMarkerHTML(loc) {
    const color = loc.color || '#8B4513';
    const iconMap = { '故乡':'乡', '求学':'学', '执教':'教', '留学':'洋', '旅途':'旅', '采风':'风', '长眠':'眠' };
    const icon = iconMap[loc.category] || '●';
    return `<div class="custom-marker pulse" style="background:${color}" data-location-id="${loc.id}">${icon}</div>`;
  }

  // ── 创建弹出卡片（比 tooltip 更丰富） ──
  function createPopupContent(loc) {
    const sceneCount = (loc.scenes && loc.scenes.length > 0) ? loc.scenes.length : 0;
    return `
      <div style="font-family:'Noto Serif SC','STSong','SimSun',serif;max-width:240px;padding:4px">
        <strong style="font-size:14px;color:#B22222;letter-spacing:2px">${loc.name}</strong>
        <span style="font-size:10px;color:#9C948C;margin-left:6px;letter-spacing:1px">${loc.category}</span>
        <p style="font-size:11px;color:#45403B;margin:6px 0;line-height:1.7">${loc.summary}</p>
        <small style="color:#6E6760">${loc.period}</small>
        ${sceneCount > 0 ? `<br><small style="color:#B22222">${sceneCount} 场关联歌剧场次</small>` : ''}
        <br><small style="color:#9C948C">点击查看详情</small>
      </div>`;
  }

  // ── 初始化 ──
  function init(state) {
    const cfg = views.world;
    map = L.map('map', {
      center: cfg.center,
      zoom: cfg.zoom,
      minZoom: cfg.minZoom,
      maxZoom: cfg.maxZoom,
      zoomControl: true,
      attributionControl: false,
      worldCopyJump: true,
    });

    tileLayer = L.tileLayer(cfg.tileUrl, {
      attribution: cfg.tileAttrib,
      maxZoom: cfg.maxZoom,
    }).addTo(map);

    // 创建动画标记（隐藏）
    animMarker = L.circleMarker([0, 0], {
      radius: 0, fillOpacity: 0, opacity: 0,
      color: '#B22222', fillColor: '#B22222',
    }).addTo(map);

    renderMarkers(state.locations);

    App.on('location:selected', onLocationSelected);
    App.on('view:changed', onViewChanged);
    App.on('year:changed', onYearChanged);
    App.on('tour:animate-route', onAnimateRoute);
    App.on('filter:changed', onFilterChanged);

    console.log('[Map] 双视图地图初始化完成');
  }

  // ── 渲染标记 ──
  function renderMarkers(locations) {
    Object.values(markers).forEach(m => map.removeLayer(m));
    markers = {};

    locations.forEach(loc => {
      const icon = L.divIcon({
        className: 'marker-wrapper',
        html: getMarkerHTML(loc),
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        popupAnchor: [0, -16],
      });

      const marker = L.marker([loc.coords[0], loc.coords[1]], {
        icon, riseOnHover: true,
      }).addTo(map);

      marker.bindPopup(createPopupContent(loc), {
        closeButton: false,
        className: 'custom-popup',
      });

      marker.on('click', () => App.selectLocation(loc.id));
      marker.on('mouseover', function() { this.openPopup(); });
      marker.on('mouseout', function() { this.closePopup(); });

      markers[loc.id] = marker;
    });
  }

  // ── 飞至地点 ──
  function flyToLocation(locationId, zoomOverride) {
    const loc = App.getLocation(locationId);
    if (!loc || !markers[locationId]) return;

    const zoomLevel = zoomOverride || (currentView === 'china' ? 9 : 5);
    map.flyTo([loc.coords[0], loc.coords[1]], zoomLevel, {
      duration: 1.5, easeLinearity: 0.25,
    });

    // 高亮当前标记
    Object.values(markers).forEach(m => m.setZIndexOffset(0));
    const m = markers[locationId];
    if (m) {
      m.setZIndexOffset(1000);
      m.openPopup();
      setTimeout(() => m.closePopup(), 3000);
    }
  }

  // ── 路线动画 ──
  function onAnimateRoute(routeCoords, callback) {
    if (!routeCoords || routeCoords.length === 0) {
      if (callback) callback();
      return;
    }

    // 创建移动标记
    animMarker.setLatLng(routeCoords[0]);
    animMarker.setStyle({ radius: 7, fillOpacity: 0.9, opacity: 0.9, weight: 2 });

    let step = 0;
    const total = routeCoords.length;
    const interval = setInterval(() => {
      step++;
      if (step >= total) {
        clearInterval(interval);
        animMarker.setStyle({ radius: 0, fillOpacity: 0, opacity: 0 });
        if (callback) callback();
        return;
      }
      animMarker.setLatLng(routeCoords[step]);
    }, 50); // 每 50ms 走一步

    // 同时飞地图跟随动画标记
    if (routeCoords.length > 10) {
      const mid = routeCoords[Math.floor(routeCoords.length / 2)];
      map.flyTo(mid, currentView === 'china' ? 6 : 4, { duration: 2, easeLinearity: 0.5 });
    }
  }

  // ── 事件处理 ──
  function onLocationSelected(locationId) {
    flyToLocation(locationId);
  }

  function onViewChanged(view) {
    currentView = view;
    const cfg = views[view];

    map.removeLayer(tileLayer);
    tileLayer = L.tileLayer(cfg.tileUrl, {
      attribution: cfg.tileAttrib,
      maxZoom: cfg.maxZoom,
    }).addTo(map);

    map.setMinZoom(cfg.minZoom);
    map.setMaxZoom(cfg.maxZoom);
    map.flyTo(cfg.center, cfg.zoom, { duration: 1.2, easeLinearity: 0.3 });

    // 根据视图显示/隐藏标记
    if (cfg.visibleCategories) {
      Object.entries(markers).forEach(([id, marker]) => {
        const loc = App.getLocation(id);
        if (loc && !cfg.visibleCategories.includes(loc.category)) {
          map.removeLayer(marker);
        } else if (loc && !map.hasLayer(marker)) {
          marker.addTo(map);
        }
      });
    } else {
      // 世界视图：显示全部
      Object.values(markers).forEach(m => {
        if (!map.hasLayer(m)) m.addTo(map);
      });
    }

    App.emit('view:tiles-changed', view);
  }

  function onYearChanged(year) {
    const loc = App.state.locations.find(l => {
      if (!l.years || l.years.length < 2) return false;
      return year >= l.years[0] && year <= l.years[1];
    });
    if (loc && App.state.activeLocationId !== loc.id) {
      App.selectLocation(loc.id);
    }
  }

  function onFilterChanged(filters) {
    Object.entries(markers).forEach(([id, marker]) => {
      const loc = App.getLocation(id);
      if (!loc) return;
      let visible = true;

      // 类别筛选
      if (filters.category && filters.category.length > 0) {
        visible = visible && filters.category.includes(loc.category);
      }
      // 人物筛选
      if (filters.person) {
        const people = loc.people || [];
        visible = visible && people.includes(filters.person);
      }
      // 主题/时期筛选 (locationIds)
      if (filters.locationIds && filters.locationIds.length > 0) {
        visible = visible && filters.locationIds.includes(id);
      }

      if (visible && !map.hasLayer(marker)) marker.addTo(map);
      if (!visible && map.hasLayer(marker)) map.removeLayer(marker);
    });
  }

  return {
    init,
    get map() { return map; },
    get markers() { return markers; },
    get currentView() { return currentView; },
    flyToLocation,
  };
})();
