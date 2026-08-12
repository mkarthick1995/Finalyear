"""
RenalCare AI - Vision model training
Trains a MobileNetV2 binary classifier (normal vs stone) on the prepared manifest.

Run: python train_vision_model.py [--epochs 10] [--pretrained] [--batch-size 32] [--lr 0.0003]

Outputs:
  backend/models/kidney_stone_cnn.pth    - trained checkpoint
  backend/models/vision_metrics.json     - val history + held-out test metrics (real numbers)
"""

import argparse
import json
import os
import time
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
from PIL import Image
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix
from torch.utils.data import DataLoader, Dataset
from torchvision import models, transforms

CLASSES = ["normal", "stone"]
SEED = 42

BASE_DIR = Path(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_MANIFEST = BASE_DIR / "dataset" / "manifest.json"
MODELS_DIR = BASE_DIR / "models"
MODEL_OUT = MODELS_DIR / "kidney_stone_cnn.pth"
METRICS_OUT = MODELS_DIR / "vision_metrics.json"

VERSION = "mobilenetv2_normal_stone_v1"

torch.manual_seed(SEED)
np.random.seed(SEED)


def get_device():
    if torch.cuda.is_available():
        return torch.device("cuda")
    if torch.backends.mps.is_available():
        return torch.device("mps")
    return torch.device("cpu")


class ScanDataset(Dataset):
    """Loads manifest entries: {path, label}."""

    def __init__(self, entries, transform):
        self.entries = entries
        self.transform = transform
        self.class_to_idx = {c: i for i, c in enumerate(CLASSES)}

    def __len__(self):
        return len(self.entries)

    def __getitem__(self, idx):
        entry = self.entries[idx]
        image = Image.open(entry["path"]).convert("RGB")
        image = self.transform(image)
        label = self.class_to_idx[entry["label"]]
        return image, label


def build_transforms(augment: bool):
    base = [transforms.Resize((224, 224))]
    if augment:
        base = [
            transforms.Resize((232, 232)),
            transforms.RandomResizedCrop(224, scale=(0.8, 1.0)),
            transforms.RandomHorizontalFlip(p=0.5),
            transforms.RandomRotation(degrees=12),
        ]
    base += [
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ]
    return transforms.Compose(base)


def build_model(pretrained: bool):
    if pretrained:
        model = models.mobilenet_v2(weights=models.MobileNet_V2_Weights.IMAGENET1K_V1)
    else:
        model = models.mobilenet_v2(weights=None)
    model.classifier[1] = nn.Linear(model.last_channel, len(CLASSES))
    return model


def evaluate(model, loader, device):
    """Return (y_true, y_pred, probs) over the loader."""
    model.eval()
    y_true, y_pred, probs = [], [], []
    with torch.no_grad():
        for images, labels in loader:
            images = images.to(device)
            logits = model(images)
            p = torch.softmax(logits, dim=1)
            preds = p.argmax(dim=1)
            y_true.extend(labels.numpy().tolist())
            y_pred.extend(preds.cpu().numpy().tolist())
            probs.extend(p.cpu().numpy().tolist())
    return np.array(y_true), np.array(y_pred), np.array(probs)


def main():
    parser = argparse.ArgumentParser(description="Train MobileNetV2 normal/stone classifier")
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--epochs", type=int, default=10)
    parser.add_argument("--pretrained", action="store_true", default=True)
    parser.add_argument("--no-pretrained", dest="pretrained", action="store_false")
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--lr", type=float, default=3e-4)
    parser.add_argument("--workers", type=int, default=0)
    args = parser.parse_args()

    with open(args.manifest) as f:
        manifest = json.load(f)

    device = get_device()
    print(f"Using device: {device}")

    train_ds = ScanDataset(manifest["splits"]["train"], build_transforms(augment=True))
    val_ds = ScanDataset(manifest["splits"]["val"], build_transforms(augment=False))
    test_ds = ScanDataset(manifest["splits"]["test"], build_transforms(augment=False))

    train_loader = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True, num_workers=args.workers)
    val_loader = DataLoader(val_ds, batch_size=args.batch_size, shuffle=False, num_workers=args.workers)
    test_loader = DataLoader(test_ds, batch_size=args.batch_size, shuffle=False, num_workers=args.workers)

    print(f"Train: {len(train_ds)}, Val: {len(val_ds)}, Test: {len(test_ds)}")
    print(f"Loading {'pretrained' if args.pretrained else 'random-initialized'} MobileNetV2")

    model = build_model(args.pretrained).to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=args.epochs)

    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    history = []
    best_val_acc = 0.0

    for epoch in range(1, args.epochs + 1):
        model.train()
        running_loss, correct, total = 0.0, 0, 0
        start = time.time()

        for images, labels in train_loader:
            images, labels = images.to(device), labels.to(device)
            optimizer.zero_grad()
            logits = model(images)
            loss = criterion(logits, labels)
            loss.backward()
            optimizer.step()
            running_loss += loss.item() * images.size(0)
            correct += (logits.argmax(1) == labels).sum().item()
            total += images.size(0)

        scheduler.step()
        train_loss = running_loss / total
        train_acc = correct / total

        val_true, val_pred, _ = evaluate(model, val_loader, device)
        val_acc = float(accuracy_score(val_true, val_pred))

        history.append({
            "epoch": epoch,
            "train_loss": round(train_loss, 4),
            "train_acc": round(train_acc, 4),
            "val_acc": round(val_acc, 4),
        })

        if val_acc > best_val_acc:
            best_val_acc = val_acc
            torch.save({
                "state_dict": model.state_dict(),
                "classes": CLASSES,
                "version": VERSION,
                "epochs": epoch,
            }, MODEL_OUT)

        print(f"Epoch {epoch}/{args.epochs} | train_loss={train_loss:.4f} "
              f"train_acc={train_acc:.4f} val_acc={val_acc:.4f} "
              f"({time.time() - start:.0f}s)")

    # Reload best checkpoint for final evaluation
    checkpoint = torch.load(MODEL_OUT, map_location="cpu")
    best_model = build_model(pretrained=False)
    best_model.load_state_dict(checkpoint["state_dict"])
    best_model = best_model.to(device)

    test_true, test_pred, test_probs = evaluate(best_model, test_loader, device)

    cm = confusion_matrix(test_true, test_pred, labels=[0, 1])
    metrics = {
        "test": {
            "accuracy": round(float(accuracy_score(test_true, test_pred)), 4),
            "precision": round(float(precision_score(test_true, test_pred, zero_division=0)), 4),
            "recall": round(float(recall_score(test_true, test_pred, zero_division=0)), 4),
            "f1": round(float(f1_score(test_true, test_pred, zero_division=0)), 4),
            "confusion_matrix": cm.tolist(),
            "n_test": int(len(test_true)),
            "classes": CLASSES,
        },
        "val_history": history,
        "best_val_acc": round(best_val_acc, 4),
        "model": {
            "version": VERSION,
            "architecture": "mobilenet_v2",
            "pretrained_imagenet": True,
            "epochs_trained": args.epochs,
            "batch_size": args.batch_size,
            "lr": args.lr,
            "training_note": (
                "Binary image-level normal/stone classification on the public CT-KIDNEY "
                "dataset (Normal vs Stone, class-balanced). Metrics below are computed on a "
                "held-out test split with no overlap into training. This model does NOT "
                "estimate location, severity, or composition. Approximate stone size is "
                "estimated separately from the trained attention map (see size_estimation)."
            ),
            "trained_at": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
        },
        "hyperparameters": {
            "seed": SEED,
            "manifest": str(args.manifest),
        },
    }

    # Fold in the current size-estimation calibration (if present) so the
    # metrics file always documents it alongside the classification metrics.
    scale_path = MODELS_DIR / "stone_scale.json"
    if scale_path.exists():
        with open(scale_path) as f:
            scale = json.load(f)
        metrics["size_estimation"] = {
            "method": (
                "Grad-CAM class-attention ROI -> brightest hyperdense structure "
                "(top-1% intensities) -> largest 8-connected component (>=3 px), "
                "normalized to a 512-px reference width"
            ),
            "calibration": scale,
            "note": (
                "Uploaded images carry no DICOM metadata, so pixel spacing is calibrated "
                "offline against the stone training population (typical kidney stones are "
                "0-10 mm, rarely up to 12-15 mm; hard ceiling 15 mm). The reported size is "
                "an approximation, not a clinical measurement. Regenerate with "
                "calibrate_size_scale.py; overridable with the STONE_SCALE_PATH env var."
            ),
        }

    with open(METRICS_OUT, "w") as f:
        json.dump(metrics, f, indent=2)

    print("\n=== Held-out test metrics (real) ===")
    print(f"Accuracy:  {metrics['test']['accuracy']}")
    print(f"Precision: {metrics['test']['precision']}")
    print(f"Recall:    {metrics['test']['recall']}")
    print(f"F1:        {metrics['test']['f1']}")
    print("Confusion matrix (rows=true, cols=predicted, [normal, stone]):")
    print(cm)
    print(f"Saved checkpoint -> {MODEL_OUT}")
    print(f"Saved metrics    -> {METRICS_OUT}")


if __name__ == "__main__":
    main()
