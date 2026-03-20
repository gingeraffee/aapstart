"""
Content Loader
==============
Reads YAML+Markdown module files from the content directory and parses them
into structured data the API can serve. Results are cached in memory at startup.

Content file format
-------------------
Each module lives in content/modules/<slug>.md and uses YAML frontmatter
for metadata (title, tracks, quiz, acknowledgements, etc.) followed by a
Markdown body that can include custom fenced directives:

    :::callout tip
    This is a tip.
    :::

    :::tabs
    [[ Tab Label One ]]
    Content for tab one.

    [[ Tab Label Two ]]
    Content for tab two.
    :::

    :::track [warehouse, hr]
    This block only shows to warehouse and HR employees.
    :::
"""

import os
import re
import yaml
import frontmatter
import markdown
from pathlib import Path
from typing import Any
from app.config import get_settings

settings = get_settings()

# ── In-memory cache ───────────────────────────────────────────────────────────
_modules_cache: dict[str, dict] = {}
_resources_cache: dict = {}
_ui_cache: dict = {}


# ── Public API ────────────────────────────────────────────────────────────────

def load_all_content():
    """Called once at startup to populate the in-memory cache."""
    _load_modules()
    _load_resources()
    _load_ui()


def get_modules_for_track(track: str) -> list[dict]:
    """
    Return ordered module list for a given track.
    - HR sees shared modules, HR-specific modules, and management process modules.
    - Management sees ONLY modules with tracks: [management].
    - Other tracks see 'all' modules plus their track-specific modules.
    Excludes draft modules (status == 'draft').
    """
    result = []
    for module in _modules_cache.values():
        if module.get("status") == "draft":
            continue
        mod_tracks = module.get("tracks", ["all"])

        if track == "hr":
            # HR sees shared modules, HR-specific modules, and management process modules.
            if "all" in mod_tracks or "hr" in mod_tracks or "management" in mod_tracks:
                result.append(_module_summary(module, track))
        elif track == "management":
            # Management only sees management-specific modules
            if "management" in mod_tracks:
                result.append(_module_summary(module, track))
        else:
            # Warehouse / administrative see 'all' + their own track
            if "all" in mod_tracks or track in mod_tracks:
                result.append(_module_summary(module, track))

    result.sort(key=lambda m: m.get("order", 99))
    return result


def get_module(slug: str, track: str) -> dict | None:
    """
    Return full module data for a given slug, filtered for the employee's track.
    HR can access shared modules, HR-specific modules, and management modules.
    Management can only access management modules.
    Quiz correct answers are stripped — never sent to the frontend.
    """
    module = _modules_cache.get(slug)
    if not module:
        return None

    mod_tracks = module.get("tracks", ["all"])

    if track == "hr":
        if "all" not in mod_tracks and "hr" not in mod_tracks and "management" not in mod_tracks:
            return None
    elif track == "management":
        if "management" not in mod_tracks:
            return None
    else:
        if "all" not in mod_tracks and track not in mod_tracks:
            return None

    return _module_for_client(module, track)


def get_ui_content() -> dict:
    return _ui_cache


def get_resources(track: str) -> list[dict]:
    all_resources = _resources_cache.get("resources", [])
    if track == "hr":
        return all_resources  # HR reviewers see all resources
    return [
        r for r in all_resources
        if "all" in r.get("tracks", ["all"]) or track in r.get("tracks", [])
    ]


def get_resource_categories() -> list[dict]:
    return _resources_cache.get("categories", [])


# ── Module loading ────────────────────────────────────────────────────────────

def _load_modules():
    content_dir = Path(settings.content_dir) / "modules"
    if not content_dir.exists():
        return

    for filepath in sorted(content_dir.glob("*.md")):
        try:
            module = _parse_module_file(filepath)
            _modules_cache[module["slug"]] = module
        except Exception as e:
            print(f"[content] Warning: could not load {filepath.name}: {e}")


def _parse_module_file(filepath: Path) -> dict:
    post = frontmatter.load(str(filepath))
    meta = post.metadata
    body = post.content

    content_blocks = _parse_body(body)

    return {
        "slug": meta.get("slug", filepath.stem),
        "title": meta.get("title", "Untitled"),
        "description": meta.get("description", ""),
        "tracks": _normalise_tracks(meta.get("tracks", ["all"])),
        "order": meta.get("order", 99),
        "estimated_minutes": meta.get("estimatedMinutes", 10),
        "status": meta.get("status", "published"),  # published | coming_soon | draft
        "requires_quiz": meta.get("requiresQuiz", False),
        "requires_acknowledgement": meta.get("requiresAcknowledgement", False),
        "content_blocks": content_blocks,
        "quiz": meta.get("quiz"),               # kept server-side; answers stripped before send
        "acknowledgements": meta.get("acknowledgements", []),
    }


def _normalise_tracks(value) -> list[str]:
    if isinstance(value, str):
        return [value]
    if isinstance(value, list):
        return [str(v) for v in value]
    return ["all"]


# ── Body parser ───────────────────────────────────────────────────────────────
# Splits the Markdown body into a list of typed content blocks.

_DIRECTIVE_PATTERN = re.compile(
    r'(:::(\w+)(?:\s+[^\n]*)?\n[\s\S]*?:::)',
    re.MULTILINE
)

_md = markdown.Markdown(extensions=["extra", "nl2br"])


def _render_md(text: str) -> str:
    _md.reset()
    return _md.convert(text.strip())


