"""
RenalCare AI - Dataset preparation
Builds a deterministic, class-balanced 70/15/15 (train/val/test) manifest from the
CT-KIDNEY dataset's Normal and Stone folders. No image is duplicated across splits.

Run: python prepare_dataset.py [--data-dir PATH] [--manifest PATH]
"""

import argparse
import json
import os
import random
from collections import Counter
from pathlib import Path

CLASSES = ["normal", "stone"]
TRAIN_RATIO, VAL_RATIO, TEST_RATIO = 0.70, 0.15, 0.15
SEED = 42

BASE_DIR = Path(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_DATA_DIR = BASE_DIR / "dataset" / "CT-KIDNEY-DATASET-Normal-Cyst-Tumor-Stone" / "dataset"
DEFAULT_MANIFEST = BASE_DIR / "dataset" / "manifest.json"


def collect_images(data_dir: Path) -> dict:
    """Return {class_name: [sorted absolute paths]}."""
    images = {}
    for cls in CLASSES:
        cls_dir = data_dir / cls.capitalize()
        if not cls_dir.is_dir():
            cls_dir = data_dir / cls
        if not cls_dir.is_dir():
            raise FileNotFoundError(f"Class directory not found: {cls_dir}")
        paths = sorted(str(p.resolve()) for p in cls_dir.iterdir() if p.is_file())
        if not paths:
            raise FileNotFoundError(f"No images found in {cls_dir}")
        images[cls] = paths
    return images


def split_class(paths, rng):
    """Return (train, val, test) lists for a single class using a seeded RNG."""
    shuffled = list(paths)
    rng.shuffle(shuffled)
    n_train = int(len(shuffled) * TRAIN_RATIO)
    n_val = int(len(shuffled) * VAL_RATIO)
    train = shuffled[:n_train]
    val = shuffled[n_train:n_train + n_val]
    test = shuffled[n_train + n_val:]
    return train, val, test


def main():
    parser = argparse.ArgumentParser(description="Build deterministic CT-KIDNEY split manifest")
    parser.add_argument("--data-dir", type=Path, default=DEFAULT_DATA_DIR)
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--seed", type=int, default=SEED)
    args = parser.parse_args()

    images = collect_images(args.data_dir)

    # Balance: use all images of the minority class and an equal count of the majority class.
    class_counts = {cls: len(paths) for cls, paths in images.items()}
    minority = min(class_counts.values())
    print(f"Collected: {class_counts}")
    print(f"Balancing to {minority} images per class.")

    rng = random.Random(args.seed)
    splits = {"train": [], "val": [], "test": []}
    per_class_split = {}

    for cls in CLASSES:
        # Sort deterministically, then pick the first `minority` for stability.
        paths = sorted(images[cls])
        if len(paths) > minority:
            # Deterministic downsampling: keep evenly spaced indices for representative coverage.
            indices = [round(i * (len(paths) - 1) / (minority - 1)) for i in range(minority)]
            paths = [paths[i] for i in sorted(set(indices))]
        train, val, test = split_class(paths, rng)
        per_class_split[cls] = {"train": train, "val": val, "test": test}
        for split_name, items in zip(["train", "val", "test"], (train, val, test)):
            splits[split_name].extend([{"path": p, "label": cls} for p in items])

    # Verify: no image in more than one split
    all_paths = []
    for split_name in ("train", "val", "test"):
        all_paths.extend(e["path"] for e in splits[split_name])
    dupes = [p for p, c in Counter(all_paths).items() if c > 1]
    if dupes:
        raise RuntimeError(f"Overlap detected across splits: {len(dupes)} duplicate(s)")

    manifest = {
        "source": str(args.data_dir),
        "seed": args.seed,
        "ratios": {"train": TRAIN_RATIO, "val": VAL_RATIO, "test": TEST_RATIO},
        "classes": CLASSES,
        "n_per_class": per_class_split,
        "splits": splits,
        "counts": {k: len(v) for k, v in splits.items()},
    }

    args.manifest.parent.mkdir(parents=True, exist_ok=True)
    with open(args.manifest, "w") as f:
        json.dump(manifest, f, indent=2)

    print(f"Manifest written to {args.manifest}")
    print("Per-split counts:")
    for cls in CLASSES:
        print(f"  {cls}: train={len(per_class_split[cls]['train'])}, "
              f"val={len(per_class_split[cls]['val'])}, test={len(per_class_split[cls]['test'])}")
    print("Totals:", manifest["counts"])
    print("✓ No image duplicated across splits.")


if __name__ == "__main__":
    main()
