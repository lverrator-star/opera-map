#!/usr/bin/env python3
"""
Build standalone HTML for opera-map.
Reads all source files, inlines CSS + JSON data,
keeps JS files as separate <script> blocks but removes fetch() for JSON
(embedding data directly instead).
"""
import json
import re
import os

BASE = os.path.dirname(os.path.abspath(__file__))

# ── Read sources ──
with open(os.path.join(BASE, 'index.html'), 'r', encoding='utf-8') as f:
    index = f.read()

with open(os.path.join(BASE, 'src', 'style.css'), 'r', encoding='utf-8') as f:
    css = f.read()

with open(os.path.join(BASE, 'locations.json'), 'r', encoding='utf-8') as f:
    locations = json.load(f)

with open(os.path.join(BASE, 'scenes.json'), 'r', encoding='utf-8') as f:
    scenes = json.load(f)

with open(os.path.join(BASE, 'data', 'journey-routes.geojson'), 'r', encoding='utf-8') as f:
    routes = json.load(f)

with open(os.path.join(BASE, 'data', 'scene_audio.json'), 'r', encoding='utf-8') as f:
    scene_audio = json.load(f)

# ── Read all JS files ──
js_files = [
    'app.js', 'map.js', 'routes.js', 'panel.js',
    'timeline.js', 'special-pages.js', 'knowledge-graph.js',
    'tone-lab.js', 'filters.js', 'audio.js'
]
js_code = {}
for fname in js_files:
    with open(os.path.join(BASE, 'src', fname), 'r', encoding='utf-8') as f:
        js_code[fname] = f.read()

# ── Build standalone HTML ──
# 1. Strip the <link> to external CSS, inject <style>
# 2. Strip the <script> tags, inject combined JS with embedded data
# 3. Remove external script loads for leaflet/d3 (keep CDN)
# 4. Patch app.js loadData() to use embedded data instead of fetch
# 5. Patch audio.js to not fetch scene_audio.json (embed it)

# Start with index.html
html = index

# Replace external CSS link with inline style
html = html.replace(
    '<link rel="stylesheet" href="src/style.css" />',
    '<style>\n' + css + '\n</style>'
)

# Keep CDN links for Leaflet and D3 (remove only our local scripts)
# Remove all local <script src="src/..."> tags
html = re.sub(
    r'<script src="src/[^"]+"></script>\s*',
    '',
    html
)

# Now build the mega JS block
# We need to embed data before app.js loads, so let's create a data preamble
data_preamble = f'''
/* ═══════ EMBEDDED DATA (no fetch needed) ═══════ */
window.__EMBEDDED_LOCATIONS__ = {json.dumps(locations, ensure_ascii=False)};
window.__EMBEDDED_SCENES__ = {json.dumps(scenes, ensure_ascii=False)};
window.__EMBEDDED_ROUTES__ = {json.dumps(routes, ensure_ascii=False)};
window.__EMBEDDED_SCENE_AUDIO__ = {json.dumps(scene_audio, ensure_ascii=False)};
'''

# Combine all JS in dependency order, patching loadData()
combined_js = data_preamble

for fname in js_files:
    code = js_code[fname]

    # Patch app.js: replace loadData() to use embedded data
    if fname == 'app.js':
        # Replace the async loadData function
        code = code.replace(
            "async function loadData() {",
            '''async function loadData() {
    // ═══ STANDALONE: use embedded data instead of fetch ═══
    try {
      state.locations = window.__EMBEDDED_LOCATIONS__;
      state.scenes = window.__EMBEDDED_SCENES__;
      state.routes = window.__EMBEDDED_ROUTES__;
      console.log(`[App] 数据加载: ${state.locations.length} 地点, ${state.scenes.length} 场次, ${state.routes.features.length} 路线 (embedded)`);
      return true;
    } catch (err) { console.error('[App] 加载失败:', err); return false; }
    /*
    // ═══ ORIGINAL fetch version (disabled) ═══
    try {'''
        )
        # Close the replacement: add */ before the original catch
        code = code.replace(
            "    } catch (err) {\n      console.error('[App] 加载失败:', err);\n      alert('数据加载失败，请通过 HTTP 服务器打开（如 python -m http.server 8000）\\n\\n' + err.message);\n      return false;\n    }\n  }",
            "    } catch (err) { console.error('[App] 加载失败:', err); return false; }\n  }\n  */"
        )

    # Patch audio.js: replace fetch for scene_audio.json
    if fname == 'audio.js':
        code = code.replace(
            "fetch('data/scene_audio.json')\n      .then(r => r.json())\n      .then(data => { sceneMeta = data; })\n      .catch(e => console.warn('[Audio] 场景音频数据加载失败:', e));",
            "// ═══ STANDALONE: embedded metadata ═══\n      sceneMeta = window.__EMBEDDED_SCENE_AUDIO__;\n      console.log('[Audio] 场景音频数据已内嵌:', sceneMeta.length, 'tracks');"
        )
        # Also update audio hint to explain no MP3s
        code = code.replace(
            "showAudioBar({ theme: meta.title + ' · ' + meta.subtitle, note: '点击播放聆听本场' });",
            "showAudioBar({ theme: meta.title + ' · ' + meta.subtitle, note: '(演示版不含音频文件)' });"
        )

    combined_js += f'\n/* ═══════ {fname} ═══════ */\n' + code

# Insert the combined JS before </body>
combined_js_block = '<script>\n' + combined_js + '\n</script>'
html = html.replace(
    '<script>\n    document.addEventListener(\'DOMContentLoaded\', () => { App.init(); });\n  </script>',
    combined_js_block + '\n<script>\n    document.addEventListener(\'DOMContentLoaded\', () => { App.init(); });\n  </script>'
)

# Fix portait images path: use relative to repo root (works on GitHub Pages)
# Already relative paths like assets/portraits/..., no change needed

# Add a small banner that this is standalone demo
html = html.replace(
    '</body>',
    '<!-- ═══ STANDALONE BUILD — shareable single-file version ═══ -->\n</body>'
)

# ── Write output ──
out_path = os.path.join(BASE, 'standalone.html')
with open(out_path, 'w', encoding='utf-8') as f:
    f.write(html)

# Report size
size_kb = os.path.getsize(out_path) / 1024
print(f'✓ standalone.html built: {size_kb:.0f} KB')
print(f'  CSS inlined, JSON embedded, JS concatenated')
print(f'  Location: {out_path}')
print(f'  Share via: https://lverrator-star.github.io/opera-map/standalone.html')
