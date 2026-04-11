import re
from pathlib import Path

from app.config import Settings


def _env_example_keys() -> set[str]:
    env_path = Path(__file__).resolve().parents[1] / ".env.example"
    content = env_path.read_text(encoding="utf-8")
    return {
        match.group(1)
        for match in re.finditer(r"^\s*([A-Z][A-Z0-9_]+)\s*=.*$", content, flags=re.MULTILINE)
    }


def test_env_example_matches_settings_model_fields():
    env_keys = _env_example_keys()
    setting_keys = set(Settings.model_fields)

    missing = sorted(setting_keys - env_keys)
    extra = sorted(env_keys - setting_keys)

    assert not missing, f".env.example is missing settings: {', '.join(missing)}"
    assert not extra, f".env.example has unsupported settings: {', '.join(extra)}"
