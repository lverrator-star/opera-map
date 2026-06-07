/* ═══════════════════════════════════════════
   special-pages.js — 「她」字专题 + 江阴三杰 + 人物关系
   ═══════════════════════════════════════════ */

const SpecialPages = (() => {
  'use strict';

  function init(state) {
    // 绑定触发按钮
    document.getElementById('btn-she-zi')?.addEventListener('click', openSheZiPage);
    document.getElementById('btn-three-brothers')?.addEventListener('click', openThreeBrothersPage);
    document.getElementById('btn-knowledge-graph')?.addEventListener('click', () => {
      if (typeof KnowledgeGraph !== 'undefined' && typeof d3 !== 'undefined') {
        KnowledgeGraph.render();
      } else {
        openKnowledgeGraph(); // 回退到静态 CSS+SVG
      }
    });

    // 人物点击弹出关系卡
    App.on('person:clicked', openPersonCard);

    console.log('[SpecialPages] 专题页模块就绪');
  }

  // ═══════════════════════════════════════
  // 「她」字专题页
  // ═══════════════════════════════════════
  function openSheZiPage() {
    const overlay = document.getElementById('shezi-overlay');
    if (!overlay) return;
    overlay.classList.remove('hidden');

    const content = overlay.querySelector('.overlay-content');
    if (content) {
      content.innerHTML = `
        <button class="btn-overlay-close" onclick="document.getElementById('shezi-overlay').classList.add('hidden')">✕</button>
        <h2>「她」字的诞生</h2>
        <p style="color:#6B5E4F;margin-bottom:16px">一个字的创造，改变了一个民族的表达方式。</p>

        <div class="shezi-timeline">
          <div class="shezi-step">
            <div class="shezi-year">1920.9</div>
            <h3>伦敦寓所，煤气灯下</h3>
            <p>刘半农在伦敦大学大学院攻读实验语音学时，写下新诗《教我如何不想她》，首次将「她」字引入中国现代诗歌。此前汉语第三人称代词不分性别，「他」兼指男女。刘半农受英文 he/she 启发，提议用「她」作为女性第三人称代词。</p>
            <div class="scene-quote">"天上飘着些微云，地上吹着些微风。<br>啊！微风吹动了我的头发，<br>教我如何不想她？"</div>
          </div>

          <div class="shezi-step">
            <div class="shezi-year">1920–1923</div>
            <h3>争议与论战</h3>
            <p>「她」字的提出引发了激烈争议。保守派认为「何必另造一字」；女权主义者质疑「为什么女性要区别出来」；甚至有人写《她之研究》长文抨击。但刘半农坚持：「她」不是区分性别，而是让女性在语言中被「看见」。</p>
            <p style="font-size:12px;color:var(--text-muted)">歌剧第三场中，赵元任打趣道："从此中华字典里又多了一个'她'！"四人朗声大笑——这个戏剧时刻正是历史真实的写照。</p>
          </div>

          <div class="shezi-step">
            <div class="shezi-year">1926</div>
            <h3>赵元任谱曲</h3>
            <p>语言学家、作曲家赵元任为《教我如何不想她》谱曲，这首歌迅速风靡全国，成为 20 世纪最著名的中国艺术歌曲之一。「她」字随着旋律深入人心，最终被全社会接受。</p>
          </div>

          <div class="shezi-step">
            <div class="shezi-year">1934</div>
            <h3>流风无尽</h3>
            <p>刘半农去世后，鲁迅在《忆刘半农君》中称赞「她」字的创造。如今近百年过去，「她」字已成为现代汉语中使用频率最高的汉字之一。据统计，「她」在当代中文文本中的出现频率约为 0.8%，每 125 个字中就有一个「她」。</p>
          </div>
        </div>

        <hr>
        <p style="text-align:center;font-size:12px;color:var(--text-muted)">
          点击「她」字 → 返回地图，查看伦敦节点中的完整故事
        </p>
        <div style="text-align:center;margin-top:16px">
          <span class="big-she-zi" onclick="App.selectLocation('london');document.getElementById('shezi-overlay').classList.add('hidden')" title="点击回到伦敦">她</span>
        </div>
      `;
    }
  }

  // ═══════════════════════════════════════
  // 江阴三杰专题页
  // ═══════════════════════════════════════
  function openThreeBrothersPage() {
    const overlay = document.getElementById('brothers-overlay');
    if (!overlay) return;
    overlay.classList.remove('hidden');

    const content = overlay.querySelector('.overlay-content');
    if (content) {
      content.innerHTML = `
        <button class="btn-overlay-close" onclick="document.getElementById('brothers-overlay').classList.add('hidden')">✕</button>
        <h2>江阴三杰</h2>
        <p style="color:#6B5E4F;margin-bottom:20px">刘氏三兄弟，一母同胞，各擅胜场。歌剧第七场「音律和鸣」的核心人物。</p>

        <div class="brothers-grid">
          <div class="brother-card" style="border-top:4px solid #C41E3A">
            <h3>刘半农 <small>（刘寿彭）</small></h3>
            <p class="brother-years">1891–1934</p>
            <p class="brother-role">文学先声</p>
            <p>文学家、语言学家、新文化运动先驱。首创「她」字，建立中国第一个语音乐律实验室，以《汉语字声实验录》获法国国家文学博士。</p>
            <p class="brother-works"><strong>代表作：</strong>《扬鞭集》《瓦釜集》《半农杂文》《教我如何不想她》</p>
          </div>

          <div class="brother-card" style="border-top:4px solid #2F5F4F">
            <h3>刘天华 <small>（刘寿椿）</small></h3>
            <p class="brother-years">1895–1932</p>
            <p class="brother-role">国乐叹绝</p>
            <p>中国现代民族音乐一代宗师。改良二胡、琵琶，使民间乐器登上大雅之堂。在天桥采风时染猩红热，37 岁早逝。</p>
            <p class="brother-works"><strong>代表作：</strong>《良宵》《病中吟》《空山鸟语》《光明行》《烛影摇红》</p>
            <p style="font-size:11px;color:var(--accent-vermillion);margin-top:8px">歌剧第七场：刘天华除夕演奏《良宵》，刘半农为其命名；随后传来噩耗。</p>
          </div>

          <div class="brother-card" style="border-top:4px solid #3B5998">
            <h3>刘北茂 <small>（刘寿慈）</small></h3>
            <p class="brother-years">1903–1981</p>
            <p class="brother-role">继志述事</p>
            <p>作曲家、二胡演奏家。两位兄长相继离世后，继承国乐改良事业。创作大量二胡曲，被誉为「刘氏三杰」中最长寿者。</p>
            <p class="brother-works"><strong>代表作：</strong>《汉江潮》《漂泊者之歌》《小花鼓》</p>
            <p style="font-size:11px;color:var(--text-muted);margin-top:8px">歌剧第七场：刘半农托付三弟"北茂啊，国乐改良的事业，往后就靠你和你的学生们了！"</p>
          </div>
        </div>

        <hr>
        <p style="text-align:center;font-size:12px;color:var(--text-muted)">
          歌剧第七场「音律和鸣」以三兄弟除夕团圆为主线 → <a href="javascript:void(0)" onclick="App.selectScene('scene-7');document.getElementById('brothers-overlay').classList.add('hidden')">查看第七场</a>
        </p>
      `;
    }
  }

  // ═══════════════════════════════════════
  // 人物关系卡片（弹窗简化版）
  // ═══════════════════════════════════════
  const PERSON_DB = {
    '刘半农': { role: '文学家·语言学家', birth: '1891', death: '1934', relation: '新文化运动先驱，首创「她」字，建立中国第一个语音乐律实验室', scenes: ['scene-prologue','scene-1','scene-2','scene-3','scene-4','scene-5','scene-6','scene-7','scene-8','scene-9'] },
    '蔡元培': { role: '北大校长', birth: '1868', death: '1940', relation: '破格聘用刘半农为北大教授，题碑文「嗣音有人，流风无尽」', scenes: ['scene-1', 'scene-5', 'scene-9'] },
    '赵元任': { role: '语言学家、作曲家', birth: '1892', death: '1982', relation: '刘半农毕生知音，为《教我如何不想她》谱曲，共同推进国语统一', scenes: ['scene-3', 'scene-5'] },
    '刘天华': { role: '国乐大师', birth: '1895', death: '1932', relation: '二弟，除夕合奏《良宵》，1932年早逝', scenes: ['scene-6', 'scene-7'] },
    '刘北茂': { role: '作曲家', birth: '1903', death: '1981', relation: '三弟，继承国乐改良事业', scenes: ['scene-7'] },
    '朱惠': { role: '刘半农夫人', birth: '?', death: '?', relation: '风雨携手一生，伦敦赶织毛衣贴补家用，巴黎用毛线法助修音鼓', scenes: ['scene-1', 'scene-2', 'scene-3', 'scene-4', 'scene-5', 'scene-8', 'scene-9'] },
    '刘小蕙': { role: '刘半农长女', birth: '1916', death: '?', relation: '剧中叙事视角，童年随父赴欧，全剧以她的回忆串联', scenes: ['scene-prologue', 'scene-2', 'scene-4', 'scene-5', 'scene-9'] },
    '钱玄同': { role: '新文化运动战友', birth: '1887', death: '1939', relation: '合撰《复王敬轩书》，痛批旧文学', scenes: ['scene-1'] },
    '鲁迅': { role: '文学家', birth: '1881', death: '1936', relation: '新青年同人，后写《忆刘半农君》', scenes: [] },
    '白涤洲': { role: '助手、学生', birth: '1900', death: '1934', relation: '协助语音乐律实验室工作，陪同绥远采风', scenes: ['scene-6', 'scene-8'] },
    '杨步伟': { role: '赵元任夫人', birth: '1889', death: '1981', relation: '江南同乡，巴黎时期两对夫妇交情深厚', scenes: ['scene-3', 'scene-5'] },
    '齐白石': { role: '画家', birth: '1864', death: '1957', relation: '1933年为刘半农画《审音鉴古图》', scenes: [] },
    '徐悲鸿': { role: '画家', birth: '1895', death: '1953', relation: '同为光社成员', scenes: [] },
    '陈独秀': { role: '新青年主编', birth: '1879', death: '1942', relation: '北大文科学长，新文化运动领袖', scenes: [] },
    '胡适': { role: '北大教授', birth: '1891', death: '1962', relation: '白话文运动倡导者，与刘半农同为北大同事', scenes: [] },
  };

  function openPersonCard(personName) {
    const info = PERSON_DB[personName];
    if (!info) return;

    const card = document.getElementById('portrait-card');
    if (!card) return;

    // 填充肖像卡片内容
    const initial = document.getElementById('portrait-initial');
    if (initial) initial.textContent = personName.charAt(0);

    const nameEl = document.getElementById('portrait-name');
    if (nameEl) nameEl.textContent = personName;

    const roleEl = document.getElementById('portrait-role');
    if (roleEl) roleEl.textContent = info.role;

    const datesEl = document.getElementById('portrait-dates');
    if (datesEl) {
      datesEl.textContent = (info.birth && info.death && info.birth !== '?')
        ? `${info.birth} – ${info.death}`
        : '';
    }

    const relEl = document.getElementById('portrait-relation');
    if (relEl) relEl.textContent = info.relation;

    // 显示
    card.classList.remove('hidden');
    // 重新触发 animation
    card.style.animation = 'none';
    card.offsetHeight;
    card.style.animation = 'portrait-in 0.35s cubic-bezier(0.6,0.04,0.4,0.94)';
  }

  function hidePortrait() {
    document.getElementById('portrait-card')?.classList.add('hidden');
  }

  // ═══════════════════════════════════════
  // 简化知识图谱（D3 太重，用纯 CSS 卡片网格替代）
  // ═══════════════════════════════════════
  function openKnowledgeGraph() {
    const overlay = document.getElementById('graph-overlay');
    if (!overlay) return;
    overlay.classList.remove('hidden');

    const nodes = [
      { name: '刘半农', color: '#C41E3A', x: 50, y: 40 },
      { name: '蔡元培', color: '#8B0000', x: 40, y: 15 },
      { name: '赵元任', color: '#3B5998', x: 65, y: 20 },
      { name: '钱玄同', color: '#8B0000', x: 30, y: 30 },
      { name: '鲁迅', color: '#8B0000', x: 25, y: 50 },
      { name: '刘天华', color: '#2F5F4F', x: 60, y: 55 },
      { name: '刘北茂', color: '#2F5F4F', x: 70, y: 60 },
      { name: '朱惠', color: '#DAA520', x: 45, y: 65 },
      { name: '刘小蕙', color: '#DAA520', x: 55, y: 70 },
      { name: '白涤洲', color: '#556B2F', x: 75, y: 35 },
      { name: '杨步伟', color: '#9370DB', x: 75, y: 15 },
    ];

    const content = overlay.querySelector('.overlay-content');
    if (content) {
      const nodeHTML = nodes.map(n =>
        `<div class="graph-node" style="left:${n.x}%;top:${n.y}%;border-color:${n.color}" onclick="App.emit('person:clicked','${n.name}')">${n.name}</div>`
      ).join('');

      content.innerHTML = `
        <button class="btn-overlay-close" onclick="document.getElementById('graph-overlay').classList.add('hidden')">✕</button>
        <h2>民国学术圈 · 人物关系网络</h2>
        <p style="color:#6B5E4F;margin-bottom:16px;font-size:13px">以刘半农为中心，辐射新文化运动、现代语言学、国乐改良三大领域。点击人物查看详情。</p>
        <div class="graph-container">
          ${nodeHTML}
          <!-- 关系线用 SVG -->
          <svg class="graph-lines" viewBox="0 0 100 100" preserveAspectRatio="none">
            <line x1="50" y1="40" x2="40" y2="15" stroke="#C41E3A" stroke-width="0.3" opacity="0.5"/>
            <line x1="50" y1="40" x2="65" y2="20" stroke="#3B5998" stroke-width="0.3" opacity="0.6"/>
            <line x1="50" y1="40" x2="30" y2="30" stroke="#8B0000" stroke-width="0.2" opacity="0.4"/>
            <line x1="50" y1="40" x2="25" y2="50" stroke="#8B0000" stroke-width="0.2" opacity="0.4"/>
            <line x1="50" y1="40" x2="60" y2="55" stroke="#2F5F4F" stroke-width="0.4" opacity="0.8"/>
            <line x1="50" y1="40" x2="70" y2="60" stroke="#2F5F4F" stroke-width="0.3" opacity="0.6"/>
            <line x1="50" y1="40" x2="45" y2="65" stroke="#DAA520" stroke-width="0.5" opacity="0.8"/>
            <line x1="50" y1="40" x2="55" y2="70" stroke="#DAA520" stroke-width="0.4" opacity="0.7"/>
            <line x1="50" y1="40" x2="75" y2="35" stroke="#556B2F" stroke-width="0.3" opacity="0.6"/>
            <line x1="65" y1="20" x2="75" y2="15" stroke="#9370DB" stroke-width="0.2" opacity="0.5"/>
            <line x1="40" y1="15" x2="30" y2="30" stroke="#8B0000" stroke-width="0.2" opacity="0.3"/>
            <line x1="60" y1="55" x2="70" y2="60" stroke="#2F5F4F" stroke-width="0.3" opacity="0.6"/>
          </svg>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:12px">
          <span style="font-size:11px;color:#C41E3A">● 刘半农</span>
          <span style="font-size:11px;color:#8B0000">● 北大/新青年</span>
          <span style="font-size:11px;color:#3B5998">● 语言学同道</span>
          <span style="font-size:11px;color:#2F5F4F">● 兄弟</span>
          <span style="font-size:11px;color:#DAA520">● 家庭</span>
          <span style="font-size:11px;color:#556B2F">● 学生/助手</span>
        </div>
      `;
    }
  }

  return { init, openSheZiPage, openThreeBrothersPage, openKnowledgeGraph, openPersonCard, hidePortrait };
})();
