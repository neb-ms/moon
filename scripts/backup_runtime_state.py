#!/usr/bin/env python3
from __future__ import annotations

import argparse
import glob
import hashlib
import io
import json
import os
import shutil
import socket
import stat
import sys
import tarfile
import time
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


DEFAULT_BACKUP_SPECS = (
    {"pattern": "/etc/project-lunar", "required": True, "label": "runtime env"},
    {"pattern": "/var/lib/project-lunar", "required": True, "label": "state data"},
    {"pattern": "/opt/project-lunar/releases", "required": False, "label": "release metadata"},
    {"pattern": "/etc/nginx/sites-available/project-lunar.conf", "required": False, "label": "nginx site"},
    {"pattern": "/etc/nginx/sites-enabled/project-lunar.conf", "required": False, "label": "nginx site link"},
    {
        "pattern": "/etc/systemd/system/project-lunar-api.service",
        "required": False,
        "label": "systemd api unit",
    },
    {
        "pattern": "/etc/systemd/system/project-lunar-cloudflared.service",
        "required": False,
        "label": "systemd cloudflared unit",
    },
    {
        "pattern": "/etc/systemd/system/project-lunar-frontend-sync.service",
        "required": False,
        "label": "systemd frontend sync unit",
    },
    {"pattern": "/etc/cloudflared/config.yml", "required": False, "label": "cloudflared config"},
    {"pattern": "/etc/cloudflared/*.json", "required": False, "label": "cloudflared credentials"},
    {"pattern": "/etc/ssl/project-lunar", "required": False, "label": "origin tls certs"},
)


@dataclass(slots=True)
class BackupTarget:
    source_path: Path
    archive_relative: str
    required: bool
    label: str


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Project Lunar runtime backup + restore utility.",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    backup_parser = subparsers.add_parser("backup", help="Create backup archive.")
    backup_parser.add_argument(
        "--output-dir",
        default="/opt/project-lunar/backups",
        help="Directory where backup archive and checksum are written.",
    )
    backup_parser.add_argument(
        "--backup-label",
        default="",
        help="Optional label suffix for archive name (default: UTC timestamp).",
    )
    backup_parser.add_argument(
        "--no-defaults",
        action="store_true",
        help="Skip default production backup paths.",
    )
    backup_parser.add_argument(
        "--include-path",
        action="append",
        default=[],
        help="Additional optional file/dir/glob pattern to include (repeatable).",
    )
    backup_parser.add_argument(
        "--required-path",
        action="append",
        default=[],
        help="Additional required file/dir/glob pattern (repeatable).",
    )

    restore_parser = subparsers.add_parser("restore", help="Restore backup archive.")
    restore_parser.add_argument("--archive", required=True, help="Path to .tar.gz backup archive.")
    restore_parser.add_argument(
        "--restore-root",
        default="/",
        help="Root directory under which snapshot paths are restored.",
    )
    restore_parser.add_argument(
        "--allow-overwrite",
        action="store_true",
        help="Allow restoring over existing files.",
    )
    restore_parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print restore actions without writing files.",
    )
    restore_parser.add_argument(
        "--skip-checksum",
        action="store_true",
        help="Skip .sha256 verification when a checksum file exists.",
    )

    return parser.parse_args(argv)


def main(argv: list[str]) -> int:
    args = parse_args(argv)
    try:
        if args.command == "backup":
            run_backup(args)
            return 0
        if args.command == "restore":
            run_restore(args)
            return 0
        raise RuntimeError(f"Unsupported command: {args.command}")
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1


