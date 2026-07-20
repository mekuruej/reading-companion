#!/usr/bin/env python3
"""
Local-only FreeDict/WikDict English-Japanese TEI importer.

Defaults to dry-run. Use --write to write quiet raw candidates to Supabase.
"""

from __future__ import annotations

import argparse
import collections
import hashlib
import json
import os
import ssl
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any


SOURCE_NAME = "FreeDict+WikDict English-Japanese"
SOURCE_VERSION_FALLBACK = "2025.11.23"
LICENSE_LABEL = "CC BY-SA 3.0"
LICENSE_URL_FALLBACK = "https://creativecommons.org/licenses/by-sa/3.0/legalcode"
SOURCE_NOTES = (
    "Automatically generated bilingual English-Japanese candidate data derived "
    "from Wiktionary through DBnary/WikDict. Requires teacher review before "
    "learner use."
)
SAMPLE_HEADWORDS = {
    "reluctant",
    "give up",
    "remain",
    "rely",
    "run",
    "take off",
    "look after",
    "set",
    "book",
    "light",
}
XML_LANG = "{http://www.w3.org/XML/1998/namespace}lang"


def local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1] if "}" in tag else tag


def clean_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = " ".join(value.split()).strip()
    return cleaned or None


def element_text(element: ET.Element) -> str | None:
    return clean_text("".join(element.itertext()))


def direct_child_texts(element: ET.Element, name: str) -> list[str]:
    values: list[str] = []
    for child in list(element):
        if local_name(child.tag) == name:
            text = element_text(child)
            if text:
                values.append(text)
    return dedupe(values)


