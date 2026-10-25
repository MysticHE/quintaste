"""Build a local release archive containing only deployable application files."""

import hashlib
import json
import re
import subprocess
import sys
import tarfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DIRECTORIES = ("src", "assets", "server", "server-assets", "data/pilot", "data/menus", "dist", "admin/src", "admin/db")
FILES = (
    "package.json", "package-lock.json", "app.json", "tsconfig.json", "Dockerfile",
    ".dockerignore", "deploy/compose.yml", "deploy/preview-gateway.mjs",
    "deploy/init-db.sh", "deploy/backup.sh", "deploy/quintaste-backup.service",
    "deploy/quintaste-backup.timer",
    "deploy/admin.compose.yml", "deploy/avatar.compose.yml", "admin/package.json", "admin/package-lock.json", "admin/tsconfig.json",
    "admin/next-env.d.ts", "admin/next.config.ts", "admin/Dockerfile",
    "deploy/quintaste-admin-maintenance.service", "deploy/quintaste-admin-maintenance.timer",
)
OPTIONAL_FILES = ("expo-env.d.ts", "metro.config.js", "babel.config.js")
DOCUMENT_EXTENSIONS = {".md", ".mdx", ".pdf", ".doc", ".docx", ".rtf", ".rst", ".adoc", ".txt"}
PRIVATE_DIRECTORIES = {"docs", "documentation", ".local", ".git", ".expo", "node_modules", "__pycache__"}
LICENSE_NOTICES = {"server-assets/avatar/LICENSE.txt", "assets/fonts/Fredoka-OFL.txt"}


def excluded(relative: Path) -> bool:
    """Keep project documentation, credentials and generated source maps local."""
    name = relative.name.lower()
    exported_asset = relative.parts[:3] == ("dist", "client", "assets") and relative.suffix.lower() in {
        ".ttf", ".otf", ".woff", ".woff2", ".png", ".jpg", ".jpeg", ".webp", ".gif",
    }
    if any(part.lower() in PRIVATE_DIRECTORIES and not (part.lower() == "node_modules" and exported_asset)
           for part in relative.parts):
        return True
    if relative.as_posix() in LICENSE_NOTICES:
        return False
    return (
        relative.suffix.lower() in DOCUMENT_EXTENSIONS | {".map", ".env", ".local", ".pem", ".key"}
        or name.startswith(".env")
        or name.endswith(".example")
        or name == "provenance.json"
    )


def release_files() -> list[Path]:
    paths = [ROOT / name for name in FILES]
    for name in (*FILES, *DIRECTORIES):
        if not (ROOT / name).exists():
            raise ValueError(f"Required release input is missing: {name}")
    paths.extend(ROOT / name for name in OPTIONAL_FILES if (ROOT / name).exists())
    for name in DIRECTORIES:
        paths.extend((ROOT / name).rglob("*"))
    accepted = []
    for path in sorted(set(paths)):
        relative = path.relative_to(ROOT)
        if path.is_symlink() or not path.resolve().is_relative_to(ROOT):
            raise ValueError(f"Linked release input is not allowed: {relative}")
        if path.is_file() and not excluded(relative):
            accepted.append(path)
    return accepted


def validate_server_modules() -> None:
    """Metro API bundles share a registry: never mix exports from different builds."""
    functions = ROOT / "dist/server/_expo/functions"
    modules: dict[str, tuple[bytes, str]] = {}
    for path in sorted(functions.rglob("*.js")):
        definition: list[str] = []
        for line in path.read_text(encoding="utf-8").splitlines():
            if line.startswith("__d(") and definition:
                raise ValueError(f"Unrecognized Metro module format in {path.name}; review the export")
            if not definition and not line.startswith("__d("):
                continue
            definition.append(line)
            match = re.search(r"\},(\d+),\[.*\]\);$", line)
            if not match:
                continue
            module_id = match[1]
            digest = hashlib.sha256("\n".join(definition).encode("utf-8")).digest()
            definition.clear()
            previous = modules.get(module_id)
            if previous and previous[0] != digest:
                raise ValueError(f"Conflicting Metro module {module_id}: {previous[1]} and {path.name}. "
                                 "Rebuild all server routes together; do not copy individual bundles between exports.")
            modules[module_id] = (digest, path.name)
        if definition:
            raise ValueError(f"Unrecognized Metro module format in {path.name}; review the export")
    if not modules:
        raise ValueError("No Metro server modules found; validate the server export before packaging")


def main() -> None:
    if len(sys.argv) != 2 or not re.fullmatch(r"[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}", sys.argv[1]):
        raise ValueError("Usage: python scripts/package-release.py RELEASE_NAME")
    output = ROOT / ".local" / "releases"
    if not output.resolve().is_relative_to(ROOT):
        raise ValueError("Release output must stay inside the workspace")
    output.mkdir(parents=True, exist_ok=True)
    archive = output / (sys.argv[1] + ".tgz")
    manifest = output / (sys.argv[1] + ".json")
    if archive.exists() or manifest.exists():
        raise ValueError("Release name already exists; choose a new immutable name")
    files = release_files()
    if (ROOT / 'server-assets/editorial-baseline.json').exists():
        baseline_check = subprocess.run(['node', str(ROOT / 'scripts/build-editorial-baseline.cjs'), '--check'], cwd=ROOT, capture_output=True, text=True)
        if baseline_check.returncode:
            raise ValueError('Publication baseline validation failed: ' + baseline_check.stderr[-1000:])
    validate_server_modules()
    names = [path.relative_to(ROOT).as_posix() for path in files]
    temporary = archive.with_suffix(".tmp")
    try:
        with tarfile.open(temporary, "x:gz") as bundle:
            for path, name in zip(files, names):
                bundle.add(path, arcname=name, recursive=False)
        with tarfile.open(temporary, "r:gz") as bundle:
            if bundle.getnames() != names or any(excluded(Path(item.name)) for item in bundle):
                raise ValueError("Release archive failed its inclusion check")
        temporary.replace(archive)
        manifest.write_text(json.dumps({"archive": archive.name, "files": names}, indent=2) + "\n", encoding="utf-8")
    finally:
        temporary.unlink(missing_ok=True)
    print(json.dumps({"archive": str(archive), "manifest": str(manifest), "fileCount": len(files)}))


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, tarfile.TarError) as error:
        print(f"Release packaging failed: {error}", file=sys.stderr)
        sys.exit(1)
