/* ═══════════════════════════════════════════
   audio.js — 场景音频播放模块
   基于歌剧视频提取的真实音频（MP3）
   保留地点主题提示音（Web Audio API）
   ═══════════════════════════════════════════ */

const AudioComponent = (() => {
  'use strict';

  let audioBar, audioTitle, audioPlayBtn, audioCloseBtn;
  let currentTrack = null;
  let audioCtx = null;
  let sceneAudio = null;    // HTML5 Audio for scene playback
  let sceneMeta = null;     // scene_audio.json data
  let activeSceneId = null;
  let isScenePlaying = false;

  // ── 地点主题提示音映射（保留） ──
  const locationThemeMap = {
    'jiangyin': { theme: '江南小调', note: '江阴民歌风格' },
    'beijing-beida': { theme: '新文化运动', note: '慷慨激昂' },
    'london': { theme: '伦敦的雨', note: '曲6《伦敦的雨》动机' },
    'paris': { theme: '巴黎阳光', note: '曲14《走进巴黎的阳光》动机' },
    'sea-route': { theme: '劈开地中海的波涛', note: '曲18' },
    'beijing-return': { theme: '良宵', note: '曲21《团圆》、刘天华《良宵》' },
    'suiyuan': { theme: '山曲儿', note: '绥远采风民歌' },
    'xiangshan': { theme: '听雨', note: '曲27《听雨》、曲28终曲' },
  };

  function init(state) {
    audioBar = document.getElementById('audio-bar');
    audioTitle = audioBar?.querySelector('.audio-title');
    audioPlayBtn = document.getElementById('btn-audio-play');
    audioCloseBtn = document.getElementById('btn-audio-close');

    audioCloseBtn?.addEventListener('click', hideAudioBar);
    audioPlayBtn?.addEventListener('click', toggleScenePlay);

    // 加载场景音频元数据
    fetch('data/scene_audio.json')
      .then(r => r.json())
      .then(data => { sceneMeta = data; })
      .catch(e => console.warn('[Audio] 场景音频数据加载失败:', e));

    App.on('location:selected', onLocationChanged);
    App.on('scene:selected', onSceneSelected);
    console.log('[Audio] 音频模块就绪（场景 MP3 + 主题提示音）');
  }

  // ── 地点切换：播放主题提示音 ──
  function onLocationChanged(locId) {
    const theme = locationThemeMap[locId];
    if (!theme) { hideAudioBar(); return; }
    if (isScenePlaying) return; // 场景音频播放中，不打断
    currentTrack = theme;
    showAudioBar(theme);
    playThemeHint(theme);
  }

  // ── 场景切换：加载场景 MP3 ──
  function onSceneSelected(sceneId) {
    if (!sceneMeta) return;
    const meta = sceneMeta.find(s => s.id === sceneId);
    if (!meta) return;

    activeSceneId = sceneId;
    stopSceneAudio();

    // 显示音频条，状态为"就绪"
    currentTrack = { theme: meta.title, note: meta.subtitle };
    showAudioBar({ theme: meta.title + ' · ' + meta.subtitle, note: '点击播放聆听本场' });
    if (audioPlayBtn) audioPlayBtn.textContent = '▶';
  }

  // ── 播放/暂停场景音频 ──
  function toggleScenePlay() {
    if (!activeSceneId || !sceneMeta) return;
    const meta = sceneMeta.find(s => s.id === activeSceneId);
    if (!meta) return;

    if (isScenePlaying) {
      pauseSceneAudio();
    } else {
      playSceneAudio(meta);
    }
  }

  function updatePanelButton(state) {
    const btn = document.querySelector('.btn-scene-audio');
    if (!btn) return;
    if (state === 'playing') {
      btn.classList.add('playing');
      btn.innerHTML = '&#9646;&#9646;'; // ⏸ pause symbol
    } else {
      btn.classList.remove('playing');
      btn.innerHTML = '&#9835;'; // ♪
    }
  }

  function playSceneAudio(meta) {
    stopAudio(); // 停止任何合成音

    if (!sceneAudio) {
      sceneAudio = new Audio();
      sceneAudio.addEventListener('ended', () => {
        isScenePlaying = false;
        if (audioPlayBtn) audioPlayBtn.textContent = '▶';
        if (audioTitle) audioTitle.textContent = meta.title + ' · ' + meta.subtitle + ' — 播放完毕';
        updatePanelButton('paused');
      });
      sceneAudio.addEventListener('error', () => {
        isScenePlaying = false;
        if (audioPlayBtn) audioPlayBtn.textContent = '▶';
        if (audioTitle) audioTitle.textContent = '音频加载失败';
        console.warn('[Audio] 场景音频加载失败:', meta.file);
      });
    }

    // 如果当前加载的不是这个文件，重新加载
    if (sceneAudio.src.indexOf(meta.file) === -1) {
      sceneAudio.src = meta.file;
      sceneAudio.load();
    }

    sceneAudio.play().then(() => {
      isScenePlaying = true;
      if (audioPlayBtn) audioPlayBtn.textContent = '⏸';
      if (audioTitle) audioTitle.textContent = meta.title + ' · ' + meta.subtitle;
      updatePanelButton('playing');
    }).catch(e => {
      console.warn('[Audio] 播放失败:', e.message);
      if (audioTitle) audioTitle.textContent = '播放失败，请重试';
    });
  }

  function pauseSceneAudio() {
    if (sceneAudio) {
      sceneAudio.pause();
      isScenePlaying = false;
      if (audioPlayBtn) audioPlayBtn.textContent = '▶';
      updatePanelButton('paused');
    }
  }

  function stopSceneAudio() {
    if (sceneAudio) {
      sceneAudio.pause();
      sceneAudio.currentTime = 0;
    }
    isScenePlaying = false;
    if (audioPlayBtn) audioPlayBtn.textContent = '▶';
    updatePanelButton('paused');
  }

  // ── 音频条 UI ──
  function showAudioBar(theme) {
    if (!audioBar) return;
    audioBar.classList.remove('hidden');
    if (audioTitle) audioTitle.textContent = theme ? `${theme.theme} — ${theme.note}` : '';
  }

  function hideAudioBar() {
    stopSceneAudio();
    stopAudio();
    audioBar?.classList.add('hidden');
    activeSceneId = null;
    isScenePlaying = false;
    updatePanelButton('paused');
  }

  function togglePlay() {
    if (isScenePlaying || activeSceneId) {
      toggleScenePlay();
      return;
    }
    if (!audioPlayBtn) return;
    if (audioPlayBtn.textContent === '▶') {
      audioPlayBtn.textContent = '⏸';
      playThemeHint(currentTrack);
    } else {
      audioPlayBtn.textContent = '▶';
      stopAudio();
    }
  }

  function stopAudio() {
    if (audioCtx) {
      audioCtx.close();
      audioCtx = null;
    }
    if (audioPlayBtn && !activeSceneId) audioPlayBtn.textContent = '▶';
  }

  // ── Web Audio 主题提示音（保留） ──
  function playThemeHint(theme) {
    if (!theme) return;
    try {
      if (audioCtx) audioCtx.close();
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const filter = audioCtx.createBiquadFilter();

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);

      const t = audioCtx.currentTime;

      switch (theme.theme) {
        case '伦敦的雨':
          osc.type = 'sine';
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(600, t);
          playSequence(osc, gain, t, [392, 440, 523.25, 440], 0.4);
          break;
        case '巴黎阳光':
          osc.type = 'triangle';
          playSequence(osc, gain, t, [523.25, 659.25, 783.99], 0.3);
          break;
        case '良宵':
          osc.type = 'sine';
          playSequence(osc, gain, t, [293.66, 369.99, 440, 293.66], 0.5);
          break;
        case '山曲儿':
          osc.type = 'sawtooth';
          gain.gain.setValueAtTime(0.05, t);
          playSequence(osc, gain, t, [330, 392, 440, 523.25, 392], 0.25);
          break;
        case '听雨':
          osc.type = 'sine';
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(400, t);
          playSequence(osc, gain, t, [587.33, 523.25, 440, 349.23], 0.6);
          break;
        default:
          osc.type = 'sine';
          playSequence(osc, gain, t, [440, 523.25, 440], 0.3);
      }

      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 3);
      osc.start(t);
      osc.stop(t + 3);
    } catch(e) {
      console.log('[Audio] 播放失败:', e.message);
    }
  }

  function playSequence(osc, gain, startTime, freqs, interval) {
    freqs.forEach((freq, i) => {
      osc.frequency.setValueAtTime(freq, startTime + i * interval);
    });
  }

  // 公开 API
  function playScene(sceneId) {
    onSceneSelected(sceneId);
    setTimeout(() => toggleScenePlay(), 300);
  }

  return {
    init,
    showAudioBar,
    hideAudioBar,
    playThemeHint,
    playScene,
    toggleScenePlay,
    get isScenePlaying() { return isScenePlaying; },
    get activeSceneId() { return activeSceneId; }
  };
})();
