import argparse
import json
from pathlib import Path

from build_outline import parse

parser = argparse.ArgumentParser(description="Compare a draft with its generated outline module.")
parser.add_argument("draft", type=Path)
parser.add_argument("--target", type=Path, default=Path(__file__).resolve().parents[1] / "outline.js")
args = parser.parse_args()

draft = parse(args.draft.read_text(encoding="utf-8"))
text = args.target.read_text(encoding="utf-8")
actual = json.loads(text.removeprefix("export default ").removesuffix(";\n"))
assert draft == actual, f"Generated outline differs from {args.draft}"
parts = sum(len(topic["parts"]) for topic in draft["topics"])
points = len(draft["news"]["points"])
print(f"PASS: OPEN, all {parts} topic parts, news link and all {points} news points match the draft exactly")
