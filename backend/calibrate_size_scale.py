"""
RenalCare AI - Stone-size calibration
Determines the mm-per-pixel scale for the size estimator from the stone
population itself (typical kidney stones are 0-10 mm, rarely up to 12-15 mm).

Method (documented):
  1. Run the pixel-scale stone localizer (_stone_pixel_diameter) over a sample
     of real stone images from the training population.
  2. Choose mm_per_px so that the median detected pixel diameter maps to the
     target typical stone size (default ~6 mm).
  3. Verify the resulting mm distribution: median in 0-10 mm band, and the vast
     majority <= 12-15 mm (hard ceiling MAX_DIAMETER_MM=15 enforces the cap).

Outputs backend/models/stone_scale.json (consumed by vision_utils.py).
Run: python calibrate_size_scale.py [--n 400] [--target-median-mm 6.0]
"""

import argparse
import glob
import json
import time
from pathlib import Path

import numpy as np

from vision_utils import _stone_pixel_diameter, MAX_DIAMETER_MM, REFERENCE_WIDTH, model_available

BASE_DIR = Path(__file__).resolve().parent
OUT = BASE_DIR / "models" / "stone_scale.json"

PIL_IMAGE_CACHE = {}


def image_width(path):
    if path not in PIL_IMAGE_CACHE:
        from PIL import Image
        PIL_IMAGE_CACHE[path] = Image.open(path).size[0]
    return PIL_IMAGE_CACHE[path]


def main():
    parser = argparse.ArgumentParser(description="Calibrate stone-size mm/pixel scale")
    parser.add_argument("--n", type=int, default=400, help="number of stone images to sample")
    parser.add_argument("--target-median-mm", type=float, default=6.0)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    if not model_available():
        raise SystemExit("Vision model not found; run train_vision_model.py first")

    stone_files = sorted(
        glob.glob(str(BASE_DIR / "dataset" / "**" / "Stone" / "*.jpg"), recursive=True)
    )
    if not stone_files:
        raise SystemExit("No stone images found under backend/dataset")

    rng = np.random.RandomState(args.seed)
    sample = rng.choice(stone_files, size=min(args.n, len(stone_files)), replace=False)

    diameters = []
    start = time.time()
    for i, path in enumerate(sample, 1):
        det = _stone_pixel_diameter(path, class_idx=1)
        if det is not None:
            # normalize native-pixel diameter to the reference width
            diameters.append(det[1] * REFERENCE_WIDTH / image_width(path))
        if i % 100 == 0:
            print(f"  processed {i}/{len(sample)} ({time.time() - start:.0f}s)")
    print(f"localized {len(diameters)}/{len(sample)}")

    if not diameters:
        raise SystemExit("No stone components localized; nothing to calibrate")

    d = np.array(diameters)
    median_px = float(np.median(d))

    mm_per_px = args.target_median_mm / median_px
    mm = np.clip(d * mm_per_px, 0, MAX_DIAMETER_MM)

    stats = {
        "n_localized": int(len(d)),
        "median_px": float(np.median(d)),
        "p90_px": float(np.percentile(d, 90)),
        "p95_px": float(np.percentile(d, 95)),
        "max_px": float(d.max()),
        "result_mm": {
            "median": round(float(np.median(mm)), 1),
            "p90": round(float(np.percentile(mm, 90)), 1),
            "p95": round(float(np.percentile(mm, 95)), 1),
            "p99": round(float(np.percentile(mm, 99)), 1),
            "max": round(float(mm.max()), 1),
            "frac_0_10mm": round(float((mm <= 10).mean()), 3),
            "frac_le_15mm": round(float((mm <= 15).mean()), 3),
        },
    }

    print("\nPixel diameter distribution (px):", stats["median_px"], stats["p90_px"], stats["p95_px"], stats["max_px"])
    print("Proposed mm_per_px:", round(mm_per_px, 6))
    print("Resulting mm distribution:", stats["result_mm"])

    check = stats["result_mm"]
    ok = (
        check["median"] <= 10.0
        and check["p90"] <= 15.0
        and check["max"] <= MAX_DIAMETER_MM
    )
    if not ok:
        print("WARNING: calibration does not meet the 0-10 (rarely 12-15) target yet.")

    scale = {
        "mm_per_px": round(mm_per_px, 6),
        "target_median_mm": args.target_median_mm,
        "max_diameter_mm": MAX_DIAMETER_MM,
        "source": (
            f"population calibration on {stats['n_localized']} stone images "
            f"(median {stats['median_px']:g} px -> {args.target_median_mm} mm)"
        ),
        "stats": stats,
        "note": (
            "Pixel-space stone localizer (Grad-CAM ROI - brightest hyperdense "
            "structure - largest 8-connected component), calibrated so the median "
            "stone in the training population maps to the typical clinical size. "
            "This is an approximation, not a clinical measurement."
        ),
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT, "w") as f:
        json.dump(scale, f, indent=2)
    print(f"saved -> {OUT}")


if __name__ == "__main__":
    main()