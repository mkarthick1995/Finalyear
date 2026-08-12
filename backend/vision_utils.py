"""
RenalCare AI - Vision inference utilities
Loads the trained MobileNetV2 binary classifier (normal vs stone) and runs inference.
All reported numbers come from the actual model checkpoint + vision_metrics.json.
"""

import json
import os
from typing import Optional

import numpy as np
import torch
from PIL import Image
from scipy import ndimage
from torch.nn import functional as F
from torchvision import transforms, models

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.getenv("VISION_MODEL_PATH", os.path.join(BASE_DIR, "models", "kidney_stone_cnn.pth"))
METRICS_PATH = os.getenv("VISION_METRICS_PATH", os.path.join(BASE_DIR, "models", "vision_metrics.json"))

# Stone-size calibration file: {mm_per_px, target_median_mm, source, note}.
# Produced offline by calibrate_size_scale.py against the training population
# (typical kidney stones are 0-10 mm, rarely up to 12-15 mm). No DICOM metadata
# is present on uploaded images, so this population-derived pixel spacing is the
# documented approximation used for size estimation.
STONE_SCALE_PATH = os.getenv(
    "STONE_SCALE_PATH", os.path.join(BASE_DIR, "models", "stone_scale.json")
)

# Reference image width the calibration was derived on (dominant resolution of
# the training population and the typical CT export width). Pixel diameters are
# normalized to this width for both calibration and estimation.
REFERENCE_WIDTH = int(os.getenv("STONE_REFERENCE_WIDTH", "512"))

CLASSES = ["normal", "stone"]


def _load_stone_scale() -> dict:
    """Load the calibrated mm-per-pixel value (with documented defaults)."""
    default = {
        "mm_per_px": 0.125,  # conservative default until calibration exists
        "target_median_mm": 6.0,
        "source": "uncalibrated default",
        "note": None,
    }
    try:
        with open(STONE_SCALE_PATH) as f:
            data = json.load(f)
        merged = dict(default)
        merged.update({k: v for k, v in data.items() if k in ("mm_per_px", "target_median_mm", "source", "note")})
        return merged
    except Exception:
        return default


STONE_SCALE = _load_stone_scale()
MM_PER_PX = float(STONE_SCALE["mm_per_px"])

# Calibration ceiling: sizes above MAX_DIAMETER_MM are clamped (rare passthrough
# for very large stones; the calibrated distribution lands at or below this).
MAX_DIAMETER_MM = float(os.getenv("MAX_DIAMETER_MM", "15.0"))

SIZE_ESTIMATION_NOTE = (
    "Estimated from the brightest stone-scale structure inside the model's attention "
    f"region, calibrated on the training population ({STONE_SCALE['source']}, "
    f"{MM_PER_PX:.4f} mm/pixel, typical stones 0-10 mm, ceiling {MAX_DIAMETER_MM:g} mm). "
    "This is an approximation, not a clinical measurement."
)

_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

_model = None
_metrics = None


def load_model():
    """Lazily load the trained model. Returns None if it is not available."""
    global _model
    if _model is not None:
        return _model
    if not os.path.exists(MODEL_PATH):
        return None
    model = models.mobilenet_v2(weights=None)
    model.classifier[1] = torch.nn.Linear(model.last_channel, len(CLASSES))
    state = torch.load(MODEL_PATH, map_location="cpu")
    if isinstance(state, dict) and "state_dict" in state:
        model.load_state_dict(state["state_dict"])
    else:
        model.load_state_dict(state)
    model.eval()
    _model = model
    return _model


def load_metrics():
    """Load the real held-out test metrics from vision_metrics.json. Returns {} if missing."""
    global _metrics
    if _metrics is not None:
        return _metrics
    if not os.path.exists(METRICS_PATH):
        _metrics = {}
        return _metrics
    with open(METRICS_PATH) as f:
        _metrics = json.load(f)
    return _metrics


def model_version() -> str:
    """Short human-readable model version string."""
    metrics = load_metrics()
    return metrics.get("model", {}).get("version", "kidney_stone_cnn_untracked")


def model_available() -> bool:
    return load_model() is not None


def predict_image(image_path: str) -> dict:
    """
    Run inference on a single image.

    Returns:
        {
            "prediction": "normal" | "stone",
            "confidence": float (probability of the predicted class),
            "probabilities": {"normal": float, "stone": float},
            "model_version": str
        }

    Raises FileNotFoundError if the model is not available.
    """
    model = load_model()
    if model is None:
        raise FileNotFoundError(
            f"Vision model not found at {MODEL_PATH}. Train it with prepare_dataset.py + train_vision_model.py."
        )

    image = Image.open(image_path).convert("RGB")
    tensor = _transform(image).unsqueeze(0)

    with torch.no_grad():
        logits = model(tensor)
        probs = torch.softmax(logits, dim=1).squeeze(0).tolist()

    probabilities = {cls: round(float(p), 4) for cls, p in zip(CLASSES, probs)}
    pred_idx = int(max(range(len(probs)), key=lambda i: probs[i]))
    prediction = CLASSES[pred_idx]
    confidence = round(float(probs[pred_idx]), 4)

    return {
        "prediction": prediction,
        "confidence": confidence,
        "probabilities": probabilities,
        "model_version": model_version(),
    }


