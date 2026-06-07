/* ═══════════════════════════════════════════
   tone-lab.js — 声调实验室
   浏览器录音 + 波形可视化 + 音高对比
   致敬刘半农的「语音乐律实验室」
   ═══════════════════════════════════════════ */

const ToneLab = (() => {
  'use strict';

  let overlay, canvas, canvasCtx;
  let audioCtx = null;
  let mediaStream = null;
  let mediaRecorder = null;
  let recordedChunks = [];
  let isRecording = false;
  let animationId = null;

  // 可视化的音频数据
  let analyser = null;
  let dataArray = null;

  // 参考音（对应刘半农实验语音学研究的四声调值）
  const REFERENCE_TONES = {
    '阴平': { freq: 220, label: '阴平（第一声）', desc: '高平调 55 → 如「她」字本调', color: '#C41E3A' },
    '阳平': { freq: 280, label: '阳平（第二声）', desc: '高升调 35 → 上扬', color: '#DAA520' },
    '上声': { freq: 180, label: '上声（第三声）', desc: '降升调 214 → 先降后升', color: '#2F5F4F' },
    '去声': { freq: 330, label: '去声（第四声）', desc: '全降调 51 → 急促下降', color: '#3B5998' },
  };

  function init(state) {
    overlay = document.getElementById('tone-lab-overlay');
    canvas = document.getElementById('tone-lab-canvas');
    if (canvas) {
      canvasCtx = canvas.getContext('2d');
      resizeCanvas();
      window.addEventListener('resize', () => { if (overlay && !overlay.classList.contains('hidden')) resizeCanvas(); });
    }

    document.getElementById('btn-tone-lab')?.addEventListener('click', open);
    document.getElementById('btn-tl-close')?.addEventListener('click', () => close());
    overlay?.addEventListener('click', e => { if (e.target === overlay) close(); });
    document.getElementById('btn-tl-record')?.addEventListener('click', toggleRecord);
    document.getElementById('btn-tl-playback')?.addEventListener('click', playRecorded);
    document.getElementById('btn-tl-stop')?.addEventListener('click', stopAll);

    // 参考音按钮
    document.querySelectorAll('.tl-ref-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tone = btn.dataset.tone;
        playReferenceTone(tone);
      });
    });

    console.log('[ToneLab] 声调实验室就绪');
  }

  function resizeCanvas() {
    if (!canvas) return;
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width || 600;
    canvas.height = 200;
    drawIdleWaveform();
  }

  function open() {
    if (!overlay) return;
    overlay.classList.remove('hidden');
    resizeCanvas();
    drawIdleWaveform();
  }

  function close() {
    if (!overlay) return;
    stopAll();
    overlay.classList.add('hidden');
  }

  // ── 录音 ──
  async function toggleRecord() {
    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  }

  async function startRecording() {
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }

      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = audioCtx.createMediaStreamSource(mediaStream);

      // 分析器
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      dataArray = new Uint8Array(analyser.fftSize);

      // MediaRecorder
      recordedChunks = [];
      mediaRecorder = new MediaRecorder(mediaStream);
      mediaRecorder.ondataavailable = e => { if (e.data.size > 0) recordedChunks.push(e.data); };
      mediaRecorder.onstop = () => {
        document.getElementById('btn-tl-playback').disabled = false;
        updateStatus('录音完成 —— 点击播放回听');
      };

      mediaRecorder.start();
      isRecording = true;

      const btn = document.getElementById('btn-tl-record');
      btn.textContent = '停止录音';
      btn.classList.add('recording');
      document.getElementById('btn-tl-playback').disabled = true;
      document.getElementById('btn-tl-status').textContent = '录音中... 请对着麦克风说话或哼唱';
      document.getElementById('btn-tl-status').className = 'tl-status recording';

      animateWaveform();
    } catch (err) {
      updateStatus('无法访问麦克风：' + err.message);
      console.error('[ToneLab] 麦克风错误:', err);
    }
  }

  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    if (mediaStream) {
      mediaStream.getTracks().forEach(t => t.stop());
      mediaStream = null;
    }
    isRecording = false;

    const btn = document.getElementById('btn-tl-record');
    btn.textContent = '开始录音';
    btn.classList.remove('recording');

    cancelAnimationFrame(animationId);
    drawIdleWaveform();
  }

  function stopAll() {
    if (isRecording) stopRecording();
    if (audioCtx) {
      audioCtx.close();
      audioCtx = null;
      analyser = null;
    }
    document.getElementById('btn-tl-playback').disabled = true;
    document.getElementById('btn-tl-status').textContent = '准备就绪 — 点击麦克风按钮开始';
    document.getElementById('btn-tl-status').className = 'tl-status';
  }

  // ── 波形动画 ──
  function animateWaveform() {
    if (!analyser || !dataArray || !canvasCtx || !canvas) return;

    const W = canvas.width;
    const H = canvas.height;
    const sliceWidth = W / dataArray.length;

    canvasCtx.clearRect(0, 0, W, H);

    // 背景网格
    canvasCtx.strokeStyle = '#E8E2D8';
    canvasCtx.lineWidth = 0.5;
    for (let y = 0; y < H; y += 40) {
      canvasCtx.beginPath();
      canvasCtx.moveTo(0, y);
      canvasCtx.lineTo(W, y);
      canvasCtx.stroke();
    }

    // 获取时域数据
    analyser.getByteTimeDomainData(dataArray);

    // 绘制波形
    canvasCtx.beginPath();
    canvasCtx.strokeStyle = '#C41E3A';
    canvasCtx.lineWidth = 2;
    canvasCtx.shadowBlur = 8;
    canvasCtx.shadowColor = 'rgba(196,30,58,0.3)';

    let x = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * H) / 2;
      if (i === 0) canvasCtx.moveTo(x, y);
      else canvasCtx.lineTo(x, y);
      x += sliceWidth;
    }
    canvasCtx.lineTo(W, H / 2);
    canvasCtx.stroke();
    canvasCtx.shadowBlur = 0;

    // 音高估计指示器
    analyser.getByteFrequencyData(dataArray);
    let maxIdx = 0, maxVal = 0;
    for (let i = 10; i < dataArray.length / 2; i++) {
      if (dataArray[i] > maxVal) { maxVal = dataArray[i]; maxIdx = i; }
    }
    const freq = Math.round(maxIdx * audioCtx.sampleRate / analyser.fftSize);
    if (maxVal > 30 && freq > 50 && freq < 2000) {
      canvasCtx.fillStyle = '#C41E3A';
      canvasCtx.font = '12px "Noto Sans SC", sans-serif';
      canvasCtx.fillText(`主频 ≈ ${freq} Hz`, 10, H - 10);
    }

    animationId = requestAnimationFrame(animateWaveform);
  }

  function drawIdleWaveform() {
    if (!canvasCtx || !canvas) return;
    const W = canvas.width;
    const H = canvas.height;
    canvasCtx.clearRect(0, 0, W, H);

    // 网格
    canvasCtx.strokeStyle = '#E8E2D8';
    canvasCtx.lineWidth = 0.5;
    for (let y = 0; y < H; y += 40) {
      canvasCtx.beginPath();
      canvasCtx.moveTo(0, y);
      canvasCtx.lineTo(W, y);
      canvasCtx.stroke();
    }

    // 安静的基线
    canvasCtx.beginPath();
    canvasCtx.strokeStyle = '#D4C9BC';
    canvasCtx.lineWidth = 1;
    canvasCtx.moveTo(0, H / 2);
    canvasCtx.lineTo(W, H / 2);
    canvasCtx.stroke();

    canvasCtx.fillStyle = '#9B8E7F';
    canvasCtx.font = '14px "Noto Serif SC", serif';
    canvasCtx.textAlign = 'center';
    canvasCtx.fillText('等待录音...', W / 2, H / 2 - 20);
    canvasCtx.textAlign = 'start';
  }

  // ── 播放已录制音频 ──
  function playRecorded() {
    if (recordedChunks.length === 0) return;
    const blob = new Blob(recordedChunks, { type: 'audio/webm' });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.onended = () => URL.revokeObjectURL(url);
    audio.play().catch(e => updateStatus('播放失败: ' + e.message));

    // 同时在 canvas 上回放波形
    visualizePlayback(audio);
  }

  function visualizePlayback(audio) {
    // 简化回放可视化
    if (!canvasCtx || !canvas) return;
    const W = canvas.width;
    const H = canvas.height;

    let startTime = null;
    function drawPlayback(timestamp) {
      if (!startTime) startTime = timestamp;
      const elapsed = (timestamp - startTime) / 1000;
      if (elapsed > audio.duration + 0.1 || audio.paused) {
        drawIdleWaveform();
        return;
      }

      canvasCtx.clearRect(0, 0, W, H);
      canvasCtx.strokeStyle = '#E8E2D8';
      canvasCtx.lineWidth = 0.5;
      for (let y = 0; y < H; y += 40) {
        canvasCtx.beginPath();
        canvasCtx.moveTo(0, y);
        canvasCtx.lineTo(W, y);
        canvasCtx.stroke();
      }

      const progress = elapsed / audio.duration;
      const cx = progress * W;

      // 模拟播放波形
      canvasCtx.beginPath();
      canvasCtx.strokeStyle = '#3B5998';
      canvasCtx.lineWidth = 2;
      for (let x = 0; x < cx; x += 2) {
        const y = H / 2 + Math.sin(x * 0.05 + elapsed * 10) * 30 * Math.sin(elapsed * 3) + Math.sin(x * 0.02) * 20;
        if (x === 0) canvasCtx.moveTo(x, y);
        else canvasCtx.lineTo(x, y);
      }
      canvasCtx.stroke();

      // 播放头
      canvasCtx.fillStyle = '#3B5998';
      canvasCtx.beginPath();
      canvasCtx.arc(cx, H / 2, 5, 0, Math.PI * 2);
      canvasCtx.fill();

      canvasCtx.fillStyle = '#9B8E7F';
      canvasCtx.font = '11px "Noto Sans SC", sans-serif';
      canvasCtx.fillText(`回放中 ${elapsed.toFixed(1)}s / ${audio.duration.toFixed(1)}s`, 10, H - 10);

      requestAnimationFrame(drawPlayback);
    }
    requestAnimationFrame(drawPlayback);
  }

  // ── 参考音播放 ──
  function playReferenceTone(toneKey) {
    const ref = REFERENCE_TONES[toneKey];
    if (!ref) return;

    try {
      if (audioCtx) { audioCtx.close(); }
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.type = 'sine';
      const t = audioCtx.currentTime;

      // 根据声调特征生成滑音
      switch (toneKey) {
        case '阴平': // 高平调 55
          osc.frequency.setValueAtTime(ref.freq, t);
          osc.frequency.setValueAtTime(ref.freq, t + 1);
          break;
        case '阳平': // 高升调 35
          osc.frequency.setValueAtTime(ref.freq * 0.8, t);
          osc.frequency.linearRampToValueAtTime(ref.freq, t + 0.8);
          break;
        case '上声': // 降升调 214
          osc.frequency.setValueAtTime(ref.freq, t);
          osc.frequency.linearRampToValueAtTime(ref.freq * 0.6, t + 0.4);
          osc.frequency.linearRampToValueAtTime(ref.freq * 1.1, t + 0.8);
          break;
        case '去声': // 全降调 51
          osc.frequency.setValueAtTime(ref.freq * 1.2, t);
          osc.frequency.exponentialRampToValueAtTime(ref.freq * 0.6, t + 0.6);
          break;
      }

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);

      osc.start(t);
      osc.stop(t + 1.2);

      updateStatus(`播放参考音：${ref.label}`);
      document.getElementById('btn-tl-status').className = 'tl-status';

      // 在 canvas 上绘制参考波形示意
      drawReferenceTone(toneKey);
    } catch (e) {
      updateStatus('播放失败: ' + e.message);
    }
  }

  function drawReferenceTone(toneKey) {
    if (!canvasCtx || !canvas) return;
    const W = canvas.width;
    const H = canvas.height;
    canvasCtx.clearRect(0, 0, W, H);

    // 网格
    canvasCtx.strokeStyle = '#E8E2D8';
    canvasCtx.lineWidth = 0.5;
    for (let y = 0; y < H; y += 40) {
      canvasCtx.beginPath();
      canvasCtx.moveTo(0, y);
      canvasCtx.lineTo(W, y);
      canvasCtx.stroke();
    }

    // 标签
    canvasCtx.fillStyle = '#9B8E7F';
    canvasCtx.font = '11px "Noto Sans SC", sans-serif';
    canvasCtx.fillText('五度标记法（参考）', 10, 16);
    canvasCtx.fillText('5 —— 高', 10, H * 0.15);
    canvasCtx.fillText('1 —— 低', 10, H * 0.85);

    // 五度线
    for (let deg = 1; deg <= 5; deg++) {
      const y = H * (0.85 - (deg - 1) * 0.175);
      canvasCtx.beginPath();
      canvasCtx.strokeStyle = '#E8E2D8';
      canvasCtx.lineWidth = 0.5;
      canvasCtx.moveTo(30, y);
      canvasCtx.lineTo(W, y);
      canvasCtx.stroke();
      canvasCtx.fillStyle = '#9B8E7F';
      canvasCtx.fillText(deg.toString(), 22, y + 4);
    }

    // 声调曲线
    const ref = REFERENCE_TONES[toneKey];
    canvasCtx.beginPath();
    canvasCtx.strokeStyle = ref.color;
    canvasCtx.lineWidth = 3;
    canvasCtx.shadowBlur = 6;
    canvasCtx.shadowColor = ref.color;

    const cx = W * 0.2;
    const cw = W * 0.6;
    const topY = H * 0.15;
    const bottomY = H * 0.85;
    const range = bottomY - topY;

    let x = cx;
    canvasCtx.moveTo(x, bottomY);

    switch (toneKey) {
      case '阴平': // 55
        canvasCtx.lineTo(x + cw, topY);
        break;
      case '阳平': // 35
        canvasCtx.lineTo(x + cw * 0.7, bottomY - range * 0.6);
        canvasCtx.lineTo(x + cw, topY);
        break;
      case '上声': // 214
        canvasCtx.lineTo(x + cw * 0.3, bottomY - range * 0.8);
        canvasCtx.lineTo(x + cw * 0.6, bottomY);
        canvasCtx.lineTo(x + cw, topY);
        break;
      case '去声': // 51
        canvasCtx.lineTo(x + cw, bottomY);
        canvasCtx.moveTo(x, topY);
        canvasCtx.lineTo(x + cw, bottomY);
        break;
    }
    canvasCtx.stroke();
    canvasCtx.shadowBlur = 0;

    // 标注
    canvasCtx.fillStyle = ref.color;
    canvasCtx.font = 'bold 14px "Noto Serif SC", serif';
    canvasCtx.fillText(ref.label, cx + cw + 10, H / 2);

    canvasCtx.fillStyle = '#6B5E4F';
    canvasCtx.font = '11px "Noto Sans SC", sans-serif';
    canvasCtx.fillText(ref.desc, cx + cw + 10, H / 2 + 20);
  }

  function updateStatus(msg) {
    const el = document.getElementById('btn-tl-status');
    if (el) el.textContent = msg;
  }

  return { init, open, close, stopAll };
})();
