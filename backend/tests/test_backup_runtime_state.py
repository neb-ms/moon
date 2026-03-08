from __future__ import annotations

import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKUP_SCRIPT = REPO_ROOT / "scripts" / "backup_runtime_state.py"


def run_script(*args: str, cwd: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, str(BACKUP_SCRIPT), *args],
        cwd=cwd,
        capture_output=True,
        text=True,
        check=False,
    )


def test_backup_restore_recovery_drill(tmp_path: Path) -> None:
    source_dir = tmp_path / "source"
    config_dir = source_dir / "etc" / "project-lunar"
    data_dir = source_dir / "var" / "lib" / "project-lunar"
    config_dir.mkdir(parents=True)
    data_dir.mkdir(parents=True)

    expected_config = "LUNAR_API_PORT=8000\nLUNAR_LOG_LEVEL=info\n"
    expected_state = '{"last_sync":"2026-03-08T00:00:00Z"}\n'
    (config_dir / "api.env").write_text(expected_config, encoding="utf-8")
    (data_dir / "state.json").write_text(expected_state, encoding="utf-8")

    backup_result = run_script(
        "backup",
        "--no-defaults",
        "--required-path",
        "source/etc/project-lunar",
        "--required-path",
        "source/var/lib/project-lunar",
        "--output-dir",
        "backups",
        "--backup-label",
        "drill",
        cwd=tmp_path,
    )
    assert backup_result.returncode == 0, backup_result.stderr

    archive_path = tmp_path / "backups" / "project-lunar-backup-drill.tar.gz"
    checksum_path = Path(f"{archive_path}.sha256")
    assert archive_path.exists()
    assert checksum_path.exists()

    restore_root = tmp_path / "restore-root"
    restore_result = run_script(
        "restore",
        "--archive",
        str(archive_path),
        "--restore-root",
        str(restore_root),
        cwd=tmp_path,
    )
    assert restore_result.returncode == 0, restore_result.stderr

    restored_config = restore_root / "source" / "etc" / "project-lunar" / "api.env"
    restored_state = restore_root / "source" / "var" / "lib" / "project-lunar" / "state.json"
    assert restored_config.read_text(encoding="utf-8") == expected_config
    assert restored_state.read_text(encoding="utf-8") == expected_state

    restored_config.write_text("MUTATED=1\n", encoding="utf-8")
    no_overwrite_result = run_script(
        "restore",
        "--archive",
        str(archive_path),
        "--restore-root",
        str(restore_root),
        cwd=tmp_path,
    )
    assert no_overwrite_result.returncode != 0
    assert "Destination already exists" in no_overwrite_result.stderr

    overwrite_result = run_script(
        "restore",
        "--archive",
        str(archive_path),
        "--restore-root",
        str(restore_root),
        "--allow-overwrite",
        cwd=tmp_path,
    )
    assert overwrite_result.returncode == 0, overwrite_result.stderr
    assert restored_config.read_text(encoding="utf-8") == expected_config