def run_backup(args: argparse.Namespace) -> None:
    output_dir = Path(args.output_dir).expanduser().resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    targets, missing_optional, missing_required = collect_backup_targets(
        include_defaults=not args.no_defaults,
        include_patterns=list(args.include_path),
        required_patterns=list(args.required_path),
        cwd=Path.cwd(),
    )

    if missing_required:
        details = ", ".join(sorted(missing_required))
        raise RuntimeError(f"Required backup paths are missing: {details}")

    now_utc = datetime.now(tz=UTC)
    label = sanitize_label(args.backup_label) if args.backup_label else now_utc.strftime("%Y%m%dT%H%M%SZ")
    archive_path = output_dir / f"project-lunar-backup-{label}.tar.gz"
    checksum_path = Path(f"{archive_path}.sha256")

    manifest: dict[str, Any] = {
        "schema_version": 1,
        "created_at_utc": now_utc.isoformat(timespec="seconds").replace("+00:00", "Z"),
        "hostname": socket.gethostname(),
        "backup_label": label,
        "include_defaults": not args.no_defaults,
        "included_entries": [],
        "missing_optional_patterns": sorted(missing_optional),
    }

    with tarfile.open(archive_path, mode="w:gz", format=tarfile.PAX_FORMAT) as tar:
        for target in targets:
            if not target.source_path.exists() and not target.source_path.is_symlink():
                continue

            arcname = f"snapshot/{target.archive_relative}"
            tar.add(target.source_path, arcname=arcname, recursive=True)

            manifest["included_entries"].append(
                {
                    "source_path": str(target.source_path),
                    "archive_relative": target.archive_relative,
                    "required": target.required,
                    "label": target.label,
                    "kind": classify_path(target.source_path),
                }
            )

        manifest_bytes = json.dumps(manifest, indent=2, sort_keys=True).encode("utf-8")
        manifest_info = tarfile.TarInfo("manifest.json")
        manifest_info.size = len(manifest_bytes)
        manifest_info.mode = 0o640
        manifest_info.mtime = time.time()
        tar.addfile(manifest_info, io.BytesIO(manifest_bytes))

    checksum = sha256_file(archive_path)
    checksum_path.write_text(f"{checksum}  {archive_path.name}\n", encoding="utf-8")

    print(f"backup_archive={archive_path}")
    print(f"checksum_file={checksum_path}")
    print(f"included_count={len(manifest['included_entries'])}")
    print(f"missing_optional_count={len(missing_optional)}")
    if missing_optional:
        print(f"missing_optional={','.join(sorted(missing_optional))}")


def run_restore(args: argparse.Namespace) -> None:
    archive_path = Path(args.archive).expanduser().resolve()
    if not archive_path.exists():
        raise RuntimeError(f"Archive not found: {archive_path}")

    if not args.skip_checksum:
        verify_checksum(archive_path)

    restore_root = Path(args.restore_root).expanduser().resolve()
    if not args.dry_run:
        restore_root.mkdir(parents=True, exist_ok=True)

    extracted_count = 0
    restore_root_resolved = restore_root.resolve()

    with tarfile.open(archive_path, mode="r:gz") as tar:
        snapshot_members = [member for member in tar.getmembers() if member.name.startswith("snapshot/")]
        snapshot_members.sort(key=lambda member: (0 if member.isdir() else 1, member.name))

        for member in snapshot_members:
            relative_path = member.name.removeprefix("snapshot/").strip("/")
            if not relative_path:
                continue

            if ".." in Path(relative_path).parts:
                raise RuntimeError(f"Unsafe archive path contains '..': {member.name}")

            destination_path = (restore_root_resolved / Path(relative_path)).resolve()
            if not is_within_root(destination_path, restore_root_resolved):
                raise RuntimeError(f"Unsafe extraction target: {destination_path}")

            if args.dry_run:
                print(f"dry_run_restore={member.name} -> {destination_path}")
                extracted_count += 1
                continue

            if member.isdir():
                destination_path.mkdir(parents=True, exist_ok=True)
                apply_metadata(destination_path, member, is_symlink=False)
                extracted_count += 1
                continue

            if member.issym():
                restore_symlink(
                    destination_path=destination_path,
                    link_target=member.linkname,
                    allow_overwrite=args.allow_overwrite,
                )
                extracted_count += 1
                continue

            if member.isfile():
                restore_file(
                    tar=tar,
                    member=member,
                    destination_path=destination_path,
                    allow_overwrite=args.allow_overwrite,
                )
                extracted_count += 1
                continue

    print(f"restored_entries={extracted_count}")
    print(f"restore_root={restore_root_resolved}")


def collect_backup_targets(
    *,
    include_defaults: bool,
    include_patterns: list[str],
    required_patterns: list[str],
    cwd: Path,
) -> tuple[list[BackupTarget], set[str], set[str]]:
    targets: dict[str, BackupTarget] = {}
    missing_optional: set[str] = set()
    missing_required: set[str] = set()

    def register_pattern(pattern: str, *, required: bool, label: str) -> None:
        expanded_paths = expand_pattern(pattern)
        if not expanded_paths:
            if required:
                missing_required.add(pattern)
            else:
                missing_optional.add(pattern)
            return

        for source_path in expanded_paths:
            source_resolved = source_path.expanduser().resolve()
            if not source_resolved.exists() and not source_resolved.is_symlink():
                if required:
                    missing_required.add(str(source_resolved))
                else:
                    missing_optional.add(str(source_resolved))
                continue

            key = str(source_resolved)
            archive_relative = to_archive_relative(source_resolved, cwd=cwd)
            existing = targets.get(key)
            if existing:
                existing.required = existing.required or required
                continue

            targets[key] = BackupTarget(
                source_path=source_resolved,
                archive_relative=archive_relative,
                required=required,
                label=label,
            )

    if include_defaults:
        for spec in DEFAULT_BACKUP_SPECS:
            register_pattern(spec["pattern"], required=bool(spec["required"]), label=str(spec["label"]))

    for pattern in include_patterns:
        register_pattern(pattern, required=False, label="custom include")

    for pattern in required_patterns:
        register_pattern(pattern, required=True, label="custom required")

    ordered_targets = sorted(targets.values(), key=lambda target: target.archive_relative)
    return ordered_targets, missing_optional, missing_required


