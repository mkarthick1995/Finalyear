"""
RenalCare AI - Authentication helpers
Password hashing, session tokens, and FastAPI dependencies.
Uses only the standard library for crypto (PBKDF2-HMAC-SHA256) - no external secrets.
"""

import hashlib
import hmac
import secrets
import uuid
from datetime import datetime, timedelta

from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from database import get_db, Patient, UserSession

PBKDF2_ITERATIONS = 200_000
SESSION_TTL_DAYS = 7


def hash_password(password: str) -> str:
    """Hash a plaintext password with a random salt using PBKDF2-HMAC-SHA256."""
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt), PBKDF2_ITERATIONS)
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${salt}${digest.hex()}"


def verify_password(password: str, hashed: str) -> bool:
    """Constant-time comparison of a plaintext password against a stored hash."""
    if not hashed:
        return False
    try:
        algorithm, iterations, salt, expected = hashed.split("$")
    except ValueError:
        return False
    if algorithm != "pbkdf2_sha256":
        return False
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt), int(iterations))
    return hmac.compare_digest(digest.hex(), expected)


def create_session(db: Session, patient: Patient) -> UserSession:
    """Create a new session token for a patient."""
    session = UserSession(
        id=f"ses_{uuid.uuid4().hex[:16]}",
        patient_id=patient.id,
        token=secrets.token_urlsafe(32),
        created_at=datetime.utcnow(),
        expires_at=datetime.utcnow() + timedelta(days=SESSION_TTL_DAYS),
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def _extract_token(authorization: str) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    return parts[1]


def delete_session(authorization: str, db: Session) -> bool:
    """Delete the session identified by the Bearer token. Returns True if one was revoked."""
    if not authorization:
        return False
    try:
        token = _extract_token(authorization)
    except HTTPException:
        return False
    session = db.query(UserSession).filter(UserSession.token == token).first()
    if session:
        db.delete(session)
        db.commit()
        return True
    return False


def get_current_patient(
    authorization: str = Header(default=None),
    db: Session = Depends(get_db),
) -> Patient:
    """FastAPI dependency: resolve the authenticated patient from the Bearer token."""
    token = _extract_token(authorization)
    session = db.query(UserSession).filter(UserSession.token == token).first()
    if not session:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    if session.expires_at < datetime.utcnow():
        raise HTTPException(status_code=401, detail="Session expired")
    patient = db.query(Patient).filter(Patient.id == session.patient_id).first()
    if not patient:
        raise HTTPException(status_code=401, detail="Patient not found")
    return patient


def require_patient_access(
    patient_id: str,
    current_patient: Patient = Depends(get_current_patient),
) -> Patient:
    """FastAPI dependency: ensure the authenticated patient owns `patient_id` (path param)."""
    if current_patient.id != patient_id:
        raise HTTPException(status_code=403, detail="You do not have access to this patient's data")
    return current_patient


def ensure_patient_access(current_patient: Patient, patient_id: str) -> Patient:
    """Validate a patient_id embedded in a request body against the authenticated patient."""
    if current_patient.id != patient_id:
        raise HTTPException(status_code=403, detail="You do not have access to this patient's data")
    return current_patient
