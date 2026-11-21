import json
import re
import sys
from pathlib import Path


def cells(line):
    return [c.strip() for c in line.strip().strip('|').split('|')]


def parse(md):
    title = re.search(r'^# .*?"(.+)"', md, re.M)
    if not title:
        raise ValueError('Episode title missing')
    out = {'title': title.group(1), 'meta': {}, 'topics': [], 'news': {}}
    rows = [cells(line) for line in md.splitlines() if line.startswith('|') and not re.match(r'^\|[-| ]+\|$', line)]
    for i, row in enumerate(rows):
        key = row[0]
        if key in ('集數', '地點', '時間', '主持人', '受訪者'):
            out['meta'][key] = row[1]
            if key == '集數' and len(row) > 2:
                out['status'] = row[2].strip('()')
        elif key == 'OPEN':
            out['open'] = row[1]
        elif key.startswith('Topic'):
            body = rows[i + 1][1]
            parts = []
            for match in re.finditer(r'\*\*(.+?)\*\*(.*?)(?=\*\*|$)', body):
                parts.append({'lead': match.group(1), 'text': match.group(2).strip(), 'backup': match.group(1).strip() == '備用追問：'})
            out['topics'].append({'id': f't{len(out["topics"]) + 1}', 'title': row[1], 'parts': parts})
    news = re.search(r'近期新聞：\[(.+?)\]\((.+?)\)', md)
    if not news:
        raise ValueError('News link missing')
    out['news'] = {'label': news.group(1), 'url': news.group(2), 'points': re.findall(r'^- (.+)$', md.split('近期新聞：', 1)[1], re.M)}
    if len(out['topics']) != 3 or any(not t['parts'] for t in out['topics']) or not 2 <= len(out['news']['points']) <= 4:
        raise ValueError('Unexpected draft shape')
    return out


if __name__ == '__main__':
    data = parse(Path(sys.argv[1]).read_text(encoding='utf-8'))
    target = Path(sys.argv[2]) if len(sys.argv) > 2 else Path(__file__).resolve().parents[1] / 'outline.js'
    target.write_text('export default ' + json.dumps(data, ensure_ascii=False, indent=2) + ';\n', encoding='utf-8')
    print(f'Wrote {target}: {len(data["topics"])} topics, {[len(t["parts"]) for t in data["topics"]]} parts, {len(data["news"]["points"])} news points')
