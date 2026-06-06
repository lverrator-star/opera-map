/* ═══════════════════════════════════════════
   audio.js — 音频播放器模块
   支持背景音乐切换、节点提示音
   ═══════════════════════════════════════════ */

const AudioComponent = (() => {
  'use strict';

  let audioBar, audioTitle, audioPlayBtn, audioCloseBtn;
  let currentTrack = null;
  let audioCtx = null; // lazy init (needed for user gesture)

  // 模拟音轨映射（每个地点对应一个"主题音轨"标识）
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
    audioPlayBtn?.addEventListener('click', togglePlay);

    App.on('location:selected', onLocationChanged);
    console.log('[Audio] 音频模块就绪');
  }

  function onLocationChanged(locId) {
    const theme = locationThemeMap[locId];
    if (!theme) {
      hideAudioBar();
      return;
    }

    currentTrack = theme;
    showAudioBar(theme);
    playThemeHint(theme);
  }

  function showAudioBar(theme) {
    if (!audioBar) return;
    audioBar.classList.remove('hidden');
    if (audioTitle) audioTitle.textContent = `${theme.theme} — ${theme.note}`;
  }

  function hideAudioBar() {
    audioBar?.classList.add('hidden');
    stopAudio();
  }

  function togglePlay() {
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
    if (audioPlayBtn) audioPlayBtn.textContent = '▶';
  }

  // 用 Web Audio API 生成简短的"主题提示音"（不同地点不同音色）
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

      // 根据主题设置不同音色
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
      // 静默失败 — 音频非关键功能
      console.log('[Audio] 播放失败:', e.message);
    }
  }

  function playSequence(osc, gain, startTime, freqs, interval) {
    freqs.forEach((freq, i) => {
      osc.frequency.setValueAtTime(freq, startTime + i * interval);
    });
  }

  return { init, showAudioBar, hideAudioBar, playThemeHint };
})();
