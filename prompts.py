"""
Prompt Loading Utilities
========================

Functions for loading prompt templates from the prompts directory.
"""

import shutil
from pathlib import Path

PROMPTS_DIR = Path(__file__).parent / "prompts"


def load_prompt(name: str) -> str:
    prompt_path = PROMPTS_DIR / f"{name}.md"
    if not prompt_path.exists():
        raise FileNotFoundError(f"Prompt not found: {prompt_path}")
    content = prompt_path.read_text()
    if not content.strip():
        raise ValueError(f"Prompt is empty: {prompt_path}")
    return content


def copy_spec_to_project(project_dir: Path) -> None:
    """Copy the app spec file into the project directory for the agent to read."""
    spec_source = PROMPTS_DIR / "app_spec.txt"
    spec_dest = project_dir / "app_spec.txt"

    db_seeding_source = PROMPTS_DIR / "database_seeding.md"
    db_seeding_dest = project_dir / "database_seeding.md"
    if not spec_dest.exists():
        shutil.copy(spec_source, spec_dest)
        print("Copied app_spec.txt to project directory")
    if db_seeding_source.exists() and not db_seeding_dest.exists():
        shutil.copy(db_seeding_source, db_seeding_dest)
        print("Copied database_seeding.md to project directory")
