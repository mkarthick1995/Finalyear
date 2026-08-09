"""
RenalCare AI - Image Processing Utilities
Image saving and analysis built on the trained normal/stone CNN.
No fabricated metrics: size is estimated from the model's own Grad-CAM attention
region with an explicitly documented pixel-spacing assumption; location/severity
beyond the binary prediction are not estimated.
"""

import os
import uuid

from vision_utils import (
    predict_image,
    model_available,
    load_metrics,
    metrics_summary,
    estimate_stone_size_mm,
)


def save_upload_file(upload_file_bytes: bytes, filename: str) -> str:
    """Save uploaded file to disk"""
    upload_dir = "./uploads"
    os.makedirs(upload_dir, exist_ok=True)

    file_path = os.path.join(upload_dir, filename)

    with open(file_path, 'wb') as f:
        f.write(upload_file_bytes)

    return file_path


def analyze_image_file(file_path: str) -> dict:
    """
    Analyze an uploaded CT image with the trained normal/stone model.

    Returns:
        {
            "success": True,
            "analysis": {
                "prediction": "normal" | "stone",
                "confidence": float,
                "probabilities": {...},
                "severity": "none" | "present",
                "model_version": str,
                "stone_size_mm": float | None,   # only when prediction == "stone"
                "size_estimated": bool,
                "size_estimation_note": str | None,
            }
        }
        or {"success": False, "error": str} when the model is unavailable.
    """
    try:
        if not model_available():
            return {
                "success": False,
                "error": "Vision model not available. Train it first (see README).",
            }
        prediction = predict_image(file_path)

        analysis = {
            "prediction": prediction["prediction"],
            "confidence": prediction["confidence"],
            "probabilities": prediction["probabilities"],
            "model_version": prediction["model_version"],
            "severity": "present" if prediction["prediction"] == "stone" else "none",
            "stone_size_mm": None,
            "size_estimated": False,
            "size_estimation_note": None,
        }

        if prediction["prediction"] == "stone":
            size = estimate_stone_size_mm(file_path, class_idx=1)
            if size is not None:
                analysis["stone_size_mm"] = size["stone_size_mm"]
                analysis["size_estimated"] = True
                analysis["size_estimation_note"] = size["note"]

        return {"success": True, "analysis": analysis}
    except Exception as e:
        return {"success": False, "error": str(e)}