def expand_pattern(pattern: str) -> list[Path]:
    if has_glob_wildcards(pattern):
        matched = [Path(path) for path in glob.glob(pattern)]
        return sorted(matched, key=lambda path: path.as_posix())

    candidate = Path(pattern)
    return [candidate]


def has_glob_wildcards(value: str) -> bool:
    return any(char in value for char in "*?[]")


def to_archive_relative(path: Path, *, cwd: Path) -> str:
    try:
        relative_to_cwd = path.relative_to(cwd.resolve())
        normalized = relative_to_cwd.as_posix()
    except ValueError:
        normalized = path.as_posix().lstrip("/")

    normalized = normalized.replace(":", "")
    normalized = normalized.strip("/")
    if not normalized:
        raise RuntimeError(f"Cannot derive archive path from source: {path}")
    return normalized


def sanitize_label(raw_label: str) -> str:
    label = raw_label.strip()
    if not label:
        raise RuntimeError("backup label cannot be empty when provided")

    sanitized = "".join(ch if ch.isalnum() or ch in ("-", "_") else "-" for ch in label)
    sanitized = sanitized.strip("-_")
    if not sanitized:
        raise RuntimeError("backup label must contain at least one alphanumeric character")
    return sanitized


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def verify_checksum(archive_path: Path) -> None:
    checksum_path = Path(f"{archive_path}.sha256")
    if not checksum_path.exists():
        return

    line = checksum_path.read_text(encoding="utf-8").strip()
    if not line:
        raise RuntimeError(f"Checksum file is empty: {checksum_path}")

    expected = line.split()[0]
    actual = sha256_file(archive_path)
    if actual != expected:
        raise RuntimeError(
            f"Checksum mismatch for {archive_path.name}: expected {expected}, got {actual}"
        )


def restore_file(
    *,
    tar: tarfile.TarFile,
    member: tarfile.TarInfo,
    destination_path: Path,
    allow_overwrite: bool,
) -> None:
    destination_path.parent.mkdir(parents=True, exist_ok=True)
    ensure_destination_writable(destination_path, allow_overwrite=allow_overwrite)

    extracted = tar.extractfile(member)
    if extracted is None:
        raise RuntimeError(f"Could not read file member: {member.name}")

    with extracted:
        payload = extracted.read()

    destination_path.write_bytes(payload)
    apply_metadata(destination_path, member, is_symlink=False)


def restore_symlink(
    *,
    destination_path: Path,
    link_target: str,
    allow_overwrite: bool,
) -> None:
    destination_path.parent.mkdir(parents=True, exist_ok=True)
    ensure_destination_writable(destination_path, allow_overwrite=allow_overwrite)

    try:
        os.symlink(link_target, destination_path)
    except OSError as exc:
        raise RuntimeError(
            f"Failed to restore symlink {destination_path} -> {link_target}: {exc}"
        ) from exc


def ensure_destination_writable(destination_path: Path, *, allow_overwrite: bool) -> None:
    if not destination_path.exists() and not destination_path.is_symlink():
        return

    if not allow_overwrite:
        raise RuntimeError(
            f"Destination already exists: {destination_path}. Use --allow-overwrite to replace."
        )

    if destination_path.is_symlink() or destination_path.is_file():
        destination_path.unlink()
        return

    if destination_path.is_dir():
        shutil.rmtree(destination_path)
        return

    raise RuntimeError(f"Cannot overwrite unknown destination type: {destination_path}")


def apply_metadata(path: Path, member: tarfile.TarInfo, *, is_symlink: bool) -> None:
    if not is_symlink:
        mode = stat.S_IMODE(member.mode)
        try:
            os.chmod(path, mode)
        except OSError:
            pass

    try:
        os.utime(path, ns=(int(member.mtime * 1_000_000_000), int(member.mtime * 1_000_000_000)))
    except OSError:
        pass


def is_within_root(path: Path, root: Path) -> bool:
    if path == root:
        return True
    return root in path.parents


def classify_path(path: Path) -> str:
    if path.is_symlink():
        return "symlink"
    if path.is_dir():
        return "directory"
    if path.is_file():
        return "file"
    return "other"


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