def metrics_summary() -> dict:
    """Public-facing summary of real test metrics, safe to surface in the UI."""
    metrics = load_metrics()
    test = metrics.get("test", {})
    return {
        "accuracy": test.get("accuracy"),
        "precision": test.get("precision"),
        "recall": test.get("recall"),
        "f1": test.get("f1"),
        "confusion_matrix": test.get("confusion_matrix"),
        "n_test": test.get("n_test"),
        "model_version": model_version(),
        "training_note": metrics.get("model", {}).get("training_note", ""),
        "size_estimation": {
            "calibration": {
                "mm_per_px": MM_PER_PX,
                "reference_width_px": REFERENCE_WIDTH,
                "max_diameter_mm": MAX_DIAMETER_MM,
                "source": STONE_SCALE.get("source"),
            },
            "note": SIZE_ESTIMATION_NOTE,
        },
    }


def grad_cam(image_path: str, class_idx: Optional[int] = None) -> tuple[np.ndarray, int]:
    """
    Compute a Grad-CAM attention map for the model's predicted (or requested) class.

    Returns (heatmap, class_idx) where heatmap is a 224x224 float array in [0, 1].
    """
    model = load_model()
    if model is None:
        raise FileNotFoundError(
            f"Vision model not found at {MODEL_PATH}. Train it with prepare_dataset.py + train_vision_model.py."
        )

    image = Image.open(image_path).convert("RGB")
    tensor = _transform(image).unsqueeze(0)

    activations = {}
    gradients = {}

    def forward_hook(_module, _inp, out):
        activations["value"] = out.detach()

    def backward_hook(_module, _ginp, gout):
        gradients["value"] = gout[0].detach()

    handle_f = model.features.register_forward_hook(forward_hook)
    handle_b = model.features.register_full_backward_hook(backward_hook)

    try:
        logits = model(tensor)
        if class_idx is None:
            class_idx = int(logits.argmax(dim=1).item())
        model.zero_grad()
        logits[0, class_idx].backward()
    finally:
        handle_f.remove()
        handle_b.remove()

    features = activations["value"][0]   # (C, H, W)
    grads = gradients["value"][0]        # (C, H, W)
    weights = grads.mean(dim=(1, 2), keepdim=True)
    cam = torch.relu((weights * features).sum(dim=0))

    cam = cam - cam.min()
    if cam.max() > 0:
        cam = cam / (cam.max() + 1e-8)
    cam = F.interpolate(
        cam.unsqueeze(0).unsqueeze(0),
        size=(224, 224),
        mode="bilinear",
        align_corners=False,
    ).squeeze()

    return cam.numpy(), class_idx


def _stone_pixel_diameter(
    image_path: str,
    class_idx: int = 1,
    attention_threshold: float = 0.2,
    bright_fraction: float = 0.01,
    min_diameter_px: int = 3,
    max_diameter_px: Optional[int] = None,
) -> Optional[tuple]:
    """
    Localize the stone in image pixels and return (area_px, diameter_px).

    Pure pixel-space detection, shared by the calibrated mm estimator and the
    offline calibration script:
      1. Grad-CAM attention of the requested class, upsampled to the original
         image resolution, selects the region of interest ("stone" class).
      2. Within that ROI, kidney stones are the brightest structures on CT
         (hyperdense), so we keep the top `bright_fraction` of intensities.
      3. The largest 8-connected bright component wins.

    Returns None when no stone-scale component can be localized.
    """
    cam, _ = grad_cam(image_path, class_idx=class_idx)

    image = Image.open(image_path).convert("RGB")
    width, height = image.size
    cam_resized = np.array(Image.fromarray(cam).resize((width, height), Image.BILINEAR))

    roi = cam_resized >= attention_threshold * float(cam_resized.max())
    gray = np.array(image.convert("L"), dtype=float)
    if not roi.any():
        return None

    meaningful = gray[roi]
    bright_threshold = float(np.percentile(meaningful, 100 * (1 - bright_fraction)))
    bright = roi & (gray >= bright_threshold)

    labeled, n = ndimage.label(bright)
    if n == 0:
        return None

    max_diameter_px = max_diameter_px or 99999
    best = None
    for i in range(1, n + 1):
        ys, xs = np.where(labeled == i)
        diameter_pixels = max(int(xs.max() - xs.min() + 1), int(ys.max() - ys.min() + 1))
        if diameter_pixels < min_diameter_px or diameter_pixels > max_diameter_px:
            continue
        area = int((labeled == i).sum())
        if best is None or area > best[0]:
            best = (area, diameter_pixels)

    return best


def estimate_stone_size_mm(
    image_path: str,
    class_idx: int = 1,
    attention_threshold: float = 0.2,
    bright_fraction: float = 0.01,
) -> Optional[dict]:
    """
    Estimate the largest stone dimension (mm), calibrated to the training
    population (typical kidney stones are 0-10 mm, rarely up to 12-15 mm).

    Pixel-scale detection is done by _stone_pixel_diameter(); the diameter is
    converted at the calibrated MM_PER_PX (see models/stone_scale.json) and
    clamped at MAX_DIAMETER_MM (documented ceiling).

    Returns None when no stone-scale bright component can be localized.
    """
    detected = _stone_pixel_diameter(
        image_path, class_idx=class_idx, attention_threshold=attention_threshold,
        bright_fraction=bright_fraction,
        min_diameter_px=3,
        max_diameter_px=int(round(MAX_DIAMETER_MM / MM_PER_PX)) + 1,
    )
    if detected is None:
        return None

    _, diameter_pixels = detected
    width, _ = Image.open(image_path).size
    normalized_px = diameter_pixels * REFERENCE_WIDTH / width
    diameter_mm = min(normalized_px * MM_PER_PX, MAX_DIAMETER_MM)
    return {
        "stone_size_mm": round(diameter_mm, 1),
        "pixels_per_mm": round(1.0 / MM_PER_PX, 2),
        "diameter_pixels": diameter_pixels,
        "note": SIZE_ESTIMATION_NOTE,
    }
