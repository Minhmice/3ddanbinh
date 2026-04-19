import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

MANIFEST = "manifest.json"


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
    os.makedirs(dest, exist_ok=True)
    url = f"https://drive.google.com/drive/folders/{folder_id}"
    subprocess.run(
        [sys.executable, "-m", "gdown", url, "-O", dest, "--folder"],
        check=True,
    )
    flatten_glb_files(dest)


def download_files(items: list) -> None:
    for item in items:
        file_id = item.get("fileId", "")
        dest = item["dest"]
        label = item.get("name", dest)

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
            [sys.executable, "-m", "gdown", url, "-O", dest, "--fuzzy", "--continue"],
            check=True,
        )





def ensure_gdown() -> None:
    try:
        import gdown
    except ImportError:
        print("[fetch] gdown not found. Auto-installing via pip...", file=sys.stderr)
        subprocess.run([sys.executable, "-m", "pip", "install", "gdown"], check=True)

def main() -> None:
    ensure_gdown()
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
