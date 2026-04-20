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


def _primary_track(tracks: list[str]) -> str:
    """Return the primary track for content rendering decisions.
    Management-only employees use 'management'; others use their first non-management track."""
    non_management = [t for t in tracks if t != "management"]
    return non_management[0] if non_management else "management"


def get_modules_for_tracks(tracks: list[str], is_admin: bool = False) -> list[dict]:
    """
    Return ordered module list for one or more tracks (union of all accessible modules).
    - HR in tracks: sees shared modules, HR-specific modules; admins also see management modules.
    - Management-only: sees ONLY modules with tracks: [management].
    - Other tracks: see 'all' modules plus their track-specific modules.
    Excludes draft modules (status == 'draft').
    When an HR-specific version exists (slug ending in '-hr'), the shared [all] version is excluded.
    """
    has_hr = "hr" in tracks
    primary = _primary_track(tracks)

    # Collect HR-specific slugs so we can exclude their [all] counterparts
    hr_base_slugs: set[str] = set()
    if has_hr:
        for module in _modules_cache.values():
            slug = module.get("slug", "")
            mod_tracks = module.get("tracks", ["all"])
            if slug.endswith("-hr") and "hr" in mod_tracks:
                hr_base_slugs.add(slug.rsplit("-hr", 1)[0])

    result = []
    seen_slugs: set[str] = set()

    for module in _modules_cache.values():
        if module.get("status") == "draft":
            continue
        mod_tracks = module.get("tracks", ["all"])
        slug = module.get("slug", "")

        if slug in seen_slugs:
            continue

        # Skip [all] modules that have an HR-specific replacement (when user has HR)
        if has_hr and "all" in mod_tracks and slug in hr_base_slugs:
            continue

        visible = False
        for track in tracks:
            if track == "hr":
                if "all" in mod_tracks or "hr" in mod_tracks:
                    visible = True
                    break
                if is_admin and "management" in mod_tracks:
                    visible = True
                    break
            elif track == "management":
                if "management" in mod_tracks:
                    visible = True
                    break
            else:
                if "all" in mod_tracks or track in mod_tracks:
                    visible = True
                    break

        if visible:
            result.append(_module_summary(module, primary))
            seen_slugs.add(slug)

    result.sort(key=lambda m: m.get("order", 99))
    return result


# Keep single-track alias for internal callers that haven't been updated
def get_modules_for_track(track: str, is_admin: bool = False) -> list[dict]:
    return get_modules_for_tracks([track], is_admin=is_admin)


def get_module(slug: str, tracks: list[str]) -> dict | None:
    """
    Return full module data for a given slug, accessible by any of the given tracks.
    Quiz correct answers are stripped — never sent to the frontend.
    """
    module = _modules_cache.get(slug)
    if not module:
        return None

    mod_tracks = module.get("tracks", ["all"])

    can_access = False
    for track in tracks:
        if track == "hr":
            if "all" in mod_tracks or "hr" in mod_tracks or "management" in mod_tracks:
                can_access = True
                break
        elif track == "management":
            if "management" in mod_tracks:
                can_access = True
                break
        else:
            if "all" in mod_tracks or track in mod_tracks:
                can_access = True
                break

    if not can_access:
        return None

    return _module_for_client(module, _primary_track(tracks))


def get_ui_content() -> dict:
    return _ui_cache


def get_resources(tracks: list[str]) -> list[dict]:
    all_resources = _resources_cache.get("resources", [])
    if "hr" in tracks:
        return all_resources  # HR reviewers see all resources
    return [
        r for r in all_resources
        if "all" in r.get("tracks", ["all"]) or any(t in r.get("tracks", []) for t in tracks)
    ]


def get_resource_categories() -> list[dict]:
    return _resources_cache.get("categories", [])


def search_all(query: str, tracks: list[str], is_admin: bool = False) -> list[dict]:
    """
    Flat unified search across training modules and resources for the user's tracks.
    Returns a mixed list ordered by relevance (title matches first, then description).
    Each item includes a result_type field: "module" or "resource".
    """
    q_lower = query.lower().strip()
    if not q_lower:
        return []

    results = []

    # ── Search modules ────────────────────────────────────────────────────────
    modules = get_modules_for_tracks(tracks, is_admin)
    for m in modules:
        title_match = q_lower in m.get("title", "").lower()
        desc_match = q_lower in m.get("description", "").lower()
        if title_match or desc_match:
            results.append({
                **m,
                "result_type": "module",
                "_rank": 0 if title_match else 1,
            })

    # ── Search resources ──────────────────────────────────────────────────────
    resources = get_resources(tracks)
    for r in resources:
        title_match = q_lower in r.get("title", "").lower()
        desc_match = q_lower in r.get("description", "").lower()
        tag_match = any(q_lower in tag.lower() for tag in r.get("tags", []))
        if title_match or desc_match or tag_match:
            results.append({
                **r,
                "result_type": "resource",
                "_rank": 0 if title_match else 1,
            })

    # Sort by rank (title matches first), preserve original order within rank
    results.sort(key=lambda x: x.get("_rank", 1))

    # Strip internal rank key before returning
    for item in results:
        item.pop("_rank", None)

    return results


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
        "quiz_mode": meta.get("quizMode"),      # "final-review" for special quiz behavior
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
        # Support custom label: :::callout warning "Custom Label"
        label_text = " ".join(args[1:]).strip().strip('"').strip("'") if len(args) > 1 else None
        result = {"type": "callout", "variant": variant, "content": _render_md(inner)}
        if label_text:
            result["label"] = label_text
        return result

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


def _get_track_quiz_questions(module: dict, track: str) -> list:
    """Return track-specific quiz questions if they exist, otherwise fallback."""
    quiz = module.get("quiz") or {}
    track_questions = quiz.get(track)
    if track_questions and isinstance(track_questions, list) and len(track_questions) > 0:
        return track_questions
    return quiz.get("questions", [])


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
                for q in _get_track_quiz_questions(module, track)
            ]
        }

    return {
        **_module_summary(module, track),
        "content_blocks": content_blocks,
        "quiz": quiz_client,
        "quiz_mode": module.get("quiz_mode"),
        "acknowledgements": [] if is_management else module.get("acknowledgements", []),
    }


def _block_visible_for_track(block: dict, track: str | list) -> bool:
    if block.get("type") != "track_block":
        return True
    track_list = [track] if isinstance(track, str) else track
    if "hr" in track_list:
        return True  # HR reviewers see all track-specific content
    block_tracks = block.get("tracks", [])
    return "all" in block_tracks or any(t in block_tracks for t in track_list)


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

