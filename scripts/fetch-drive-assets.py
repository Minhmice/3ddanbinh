import json
import os
import shutil
import subprocess
import sys
import venv
from pathlib import Path

MANIFEST = "manifest.json"
SKIP_IF_PRESENT_ENV = "SKIP_FETCH_IF_PRESENT"


def should_skip_download(dest: str) -> bool:
    """
    Skip re-downloading when assets already exist.

    Default behavior: if the destination already contains .glb files (or any
    *_original.glb backup created by optimize-models), assume assets were fetched
    previously and avoid overwriting optimized files on subsequent installs.

    Override: set SKIP_FETCH_IF_PRESENT=0 (or FORCE_FETCH=1) to always fetch.
    """
    if os.environ.get("FORCE_FETCH") == "1":
        return False
    if os.environ.get(SKIP_IF_PRESENT_ENV, "1") in ("0", "false", "False", "no", "NO"):
        return False

    root = Path(dest)
    if not root.is_dir():
        return False

    # If optimization backups exist, we definitely do not want to overwrite them.
    if any(root.glob("*_original.glb")):
        return True

    # Otherwise, if any GLB is already present, assume it's intentional.
    if any(root.glob("*.glb")):
        return True

    return False


def flatten_glb_files(dest_dir: str) -> None:
    """Move *.glb from nested folders (Drive folder title) up into dest_dir."""
    root = Path(dest_dir)
    if not root.is_dir():
        return
    for glb in list(root.rglob("*.glb")):
        if not glb.is_file():
            continue
        if glb.parent == root:
            continue
        target = root / glb.name
        if target.resolve() == glb.resolve():
            continue
        if target.exists():
            target.unlink()
        glb.rename(target)
    for path in sorted(root.rglob("*"), key=lambda p: len(str(p)), reverse=True):
        if path.is_dir():
            try:
                path.rmdir()
            except OSError:
                pass


def download_folder(folder_id: str, dest: str) -> None:
    if not folder_id or str(folder_id).startswith("REPLACE_"):
        print(
            f"Set a real Google Drive folderId in {MANIFEST} "
            "(open the shared folder, copy id from the URL /folders/<id>).",
            file=sys.stderr,
        )
        sys.exit(1)
    if should_skip_download(dest):
        print(f"[fetch] Skipping download; '{dest}' already has assets.", file=sys.stderr)
        return

    os.makedirs(dest, exist_ok=True)
    url = f"https://drive.google.com/drive/folders/{folder_id}"
    subprocess.run(
        [get_gdown_python(), "-m", "gdown", url, "-O", dest, "--folder"],
        check=True,
    )
    flatten_glb_files(dest)


def download_files(items: list) -> None:
    for item in items:
        file_id = item.get("fileId", "")
        dest = item["dest"]
        label = item.get("name", dest)

        if should_skip_download(dest):
            print(f"[fetch] Skipping {label}; '{dest}' already exists.", file=sys.stderr)
            continue

        if not file_id or str(file_id).startswith("REPLACE_"):
            print(
                f"Set a real Google Drive fileId for {label} in {MANIFEST} "
                "(share as anyone-with-link, then copy the id from the file URL).",
                file=sys.stderr,
            )
            sys.exit(1)

        parent = os.path.dirname(dest)
        if parent:
            os.makedirs(parent, exist_ok=True)

        url = f"https://drive.google.com/uc?id={file_id}"
        subprocess.run(
            [get_gdown_python(), "-m", "gdown", url, "-O", dest, "--fuzzy", "--continue"],
            check=True,
        )





def project_root() -> Path:
    # scripts/ is at <root>/scripts
    return Path(__file__).resolve().parent.parent


def venv_python_path(venv_dir: Path) -> Path:
    # macOS/Linux
    return venv_dir / "bin" / "python"


def ensure_gdown_venv(venv_dir: Path) -> Path:
    py = venv_python_path(venv_dir)
    if not py.exists():
        print(f"[fetch] Creating venv at {venv_dir}...", file=sys.stderr)
        venv.EnvBuilder(with_pip=True, clear=False, upgrade=False).create(str(venv_dir))

    try:
        subprocess.run([str(py), "-c", "import gdown"], check=True, stdout=subprocess.DEVNULL)
    except subprocess.CalledProcessError:
        print("[fetch] Installing gdown into venv...", file=sys.stderr)
        subprocess.run([str(py), "-m", "pip", "install", "--upgrade", "pip"], check=True)
        subprocess.run([str(py), "-m", "pip", "install", "gdown"], check=True)

    return py


_GDOWN_PY: str | None = None


def get_gdown_python() -> str:
    global _GDOWN_PY
    if _GDOWN_PY:
        return _GDOWN_PY
    venv_dir = project_root() / ".venv-gdown"
    py = ensure_gdown_venv(venv_dir)
    _GDOWN_PY = str(py)
    return _GDOWN_PY

def main() -> None:
    # Ensure gdown is available without touching system Python packages (PEP 668-safe).
    get_gdown_python()
    with open(MANIFEST, encoding="utf-8") as f:
        data = json.load(f)

    if isinstance(data, dict) and data.get("folderId") is not None:
        download_folder(data["folderId"], data.get("dest", "models"))
    elif isinstance(data, list):
        download_files(data)
    else:
        print(
            f"{MANIFEST} must be either {{ \"folderId\", \"dest\" }} or a list of file entries.",
            file=sys.stderr,
        )
        sys.exit(1)

    # removed sync_glbs_to_frontend_public(data) since models are loaded directly


if __name__ == "__main__":
    main()