def dedupe(values: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for value in values:
        key = value.strip()
        if not key or key in seen:
            continue
        seen.add(key)
        out.append(key)
    return out


def normalize_lookup(value: str) -> str:
    return " ".join(value.replace("’", "'").replace("‘", "'").strip().lower().split())


def item_type_for(normalized_lookup: str) -> str:
    return "phrase" if any(char.isspace() for char in normalized_lookup) else "word"


def source_entry_key(version: str, ordinal: int, normalized: str, part_of_speech: str | None) -> str:
    digest = hashlib.sha1(
        f"{version}|{ordinal}|{normalized}|{part_of_speech or ''}".encode("utf-8")
    ).hexdigest()[:12]
    return f"{version}:entry:{ordinal:05d}:{digest}"


def parse_env_file(path: Path) -> None:
    if not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def find_first_text(element: ET.Element, name: str) -> str | None:
    for child in element.iter():
        if local_name(child.tag) == name:
            text = element_text(child)
            if text:
                return text
    return None


def find_refs(element: ET.Element) -> list[dict[str, str]]:
    refs: list[dict[str, str]] = []
    for child in element.iter():
        if local_name(child.tag) != "ref":
            continue
        target = clean_text(child.attrib.get("target"))
        text = element_text(child)
        if target or text:
            refs.append({"target": target or "", "text": text or ""})
    return refs


def parse_header(header: ET.Element) -> dict[str, Any]:
    refs = find_refs(header)
    license_url = next(
        (ref["target"] for ref in refs if "creativecommons.org/licenses/by-sa/3.0" in ref["target"]),
        LICENSE_URL_FALLBACK,
    )
    source_url = next(
        (
            ref["target"]
            for ref in refs
            if "wikdict.com" in ref["target"] or "freedict" in ref["target"].lower()
        ),
        "",
    )
    extent = find_first_text(header, "extent")
    declared_entries = None
    if extent:
        digits = "".join(char for char in extent if char.isdigit())
        declared_entries = int(digits) if digits else None
    return {
        "title": find_first_text(header, "title"),
        "edition": find_first_text(header, "edition") or SOURCE_VERSION_FALLBACK,
        "extent": extent,
        "declared_entries": declared_entries,
        "license_url": license_url,
        "source_url": source_url,
    }


def child_attr(child: ET.Element, name: str) -> str | None:
    return clean_text(child.attrib.get(name))


def parse_cit_translations(cit: ET.Element) -> list[str]:
    translations: list[str] = []
    for quote in list(cit):
        if local_name(quote.tag) != "quote":
            continue
        text = element_text(quote)
        if text:
            translations.append(text)
    return dedupe(translations)


def parse_sense(sense: ET.Element, order: int) -> dict[str, Any]:
    definitions: list[str] = []
    japanese_translations: list[str] = []
    labels: list[str] = []
    contexts: list[dict[str, str]] = []
    nested_senses: list[dict[str, Any]] = []
    nested_order = 0

    for child in list(sense):
        name = local_name(child.tag)
        if name == "def":
            text = element_text(child)
            if text:
                definitions.append(text)
        elif name == "cit":
            cit_type = child_attr(child, "type")
            lang = child_attr(child, XML_LANG)
            if cit_type == "trans" and lang == "ja":
                japanese_translations.extend(parse_cit_translations(child))
        elif name == "sense":
            nested_order += 1
            nested_senses.append(parse_sense(child, nested_order))
        elif name in {"usg", "lbl", "gloss", "note"}:
            text = element_text(child)
            if text:
                labels.append(text)
        elif name == "gramGrp":
            text = element_text(child)
            if text:
                contexts.append({"type": "gramGrp", "text": text})

    record: dict[str, Any] = {
        "source_order": order,
        "definitions": dedupe(definitions),
        "japanese_translations": dedupe(japanese_translations),
    }
    if labels:
        record["labels"] = dedupe(labels)
    if contexts:
        record["contexts"] = contexts
    if nested_senses:
        record["senses"] = nested_senses
    return record


def flatten_senses(senses: list[dict[str, Any]]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for sense in senses:
        out.append(sense)
        nested = sense.get("senses")
        if isinstance(nested, list):
            out.extend(flatten_senses(nested))
    return out


def nested_sense_count(senses: list[dict[str, Any]]) -> int:
    count = 0
    for sense in senses:
        nested = sense.get("senses")
        if isinstance(nested, list):
            count += len(nested)
            count += nested_sense_count(nested)
    return count


def semantic_sense_count(senses: list[dict[str, Any]]) -> int:
    """Count meaningful sense groups without double-counting TEI wrapper senses.

    In this TEI, a common pattern is:
      <sense><cit type="trans">...</cit><sense><def>...</def></sense></sense>

    The outer sense carries translations and the single nested sense carries the
    matching English definition, so that pair should count as one semantic sense,
    not two. Multiple top-level senses or multiple nested sibling senses are
    counted as multiple semantic senses.
    """

    total = 0
    for sense in senses:
        nested = sense.get("senses")
        if isinstance(nested, list) and len(nested) > 1:
            total += semantic_sense_count(nested)
        else:
            total += 1
    return total


def sense_metrics(senses: list[dict[str, Any]]) -> dict[str, int]:
    flat = flatten_senses(senses)
    return {
        "top_level_sense_count": len(senses),
        "total_nested_sense_count": nested_sense_count(senses),
        "semantic_sense_count": semantic_sense_count(senses),
        "total_english_definition_count": sum(len(sense.get("definitions", [])) for sense in flat),
        "total_japanese_translation_count": sum(
            len(sense.get("japanese_translations", [])) for sense in flat
        ),
    }


def parse_entry(entry: ET.Element, ordinal: int, version: str) -> tuple[dict[str, Any] | None, str | None]:
    orths = [text for child in entry.iter() if local_name(child.tag) == "orth" for text in [element_text(child)] if text]
    headword = orths[0] if orths else None
    if not headword:
        return None, "missing_headword"

    normalized = normalize_lookup(headword)
    if not normalized:
        return None, "missing_normalized_headword"

    pronunciations = dedupe(
        [text for child in entry.iter() if local_name(child.tag) == "pron" for text in [element_text(child)] if text]
    )
    part_of_speech = next(
        (text for child in entry.iter() if local_name(child.tag) == "pos" for text in [element_text(child)] if text),
        None,
    )

    top_senses: list[dict[str, Any]] = []
    sense_order = 0
    for child in list(entry):
        if local_name(child.tag) == "sense":
            sense_order += 1
            top_senses.append(parse_sense(child, sense_order))

    metrics = sense_metrics(top_senses)
    definitions_count = metrics["total_english_definition_count"]
    translations_count = metrics["total_japanese_translation_count"]
    has_nested = metrics["total_nested_sense_count"] > 0

    flags: list[str] = []
    if definitions_count == 0:
        flags.append("missing_definition")
    if translations_count == 0:
        flags.append("missing_japanese_translation")
    if metrics["semantic_sense_count"] > 1:
        flags.append("multi_sense")
    if has_nested:
        flags.append("nested_senses")
    if len(pronunciations) > 1:
        flags.append("multiple_pronunciations")
    if item_type_for(normalized) == "phrase":
        flags.append("phrase_like")
    if not part_of_speech:
        flags.append("missing_part_of_speech")

    candidate = {
        "source_entry_key": source_entry_key(version, ordinal, normalized, part_of_speech),
        "headword": headword,
        "normalized_lookup": normalized,
        "item_type": item_type_for(normalized),
        "part_of_speech": part_of_speech,
        "pronunciations": pronunciations,
        "raw_senses": top_senses,
        "quality_flags": flags,
        "raw_entry": {
            "source_entry_ordinal": ordinal,
            "orths": dedupe(orths),
        },
    }
    return candidate, None


def parse_tei(path: Path, limit: int | None = None) -> tuple[dict[str, Any], list[dict[str, Any]], dict[str, Any]]:
    header_info: dict[str, Any] = {}
    candidates: list[dict[str, Any]] = []
    stats: dict[str, Any] = {
        "entries_parsed": 0,
        "valid_candidates": 0,
        "skipped_candidates": 0,
        "skip_reasons": collections.Counter(),
        "parse_errors": [],
        "word_count": 0,
        "phrase_count": 0,
        "with_japanese_translations": 0,
        "without_japanese_translations": 0,
        "with_english_definitions": 0,
        "without_english_definitions": 0,
        "multi_sense_count": 0,
        "nested_sense_count": 0,
        "part_of_speech_counts": collections.Counter(),
        "with_pronunciation": 0,
        "without_pronunciation": 0,
        "quality_flag_counts": collections.Counter(),
        "samples": {},
    }

    context = ET.iterparse(path, events=("start", "end"))
    root: ET.Element | None = None
    for event, elem in context:
        if root is None and event == "start":
            root = elem

        if event != "end":
            continue

        name = local_name(elem.tag)
        if name == "teiHeader":
            header_info = parse_header(elem)
            elem.clear()
            continue

        if name != "entry":
            continue

        stats["entries_parsed"] += 1
        ordinal = stats["entries_parsed"]
        version = header_info.get("edition") or SOURCE_VERSION_FALLBACK

        try:
            candidate, skip_reason = parse_entry(elem, ordinal, version)
        except Exception as error:  # noqa: BLE001 - importer should continue through malformed entries.
            candidate = None
            skip_reason = "parse_error"
            if len(stats["parse_errors"]) < 5:
                stats["parse_errors"].append({"entry_ordinal": ordinal, "error": str(error)})

        if candidate is None:
            stats["skipped_candidates"] += 1
            stats["skip_reasons"][skip_reason or "unknown"] += 1
        else:
            candidates.append(candidate)
            stats["valid_candidates"] += 1
            if candidate["item_type"] == "phrase":
                stats["phrase_count"] += 1
            else:
                stats["word_count"] += 1
            if candidate["part_of_speech"]:
                stats["part_of_speech_counts"][candidate["part_of_speech"]] += 1
            else:
                stats["part_of_speech_counts"]["(missing)"] += 1
            if candidate["pronunciations"]:
                stats["with_pronunciation"] += 1
            else:
                stats["without_pronunciation"] += 1

            flat = flatten_senses(candidate["raw_senses"])
            definition_count = sum(len(s.get("definitions", [])) for s in flat)
            translation_count = sum(len(s.get("japanese_translations", [])) for s in flat)
            if definition_count:
                stats["with_english_definitions"] += 1
            else:
                stats["without_english_definitions"] += 1
            if translation_count:
                stats["with_japanese_translations"] += 1
            else:
                stats["without_japanese_translations"] += 1
            if "multi_sense" in candidate["quality_flags"]:
                stats["multi_sense_count"] += 1
            if "nested_senses" in candidate["quality_flags"]:
                stats["nested_sense_count"] += 1
            for flag in candidate["quality_flags"]:
                stats["quality_flag_counts"][flag] += 1

            normalized = candidate["normalized_lookup"]
            if normalized in SAMPLE_HEADWORDS:
                stats["samples"].setdefault(normalized, [])
                if len(stats["samples"][normalized]) < 2:
                    stats["samples"][normalized].append(candidate)

        elem.clear()
        if root is not None:
            root.clear()

        if limit is not None and stats["entries_parsed"] >= limit:
            break

    return header_info, candidates, stats


def json_default(value: Any) -> Any:
    if isinstance(value, collections.Counter):
        return dict(value)
    raise TypeError(f"Cannot JSON encode {type(value)!r}")


def print_report(header: dict[str, Any], candidates: list[dict[str, Any]], stats: dict[str, Any], *, dry_run: bool) -> None:
    print("FreeDict English-Japanese raw-candidate import")
    print(f"Mode: {'dry run' if dry_run else 'WRITE'}")
    print(f"TEI title: {header.get('title') or '(not found)'}")
    print(f"TEI source/version: {SOURCE_NAME} / {header.get('edition') or SOURCE_VERSION_FALLBACK}")
    print(f"Declared entries: {header.get('declared_entries') or '(not found)'}")
    print(f"Source URL: {header.get('source_url') or '(not found)'}")
    print("")
    print("Dry-run/import stats:")
    summary_keys = [
        "entries_parsed",
        "valid_candidates",
        "skipped_candidates",
        "word_count",
        "phrase_count",
        "with_japanese_translations",
        "without_japanese_translations",
        "with_english_definitions",
        "without_english_definitions",
        "multi_sense_count",
        "nested_sense_count",
        "with_pronunciation",
        "without_pronunciation",
    ]
    for key in summary_keys:
        print(f"  {key}: {stats[key]}")
    print(f"  part_of_speech_counts: {json.dumps(dict(stats['part_of_speech_counts']), ensure_ascii=False, sort_keys=True)}")
    print(f"  quality_flag_counts: {json.dumps(dict(stats['quality_flag_counts']), ensure_ascii=False, sort_keys=True)}")
    print(f"  skip_reasons: {json.dumps(dict(stats['skip_reasons']), ensure_ascii=False, sort_keys=True)}")
    if stats["parse_errors"]:
        print(f"  representative_parse_errors: {json.dumps(stats['parse_errors'], ensure_ascii=False)}")
    print("")
    print("Compact parsed samples:")
    for headword in sorted(SAMPLE_HEADWORDS):
        samples = stats["samples"].get(headword) or []
        if not samples:
            print(f"- {headword}: not found in parsed range")
            continue
        for sample in samples:
            metrics = sense_metrics(sample["raw_senses"])
            compact = {
                "source_entry_key": sample["source_entry_key"],
                "headword": sample["headword"],
                "normalized_lookup": sample["normalized_lookup"],
                "item_type": sample["item_type"],
                "part_of_speech": sample["part_of_speech"],
                "pronunciations": sample["pronunciations"][:5],
                "quality_flags": sample["quality_flags"],
                **metrics,
                "raw_senses": sample["raw_senses"][:2],
            }
            print(json.dumps(compact, ensure_ascii=False, indent=2))


def supabase_request(
    method: str,
    path: str,
    *,
    service_key: str,
    base_url: str,
    payload: Any | None = None,
    prefer: str | None = None,
) -> Any:
    url = f"{base_url.rstrip('/')}/rest/v1/{path.lstrip('/')}"
    body = None if payload is None else json.dumps(payload).encode("utf-8")
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
    }
    if prefer:
        headers["Prefer"] = prefer
    request = urllib.request.Request(url, data=body, headers=headers, method=method)
    cafile = os.environ.get("SSL_CERT_FILE")
    if not cafile and Path("/etc/ssl/cert.pem").exists():
        cafile = "/etc/ssl/cert.pem"
    context = ssl.create_default_context(cafile=cafile) if cafile else None
    try:
        with urllib.request.urlopen(request, timeout=60, context=context) as response:
            text = response.read().decode("utf-8")
            return json.loads(text) if text else None
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Supabase {method} {path} failed: {error.code} {detail}") from error
    except urllib.error.URLError as error:
        raise RuntimeError(f"Supabase {method} {path} failed before receiving a response: {error}") from error


def get_supabase_env() -> tuple[str, str]:
    parse_env_file(Path(".env.local"))
    parse_env_file(Path(".env"))
    base_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "").strip()
    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    if not base_url or not service_key:
        raise RuntimeError(
            "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. "
            "Real imports require privileged Supabase credentials."
        )
    return base_url, service_key


