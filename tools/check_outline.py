import json
import sys
from pathlib import Path

from build_outline import parse

draft = parse(Path(sys.argv[1]).read_text(encoding='utf-8'))
text = (Path(__file__).resolve().parents[1] / 'outline.js').read_text(encoding='utf-8')
actual = json.loads(text.removeprefix('export default ').removesuffix(';\n'))
assert draft == actual
assert actual['open'] in text
for topic in draft['topics']:
    for part in topic['parts']:
        assert part['lead'] == actual['topics'][int(topic['id'][1:])-1]['parts'][topic['parts'].index(part)]['lead']
        assert part['text'] == actual['topics'][int(topic['id'][1:])-1]['parts'][topic['parts'].index(part)]['text']
for point in draft['news']['points']:
    assert point in actual['news']['points']
print('PASS: OPEN, all 7 topic parts, news link and all 3 news points match the draft exactly')
