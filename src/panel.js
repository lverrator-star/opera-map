/* ═══════════════════════════════════════════
   panel.js — 抽屉面板（含虚实对照模式）
   剧情/曲目/作品/历史/人物 五Tab
   ═══════════════════════════════════════════ */

const PanelComponent = (() => {
  'use strict';

  let panel, content, locationName;
  let activeTab = 'plot';
  let currentLocation = null;
  let compareMode = false; // 虚实对照模式

  function init(state) {
    panel = document.getElementById('side-panel');
    content = document.getElementById('panel-content');
    locationName = document.getElementById('panel-location-name');

    document.getElementById('btn-close-panel').addEventListener('click', close);
    document.getElementById('side-panel').addEventListener('click', e => {
      if (e.target === panel) close();
    });

    document.querySelectorAll('.panel-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.panel-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeTab = btn.dataset.tab;
        if (currentLocation) renderTab(activeTab, currentLocation);
      });
    });

    App.on('location:selected', onLocationSelected);
    App.on('scene:selected', onSceneSelected);
    console.log('[Panel] 面板就绪（含虚实对照模式）');
  }

  function open() { panel.classList.add('open'); }
  function close() {
    panel.classList.remove('open');
    compareMode = false;
  }

  function onLocationSelected(locId) {
    const loc = App.getLocation(locId);
    if (!loc) return;
    currentLocation = loc;
    locationName.textContent = loc.name;
    activeTab = 'plot';
    document.querySelectorAll('.panel-tab').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === 'plot');
    });
    renderTab('plot', loc);
    open();
  }

  function onSceneSelected(sceneId) {
    const scene = App.getScene(sceneId);
    if (!scene) return;
    const loc = App.getLocationByScene(sceneId);
    if (loc && currentLocation?.id !== loc.id) {
      currentLocation = loc;
      locationName.textContent = loc.name;
    }
    activeTab = 'plot';
    document.querySelectorAll('.panel-tab').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === 'plot');
    });
    renderTab('plot', currentLocation);
    open();
  }

  function renderTab(tab, loc) {
    switch (tab) {
      case 'plot': renderPlot(loc); break;
      case 'music': renderMusic(loc); break;
      case 'works': renderWorks(loc); break;
      case 'history': renderHistory(loc); break;
      case 'people': renderPeople(loc); break;
    }
    content.scrollTop = 0;
  }

  // ── 剧情 Tab（增强版：含虚实对照切换） ──
  function renderPlot(loc) {
    const scenes = App.getScenesByLocation(loc.id);

    let html = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <p style="color:var(--text-secondary);font-size:13px;flex:1">${loc.summary}</p>
        <button style="flex-shrink:0;margin-left:8px;padding:4px 10px;border:1px solid var(--border);border-radius:12px;background:#fff;font-size:11px;cursor:pointer;color:var(--text-secondary)"
                onclick="PanelComponent.toggleCompareMode()">
          ${compareMode ? '📜 纯脚本' : '🔍 虚实对照'}
        </button>
      </div>
    `;

    if (scenes.length === 0) {
      html += `<div style="text-align:center;padding:30px;color:var(--text-muted)">
        <p>该地点暂无直接关联的歌剧场次。</p>
        <p style="font-size:12px;margin-top:8px">但它在刘半农生平中仍占有重要位置。</p>
      </div>`;
      content.innerHTML = html;
      return;
    }

    scenes.forEach(scene => {
      html += `
        <div class="scene-card">
          <div class="scene-title">${scene.title} · ${scene.subtitle}</div>
          <div class="scene-atmosphere">⏱ ${scene.time_setting} &nbsp;|&nbsp; 🎭 ${scene.atmosphere}</div>
          <div class="scene-synopsis">${scene.synopsis}</div>
      `;

      // 虚实对照模式
      if (compareMode && loc.historical_note) {
        html += `
          <div style="margin:8px 0;padding:10px 14px;background:#F0F8E8;border-left:3px solid var(--accent-green);border-radius:0 6px 6px 0;font-size:12px;color:var(--text-secondary);line-height:1.7">
            <strong>📋 史料对照：</strong>${loc.historical_note}
          </div>`;
      }

      // 关键台词
      if (loc.quote_from_script && loc.quote_from_script.lines) {
        html += `<div class="scene-quote">`;
        loc.quote_from_script.lines.forEach(line => {
          html += `"${line}"<br>`;
        });
        html += `<small style="color:var(--text-muted)">—— ${loc.quote_from_script.song}</small></div>`;
      }

      if (scene.key_moment) {
        html += `<p style="font-size:12px;color:var(--accent-vermillion);margin-top:8px">✦ ${scene.key_moment}</p>`;
      }

      if (scene.characters && scene.characters.length > 0) {
        html += `<div class="scene-characters">出场：`;
        scene.characters.forEach(c => {
          html += `<span class="person-chip" onclick="App.emit('person:clicked','${c}')">${c}</span>`;
        });
        html += `</div>`;
      }

      html += `</div>`;
    });

    content.innerHTML = html;
  }

  function toggleCompareMode() {
    compareMode = !compareMode;
    if (currentLocation) renderTab('plot', currentLocation);
  }

  // ── 曲目 Tab ──
  function renderMusic(loc) {
    const scenes = App.getScenesByLocation(loc.id);
    if (scenes.length === 0) {
      content.innerHTML = `<p style="text-align:center;padding:40px;color:var(--text-muted)">该地点暂无关联曲目。</p>`;
      return;
    }

    let html = '';
    let songCount = 0;
    scenes.forEach(scene => {
      if (!scene.songs || scene.songs.length === 0) return;
      html += `<h3>${scene.title} · ${scene.subtitle}</h3>`;
      scene.songs.forEach(song => {
        songCount++;
        html += `
          <div class="song-item" onclick="this.classList.toggle('expanded')">
            <div class="song-number">${song.number}</div>
            <div class="song-title">${song.title}</div>
            <div class="song-performers">🎤 ${song.performers.join(' · ')} &nbsp;|&nbsp; ${song.type}</div>
            <div class="song-lyrics">${song.key_lines.map(l => `"${l}"`).join('<br>')}
              <br><small style="color:var(--text-muted);cursor:pointer;margin-top:4px;display:inline-block" onclick="event.stopPropagation();PanelComponent.playAudioHint('${song.title.replace(/'/g, "\\'")}')">🎵 试听提示音</small>
            </div>
          </div>`;
      });
    });

    if (songCount === 0) html = `<p style="text-align:center;padding:40px;color:var(--text-muted)">该地点暂无关联曲目。</p>`;
    content.innerHTML = html;
  }

  // ── 作品 Tab ──
  function renderWorks(loc) {
    let html = '';
    if (loc.works && loc.works.length > 0) {
      html += `<h3>在此地/时期的创作与成果</h3>`;
      loc.works.forEach(work => {
        html += `
          <div class="work-card">
            <div class="work-title">${work.title}</div>
            <div class="work-meta">📅 ${work.date||''} &nbsp;|&nbsp; 📂 ${work.type||''}</div>
            <div class="work-note">${work.note}</div>
            ${work.excerpt ? `<div class="scene-quote" style="margin-top:8px">${work.excerpt}</div>` : ''}
          </div>`;
      });
    } else {
      html += `<p style="text-align:center;padding:40px;color:var(--text-muted)">该地点暂无关联作品记录。</p>`;
    }
    content.innerHTML = html;
  }

  // ── 历史 Tab（增强版） ──
  function renderHistory(loc) {
    let html = '';

    if (loc.historical_note) {
      html += `
        <div class="history-note" style="border-left:3px solid var(--accent-green)">
          <h3 style="margin-top:0">📋 史料补充</h3>
          <p>${loc.historical_note}</p>
        </div>`;
    }

    html += `
      <div class="history-note">
        <h3 style="margin-top:0">⏱ 基本信息</h3>
        <p><strong>时期：</strong>${loc.period}</p>
        <p><strong>类别：</strong>${loc.category}</p>
        ${loc.name_en ? `<p><strong>英文名：</strong>${loc.name_en}</p>` : ''}
      </div>`;

    if (loc.opera_scenes && loc.opera_scenes.length > 0) {
      html += `<div class="history-note"><h3 style="margin-top:0">🎭 歌剧场次</h3>`;
      loc.opera_scenes.forEach(s => {
        html += `<p style="margin:4px 0"><strong>${s.scene}</strong>：${s.desc}</p>`;
      });
      html += `</div>`;
    }

    // 无脚本关联的提示
    if ((!loc.scenes || loc.scenes.length === 0) && loc.historical_note) {
      html += `
        <div class="history-note" style="border-left:3px solid var(--accent-gold);background:#FFFDF5">
          <p style="font-size:12px;color:var(--text-secondary)">💡 此处为刘半农生平中的重要历史节点，在歌剧脚本中未单独成场，但与前后的戏剧事件紧密关联。</p>
        </div>`;
    }

    // 媒体资源提示
    if (loc.media && (loc.media.images?.length > 0 || loc.media.audio?.length > 0)) {
      html += `<div class="history-note"><h3 style="margin-top:0">📁 媒体资源</h3>`;
      if (loc.media.images?.length > 0) {
        html += `<p>🖼 图像：${loc.media.images.join(', ')}</p>`;
      }
      if (loc.media.audio?.length > 0) {
        html += `<p>🎵 音频：${loc.media.audio.join(', ')}</p>`;
      }
      html += `<p style="font-size:11px;color:var(--text-muted)">媒体文件待后续版本添加。</p></div>`;
    }

    content.innerHTML = html;
  }

  // ── 人物 Tab ──
  function renderPeople(loc) {
    let html = '';
    const locPeople = new Set(loc.people || []);

    if (loc.people && loc.people.length > 0) {
      html += `<h3>与此地相关的人物</h3><div>`;
      loc.people.forEach(person => {
        html += `<span class="person-chip" onclick="App.emit('person:clicked','${person}')">${person}</span>`;
      });
      html += `</div>`;
    }

    const scenes = App.getScenesByLocation(loc.id);
    const sceneChars = new Set();
    scenes.forEach(s => { if (s.characters) s.characters.forEach(c => sceneChars.add(c)); });
    const newChars = [...sceneChars].filter(c => !locPeople.has(c));

    if (newChars.length > 0) {
      html += `<h3>出场人物（脚本）</h3><div>`;
      newChars.forEach(person => {
        html += `<span class="person-chip" onclick="App.emit('person:clicked','${person}')">${person}</span>`;
      });
      html += `</div>`;
    }

    if (locPeople.size === 0 && newChars.length === 0) {
      html += `<p style="text-align:center;padding:40px;color:var(--text-muted)">暂无关联人物信息。</p>`;
    }

    content.innerHTML = html;
  }

  // ── 音频提示（Layer 5 占位：用 Web Audio API 生成简单提示音） ──
  function playAudioHint(title) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      // 简单旋律：do re mi
      const notes = [523.25, 587.33, 659.25];
      let t = ctx.currentTime;
      notes.forEach((freq, i) => {
        osc.frequency.setValueAtTime(freq, t + i * 0.15);
      });
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.6);
      osc.start(t);
      osc.stop(t + 0.6);
      App.showToast(`🎵 "${title}" — 完整音频将随后续版本提供`);
    } catch(e) {
      App.showToast('音频播放需要用户交互授权');
    }
  }

  return {
    init, open, close, toggleCompareMode,
    playAudioHint,
    get currentLocation() { return currentLocation; },
  };
})();
