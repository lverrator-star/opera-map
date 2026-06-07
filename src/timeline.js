/* ═══════════════════════════════════════════
   timeline.js — 增强时间轴 (1891–1934)
   关键事件标记、双向联动、悬浮气泡
   ═══════════════════════════════════════════ */

const TimelineComponent = (() => {
  'use strict';

  let track;
  const START = 1891, END = 1934;

  // 关键事件（含详细描述、关联地点）
  const keyEvents = {
    1891: { text: '生于江阴南沙镇殷家埭', locId: 'jiangyin', icon: '生' },
    1907: { text: '入读常州府中学堂', locId: 'changzhou', icon: '读' },
    1912: { text: '赴沪，入开明剧社，开始翻译生涯', locId: 'shanghai', icon: '译' },
    1917: { text: '受蔡元培破格聘为北大预科教授', locId: 'beijing-beida', icon: '教' },
    1920: { text: '赴伦敦大学大学院留学', locId: 'london', icon: '洋' },
    1921: { text: '转入巴黎大学，自制音鼓浪纹计', locId: 'paris', icon: '研' },
    1925: { text: '获法国国家文学博士，回国', locId: 'beijing-return', icon: '归' },
    1926: { text: '《扬鞭集》《瓦釜集》出版；赵元任为《教我如何不想她》谱曲', locId: 'beijing-return', icon: '著' },
    1931: { text: '主持故宫天坛古乐器测音', locId: 'beijing-return', icon: '乐' },
    1932: { text: '弟刘天华病逝，年仅37岁', locId: 'beijing-return', icon: '哀' },
    1933: { text: '赴河南、山东（曲阜）考察古乐', locId: 'henan-shandong', icon: '考' },
    1934: { text: '绥远采风，染回归热逝世', locId: 'xiangshan', icon: '眠' },
  };

  function init(state) {
    track = document.getElementById('timeline-track');
    if (!track) return;
    renderTicks();
    App.on('location:selected', onLocationSelected);
    App.on('year:changed', onYearChanged);
    App.on('scene:selected', onSceneSelected);
    console.log('[Timeline] 增强时间轴就绪');
  }

  function renderTicks() {
    let html = '';
    for (let y = START; y <= END; y++) {
      const ev = keyEvents[y];
      const cls = ev ? 'timeline-tick key-event' : 'timeline-tick';
      const showLabel = y % 5 === 0 || ev;
      html += `
        <div class="timeline-tick ${ev ? 'key-event' : ''}"
             data-year="${y}"
             ${ev ? `data-loc="${ev.locId}"` : ''}
             title="${ev ? `${y}年：${ev.text}` : `${y}年`}">
          ${showLabel ? `<span class="tick-label">${y}</span>` : ''}
        </div>`;
    }
    track.innerHTML = html;

    // 点击事件
    track.querySelectorAll('.timeline-tick').forEach(tick => {
      tick.addEventListener('click', () => {
        const year = parseInt(tick.dataset.year);
        App.setYear(year);
        const locId = tick.dataset.loc;
        if (locId) App.selectLocation(locId);
      });
    });

    // 初始化悬浮提示（用原生 title 已够用，但也可以做自定义 tooltip）
  }

  function onLocationSelected(locId) {
    const loc = App.getLocation(locId);
    if (!loc || !loc.years || loc.years.length < 2) return;
    const [s, e] = loc.years;

    track.querySelectorAll('.timeline-tick').forEach(tick => {
      const y = parseInt(tick.dataset.year);
      tick.classList.toggle('active', y >= s && y <= e);
    });

    // 滚动到起始年份
    const firstTick = track.querySelector(`.timeline-tick[data-year="${s}"]`);
    firstTick?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }

  function onSceneSelected(sceneId) {
    const loc = App.getLocationByScene(sceneId);
    if (loc) onLocationSelected(loc.id);
  }

  function onYearChanged(year) {
    track.querySelectorAll('.timeline-tick').forEach(tick => {
      const y = parseInt(tick.dataset.year);
      tick.classList.toggle('active', y === year);
    });
  }

  return { init, get keyEvents() { return keyEvents; } };
})();
