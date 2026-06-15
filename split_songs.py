#!/usr/bin/env python3
"""
Split scene MP3s into individual song MP3s (曲1–曲28).
Uses silencedetect to find song boundaries within each scene,
falling back to proportional splitting.
"""
import subprocess, json, re, os

AUDIO_DIR = r'E:\Claude Code Project\Project\operamap\assets\audio'
SCENE_DIR = os.path.join(AUDIO_DIR, 'scenes')
SONG_DIR  = os.path.join(AUDIO_DIR, 'songs')
os.makedirs(SONG_DIR, exist_ok=True)

# ── Load scene metadata ──
with open(r'E:\Claude Code Project\Project\operamap\scenes.json', 'r', encoding='utf-8') as f:
    scenes_data = json.load(f)

# Map scene-id → number of songs
scene_song_counts = {}
scene_song_ids = {}  # scene-id → [song_number, ...]
song_num = 1
for scene in scenes_data:
    sid = scene['id']
    n = len(scene['songs'])
    scene_song_counts[sid] = n
    scene_song_ids[sid] = [f'曲{song_num + i}' for i in range(n)]
    song_num += n

print(f'Total songs: {song_num - 1} across {len(scenes_data)} scenes')

# ── Detect silence gaps in a scene MP3 ──
def detect_silences(mp3_path, min_dur=1.2, noise_thresh=-38):
    """Return list of (start_sec, end_sec, duration) silence gaps."""
    result = subprocess.run([
        'ffmpeg', '-i', mp3_path,
        '-af', f'silencedetect=noise={noise_thresh}dB:d={min_dur}',
        '-f', 'null', '-'
    ], capture_output=True, text=True, timeout=120)

    silences = []
    events = []
    for line in result.stderr.split('\n'):
        m_s = re.search(r'silence_start:\s*([\d.]+)', line)
        m_e = re.search(r'silence_end:\s*([\d.]+)\s*\|', line)
        m_d = re.search(r'silence_duration:\s*([\d.]+)', line)
        if m_s and not m_e:
            events.append({'type': 'start', 'time': float(m_s.group(1))})
        elif m_e:
            events.append({'type': 'end', 'time': float(m_e.group(1)),
                          'duration': float(m_d.group(1)) if m_d else 0})

    i = 0
    while i < len(events):
        if (i+1 < len(events) and events[i]['type'] == 'start'
            and events[i+1]['type'] == 'end'):
            silences.append({
                'start': events[i]['time'],
                'end': events[i+1]['time'],
                'duration': events[i+1]['duration']
            })
            i += 2
        else:
            i += 1
    return silences

# ── Process each scene ──
all_songs = []  # [{scene_id, song_number, start, end, file}]

for scene in scenes_data:
    sid = scene['id']
    n_songs = scene_song_counts[sid]
    song_ids = scene_song_ids[sid]
    mp3 = os.path.join(SCENE_DIR, f'{sid}.mp3')
    if not os.path.exists(mp3):
        print(f'  ⚠ {sid}: MP3 not found, skipping')
        continue

    # Get total duration
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries',
                        'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1',
                        mp3], capture_output=True, text=True)
    total_dur = float(r.stdout.strip())
    print(f'\n{sid} [{song_ids[0]}–{song_ids[-1]}]: {n_songs} songs, {total_dur:.1f}s')

    if n_songs == 1:
        # Single song scene — no splitting needed
        all_songs.append({
            'scene_id': sid, 'song_number': song_ids[0],
            'start': 0, 'end': total_dur, 'duration': total_dur,
            'file': f'{sid}.mp3'  # Use scene file directly
        })
        # Copy to songs dir
        import shutil
        dst = os.path.join(SONG_DIR, f'{song_ids[0]}.mp3')
        shutil.copy2(mp3, dst)
        print(f'  → {song_ids[0]}: 0.0–{total_dur:.1f}s (single song scene)')
        continue

    # Detect silences
    silences = detect_silences(mp3, min_dur=1.0, noise_thresh=-38)

    # Filter: keep silences 1.5–6s (likely song boundaries)
    candidates = [s for s in silences if 1.5 <= s['duration'] <= 8.0]
    print(f'  Silences >1.0s: {len(silences)}, candidates (1.5–8s): {len(candidates)}')

    # Expected proportional boundaries
    song_dur = total_dur / n_songs
    expected_boundaries = [song_dur * (i + 1) for i in range(n_songs - 1)]

    # Match each expected boundary to the closest candidate silence midpoint
    boundaries = []
    used = set()
    for exp in expected_boundaries:
        best = None
        best_dist = float('inf')
        for ci, cand in enumerate(candidates):
            if ci in used:
                continue
            mid = (cand['start'] + cand['end']) / 2
            dist = abs(mid - exp)
            if dist < best_dist and dist < song_dur * 0.6:  # Within 60% of song length
                best = ci
                best_dist = dist
        if best is not None:
            used.add(best)
            mid = (candidates[best]['start'] + candidates[best]['end']) / 2
            boundaries.append(mid)
            print(f'    boundary ~{mid:.1f}s (matched to expected ~{exp:.1f}s, silence {candidates[best]["duration"]:.1f}s)')
        else:
            boundaries.append(exp)
            print(f'    boundary ~{exp:.1f}s (proportional — no matching silence)')

    # Sort and split
    boundaries = sorted(boundaries)
    segments = []
    prev = 0
    for b in boundaries:
        segments.append((prev, b))
        prev = b
    segments.append((prev, total_dur))

    for si, (start, end) in enumerate(segments):
        song_id = song_ids[si]
        dur = end - start
        out_file = os.path.join(SONG_DIR, f'{song_id}.mp3')
        subprocess.run([
            'ffmpeg', '-y', '-i', mp3, '-ss', str(start), '-to', str(end),
            '-acodec', 'libmp3lame', '-q:a', '2', out_file
        ], capture_output=True, timeout=60)
        size_kb = os.path.getsize(out_file) / 1024
        print(f'    → {song_id}: {start:.1f}–{end:.1f}s ({dur:.1f}s, {size_kb:.0f}KB)')
        all_songs.append({
            'scene_id': sid, 'song_number': song_id,
            'start': round(start, 2), 'end': round(end, 2),
            'duration': round(dur, 2), 'file': f'{song_id}.mp3'
        })

# ── Save song metadata ──
meta_path = os.path.join(AUDIO_DIR, 'song_audio.json')
with open(meta_path, 'w', encoding='utf-8') as f:
    json.dump(all_songs, f, ensure_ascii=False, indent=2)
print(f'\n✓ Song metadata saved to {meta_path}')
print(f'✓ {len(all_songs)} songs in {SONG_DIR}')

# ── Summary ──
total_song_mb = sum(os.path.getsize(os.path.join(SONG_DIR, f)) for f in os.listdir(SONG_DIR) if f.endswith('.mp3')) / 1e6
print(f'  Total song audio: {total_song_mb:.1f} MB')
