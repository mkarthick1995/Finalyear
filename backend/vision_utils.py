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

# Assumed CT pixel spacing for uploaded (metadata-stripped) images, in mm per pixel.
# Typical abdominal CT slices are ~0.6-1.0 mm/pixel; 0.78 is the documented default.
PIXELS_PER_MM = float(os.getenv("PIXELS_PER_MM", "0.78"))

CLASSES = ["normal", "stone"]

SIZE_ESTIMATION_NOTE = (
    "Estimated from the model's attention region on the CT image using an assumed pixel "
    f"spacing of {PIXELS_PER_MM} mm/pixel (uploaded images carry no DICOM metadata, so this "
    "is an approximation, not a clinical measurement)."
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
            "pixels_per_mm": PIXELS_PER_MM,
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


def estimate_stone_size_mm(
    image_path: str, cam_threshold: float = 0.5, class_idx: int = 1
) -> Optional[dict]:
    """
    Estimate the largest stone dimension (mm) from the Grad-CAM attention region
    of the "stone" class. Returns None when the localization is too weak to report.

    Returns:
        {
            "stone_size_mm": float,
            "pixels_per_mm": float,
            "diameter_pixels": int,
            "cam_threshold": float,
            "note": str,
        }
    """
    cam, _ = grad_cam(image_path, class_idx=class_idx)
    binary = cam >= cam_threshold
    if not binary.any():
        return None

    labeled, n = ndimage.label(binary)
    if n == 0:
        return None
    sizes = ndimage.sum(binary, labeled, range(1, n + 1))
    largest = int(np.argmax(sizes)) + 1
    ys, xs = np.where(labeled == largest)
    diameter_pixels = max(int(xs.max() - xs.min() + 1), int(ys.max() - ys.min() + 1))
    if diameter_pixels < 1:
        return None

    return {
        "stone_size_mm": round(diameter_pixels * PIXELS_PER_MM, 2),
        "pixels_per_mm": PIXELS_PER_MM,
        "diameter_pixels": diameter_pixels,
        "cam_threshold": cam_threshold,
        "note": SIZE_ESTIMATION_NOTE,
    }
