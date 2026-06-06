/* ═══════════════════════════════════════════
   routes.js — GeoJSON 路线渲染、视图联动、高亮
   ═══════════════════════════════════════════ */

const RoutesComponent = (() => {
  'use strict';

  let routeLayers = {};
  let allRoutes = null;

  function init(state) {
    allRoutes = state.routes;
    if (!allRoutes || !allRoutes.features) {
      console.warn('[Routes] 无路线数据');
      return;
    }

    renderAllRoutes();
    App.on('view:changed', onViewChanged);
    App.on('location:selected', onLocationSelected);
    console.log('[Routes] 渲染完成:', allRoutes.features.length, '条');
  }

  function renderAllRoutes() {
    allRoutes.features.forEach(feature => {
      const props = feature.properties;
      const coords = feature.geometry.coordinates.map(c => [c[1], c[0]]);

      const style = {
        color: props.color || '#888',
        weight: props.weight || 2.5,
        opacity: props.opacity || 0.7,
        dashArray: props.dashArray || null,
        lineCap: 'round',
        lineJoin: 'round',
      };

      const polyline = L.polyline(coords, style).addTo(MapComponent.map);

      // 装饰箭头标记（在中点显示方向）
      if (coords.length > 2) {
        const mid = coords[Math.floor(coords.length / 2)];
        const decorator = L.circleMarker(mid, {
          radius: 3, color: props.color, fillColor: props.color,
          fillOpacity: 0.9, opacity: 0.8, weight: 0,
        }).addTo(MapComponent.map);
        decorator.bindTooltip(props.name, {
          permanent: false, direction: 'center',
          className: 'route-tooltip',
        });
        polyline._decorator = decorator;
      }

      polyline.on('mouseover', function () {
        this.setStyle({ weight: props.weight + 2, opacity: 1 });
        if (this._decorator) this._decorator.setRadius(6);
      });
      polyline.on('mouseout', function () {
        this.setStyle({ weight: props.weight, opacity: props.opacity });
        if (this._decorator) this._decorator.setRadius(3);
      });
      polyline.on('click', () => {
        L.popup()
          .setLatLng(coords[Math.floor(coords.length / 2)])
          .setContent(`<div style="font-size:13px;line-height:1.7;max-width:280px;font-family:'Noto Sans SC','PingFang SC','Microsoft YaHei',sans-serif"><strong>${props.name}</strong> · ${props.year}年<br><small>${props.description}</small></div>`)
          .openOn(MapComponent.map);
      });

      routeLayers[feature.id] = polyline;
    });
  }

  function onViewChanged(view) {
    Object.entries(routeLayers).forEach(([id, layer]) => {
      const map = MapComponent.map;
      if (view === 'china') {
        if (id === 'route-suiyuan' || id === 'route-london-paris') {
          if (!map.hasLayer(layer)) layer.addTo(map);
        } else {
          if (map.hasLayer(layer)) map.removeLayer(layer);
        }
      } else {
        if (!map.hasLayer(layer)) layer.addTo(map);
      }
    });
  }

  function onLocationSelected(locId) {
    const loc = App.getLocation(locId);
    if (!loc) return;
    const relatedSceneIds = new Set(loc.scenes || []);

    Object.entries(routeLayers).forEach(([id, layer]) => {
      const feature = allRoutes.features.find(f => f.id === id);
      if (!feature) return;
      const featSceneIds = feature.properties.scene_ids || [];
      const isRelated = featSceneIds.some(sid => relatedSceneIds.has(sid));
      layer.setStyle({
        weight: isRelated ? 5 : feature.properties.weight,
        opacity: isRelated ? 1 : feature.properties.opacity * 0.35,
      });
      if (isRelated) layer.bringToFront();
    });
  }

  return { init, get routeLayers() { return routeLayers; } };
})();