def _parse_body(body: str) -> list[dict]:
    blocks: list[dict] = []
    last_end = 0

    for match in _DIRECTIVE_PATTERN.finditer(body):
        # Text before this directive
        before = body[last_end:match.start()].strip()
        if before:
            blocks.append({"type": "text", "content": _render_md(before)})

        directive_block = match.group(1)
        parsed = _parse_directive(directive_block)
        if parsed:
            blocks.append(parsed)

        last_end = match.end()

    # Remaining text after last directive
    tail = body[last_end:].strip()
    if tail:
        blocks.append({"type": "text", "content": _render_md(tail)})

    return blocks


def _parse_directive(block: str) -> dict | None:
    lines = block.split("\n")
    header = lines[0].strip()          # e.g. ":::callout tip"
    inner = "\n".join(lines[1:-1])     # content between opening ::: and closing :::

    # Parse header: :::type [args]
    header_parts = header[3:].strip().split()
    if not header_parts:
        return None
    block_type = header_parts[0]
    args = header_parts[1:]

    if block_type == "callout":
        variant = args[0] if args else "tip"
        return {"type": "callout", "variant": variant, "content": _render_md(inner)}

    if block_type == "tabs":
        return {"type": "tabs", "tabs": _parse_tabs(inner)}

    if block_type == "checklist":
        return {"type": "checklist", "items": _parse_checklist(inner)}

    if block_type == "track":
        # :::track [hr, warehouse] — track-specific block
        raw_tracks = " ".join(args).strip("[]").split(",")
        tracks = [t.strip() for t in raw_tracks]
        return {"type": "track_block", "tracks": tracks, "content": _render_md(inner)}

    if block_type in ("download", "link", "video", "image"):
        props = _parse_key_value(inner)
        return {"type": block_type, **props}

    if block_type == "aside":
        props = _parse_key_value(inner)
        header_text = props.pop("header", "")
        body_lines = [l for l in inner.split("\n")
                      if not l.strip().startswith(("header:", "icon:", "border:"))]
        body_content = _render_md("\n".join(body_lines)) if body_lines else ""
        return {"type": "aside", "content": body_content, "label": header_text, **props}

    if block_type == "qrcode":
        return {"type": "qrcode", **_parse_key_value(inner)}

    return None


def _parse_tabs(content: str) -> list[dict]:
    tabs: list[dict] = []
    current_label: str | None = None
    current_lines: list[str] = []

    for line in content.split("\n"):
        tab_match = re.match(r'\[\[\s*(.+?)\s*\]\]', line)
        if tab_match:
            if current_label is not None:
                tabs.append({
                    "label": current_label,
                    "content": _render_md("\n".join(current_lines))
                })
            current_label = tab_match.group(1)
            current_lines = []
        else:
            current_lines.append(line)

    if current_label is not None:
        tabs.append({
            "label": current_label,
            "content": _render_md("\n".join(current_lines))
        })

    return tabs


def _parse_checklist(content: str) -> list[dict]:
    items = []
    for line in content.split("\n"):
        line = line.strip()
        if line.startswith("- [ ]") or line.startswith("- [x]"):
            checked = line.startswith("- [x]")
            label = line[5:].strip()
            items.append({"label": label, "checked": checked})
    return items


def _parse_key_value(content: str) -> dict:
    result = {}
    for line in content.strip().split("\n"):
        if ":" in line:
            key, _, value = line.partition(":")
            result[key.strip()] = value.strip()
    return result


# ── Summary / client views ────────────────────────────────────────────────────

def _module_summary(module: dict, track: str | None = None) -> dict:
    """Lightweight version for the overview module list."""
    is_management = track == "management"
    return {
        "slug": module["slug"],
        "title": module["title"],
        "description": module["description"],
        "tracks": module.get("tracks", ["all"]),
        "order": module["order"],
        "estimated_minutes": module["estimated_minutes"],
        "status": module["status"],
        "requires_quiz": False if is_management else module["requires_quiz"],
        "requires_acknowledgement": False if is_management else module["requires_acknowledgement"],
    }


def _module_for_client(module: dict, track: str) -> dict:
    """Full module with content blocks, track-filtered. Quiz answers stripped."""
    is_management = track == "management"

    content_blocks = [
        b for b in module["content_blocks"]
        if _block_visible_for_track(b, track)
    ]

    quiz_client = None
    if module.get("quiz") and not is_management:
        quiz_client = {
            "questions": [
                {
                    "id": q["id"],
                    "text": q["text"],
                    "options": q["options"],
                    # correctId intentionally omitted
                }
                for q in module["quiz"].get("questions", [])
            ]
        }

    return {
        **_module_summary(module, track),
        "content_blocks": content_blocks,
        "quiz": quiz_client,
        "acknowledgements": [] if is_management else module.get("acknowledgements", []),
    }


def _block_visible_for_track(block: dict, track: str) -> bool:
    if block.get("type") != "track_block":
        return True
    if track == "hr":
        return True  # HR reviewers see all track-specific content
    tracks = block.get("tracks", [])
    return "all" in tracks or track in tracks


# ── Resources ─────────────────────────────────────────────────────────────────

def _load_resources():
    filepath = Path(settings.content_dir) / "resources" / "resources.yaml"
    if not filepath.exists():
        return
    with open(filepath, "r", encoding="utf-8") as f:
        _resources_cache.update(yaml.safe_load(f) or {})


# ── UI copy ───────────────────────────────────────────────────────────────────

def _load_ui():
    ui_dir = Path(settings.content_dir) / "ui"
    files = {
        "rotating_headers": "rotating-headers.yaml",
        "coach_tips": "coach-tips.yaml",
        "login_scenes": "login-scenes.yaml",
    }
    for key, filename in files.items():
        filepath = ui_dir / filename
        if filepath.exists():
            with open(filepath, "r", encoding="utf-8") as f:
                _ui_cache[key] = yaml.safe_load(f) or []

