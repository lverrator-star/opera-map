/* ═══════════════════════════════════════════
   knowledge-graph.js — D3.js 力导向人物关系图
   替换原 CSS+SVG 静态图，支持拖拽、缩放、点击
   致敬刘半农的民国学术圈
   ═══════════════════════════════════════════ */

const KnowledgeGraph = (() => {
  'use strict';

  let overlay, container, svg, simulation;
  let nodes = [], links = [];

  // 完整人物关系数据（含权重和分类）
  const graphData = {
    nodes: [
      { id: '刘半农', group: 'center', desc: '文学家·语言学家·新文化先驱', color: '#B22222', size: 22 },
      { id: '蔡元培', group: 'beida', desc: '北大校长·破格聘用', color: '#7A1818', size: 18 },
      { id: '赵元任', group: 'linguist', desc: '语言学家·作曲家·知音', color: '#3D5273', size: 17 },
      { id: '钱玄同', group: 'beida', desc: '新文化战友·合撰双簧信', color: '#7A1818', size: 14 },
      { id: '鲁迅', group: 'beida', desc: '文学家·新青年同人', color: '#7A1818', size: 15 },
      { id: '刘天华', group: 'family', desc: '二弟·国乐大师·《良宵》', color: '#3D6B5D', size: 18 },
      { id: '刘北茂', group: 'family', desc: '三弟·继承国乐事业', color: '#3D6B5D', size: 14 },
      { id: '朱惠', group: 'family', desc: '夫人·风雨携手一生', color: '#A0845C', size: 16 },
      { id: '刘小蕙', group: 'family', desc: '长女·叙事视角', color: '#A0845C', size: 13 },
      { id: '白涤洲', group: 'student', desc: '助手·陪同绥远采风', color: '#5C7A6B', size: 13 },
      { id: '杨步伟', group: 'linguist', desc: '赵元任夫人·江南同乡', color: '#5B7BA0', size: 12 },
      { id: '齐白石', group: 'art', desc: '画家·《审音鉴古图》', color: '#A0845C', size: 12 },
      { id: '徐悲鸿', group: 'art', desc: '画家·光社同人', color: '#A0845C', size: 12 },
      { id: '陈独秀', group: 'beida', desc: '新青年主编·北大文科学长', color: '#7A1818', size: 14 },
      { id: '胡适', group: 'beida', desc: '北大教授·白话文运动', color: '#7A1818', size: 14 },
      { id: '周作人', group: 'beida', desc: '北大教授·散文家', color: '#7A1818', size: 12 },
      { id: '郭沫若', group: 'literary', desc: '诗人·后撰文评价刘半农', color: '#6E6760', size: 11 },
      { id: '萧乾', group: 'literary', desc: '记者·回忆刘半农', color: '#6E6760', size: 10 },
    ],
    links: [
      { source: '刘半农', target: '蔡元培', strength: 0.9, label: '破格聘用·题碑' },
      { source: '刘半农', target: '赵元任', strength: 0.95, label: '毕生知音·谱曲' },
      { source: '刘半农', target: '钱玄同', strength: 0.8, label: '合撰双簧信' },
      { source: '刘半农', target: '鲁迅', strength: 0.7, label: '新青年同人' },
      { source: '刘半农', target: '刘天华', strength: 1.0, label: '同胞兄弟' },
      { source: '刘半农', target: '刘北茂', strength: 0.9, label: '同胞兄弟' },
      { source: '刘半农', target: '朱惠', strength: 1.0, label: '夫妻' },
      { source: '刘半农', target: '刘小蕙', strength: 0.9, label: '父女' },
      { source: '刘半农', target: '白涤洲', strength: 0.7, label: '师生·助手' },
      { source: '刘半农', target: '陈独秀', strength: 0.6, label: '新青年同人' },
      { source: '刘半农', target: '胡适', strength: 0.55, label: '白话文运动' },
      { source: '赵元任', target: '杨步伟', strength: 0.9, label: '夫妻' },
      { source: '刘天华', target: '刘北茂', strength: 0.85, label: '兄弟' },
      { source: '朱惠', target: '刘小蕙', strength: 0.8, label: '母女' },
      { source: '蔡元培', target: '陈独秀', strength: 0.7, label: '聘为文科学长' },
      { source: '蔡元培', target: '胡适', strength: 0.6, label: '北大同事' },
      { source: '鲁迅', target: '钱玄同', strength: 0.5, label: '新青年同人' },
      { source: '鲁迅', target: '周作人', strength: 0.7, label: '兄弟' },
      { source: '齐白石', target: '徐悲鸿', strength: 0.4, label: '画坛同道' },
      { source: '刘半农', target: '郭沫若', strength: 0.3, label: '后世评述' },
      { source: '刘半农', target: '萧乾', strength: 0.3, label: '后世采访' },
    ],
  };

  // 颜色分组
  const groupColors = {
    center: '#B22222',
    beida: '#7A1818',
    linguist: '#3D5273',
    family: '#3D6B5D',
    student: '#5C7A6B',
    art: '#A0845C',
    literary: '#6E6760',
  };

  function init(state) {
    overlay = document.getElementById('graph-overlay');
    // 按钮绑定由 special-pages.js 处理，这里只做 D3 检测

    if (typeof d3 === 'undefined') {
      console.warn('[KnowledgeGraph] D3.js 未加载，回退到静态图');
      return;
    }
    console.log('[KnowledgeGraph] D3 力导向图就绪');
  }

  function render() {
    if (!overlay) return;
    overlay.classList.remove('hidden');

    const content = overlay.querySelector('.overlay-content');
    if (!content) return;

    content.innerHTML = `
      <button class="btn-overlay-close" id="kg-close">✕</button>
      <h2>民国学术圈 · 人物关系网络</h2>
      <p style="color:#6E6760;margin-bottom:12px;font-size:13px">
        以刘半农为中心，辐射新文化运动、现代语言学、国乐改良三大领域。
        <strong>拖拽节点</strong> · <strong>滚轮缩放</strong> · <strong>点击查看详情</strong>
      </p>
      <div id="kg-legend" style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:10px"></div>
      <div id="kg-container" style="width:100%;height:500px;background:#FFF;border:1px solid var(--border);border-radius:var(--radius);overflow:hidden"></div>
      <button id="kg-reset" style="margin-top:10px;padding:6px 16px;border:1px solid var(--border);border-radius:20px;background:#fff;cursor:pointer;font-size:12px;color:var(--text-secondary)">重置布局</button>
    `;

    // 关闭
    content.querySelector('#kg-close').addEventListener('click', () => overlay.classList.add('hidden'));

    // 图例
    const legend = content.querySelector('#kg-legend');
    const groupLabels = {
      center: '核心人物', beida: '北大/新青年', linguist: '语言学同道',
      family: '家庭', student: '学生/助手', art: '艺术圈', literary: '文学圈',
    };
    legend.innerHTML = Object.entries(groupLabels).map(([k, v]) =>
      `<span style="font-size:11px;color:${groupColors[k]};display:flex;align-items:center;gap:4px">
        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${groupColors[k]}"></span>${v}
      </span>`
    ).join('');

    // D3 绑定
    const box = content.querySelector('#kg-container');
    buildGraph(box);

    content.querySelector('#kg-reset').addEventListener('click', () => {
      buildGraph(box);
    });
  }

  function buildGraph(box) {
    if (typeof d3 === 'undefined') {
      box.innerHTML = `<p style="text-align:center;padding:40px;color:var(--text-muted)">D3.js 未加载，请检查网络连接。</p>`;
      return;
    }

    // 清理旧图和 observer
    if (box._resizeObserver) box._resizeObserver.disconnect();
    box.innerHTML = '';
    const W = box.clientWidth;
    const H = box.clientHeight || 500;

    // ResizeObserver: 窗口变化时重建布局
    box._resizeObserver = new ResizeObserver(() => {
      clearTimeout(box._resizeTimer);
      box._resizeTimer = setTimeout(() => buildGraph(box), 250);
    });
    box._resizeObserver.observe(box);

    svg = d3.select(box).append('svg')
      .attr('width', W)
      .attr('height', H)
      .attr('viewBox', [0, 0, W, H]);

    // 缩放
    const g = svg.append('g');
    const zoom = d3.zoom()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => { g.attr('transform', event.transform); });
    svg.call(zoom);

    // 数据深拷贝
    nodes = graphData.nodes.map(n => ({ ...n }));
    links = graphData.links.map(l => ({ ...l }));

    // 力模拟
    simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(d => 120 - d.strength * 50))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(W / 2, H / 2))
      .force('collision', d3.forceCollide().radius(d => d.size + 8));

    // 连线
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#C7C0B8')
      .attr('stroke-width', d => d.strength * 3)
      .attr('stroke-opacity', 0.5)
      .attr('stroke-dasharray', d => d.strength < 0.5 ? '4,4' : null);

    // 连线标签（仅高权重显示）
    const linkLabel = g.append('g')
      .selectAll('text')
      .data(links.filter(l => l.strength >= 0.7))
      .join('text')
      .text(d => d.label)
      .attr('font-size', 10)
      .attr('fill', '#9C948C')
      .attr('text-anchor', 'middle')
      .attr('dy', -4);

    // 节点组
    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'pointer')
      .call(drag(simulation));

    // 节点圆
    node.append('circle')
      .attr('r', d => d.size)
      .attr('fill', d => d.color)
      .attr('stroke', '#fff')
      .attr('stroke-width', 2.5)
      .attr('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))');

    // 中心人物光晕
    node.filter(d => d.group === 'center')
      .append('circle')
      .attr('r', d => d.size + 6)
      .attr('fill', 'none')
      .attr('stroke', '#B22222')
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.3)
      .attr('class', 'kg-halo');

    // 标签
    node.append('text')
      .text(d => d.id)
      .attr('text-anchor', 'middle')
      .attr('dy', d => d.size + 14)
      .attr('font-size', d => d.group === 'center' ? 13 : 11)
      .attr('font-weight', d => d.group === 'center' ? 700 : 400)
      .attr('font-family', "'Noto Sans SC', sans-serif")
      .attr('fill', '#2C2416')
      .attr('pointer-events', 'none');

    // 描述标注（hover显示）
    node.append('title')
      .text(d => `${d.id}\n${d.desc}`);

    // 交互
    node.on('click', (event, d) => {
      event.stopPropagation();
      // 高亮当前节点及其连线
      const connected = new Set();
      links.forEach(l => {
        if (l.source.id === d.id || l.target.id === d.id) {
          connected.add(l.source.id);
          connected.add(l.target.id);
        }
      });

      node.select('circle')
        .attr('stroke', n => connected.has(n.id) ? '#B22222' : '#fff')
        .attr('stroke-width', n => connected.has(n.id) ? 3 : (n.id === d.id ? 3 : 2.5))
        .attr('opacity', n => connected.has(n.id) || n.id === d.id ? 1 : 0.3);

      link
        .attr('stroke-opacity', l => (l.source.id === d.id || l.target.id === d.id) ? 0.9 : 0.1)
        .attr('stroke', l => (l.source.id === d.id || l.target.id === d.id) ? '#B22222' : '#C7C0B8')
        .attr('stroke-width', l => (l.source.id === d.id || l.target.id === d.id) ? 4 : 1);

      // 弹人物卡片
      if (typeof App !== 'undefined') {
        App.emit('person:clicked', d.id);
      }
    });

    // 双击重置
    node.on('dblclick', () => {
      node.select('circle').attr('stroke', '#fff').attr('stroke-width', 2.5).attr('opacity', 1);
      link.attr('stroke', '#C7C0B8').attr('stroke-opacity', 0.5).attr('stroke-width', d => d.strength * 3);
    });

    // 空白区域点击重置
    svg.on('click', () => {
      node.select('circle').attr('stroke', '#fff').attr('stroke-width', 2.5).attr('opacity', 1);
      link.attr('stroke', '#C7C0B8').attr('stroke-opacity', 0.5).attr('stroke-width', d => d.strength * 3);
    });

    // 模拟 tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      linkLabel
        .attr('x', d => (d.source.x + d.target.x) / 2)
        .attr('y', d => (d.source.y + d.target.y) / 2);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // 脉冲动画（中心节点）
    animateHalo();
  }

  function drag(simulation) {
    function dragstarted(event) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }
    function dragged(event) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }
    function dragended(event) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }
    return d3.drag()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended);
  }

  function animateHalo() {
    if (!svg) return;
    const halo = svg.select('.kg-halo');
    if (halo.empty()) return;
    halo.transition()
      .duration(1500)
      .attr('stroke-opacity', 0.8)
      .attr('r', d => d.size + 10)
      .transition()
      .duration(1500)
      .attr('stroke-opacity', 0.2)
      .attr('r', d => d.size + 4)
      .on('end', animateHalo);
  }

  return { init, render };
})();