def preflight(base_url: str, service_key: str) -> None:
    supabase_request(
        "GET",
        "english_lexicon_sources?select=id&limit=1",
        base_url=base_url,
        service_key=service_key,
    )
    supabase_request(
        "GET",
        "english_lexicon_raw_candidates?select=id&limit=1",
        base_url=base_url,
        service_key=service_key,
    )


def find_or_create_source(header: dict[str, Any], base_url: str, service_key: str) -> str:
    version = header.get("edition") or SOURCE_VERSION_FALLBACK
    query = urllib.parse.urlencode(
        {
            "select": "id",
            "source_name": f"eq.{SOURCE_NAME}",
            "source_version": f"eq.{version}",
            "limit": "1",
        }
    )
    rows = supabase_request(
        "GET",
        f"english_lexicon_sources?{query}",
        base_url=base_url,
        service_key=service_key,
    )
    if rows:
        source_id = rows[0]["id"]
        supabase_request(
            "PATCH",
            f"english_lexicon_sources?id=eq.{urllib.parse.quote(source_id)}",
            base_url=base_url,
            service_key=service_key,
            payload={"imported_at": None, "notes": SOURCE_NOTES},
        )
        return source_id

    inserted = supabase_request(
        "POST",
        "english_lexicon_sources",
        base_url=base_url,
        service_key=service_key,
        prefer="return=representation",
        payload={
            "source_name": SOURCE_NAME,
            "source_version": version,
            "license_label": LICENSE_LABEL,
            "license_url": header.get("license_url") or LICENSE_URL_FALLBACK,
            "source_url": header.get("source_url") or None,
            "notes": SOURCE_NOTES,
            "imported_at": None,
        },
    )
    return inserted[0]["id"]


