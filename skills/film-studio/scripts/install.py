#!/usr/bin/env python3
"""Install this skill for Claude Code on this machine: copies the skill folder to
~/.claude/skills/film-studio (replacing an older copy). New sessions pick it up.

    python skills/film-studio/scripts/install.py            # from the repo that holds the skill
    python install.py --to <dir>                             # another skills folder, e.g. <repo>/.claude/skills
"""
import argparse
import shutil
from pathlib import Path

SRC = Path(__file__).resolve().parent.parent


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--to", default=str(Path.home() / ".claude" / "skills"))
    a = ap.parse_args()
    dest = Path(a.to).expanduser().resolve() / SRC.name
    if dest == SRC:
        print(f"already installed at {dest}")
        return
    if dest.exists():
        shutil.rmtree(dest)
    shutil.copytree(SRC, dest, ignore=shutil.ignore_patterns("__pycache__", "*.pyc"))
    n = sum(1 for p in dest.rglob("*") if p.is_file())
    print(f"installed {n} files to {dest}; start a new Claude Code session to load it")


if __name__ == "__main__":
    main()
