"""Manual-review-only visual diff of paired screenshots: NEVER releases production."""
import json
import sys
from pathlib import Path
from PIL import Image, ImageChops, ImageEnhance
if len(sys.argv) != 2:
    raise SystemExit("usage: python scripts/bmpe-visual-diff.py reports/bmpe-visual")
root = Path(sys.argv[1])
a = json.loads((root / "baseline-manifest.json").read_text())
b = json.loads((root / "candidate-manifest.json").read_text())
assert len(a["captures"]) == len(b["captures"]) == 8
changes = []
for left, right in zip(a["captures"], b["captures"]):
    assert (left["route"], left["viewport"]) == (right["route"], right["viewport"])
    item = {"route": left["route"], "viewport": left["viewport"], "baseline": left["filename"], "candidate": right["filename"], "status": "NOT_VERIFIED"}
    if left["status"] != "CAPTURED_FOR_MANUAL_REVIEW" or right["status"] != "CAPTURED_FOR_MANUAL_REVIEW":
        item["captureError"] = True
        changes.append(item)
        continue
    aimg = Image.open(root / left["filename"]).convert("RGB")
    bimg = Image.open(root / right["filename"]).convert("RGB")
    if aimg.size != bimg.size:
        item["sizeMismatch"] = True
        changes.append(item)
        continue
    diff = ImageChops.difference(aimg, bimg)
    changed = sum(1 for rgb in diff.getdata() if max(rgb) > 18)
    item["changedPixelsThreshold18Pct"] = round(changed / (aimg.width * aimg.height) * 100, 2)
    item["imagePixels"] = aimg.width * aimg.height
    name = left["route"].replace("/", "-") + "-" + str(left["viewport"]["width"]) + "-diff.png"
    ImageEnhance.Contrast(diff).enhance(3).save(root / name)
    item["diffFile"] = name
    changes.append(item)
report = {
 "schema": "bmpe-visual-pair-comparison-v1",
 "baselineCommit": a["commit"], "candidateCommit": b["commit"],
 "gate": "NOT_VERIFIED",
 "note": "Pixel differences can come from dynamic content, routes, fonts, motion, or actual styling. Review each pair manually; pixel percentage alone neither approves nor rejects feature parity.",
 "pairs": changes,
}
(root / "comparison.json").write_text(json.dumps(report, ensure_ascii=False, indent=2))
print(json.dumps({k: v for k, v in report.items() if k != "pairs"}))
for item in changes:
    print(item["route"], item["viewport"]["width"], item.get("changedPixelsThreshold18Pct"), item.get("diffFile", "NO_DIFF"))
if len(changes) != 8 or any(x.get("captureError") or x.get("sizeMismatch") for x in changes):
    raise SystemExit("Visual capture incompleteness; do not claim review PASS")