def write_candidates(
    candidates: list[dict[str, Any]],
    source_id: str,
    base_url: str,
    service_key: str,
    batch_size: int,
) -> None:
    total = len(candidates)
    for start in range(0, total, batch_size):
        batch = candidates[start : start + batch_size]
        payload = [{**candidate, "source_id": source_id} for candidate in batch]
        supabase_request(
            "POST",
            "english_lexicon_raw_candidates?on_conflict=source_id,source_entry_key",
            base_url=base_url,
            service_key=service_key,
            prefer="resolution=merge-duplicates",
            payload=payload,
        )
        print(f"Wrote candidates {start + 1}-{start + len(batch)} of {total}")


def mark_source_imported(source_id: str, base_url: str, service_key: str) -> None:
    supabase_request(
        "PATCH",
        f"english_lexicon_sources?id=eq.{urllib.parse.quote(source_id)}",
        base_url=base_url,
        service_key=service_key,
        payload={"imported_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())},
    )


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Import FreeDict English-Japanese TEI raw candidates.")
    parser.add_argument("--file", required=True, help="Path to eng-jpn.tei")
    parser.add_argument("--limit", type=int, default=None, help="Maximum TEI entries to parse.")
    parser.add_argument("--write", action="store_true", help="Write to Supabase. Omit for dry run.")
    parser.add_argument(
        "--preflight-only",
        action="store_true",
        help="Check required Supabase tables and exit without importing.",
    )
    parser.add_argument("--batch-size", type=int, default=500, help="Supabase write batch size.")
    return parser


def main() -> int:
    args = build_arg_parser().parse_args()
    path = Path(args.file).expanduser()
    if not path.exists():
        print(f"TEI file not found: {path}", file=sys.stderr)
        return 2
    if args.batch_size <= 0:
        print("--batch-size must be greater than 0", file=sys.stderr)
        return 2

    if args.preflight_only:
        base_url, service_key = get_supabase_env()
        print("Running Supabase preflight...")
        preflight(base_url, service_key)
        print("Preflight passed. No Supabase writes performed.")
        return 0

    header, candidates, stats = parse_tei(path, limit=args.limit)
    print_report(header, candidates, stats, dry_run=not args.write)

    if not args.write:
        print("")
        print("No Supabase writes performed. Re-run with --write to import.")
        return 0

    base_url, service_key = get_supabase_env()
    print("")
    print("Running Supabase preflight...")
    preflight(base_url, service_key)
    print("Preflight passed.")
    source_id = find_or_create_source(header, base_url, service_key)
    print(f"Using source_id: {source_id}")
    write_candidates(candidates, source_id, base_url, service_key, args.batch_size)
    mark_source_imported(source_id, base_url, service_key)
    print("Import complete. Source imported_at updated.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
