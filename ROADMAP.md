# RenalCare AI — Completion Roadmap

**Purpose of this document**: this is the single source of truth for finishing the
project. Every phase below is written so it can be executed without needing to go back
and ask "what did we mean by X" — commands, file paths, exact config keys, and security
steps are all spelled out. If something in the codebase changes and a step here goes
stale, update this doc in the same commit.

**Environment assumption**: implementation happens on **macOS** (zsh, the default shell
since macOS Catalina). All shell commands below are zsh/bash-compatible commands for Mac.
If a step is run on Windows instead, the equivalent PowerShell command is noted inline.

**Budget ceiling: ₹500 total, for the entire project, forever — not per month.**

---

## Table of contents

- [Budget allocation](#budget-allocation-target)
- [Phase 0 — Prerequisites & environment setup](#phase-0--prerequisites--environment-setup-mac--free)
- [Phase 1 — Hygiene / repo cleanup](#phase-1--hygiene--repo-cleanup--free-do-this-first)
- [Phase 2 — Fix what's fake or broken](#phase-2--fix-whats-fake-or-broken-in-existing-features--free)
- [Phase 3 — Real scan analysis model](#phase-3--real-scan-analysis-model-replace-opencv-heuristic--free)
- [Phase 4 — Multi-patient auth](#phase-4--multi-patient-support--minimal-auth--free)
- [Phase 5 — Health Goals (LLM)](#phase-5--health-goals-tab-llm-powered--₹150250)
- [API key generation & security procedure](#api-key-generation--security-procedure-anthropic)
- [Sequencing & effort estimate](#sequencing--effort-estimate)
- [Definition of done](#definition-of-done-checklist)
- [Rollback / fallback plan](#rollback--fallback-plan-per-phase)

---

## Budget allocation (target)

| Item | Cost | Notes |
|---|---|---|
| Kaggle CT-scan dataset | ₹0 | Free download, Kaggle account only |
| Model training (CNN) | ₹0 | Free Kaggle-notebook or Google Colab GPU hours, or local CPU |
| Health Goals — Claude Haiku calls | ~₹150–250 | Cheapest current Claude model, short prompts, daily caching |
| Buffer / contingency | ~₹150–250 | Covers Anthropic minimum top-up granularity and any overage |
| **Total** | **≤ ₹500** | |

Anthropic's console requires a **minimum credit purchase** when you first add billing
(currently USD $5, i.e. roughly ₹420 at typical rates — check the live rate at purchase
time since ₹/USD moves). That single top-up **is** the ₹500 budget — you are not meant
to spend ₹500 API call by API call, you buy one block of credit once and monitor usage
against it. This is spelled out in detail in the [API key section](#api-key-generation--security-procedure-anthropic) below.

---

## Phase 0 — Prerequisites & environment setup (Mac) — free

Do this once, before any phase below. Confirms the friend's Mac has everything needed
so no phase stalls on a missing tool.

### 0.1 Confirm core tools are installed

```bash
# Check Python version — need 3.10+ (project was scaffolded assuming 3.8+,
# but torch/torchvision wheels used in Phase 3 need 3.10 or newer)
python3 --version

# Check Node.js — need 18+ for Vite 8 / React 19
node --version

# Check npm
npm --version

# Check git
git --version
```

If any are missing, install via [Homebrew](https://brew.sh) (the standard macOS package
manager):

```bash
# Install Homebrew if not present
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install/upgrade what's missing
brew install python@3.11 node git
```

### 0.2 Clone / confirm the repo is present

```bash
cd ~/Workspace   # or wherever the friend keeps projects — create it if missing
git clone https://github.com/mkarthick1995/renalcare.git
cd renalcare
```

(Use HTTPS, not SSH, to avoid the same connection-drop issue hit earlier during initial
clone — see prior troubleshooting. HTTPS proved reliable.)

### 0.3 Backend virtual environment

Never install Python packages globally — always use a virtual environment. This also
matters for Phase 3, where a large `torch` install can otherwise conflict with system
Python.

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Mac/Linux activation
# (On Windows this would be: venv\Scripts\Activate.ps1)

pip install --upgrade pip
pip install -r requirements.txt
```

Leave the venv activated for every backend command in this document. Reactivate with
`source venv/bin/activate` in any new terminal tab.

### 0.4 Frontend dependencies

```bash
cd ../          # back to repo root
npm install
```

### 0.5 Sanity check both halves run

```bash
# Terminal 1
cd backend
source venv/bin/activate
python init_db.py     # creates renal_care.db + seed patient_demo_001
python main.py         # starts FastAPI on http://localhost:8001

# Terminal 2
cd renalcare            # repo root
npm run dev              # starts Vite dev server, usually http://localhost:5173
```

Visit `http://localhost:8001/docs` — should show the FastAPI Swagger UI with all
endpoints. Visit the Vite URL printed in Terminal 2 — should show the dashboard.

If both load, environment setup is done. **Do not proceed to later phases until this
checkpoint passes.**

---

## Phase 1 — Hygiene / repo cleanup — free, do this first

Takes about 15 minutes. Do this before any other phase so new work doesn't keep
building on top of a dirty repo state.

### 1.1 Extend `.gitignore`

Open `.gitignore` at the repo root and append:

```gitignore
# Python backend
backend/__pycache__/
backend/**/__pycache__/
*.pyc
backend/venv/
backend/*.db
backend/uploads/*
!backend/uploads/.gitkeep

# Environment secrets — never commit real values
.env
backend/.env
!.env.example
!backend/.env.example
```

### 1.2 Remove already-committed junk from git tracking

These files are already in git history from earlier commits — `.gitignore` alone won't
remove them, they need to be explicitly untracked. This does **not** delete the files
from disk, only from git tracking going forward.

```bash
cd renalcare   # repo root

# Untrack the live database file
git rm --cached backend/renal_care.db

# Untrack all committed __pycache__ files
git rm -r --cached backend/__pycache__

# Untrack all committed uploaded scan images (keep them on disk, just stop tracking)
git rm -r --cached backend/uploads

# Recreate an empty uploads folder placeholder so the directory still exists after clone
mkdir -p backend/uploads
touch backend/uploads/.gitkeep
```

### 1.3 Handle `backend/.env`

`.env` currently contains only placeholder values (`SECRET_KEY=your-secret-key-here...`)
so there's no live secret to rotate yet — but going forward it must never be committed
again, especially once Phase 5 adds a real Anthropic API key to it.

```bash
# Untrack .env going forward
git rm --cached backend/.env

# Create a checked-in template instead, with placeholders only
cp backend/.env backend/.env.example
```

Then edit `backend/.env.example` and blank out every value that should differ per
machine or that will later hold a real secret:

```ini
# backend/.env.example — commit this file, never commit backend/.env itself

DATABASE_URL=sqlite:///./renal_care.db
SECRET_KEY=changeme-generate-a-real-random-value
DEBUG=True
ENVIRONMENT=development

RISK_MODEL_PATH=./models/risk_model.pkl
VISION_MODEL_PATH=./models/kidney_stone_cnn.pth

MAX_UPLOAD_SIZE_MB=50
UPLOAD_DIRECTORY=./uploads

API_VERSION=2.0.0
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# Phase 5 — Health Goals LLM feature
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxx
ENABLE_LLM_GOALS=true
```

`backend/.env` (the real file, with real values) stays local-only from this point on.

### 1.4 Delete the stale duplicate `api.js`

```bash
# Root-level api.js is a stale, unused duplicate (wrong port 8000, older
# uploadScan signature) — the Vite build only reads src/api.js.
git rm api.js
```

### 1.5 Reconcile the documentation files

The 8 root-level docs (`BACKEND_COMPLETE.md`, `COMPLETION_SUMMARY.txt`,
`COMPONENTS_SETUP.md`, `DELIVERABLES.md`, `FRONTEND_INTEGRATION.md`,
`IMPLEMENTATION_COMPLETE.md`, `INTEGRATION_COMPLETE.md`, `PROJECT_COMPLETION_INDEX.md`,
`PROJECT_SUMMARY.md`, `QUICK_START.md`, `README_BACKEND.md`, `SYSTEM_ARCHITECTURE.md`,
`TESTING_GUIDE.md`) describe things that don't exist (`train_vision_model.py`,
`train_risk_model.py`, a `models/` folder, port 8000) and will actively mislead anyone
— including a professor — who reads them before the code.

Decision: **delete them**, don't try to patch 3000+ lines of stale prose. Keep only:
- `README.md` (root) — rewrite this one to be short and accurate (see 1.6).
- `backend/README.md` — rewrite for accuracy too, or fold into root README.

```bash
git rm BACKEND_COMPLETE.md COMPLETION_SUMMARY.txt COMPONENTS_SETUP.md \
  DELIVERABLES.md FRONTEND_INTEGRATION.md IMPLEMENTATION_COMPLETE.md \
  INTEGRATION_COMPLETE.md PROJECT_COMPLETION_INDEX.md PROJECT_SUMMARY.md \
  QUICK_START.md README_BACKEND.md SYSTEM_ARCHITECTURE.md TESTING_GUIDE.md \
  SETUP_ALL.sh
```

(`SETUP_ALL.sh` and `backend/setup.py`/`backend/setup.sh` also reference the wrong port
and nonexistent scripts — remove `SETUP_ALL.sh`; `backend/setup.py` can stay since it
only does `pip install` + `init_db.py`, both of which are real, but strip its printed
"next steps" text that references port 8000 and the two missing training scripts.)

### 1.6 Rewrite root `README.md`

Replace with something short and true: what the project is, exact setup commands
(matching Phase 0 above), actual port numbers (8001 backend, 5173 frontend), and a
link to this `ROADMAP.md` for anyone picking up remaining work.

### 1.7 Commit

```bash
git add -A
git status   # review — confirm no stray secrets, only the expected deletions/additions
git commit -m "Repo hygiene: gitignore backend artifacts, remove stale docs and dead api.js"
```

**Checkpoint**: `git log --stat -1` shows only the expected files touched. Fresh
`git clone` + Phase 0 steps still work end to end.

---

## Phase 2 — Fix what's fake or broken in existing features — free

### 2.1 Appointments — make "Book Now" actually persist

**Problem**: `src/components/AppointmentsComponent.jsx` imports `createAppointment`
from `../api` but never calls it. "Book Now" only toggles a local details view.
Separately, `saveRecommendations` is called with a synthetic client-side id (`1` or
`2`), not a real database appointment id. There's also a request-shape mismatch:
`backend/main.py`'s `create_appointment` endpoint expects individual query parameters,
while `src/api.js`'s `createAppointment` sends a JSON body — these don't match today.

**Fix, backend first** (`backend/main.py`):

Replace the query-param-based signature with a Pydantic request body, consistent with
every other POST endpoint in the file. Add to `backend/schemas.py`:

```python
class AppointmentCreate(BaseModel):
    patient_id: str
    appointment_date: str
    appointment_type: str
    doctor_type: str
    title: str
    reason: str
    description: str
```

Update `backend/main.py`'s `create_appointment`:

```python
@app.post("/api/appointments")
async def create_appointment(payload: AppointmentCreate, db: Session = Depends(get_db)):
    """Create a new appointment record"""
    try:
        appointment = Appointment(
            id=f"app_{uuid.uuid4().hex[:8]}",
            patient_id=payload.patient_id,
            appointment_date=datetime.fromisoformat(payload.appointment_date),
            appointment_type=payload.appointment_type,
            doctor_type=payload.doctor_type,
            title=payload.title,
            reason=payload.reason,
            description=payload.description,
            status="scheduled"
        )
        db.add(appointment)
        db.commit()
        db.refresh(appointment)
        return {
            "success": True,
            "appointment_id": appointment.id,
            "message": f"Appointment scheduled for {payload.appointment_date}"
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
```

(Same pattern applies to `/api/recommendations` — convert its query params to a
`DoctorRecommendationCreate` Pydantic body for consistency; `src/api.js`'s
`saveRecommendations` already sends a JSON body, so this side just needs the backend
to match.)

**Fix, frontend** (`src/components/AppointmentsComponent.jsx`):

In the "Book Now" click handler, actually call `createAppointment` before opening the
recommendation form, and store the **real** returned `appointment_id` in local state
instead of the synthetic `appointment.id` (1/2) used today:

```javascript
const handleBookNow = async (appointment) => {
  try {
    const response = await createAppointment(patientId, {
      appointment_date: appointment.suggestedDate,
      appointment_type: appointment.type,
      doctor_type: appointment.doctorType,
      title: appointment.title,
      reason: appointment.reason,
      description: appointment.description,
    });
    if (response.success) {
      setSelectedAppointment(appointment.id);
      setBookedAppointmentId(response.appointment_id); // real DB id — use this in saveRecommendations, not appointment.id
    }
  } catch (err) {
    alert('Failed to book appointment: ' + err.message);
  }
};
```

Wire the existing "Book Now" button's `onClick` to this handler, and change
`handleSaveRecommendations(appointmentId)` to use `bookedAppointmentId` instead of the
synthetic id.

**Verification**: book an appointment in the UI, then `GET /api/appointments/patient_demo_001`
via the Swagger docs (`/docs`) and confirm a real row with a real `app_xxxxxxxx` id
comes back — not just a UI state change that vanishes on refresh.

### 2.2 Dashboard tab — stop faking it

**Problem**: `src/App.jsx`'s main dashboard tab (`activeTab === 'dashboard'`) is
entirely static: hardcoded stat cards ("127 Days Stone-Free," "94.3% confidence,"
"Right Kidney"), a drag-and-drop that just sets a filename string
(`setUploadedFile('ct-scan-sample.dcm')`) with no real upload, and a static 6-bar risk
trend chart with made-up values (`[68, 54, 45, 38, 29, 24]`).

**Fix**:

1. On mount, fetch real data:
   ```javascript
   useEffect(() => {
     getHealthSummary(patientId).then(setHealthSummary);
     getRiskInsights(patientId, 90).then(setRiskInsights);
   }, [patientId]);
   ```
   (`getHealthSummary` already exists in `src/api.js`; `getRiskInsights` too.)

2. Replace the three hardcoded stat cards with values derived from `healthSummary`
   and `riskInsights` (today's water intake %, current risk %, and — once Phase 4
   ships real accumulated history — a genuine "days since last severe scan" instead of
   a hardcoded "127").

3. Replace the fake drag-and-drop block with the already-working
   `ImageUploadComponent` (either embed it directly in the dashboard grid cell, or make
   the drop zone call `setActiveTab('scan')` to hand off to the real component — the
   embed approach is less code).

4. Replace the static risk trend bar chart with real historical points. This needs
   actual time-series data per patient — see the new endpoint below.

**New backend endpoint** (`backend/main.py`), to make the trend chart honest:

```python
@app.get("/api/risk-insights/{patient_id}/history")
def get_risk_history(patient_id: str, months: int = 6, db: Session = Depends(get_db)):
    """Monthly risk score snapshots for trend charting."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Simplest honest version: compute today's risk once per month boundary
    # by re-running calculate_patient_risk against data available as of that month.
    # For a college-project scope, storing a monthly snapshot row going forward
    # (rather than reconstructing history retroactively) is the pragmatic approach —
    # add a lightweight RiskSnapshot model and write one row per month on first
    # request per month, then this endpoint just reads stored snapshots.
    ...
```

Add a `RiskSnapshot` table (`patient_id`, `month` (YYYY-MM), `risk_percentage`,
`created_at`) to `backend/database.py`, and write a row the first time
`/api/risk-insights/{patient_id}` is called in a new calendar month. This is
intentionally simple — a full time-series backfill isn't worth the effort for a demo,
and being explicit that the chart starts accumulating from when this feature ships
(rather than fabricating a 6-month history) is the honest choice.

**Verification**: dashboard shows numbers that change when you log water intake or
upload a scan — refresh the page and confirm the numbers persist (proving they're read
from the database, not component state).

### 2.3 Delete dead code paths

- Remove the `pickle` import in `backend/main.py` (imported, never used).
- Remove the unused `getPatient` import check in `ImageUploadComponent.jsx` if unused
  after review (`import { uploadScan, getPatient } from '../api'` — confirm `getPatient`
  is actually called; if not, drop it from the import).

### 2.4 Commit

```bash
git add -A
git commit -m "Wire up appointments persistence and replace hardcoded dashboard data with live API calls"
```

**Checkpoint**: every number visible on the dashboard and appointments tab traces back
to a real database row, verifiable via `/docs`.

---

## Phase 3 — Real scan analysis model (replace OpenCV heuristic) — free

### 3.1 Get the dataset

Use the public **"CT Kidney Dataset: Normal-Cyst-Tumor-Stone"** dataset on Kaggle
(~12,000 labeled CT images across 4 classes). This is free — no cost, just a Kaggle
account.

```bash
# Requires a free Kaggle account + API token (Account → Create New API Token,
# downloads kaggle.json — place at ~/.kaggle/kaggle.json, chmod 600)
pip install kaggle
mkdir -p ~/.kaggle
mv ~/Downloads/kaggle.json ~/.kaggle/kaggle.json
chmod 600 ~/.kaggle/kaggle.json

cd backend
mkdir -p data
kaggle datasets download -d nazmul0087/ct-kidney-dataset-normal-cyst-tumor-and-stone -p data --unzip
```

(Dataset name/slug confirmed as of writing — if Kaggle has renamed or removed it by
the time this is executed, search Kaggle for "CT Kidney Stone" and substitute the
current slug; the rest of this phase is dataset-agnostic as long as it's labeled CT
images with a stone/no-stone distinction.)

### 3.2 Prepare a train/val/test split

Create `backend/prepare_dataset.py`:

```python
"""Split the Kaggle CT kidney dataset into train/val/test folders."""
import os, shutil, random

SOURCE_DIR = "data/CT-KIDNEY-DATASET"  # adjust to actual unzip folder name
OUT_DIR = "data/split"
CLASSES = ["Normal", "Stone"]  # binary: stone vs not, for scope control
SPLIT = {"train": 0.7, "val": 0.15, "test": 0.15}

random.seed(42)

for cls in CLASSES:
    files = os.listdir(os.path.join(SOURCE_DIR, cls))
    random.shuffle(files)
    n = len(files)
    n_train = int(n * SPLIT["train"])
    n_val = int(n * SPLIT["val"])
    splits = {
        "train": files[:n_train],
        "val": files[n_train:n_train + n_val],
        "test": files[n_train + n_val:],
    }
    for split_name, split_files in splits.items():
        out_path = os.path.join(OUT_DIR, split_name, cls)
        os.makedirs(out_path, exist_ok=True)
        for f in split_files:
            shutil.copy(os.path.join(SOURCE_DIR, cls, f), os.path.join(out_path, f))

print("Dataset split complete:", OUT_DIR)
```

Run it: `python prepare_dataset.py`

### 3.3 Train the classifier

Create `backend/train_vision_model.py` (this file is referenced throughout the old docs
but has never actually existed — this closes that gap):

```python
"""
RenalCare AI - Vision Model Training
Transfer learning on MobileNetV2 to classify kidney CT scans: Stone vs Normal.
Free to run: CPU works (slow), or use a free Kaggle/Colab GPU notebook.
"""
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from torchvision import datasets, transforms, models

DATA_DIR = "data/split"
BATCH_SIZE = 32
EPOCHS = 10
LR = 1e-4
DEVICE = "cuda" if torch.cuda.is_available() else "mps" if torch.backends.mps.is_available() else "cpu"
# Note: "mps" targets Apple Silicon GPU acceleration — relevant since training
# happens on a Mac; falls back to cpu automatically on Intel Macs.

transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.Grayscale(num_output_channels=3),  # CT scans are grayscale; pretrained nets expect 3-channel
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

train_ds = datasets.ImageFolder(f"{DATA_DIR}/train", transform=transform)
val_ds = datasets.ImageFolder(f"{DATA_DIR}/val", transform=transform)

train_loader = DataLoader(train_ds, batch_size=BATCH_SIZE, shuffle=True)
val_loader = DataLoader(val_ds, batch_size=BATCH_SIZE)

model = models.mobilenet_v2(weights="IMAGENET1K_V1")
model.classifier[1] = nn.Linear(model.last_channel, len(train_ds.classes))
model = model.to(DEVICE)

criterion = nn.CrossEntropyLoss()
optimizer = torch.optim.Adam(model.parameters(), lr=LR)

def evaluate(loader):
    model.eval()
    correct, total = 0, 0
    with torch.no_grad():
        for x, y in loader:
            x, y = x.to(DEVICE), y.to(DEVICE)
            preds = model(x).argmax(dim=1)
            correct += (preds == y).sum().item()
            total += y.size(0)
    return correct / total

for epoch in range(EPOCHS):
    model.train()
    running_loss = 0.0
    for x, y in train_loader:
        x, y = x.to(DEVICE), y.to(DEVICE)
        optimizer.zero_grad()
        loss = criterion(model(x), y)
        loss.backward()
        optimizer.step()
        running_loss += loss.item()

    val_acc = evaluate(val_loader)
    print(f"Epoch {epoch+1}/{EPOCHS} — loss: {running_loss/len(train_loader):.4f} — val_acc: {val_acc:.4f}")

os.makedirs("models", exist_ok=True)
torch.save({
    "model_state": model.state_dict(),
    "classes": train_ds.classes,
}, "models/kidney_stone_cnn.pth")
print("Saved model to models/kidney_stone_cnn.pth")
print("Class order:", train_ds.classes)
```

Run it (inside the activated venv, from `backend/`):

```bash
python train_vision_model.py
```

On a Mac with Apple Silicon (M1/M2/M3), the `mps` device will use the GPU
automatically — no extra setup needed beyond a torch version that supports MPS
(torch ≥ 1.12, already satisfied by the pinned `torch==2.1.1`).

Expect this to take anywhere from ~15 minutes (Apple Silicon, MPS) to a few hours
(older Intel Mac, CPU-only) for 10 epochs on ~12k images. If it's too slow locally,
run the identical script in a free Kaggle Notebook (Settings → Accelerator → GPU) or
free-tier Google Colab, then download `models/kidney_stone_cnn.pth` back to the Mac.

### 3.4 Evaluate on the held-out test set

Add a short eval block (or a separate `evaluate_model.py`) that loads
`data/split/test` and reports accuracy, precision/recall, and a confusion matrix using
`sklearn.metrics` (already in `requirements.txt`). Record these numbers — they go in
the final report/demo as evidence the model is real and measured, not just "trust me."

**Minimum bar for shipping this as the production path**: test accuracy meaningfully
above the majority-class baseline (i.e., better than "always guess the more common
class"). If it doesn't clear that bar within the time available, fall back per the
[rollback plan](#rollback--fallback-plan-per-phase) below — do not ship an unvalidated
model silently.

### 3.5 Integrate into the backend

Update `backend/image_utils.py`:

```python
import torch
from torchvision import transforms, models
import torch.nn as nn

_model = None
_classes = None

def load_vision_model(model_path="./models/kidney_stone_cnn.pth"):
    global _model, _classes
    checkpoint = torch.load(model_path, map_location="cpu")
    _classes = checkpoint["classes"]
    model = models.mobilenet_v2(weights=None)
    model.classifier[1] = nn.Linear(model.last_channel, len(_classes))
    model.load_state_dict(checkpoint["model_state"])
    model.eval()
    _model = model

_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.Grayscale(num_output_channels=3),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

def classify_stone_presence(pil_image):
    """Returns (is_stone: bool, confidence: float)"""
    if _model is None:
        load_vision_model()
    x = _transform(pil_image).unsqueeze(0)
    with torch.no_grad():
        logits = _model(x)
        probs = torch.softmax(logits, dim=1)[0]
        pred_idx = probs.argmax().item()
    return _classes[pred_idx] == "Stone", probs[pred_idx].item()
```

Update `analyze_image_file()` to run the classifier first; only run the existing
OpenCV contour logic (for size/location estimate) when the classifier says a stone is
present — the classical CV work is legitimate for that narrower sub-problem, it's just
no longer responsible for the presence/absence decision:

```python
def analyze_image_file(file_path: str) -> Dict:
    try:
        from PIL import Image
        pil_image = Image.open(file_path)
        is_stone, confidence = classify_stone_presence(pil_image)

        if not is_stone:
            return {"success": True, "analysis": {
                "stone_size_mm": 0, "location": "No stone detected",
                "severity": "none", "confidence": round(confidence, 4), "num_stones": 0
            }}

        image = load_image(file_path)  # existing OpenCV grayscale loader
        stone_analysis = detect_kidney_stones(image)  # existing contour logic, for size/location only
        stone_analysis["confidence"] = round(confidence, 4)  # overwrite with real model confidence
        return {"success": True, "analysis": stone_analysis}
    except Exception as e:
        return {"success": False, "error": str(e)}
```

Wire `load_vision_model()` into FastAPI's startup event in `main.py` (alongside
`init_db()`) so the model loads once, not per-request:

```python
@app.on_event("startup")
def startup_event():
    init_db()
    load_vision_model()  # add this
    ...
```

Point `VISION_MODEL_PATH` in `.env` at `./models/kidney_stone_cnn.pth` (already added
to `.env.example` in Phase 1.3) and read it in `main.py`/`image_utils.py` via
`os.getenv("VISION_MODEL_PATH", "./models/kidney_stone_cnn.pth")` instead of hardcoding
the path.

### 3.6 Gitignore the trained model and raw dataset

Large binary files don't belong in git. Add to `.gitignore`:

```gitignore
backend/data/
backend/models/*.pth
backend/models/*.pkl
```

Document in `backend/README.md` that `train_vision_model.py` must be run once after
clone to regenerate `models/kidney_stone_cnn.pth` (or provide a download link if hosting
the trained weights somewhere external, e.g. a GitHub Release attachment — optional,
not required for the demo).

### 3.7 Commit

```bash
git add -A
git commit -m "Train and integrate real CNN classifier for kidney stone detection, replacing OpenCV-only heuristic"
```

**Checkpoint**: uploading a known-stone image and a known-normal image through the UI
produces different, model-driven confidence scores — not the old fixed 0.75/0.85/0.90
severity-band values.

---

## Phase 4 — Multi-patient support / minimal auth — free

### 4.1 Add a `User` model

`backend/database.py` — add:

```python
class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship("Patient", back_populates="user", uselist=False)
```

Add `user_id = Column(String, ForeignKey("users.id"), unique=True, index=True)` and
`user = relationship("User", back_populates="patient")` to the existing `Patient` model
(one-to-one is enough scope for a college demo — one login, one patient profile).

### 4.2 Password hashing & JWT

```bash
pip install passlib[bcrypt] python-jose[cryptography]
```

Add both to `backend/requirements.txt`.

Create `backend/auth.py`:

```python
from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timedelta
import os

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.getenv("SECRET_KEY")  # from .env — see security note below
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days, fine for a demo project

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    to_encode["exp"] = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_access_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None
```

**Security note on `SECRET_KEY`**: the current `.env` placeholder
(`your-secret-key-here-change-in-production`) must be replaced with a real random
value before this phase ships, even for a demo — a predictable JWT signing key defeats
the entire point of authentication. Generate one:

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

Paste the output into `backend/.env` (the real, gitignored file) as `SECRET_KEY=...`.
Never reuse this value in `.env.example` (keep the placeholder there).

### 4.3 Auth endpoints

`backend/main.py`:

```python
from auth import hash_password, verify_password, create_access_token, decode_access_token
from fastapi.security import OAuth2PasswordBearer

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

@app.post("/api/auth/register")
def register(email: str, password: str, name: str, age: int, gender: str, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(id=f"user_{uuid.uuid4().hex[:8]}", email=email, hashed_password=hash_password(password))
    db.add(user)
    db.flush()
    patient = Patient(id=f"patient_{uuid.uuid4().hex[:8]}", name=name, age=age, gender=gender, user_id=user.id)
    db.add(patient)
    db.commit()
    token = create_access_token({"sub": user.id, "patient_id": patient.id})
    return {"access_token": token, "token_type": "bearer", "patient_id": patient.id}

@app.post("/api/auth/login")
def login(email: str, password: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    patient = db.query(Patient).filter(Patient.user_id == user.id).first()
    token = create_access_token({"sub": user.id, "patient_id": patient.id if patient else None})
    return {"access_token": token, "token_type": "bearer", "patient_id": patient.id if patient else None}

def get_current_patient_id(token: str = Depends(oauth2_scheme)) -> str:
    payload = decode_access_token(token)
    if not payload or not payload.get("patient_id"):
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return payload["patient_id"]
```

Note: for form-encoded login (standard OAuth2 password flow expected by
`OAuth2PasswordBearer`), switch `register`/`login` to accept
`OAuth2PasswordRequestForm` rather than raw query params if strict OAuth2 compliance
matters — for a demo, matching the frontend's `fetch` calls exactly (JSON body) is
simpler; document whichever choice is made in `backend/README.md` so it isn't
rediscovered by trial and error later.

### 4.4 Frontend — login/register screen + auth-aware API calls

- New `src/components/AuthComponent.jsx` — simple email/password form, calls
  `/api/auth/login` or `/api/auth/register`, stores the returned JWT.
- **Token storage security note**: `localStorage` is the pragmatic choice for a
  student demo (simple, works), but is readable by any JS on the page — acceptable
  risk here since this isn't handling real patient data or facing the public internet.
  If this were ever deployed for real use, an httpOnly cookie would be the correct
  choice instead. State this tradeoff explicitly in the final report so it reads as a
  conscious decision, not an oversight.
- `src/api.js` — add an `Authorization: Bearer <token>` header to every authenticated
  call, reading the token from `localStorage`.
- `src/App.jsx` — gate the dashboard behind an auth check; replace every hardcoded
  `patientId="patient_demo_001"` prop with the patient id from the logged-in user's
  token/session state.

### 4.5 Commit

```bash
git add -A
git commit -m "Add minimal JWT auth and per-user patient records, replacing hardcoded demo patient"
```

**Checkpoint**: two different accounts, registered separately, see two different sets
of scans/hydration logs/risk scores — no data bleeds between them.

---

## Phase 5 — Health Goals tab (LLM-powered) — ~₹150–250

This is the only phase in the whole roadmap with a real dollar cost, so it's
deliberately scoped tight and done last, once the rest of the budget picture (Phase 3's
free-vs-fallback outcome) is known.

### 5.1 Get an Anthropic API key — **do this only after reading the full security procedure below**

See [API key generation & security procedure](#api-key-generation--security-procedure-anthropic).
Do not skip ahead — the key, once generated, is a live credential that can spend real
money if mishandled, and the steps below are written to prevent exactly that.

### 5.2 Backend — goals endpoint

```bash
pip install anthropic
```
Add `anthropic` to `backend/requirements.txt`.

Add a `GoalSnapshot` table to `backend/database.py` for daily caching (this is what
keeps the cost bounded even under repeated demo clicks):

```python
class GoalSnapshot(Base):
    __tablename__ = "goal_snapshots"

    id = Column(String, primary_key=True, index=True)
    patient_id = Column(String, ForeignKey("patients.id"), index=True)
    date = Column(String, index=True)  # YYYY-MM-DD
    goals_json = Column(Text)          # JSON array of goal objects
    created_at = Column(DateTime, default=datetime.utcnow)
```

New file `backend/goals.py`:

```python
"""
RenalCare AI - LLM-Powered Health Goals
Calls Claude Haiku with tightly bounded token limits to keep cost predictable.
Falls back to a free rule-based generator if ENABLE_LLM_GOALS=false or the API call fails.
"""
import os
import json
import anthropic

client = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY from env automatically

MODEL = "claude-haiku-4-5-20251001"  # cheapest current Claude model — confirm latest id at implementation time
MAX_TOKENS = 400  # hard cap — keeps each call's cost small and predictable

def generate_llm_goals(patient_stats: dict) -> list[dict]:
    """
    patient_stats example:
    {
      "name": "...", "risk_percentage": 42.0, "risk_level": "Moderate",
      "hydration_compliance": 68.0, "stone_type": "calcium_oxalate",
      "latest_scan_severity": "mild", "recovery_percentage": 58.0
    }
    Returns: [{"title": str, "description": str, "category": str}, ...]
    """
    prompt = f"""You are a kidney health assistant. Based on this patient's data, generate
exactly 4 short, specific, actionable health goals and one brief motivational line.

Patient data:
{json.dumps(patient_stats, indent=2)}

Respond ONLY with valid JSON in this exact shape, no other text:
{{
  "motivational_line": "...",
  "goals": [
    {{"title": "...", "description": "...", "category": "hydration|diet|monitoring|lifestyle"}},
    ...
  ]
}}"""

    response = client.messages.create(
        model=MODEL,
        max_tokens=MAX_TOKENS,
        messages=[{"role": "user", "content": prompt}],
    )
    text = response.content[0].text
    return json.loads(text)


def generate_fallback_goals(patient_stats: dict) -> dict:
    """Free, rule-based fallback — same style as get_health_recommendations() in main.py."""
    goals = []
    if patient_stats.get("hydration_compliance", 100) < 80:
        goals.append({"title": "Boost daily hydration", "description": "Aim for at least 80% of your daily water goal for the next 7 days.", "category": "hydration"})
    if patient_stats.get("risk_level") in ("Moderate", "High"):
        goals.append({"title": "Schedule a follow-up", "description": "Book a consultation with your nephrologist this month.", "category": "monitoring"})
    goals.append({"title": "Log every meal", "description": "Track meals daily to keep oxalate and sodium intake visible.", "category": "diet"})
    goals.append({"title": "Stay consistent", "description": "Keep up your current hydration and diet routine.", "category": "lifestyle"})
    return {"motivational_line": "Small consistent habits add up to real recovery progress.", "goals": goals}
```

`backend/main.py`:

```python
from goals import generate_llm_goals, generate_fallback_goals

@app.get("/api/goals/{patient_id}")
def get_health_goals(patient_id: str, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    today = datetime.utcnow().date().isoformat()

    # Serve from cache if already generated today — this is what bounds the cost
    cached = db.query(GoalSnapshot).filter(
        GoalSnapshot.patient_id == patient_id, GoalSnapshot.date == today
    ).first()
    if cached:
        return json.loads(cached.goals_json)

    latest_scan = db.query(KidneyScan).filter(KidneyScan.patient_id == patient_id).order_by(KidneyScan.created_at.desc()).first()
    risk_score = calculate_patient_risk(patient, db)

    patient_stats = {
        "name": patient.name,
        "risk_percentage": round(risk_score * 100, 1),
        "risk_level": get_risk_level(risk_score),
        "stone_type": latest_scan.stone_type if latest_scan else "unknown",
        "latest_scan_severity": latest_scan.severity if latest_scan else "none",
    }

    enable_llm = os.getenv("ENABLE_LLM_GOALS", "false").lower() == "true"
    try:
        result = generate_llm_goals(patient_stats) if enable_llm else generate_fallback_goals(patient_stats)
    except Exception as e:
        print(f"LLM goal generation failed, using fallback: {e}")
        result = generate_fallback_goals(patient_stats)

    snapshot = GoalSnapshot(
        id=f"goal_{uuid.uuid4().hex[:8]}",
        patient_id=patient_id,
        date=today,
        goals_json=json.dumps(result),
    )
    db.add(snapshot)
    db.commit()

    return result
```

This design means: **at most one paid API call per patient per day**, regardless of how
many times the tab is opened or refreshed. For a demo with even 5 test patients over
a week of preparation, that's ~35 calls total — nowhere near the budget ceiling.

### 5.3 Frontend — `GoalsComponent.jsx`

Model this on `RiskInsightsComponent.jsx`'s structure (loading/error states, card
layout). Add `getHealthGoals(patientId)` to `src/api.js`:

```javascript
export const getHealthGoals = async (patientId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/goals/${patientId}`);
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Error fetching health goals:", error);
    throw error;
  }
};
```

Replace the `'goals'` tab's `<div>coming soon</div>` in `src/App.jsx` with
`<GoalsComponent patientId={...} />`.

### 5.4 Commit

```bash
git add -A
git commit -m "Add LLM-powered Health Goals tab with daily caching and free rule-based fallback"
```

**Checkpoint**: opening the Goals tab twice in the same day only triggers one Anthropic
API call (check the Anthropic console usage dashboard to confirm), and setting
`ENABLE_LLM_GOALS=false` in `.env` still produces a working (if simpler) goals tab with
zero API calls.

---

## API key generation & security procedure (Anthropic)

Follow this exactly — API keys are bearer credentials: anyone who has the key can spend
money on the account until it's revoked, with no additional authentication required.
This section exists so that never happens by accident.

### Step 1 — Create the Anthropic account & add billing

1. Go to the Anthropic Console: `https://console.anthropic.com` (type this URL directly
   into the browser rather than clicking a link from an email/message, to avoid
   phishing pages that mimic the real console).
2. Sign up / log in.
3. Navigate to **Settings → Billing**.
4. Add a payment method and purchase credit. Anthropic's minimum initial purchase is
   currently **USD $5** — this single top-up is the entire ₹500 budget for this
   project. Do not set up auto-reload / auto top-up — leave it as a one-time purchase
   so spending cannot silently exceed the budget.
5. Under **Settings → Billing → Usage limits** (if available on the console at
   implementation time), set a **monthly spend limit** matching the $5 purchase, so the
   account hard-stops rather than over-drafting if something goes wrong (e.g. a bug
   causing a retry loop).

### Step 2 — Generate the API key

1. Navigate to **Settings → API Keys** in the console.
2. Click **Create Key**.
3. Name it something identifiable, e.g. `renalcare-demo-dev` — this matters if the key
   is ever revoked and regenerated, so it's clear from the name which project/purpose
   it was for.
4. Copy the key **immediately** — Anthropic shows the full key value exactly once. If
   the page is closed before copying, the only option is to delete that key and
   generate a new one (the value cannot be retrieved again later).
5. Paste it somewhere temporary and safe for the next step (a password manager's
   "secure note," not a Slack message, not a plain text file on the Desktop, not an
   email to yourself).

### Step 3 — Store the key on the Mac (never in git)

The key goes in `backend/.env` — a file that is now correctly gitignored as of
Phase 1.3 — **never** in `backend/.env.example`, never hardcoded in `goals.py` or any
`.py`/`.js` file, never pasted into a commit message, and never pasted into this
`ROADMAP.md` or any other doc that gets committed.

```bash
cd backend
# Confirm .env is gitignored before writing anything sensitive into it
git check-ignore -v .env
# Expected output: .gitignore:<line>:.env    .env
# If this prints nothing, STOP — .gitignore is not correctly configured yet,
# go back and fix Phase 1.3 before proceeding.
```

Open `backend/.env` (create it from `.env.example` if it doesn't exist yet:
`cp .env.example .env`) and add:

```ini
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
ENABLE_LLM_GOALS=true
```

The Anthropic Python SDK (`anthropic` package, installed in Phase 5.2) automatically
reads `ANTHROPIC_API_KEY` from the environment — no need to pass it explicitly in code,
which is exactly what avoids ever having the key appear in a source file.

### Step 4 — Load the `.env` file into the actual process environment

FastAPI needs the variables in `backend/.env` to actually reach `os.getenv(...)` calls
at runtime. The project already lists `python-dotenv` in `requirements.txt` — confirm
`backend/main.py` (or `database.py`, wherever startup config is read) calls it near the
top of the entrypoint:

```python
from dotenv import load_dotenv
load_dotenv()  # must run before any os.getenv() calls, including anthropic.Anthropic()
```

If this line is missing from `main.py`, add it — this is a one-line, easy-to-miss gap
between "the key is in `.env`" and "the code can actually see it."

**Alternative (belt-and-suspenders) — export directly in the shell**, useful for
quick manual testing without relying on `.env` loading order:

```bash
# Add to ~/.zshrc (Mac's default shell config file) for a persistent per-user export —
# only do this on a personal development machine, never on a shared/lab Mac:
echo 'export ANTHROPIC_API_KEY="sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"' >> ~/.zshrc
source ~/.zshrc

# Verify it loaded (prints the key — only run this in a private terminal,
# never share a screenshot/recording of this output):
echo $ANTHROPIC_API_KEY
```

If using this shell-export approach instead of (or in addition to) `.env`, be aware
`~/.zshrc` is a personal dotfile outside the git repo — it will never accidentally get
committed, which is exactly why this is a safe fallback location. **Do not** export it
via a command typed directly in a shared terminal session, screen share, or recording.

### Step 5 — Prevent leaks in practice

- **Never** log the raw key. If debugging API calls, log `response.status_code` or a
  redacted form (`key[:12] + "..."`), never the full string.
- **Never** put the key in a GitHub issue, PR description, commit message, Slack
  message, or this roadmap document — if it's ever pasted anywhere by accident,
  treat it as compromised (see Step 7 — revoke and rotate, don't just delete the
  message, since chat history / git history often retains it anyway).
- Before every `git commit`, run `git status` and `git diff --cached` and actually read
  the output — this project's `.gitignore` now covers `.env`, but a manual
  `git add -f backend/.env` would still override that, so the habit of checking the
  diff before committing is the real safety net, not just the ignore file.
- Consider installing a pre-commit secret scanner as extra insurance (optional, free):
  ```bash
  pip install detect-secrets
  cd renalcare
  detect-secrets scan > .secrets.baseline
  ```
  and wiring it into a git pre-commit hook — not required for a college demo, but
  cheap insurance if there's time.

### Step 6 — Set a usage budget alert

Back in the Anthropic Console under **Settings → Billing**, set up an email alert
threshold (e.g. at $3 of the $5 purchased) if the console supports it at
implementation time, so there's a warning before the full ₹500 is exhausted rather than
finding out after the fact.

### Step 7 — If the key is ever exposed (accidental commit, shared screen, etc.)

1. Go to **Settings → API Keys** in the Anthropic console immediately.
2. Click **Revoke** / **Delete** on the exposed key — this takes effect immediately,
   any further calls using it will fail.
3. Generate a new key following Step 2 again, and update `backend/.env` with the new
   value.
4. If it was committed to git, the value still exists in git history even after
   revoking (revoking makes it useless, but doesn't erase it from history) — for a
   private repo used only for a college project this is generally low-risk once
   revoked, but if the repo is ever made public, scrub history first
   (`git filter-repo` or BFG Repo-Cleaner) before making it public.
5. Check **Settings → Billing → Usage** for any unexpected spend in the window between
   exposure and revocation — this is why Step 6's spend alert matters.

---

## Sequencing & effort estimate

```
Phase 0 (env setup)         — ~30 min,  do first, on the Mac, once
Phase 1 (hygiene)           — ~15 min,  zero risk, do immediately after Phase 0
Phase 2 (fix fakes)         — ~1–2 days, unblocks a credible demo even before AI work lands
Phase 3 (real CNN model)    — ~3–5 days, dataset download + training + integration
                               (training itself is minutes-to-hours of *wall clock*,
                                most of the time is data prep + integration + eval)
Phase 4 (auth/patients)     — ~2–3 days, needed for the demo to feel "real world"
Phase 5 (Health Goals LLM)  — ~1 day,   do last — by then the exact remaining budget
                               from Phase 3 (free vs. any fallback cost) is known
```

Phases 3 and 4 can run in parallel if two people are working on this — they don't
depend on each other. Phase 5 depends on Phase 2's dashboard/API patterns but not on
Phase 3 or 4, so it could also be pulled earlier if the LLM feature needs more lead
time for iteration/testing before a demo date.

---

## Definition of done (checklist)

Copy this into an issue tracker or just check off inline as work lands:

- [ ] Fresh `git clone` + Phase 0 steps run end-to-end with no manual fixes needed
- [ ] `git status` after clone shows no `.db`, `__pycache__`, or uploaded images tracked
- [ ] No stale/contradictory docs remain in the repo (only accurate `README.md`s)
- [ ] Login → real per-user patient dashboard (no hardcoded `patient_demo_001`)
- [ ] Uploading a CT image returns a classification from the trained CNN, with a
      logged test-set accuracy number to cite if asked
- [ ] Dashboard numbers match what's actually in the database (verified by refresh)
- [ ] Booking an appointment creates a real, persisted row — visible after reload
- [ ] Health Goals tab produces real personalized output, cached daily, with a working
      free fallback when `ENABLE_LLM_GOALS=false`
- [ ] `backend/.env` (with the real Anthropic key) is confirmed gitignored
      (`git check-ignore -v backend/.env` prints a match)
- [ ] Anthropic console usage checked and confirmed under the ₹500 / $5 ceiling
- [ ] No API key appears anywhere in `git log -p` (spot-check with
      `git log -p | grep -i "sk-ant"` before considering the repo demo/submission-ready)

---

## Rollback / fallback plan (per phase)

Every phase has a cheap, working fallback so a delay in one area never blocks the demo:

| Phase | If it's not done in time | Fallback |
|---|---|---|
| 3 (CNN model) | Training doesn't converge well, or takes too long | Keep the current OpenCV heuristic, but be upfront in the demo that it's classical CV, not ML — still an honest, working feature, just don't oversell it |
| 4 (Auth) | Runs out of time | Ship with the single hardcoded demo patient as-is, note it as "future work" rather than pretending it's multi-tenant |
| 5 (Goals LLM) | Budget concerns, or API integration issues close to demo day | `ENABLE_LLM_GOALS=false` serves the free rule-based fallback automatically — the tab still works, just without LLM personalization |

The one thing that should never be rolled back on: Phase 1 (hygiene) and the API key
security steps — those are cheap, low-risk, and prevent real problems (leaked
credentials, a bloated git history) regardless of how the rest of the timeline goes.
