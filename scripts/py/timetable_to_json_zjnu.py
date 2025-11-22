"""ZJNU PDF timetable → JSON generator for database seeding

Automatically processes PDFs in the pdfs folder, prompts for unknown term Monday dates,
and appends unique courses to backend/accounts/seed_data/courses.json
"""

import os
import sys
import glob
import pdfplumber
import re
import json
from datetime import datetime, timedelta


def find_default_pdf() -> str | None:
    pdfs = sorted(glob.glob("*.pdf"))
    return pdfs[0] if pdfs else None


def extract_tables(pdf_path: str, strategy: str = "auto"):
    all_tables = []  # (page_index, table_index, rows)
    with pdfplumber.open(pdf_path) as pdf:
        for i, page in enumerate(pdf.pages, start=1):
            tables = []
            if strategy in ("auto", "lines"):
                try:
                    tables = page.extract_tables({
                        "vertical_strategy": "lines",
                        "horizontal_strategy": "lines",
                    }) or []
                except Exception:
                    tables = []
            if strategy == "text" or (strategy == "auto" and not tables):
                try:
                    tables = page.extract_tables({
                        "vertical_strategy": "text",
                        "horizontal_strategy": "text",
                    }) or []
                except Exception:
                    tables = page.extract_tables() or []
            for t_idx, table in enumerate(tables, start=1):
                all_tables.append((i, t_idx, table))
    return all_tables


def merge_main_table(all_tables, collapse_newlines: bool = True):
    import html as _html

    def clean_cell(c: str) -> str:
        s = (c or "")
        if collapse_newlines:
            # Collapse all whitespace and line breaks into single spaces
            s = s.replace("\r", " ").replace("\n", " ")
            s = " ".join(s.split())
        else:
            # Preserve line breaks for downstream block parsing
            s = s.replace("\r", "\n")
            # Trim lines but keep structure
            s = "\n".join([ln.strip() for ln in s.split("\n")])
        s = _html.unescape(s)
        return s.replace("|", "\\|")

    def normalize_header(cells: list[str]) -> list[str]:
        mapped = []
        for x in cells:
            y = x
            y = y.replace("Sectio ns", "Sections")
            y = y.replace("Sectio\u00A0ns", "Sections")
            # Do not over-correct generic prefixes to avoid "Sectionns"
            mapped.append(y)
        return mapped

    def find_header_idx(rows: list[list[str]]):
        # Detect English or Chinese timetable headers
        cn_days = ["周一", "周二", "周三", "周四", "周五", "周六", "周日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日"]
        for idx, row in enumerate(rows):
            joined = " ".join(row)
            # English
            if ("Period" in joined or "Morning" in joined or "Evening" in joined) and ("Mon" in joined and "Sun" in joined):
                return idx
            # Chinese: row contains multiple day names and a time/section indicator like 节/节次/上午/下午/晚上
            day_hits = sum(1 for d in cn_days if d in joined)
            if day_hits >= 3 and ("节" in joined or "节次" in joined or "上午" in joined or "下午" in joined or "晚上" in joined):
                return idx
        return None

    # Find the first table with recognizable EN/CN header
    main_headers = None
    col_count = None
    merged_rows: list[list[str]] = []
    metadata_lines: list[str] = []
    notes_lines: list[str] = []

    # Pre-clean all cells and compute per-table cleaned rows
    cleaned_tables = []
    for page_idx, table_idx, rows in all_tables:
        cleaned = [[clean_cell(c) for c in (row or [])] for row in (rows or [])]
        cleaned_tables.append((page_idx, table_idx, cleaned))

    header_src = None  # (page_idx, table_idx)
    detected_chinese = False
    for page_idx, table_idx, rows in cleaned_tables:
        if not rows:
            continue
        hdr_idx = find_header_idx(rows)
        if hdr_idx is not None:
            # Rows before header are metadata lines
            pre_rows = rows[:hdr_idx]
            for pr in pre_rows:
                joined = " ".join([x for x in pr if x])
                j = " ".join(joined.split())
                if j:
                    metadata_lines.append(j)
            headers_row = rows[hdr_idx]
            col_count = max(col_count or 0, len(headers_row))
            main_headers = normalize_header(headers_row + [""] * (col_count - len(headers_row)))
            # Detect Chinese by presence of Chinese weekdays in header
            hdr_joined = " ".join(headers_row)
            if any(x in hdr_joined for x in ["周一","星期一","周二","星期二","周三","星期三","周四","星期四","周五","星期五","周六","星期六","周日","星期日"]):
                detected_chinese = True
            # Append all rows after header
            for r in rows[hdr_idx + 1 : ]:
                merged_rows.append(r)
            header_src = (page_idx, table_idx)
            break

    if main_headers is None:
        # Fallback to the first table's shape
        if cleaned_tables:
            _, _, rows = cleaned_tables[0]
            col_count = max(len(r) for r in rows) if rows else 0
            main_headers = [f"Col {i}" for i in range(1, col_count + 1)]
            merged_rows.extend(rows)
        return main_headers, merged_rows

    # Append remaining tables with the same column count as continuation
    for page_idx, table_idx, rows in cleaned_tables:
        # Skip the table that provided the header and rows we already consumed
        if header_src and (page_idx, table_idx) == header_src:
            continue
        if not rows:
            continue
        # If this table also contains a header row, append rows after it; otherwise append all
        hdr_idx = find_header_idx(rows)
        if hdr_idx is not None:
            rows_to_add = rows[hdr_idx + 1 : ]
        else:
            rows_to_add = rows
        merged_rows.extend(rows_to_add)

    # Collect optional notes
    for page_idx, table_idx, rows in cleaned_tables:
        for r in rows or []:
            joined = " ".join([x for x in r if x])
            j = " ".join(joined.split())
            if j.startswith("★:") or "print time" in j:
                notes_lines.append(j)

    # Pad each row to the number of header columns
    merged_rows = [r + [""] * (len(main_headers) - len(r)) for r in merged_rows]
    return main_headers, merged_rows, metadata_lines, notes_lines, detected_chinese


# Section → time mapping (24h)
SECTION_TIMES = {
    1: ("08:00", "08:40"),
    2: ("08:45", "09:25"),
    3: ("09:40", "10:20"),
    4: ("10:35", "11:15"),
    5: ("11:20", "12:00"),
    6: ("14:00", "14:40"),
    7: ("14:45", "15:25"),
    8: ("15:40", "16:20"),
    9: ("16:30", "17:10"),
    10: ("18:00", "18:40"),
    11: ("18:45", "19:25"),
    12: ("19:40", "20:20"),
    13: ("20:30", "21:10"),
}

TYPE_MAP_EN = {"△": "Theory", "★": "Technical", "▲": "Practice", "☆": "Experiment"}
TYPE_MAP_CN = {"△": "理论", "★": "技术", "▲": "实践", "☆": "实验"}
# Active type map (switched per language)
TYPE_MAP = TYPE_MAP_EN

def set_active_type_map(use_chinese: bool) -> None:
    global TYPE_MAP
    TYPE_MAP = TYPE_MAP_CN if use_chinese else TYPE_MAP_EN


def summarize_courses(courses: list[dict], is_chinese: bool) -> str:
    """Return a detailed, human-readable summary of parsed courses/events.

    Includes: day, type, weeks (count and condensed list), sections and time span,
    course name, effective location, and teacher. Ends with total week-occurrences.
    """
    lines: list[str] = []
    lines.append(f"Detected {len(courses)} courses; generating calendar…")
    lines.append("-- Course summary --")
    total_weeks = 0
    for i, c in enumerate(courses, start=1):
        name = (c.get("name", "") or "").strip()
        day = c.get("day") or ("outside" if c.get("outside") else "?")
        weeks = c.get("weeks", []) or []
        total_weeks += len(weeks)
        periods = c.get("periods", []) or []
        if periods:
            pspan = f"{min(periods)}-{max(periods)}"
        else:
            pspan = "-"
        loc = c.get("location", "") or ""
        teacher = c.get("teacher", "") or ""
        ctype = c.get("type", "") or ""
        # time span from sections (if any)
        tspan = ""
        if periods:
            ts = SECTION_TIMES.get(min(periods))
            te = SECTION_TIMES.get(max(periods))
            if ts and te:
                tspan = f" {ts[0]}-{te[1]}"
        # Effective location mirrors ICS behavior
        if c.get("outside"):
            eff_loc = (("线上" if is_chinese else "Online") if not loc else loc)
        else:
            eff_loc = (loc if loc else ("未定" if is_chinese else "Not yet"))
        lines.append(
            f"{i:02d}. [{day}] {ctype} weeks={len(weeks):2d} ({_condense_weeks(weeks)}) "
            f"sections={pspan}{tspan} :: {name} @ {eff_loc} | {teacher}"
        )
    lines.append(f"Total week-occurrences (expected ~ event count): {total_weeks}")
    return "\n".join(lines)


def parse_weeks(weeks_text: str) -> list[int]:
    weeks = set()
    if not weeks_text:
        return []
    # Normalize Chinese comma to ASCII comma
    weeks_text = weeks_text.replace("，", ",")
    for part in re.split(r",", weeks_text):
        part = part.strip()
        if not part:
            continue
        m = re.match(r"^(\d+)-(\d+)$", part)
        if m:
            a, b = int(m.group(1)), int(m.group(2))
            if a <= b:
                weeks.update(range(a, b + 1))
        elif part.isdigit():
            weeks.add(int(part))
    return sorted(weeks)


def _condense_weeks(weeks: list[int]) -> str:
    if not weeks:
        return ""
    w = sorted(set(weeks))
    ranges = []
    start = prev = w[0]
    for x in w[1:]:
        if x == prev + 1:
            prev = x
            continue
        if start == prev:
            ranges.append(str(start))
        else:
            ranges.append(f"{start}-{prev}")
        start = prev = x
    if start == prev:
        ranges.append(str(start))
    else:
        ranges.append(f"{start}-{prev}")
    return ",".join(ranges)


def split_blocks(cell_text: str) -> list[list[str]]:
    # Line-based blocks: start a new block when a line contains a type marker anywhere
    lines = [l.strip() for l in cell_text.split("\n") if l.strip()]
    if not lines:
        return []
    blocks: list[list[str]] = []
    cur: list[str] = []
    for ln in lines:
        if re.search(r"[△★▲☆]", ln):
            # Close previous block if any
            if cur:
                blocks.append(cur)
            cur = [ln]
        else:
            if cur:
                cur.append(ln)
            else:
                # Ignore prelude lines without a marker
                continue
    if cur:
        blocks.append(cur)
    return blocks


def split_blocks_by_marker(cell_text: str) -> list[str]:
    # Robust: split by occurrences of the type marker anywhere in the text
    text = cell_text or ""
    if not text:
        return []
    # If there is at least one marker, use positions to split into blocks
    markers = list(re.finditer(r"[△★▲☆]", text))
    if not markers:
        return []
    # Start each block exactly at marker positions; ignore any leading pre-marker noise
    idxs = [m.start() for m in markers]
    blocks: list[str] = []
    for i, st in enumerate(idxs):
        en = idxs[i + 1] if i + 1 < len(idxs) else len(text)
        seg = text[st:en].strip()
        if seg:
            blocks.append(seg)
    return [b for b in blocks if b]


def parse_block_text(block_text: str, fallback_period: int | None) -> dict | None:
    txt = (block_text or "").strip()
    if not txt:
        return None
    # Normalize whitespace/newlines
    flat = re.sub(r"\s+", " ", txt)
    # Course name: combine prelude lines before the marker (excluding meta lines) with the marker line prefix
    mpos = re.search(r"[△★▲☆]", txt)
    if not mpos:
        return None
    mi = mpos.start()
    lines = [l for l in txt.split("\n")]
    # Find marker line index
    acc = 0
    marker_line_idx = 0
    for idx, line in enumerate(lines):
        acc_next = acc + len(line) + 1  # +1 for newline
        if mi < acc_next:
            marker_line_idx = idx
            break
        acc = acc_next
    marker_line = lines[marker_line_idx]
    # Define meta-line predicate
    has_teacher_label = bool(re.search(r"(Teacher[s]?|任课教师|教师|老师)\s*[:：]", txt))
    def looks_like_person_name(ln: str) -> bool:
        # A heuristic: a short line with only letters/CJK/dots/spaces
        return bool(re.fullmatch(r"[A-Za-z\u4e00-\u9fff.\s]{2,40}", ln))
    def is_meta_line_name(ln: str) -> bool:
        if re.search(r"\(\d+(?:-\d+)?\s*Section\)|\bWeek\b|(Campus|Area)\s*[:：]|Teacher[s]?\s*[:：]", ln):
            return True
        # Chinese meta indicators
        if re.search(r"\(\d+(?:-\d+)?\s*节\)|第\s*[0-9,\-\s]+\s*周", ln):
            return True
        if re.search(r"(校区|教学区|地点|上课地点|场地|任课教师|教师|老师)\s*[:：]", ln):
            return True
        # Other metadata lines found in PDFs (match anywhere, not only at start, to catch '/The class:')
        if re.search(r"(?:^|/|\s)(The class|The makeup of the class|Class selection remarks|Course\s*hours|Week\s*period|Credit)\s*[:：]", ln, flags=re.IGNORECASE):
            return True
        # Broken lines where 'Week' split from 'period', or 'hours' alone
        if re.search(r"^(?:Week\s*)?period\s*[:：]", ln, flags=re.IGNORECASE):
            return True
        if re.search(r"^hours\s*[:：]", ln, flags=re.IGNORECASE):
            return True
        # Otherwise, include as part of course title prelude (do not block generic English/CN lines)
        return False
    # Collect name prelude from lines above marker line
    prelude_parts: list[str] = []
    j = marker_line_idx - 1
    while j >= 0:
        ln = (lines[j] or "").strip()
        if not ln or is_meta_line_name(ln) or re.search(r"[△★▲☆]", ln):
            break
        prelude_parts.append(ln)
        j -= 1
    prelude_parts.reverse()
    # Extract name prefix on the marker line up to marker
    mname_line = re.search(r"^(.*?)\s*([△★▲☆])", marker_line)
    if not mname_line:
        # Fallback to flattened prefix
        mname_line = re.search(r"^(.*?)\s*([△★▲☆])", flat)
        if not mname_line:
            return None
    type_char = mname_line.group(2)
    name_prefix = mname_line.group(1).strip()
    name_raw = (" ".join(prelude_parts + [name_prefix])).strip()
    # Fix hyphen/connectors in EN titles
    # Remove spurious spaces around hyphens introduced by joins
    name_raw = re.sub(r"\s*-\s*", "-", name_raw)
    # Merge common English connectors split by newlines: ensure single spaces around '&' and between words
    name_raw = re.sub(r"\s*&\s*", " & ", name_raw)
    name_raw = re.sub(r"\s{2,}", " ", name_raw)
    original_name_raw = name_raw
    # Drop leading non-letter/CJK noise
    name_raw = re.sub(r"^[^A-Za-z\u4e00-\u9fff]+", "", name_raw).strip()
    # Sections: (a-b Section) or (n Section) or Chinese '(a-b节)' '(n节)'
    sec_m = re.search(r"\((\d+)(?:-(\d+))?\s*Section\)", flat)
    if not sec_m:
        sec_m = re.search(r"\((\d+)(?:-(\d+))?\s*节\)", flat)
    if sec_m:
        s1 = int(sec_m.group(1)); s2 = int(sec_m.group(2)) if sec_m.group(2) else s1
        periods = list(range(s1, s2 + 1))
    else:
        periods = [fallback_period] if fallback_period else []
    # Weeks: EN Week / CN 第…周 / generic …周
    weeks: list[int] = []
    w_m = re.search(r"Week\s*([0-9,\-\s]+)", flat)
    if w_m:
        weeks = parse_weeks(w_m.group(1).replace(" ", ""))
    else:
        m_cn = re.search(r"第\s*([0-9,\-\s]+)\s*周", flat)
        if m_cn:
            weeks = parse_weeks(m_cn.group(1).replace(" ", ""))
        else:
            # Fallback: collect occurrences like '2-5周' or '17周'
            parts = re.findall(r"(\d+(?:-\d+)?)\s*周", flat)
            if parts:
                expanded: list[int] = []
                for p in parts:
                    if "-" in p:
                        a, b = p.split("-", 1)
                        try:
                            a_i = int(a); b_i = int(b)
                            if a_i <= b_i:
                                expanded.extend(list(range(a_i, b_i + 1)))
                        except Exception:
                            pass
                    else:
                        try:
                            expanded.append(int(p))
                        except Exception:
                            pass
                if expanded:
                    weeks = sorted(set(expanded))
    # Location: Area/Campus or CN 校区/教学区/地点; QQ optional
    loc = ""
    qq_m = re.search(r"课程QQ群号[：:]\s*(\d+)", txt)
    if qq_m:
        loc = f"Online {qq_m.group(1)}"
    else:
        loc_m = re.search(r"Area[:：]?\s*([^/;]+)", flat)
        if loc_m:
            loc = loc_m.group(1).strip()
    if not loc:
        camp_m = re.search(r"Campus[:：]?\s*([^/;]+)", flat)
        if camp_m:
            loc = camp_m.group(1).strip()
    if not loc:
        # Chinese labels: use flattened text to capture multi-line values
        campus = None
        place = None
        m_campus = re.search(r"(校区|教学区)\s*[:：]?\s*([^/;]+)", flat)
        if m_campus:
            campus = m_campus.group(2).strip()
        m_place = re.search(r"(场地|地点|上课地点)\s*[:：]?\s*([^/;]+)", flat)
        if m_place:
            place = m_place.group(2).strip()
        if campus and place:
            # Prefer the specific place/room; omit campus prefix
            loc = place
        elif place:
            loc = place
        elif campus:
            loc = campus
    # If Chinese text indicates '未排/未定', keep as '未定' instead of Online
    if loc and ("未排" in loc or "未定" in loc):
        loc = "未定"
    # Fallback: any line that contains the word 'Campus' (e.g., 'Main Campus  25-315')
    if not loc:
        for ln in lines:
            if re.search(r"\bCampus\b", ln, flags=re.IGNORECASE):
                # take the entire line as location candidate
                loc = ln.strip()
                break
    # Do not convert English 'Not yet' to 'Online' for in-table courses; keep as-is
    if loc:
        # fix hyphen spacing and CJK spacing
        loc = re.sub(r"\s*-\s*", "-", loc)
        loc = re.sub(r"([\u4e00-\u9fff])\s+([\u4e00-\u9fff])", r"\1\2", loc)
    # tighten Chinese parentheses spacing
    loc = re.sub(r"\s*（\s*", "（", loc)
    loc = re.sub(r"\s*）\s*", "）", loc)
    # Teacher: after Teacher:/任课教师/教师/老师; gather short continuation lines
    teacher = ""
    # Helpers to decide continuation
    def is_probable_name_line_cn(ln: str) -> bool:
        if not ln:
            return False
        if not re.search(r"[\u4e00-\u9fff]", ln):
            return False
        if re.search(r"(周|节|校区|地点|场地|上课地点|实验|理论|技术|实践)", ln):
            return False
        return bool(re.fullmatch(r"[\u4e00-\u9fff.\s]{2,16}", ln))

    def is_probable_name_line_en(ln: str) -> bool:
        if not ln or re.search(r"[0-9:/-]", ln):
            return False
        if not re.fullmatch(r"[A-Za-z.'\s]{2,40}", ln):
            return False
        tokens = ln.split()
        if len(tokens) > 4:
            return False
        # Exclude common course words
        course_words = r"(Project|Security|Design|Software|Training|College|Physical|China|Communication|National|Conditions|Analysis|Specification|Quality|Assurance|Testing)"
        if re.search(course_words, ln, flags=re.IGNORECASE):
            return False
        return True

    for idx_ln, ln in enumerate(lines):
        m_tline = re.search(r"(Teacher[s]?|任课教师|教师|老师)\s*[:：]\s*(.+)$", ln)
        if m_tline:
            teacher = m_tline.group(2).strip()
            # Cut at any trailing metadata marker on same line
            teacher = re.split(r"\b(The class|The makeup of the class|Class selection remarks|Course\s*hours|Week\s*period|Credit)\b", teacher, maxsplit=1, flags=re.IGNORECASE)[0].strip()
            # Collect continuation lines for Chinese or English teacher names, cautiously
            j = idx_ln + 1
            cont = []
            while j < len(lines) and len(cont) < 2:
                nxt_raw = (lines[j] or "").strip()
                # Stop if continuation line starts with metadata keys
                if re.search(r"^(The class|The makeup of the class|Class selection remarks|Course\s*hours|Week\s*period|Credit)\s*[:：]", nxt_raw, flags=re.IGNORECASE):
                    break
                # Clean trailing separators and inline metadata from continuation line
                nxt = re.split(r"[|/;]|\b(The class|The makeup of the class|Class selection remarks|Course\s*hours|Week\s*period|Credit)\b", nxt_raw, maxsplit=1, flags=re.IGNORECASE)[0].strip()
                if (is_probable_name_line_cn(nxt) or is_probable_name_line_en(nxt)) and not re.search(r"[△★▲☆]", nxt):
                    cont.append(nxt)
                    j += 1
                    continue
                break
            if cont:
                teacher = (teacher + " " + " ".join(cont)).strip()
            break
    # As a small cleanup, drop trailing icon hints or extra labels
    if teacher:
        teacher = re.sub(r"\s*[|/;].*$", "", teacher).strip()
        # Collapse spaces between CJK characters (e.g., '吴 剑明' -> '吴剑明')
        teacher = re.sub(r"([\u4e00-\u9fff])\s+([\u4e00-\u9fff])", r"\1\2", teacher)
        # Normalize camel-case English names without spaces (e.g., WangZiYe -> Wang Zi Ye)
        if not re.search(r"[\u4e00-\u9fff]", teacher) and not re.search(r"\s", teacher):
            parts = re.findall(r"[A-Z][a-z]*|[A-Z]+(?![a-z])|[a-z]+", teacher)
            if len(parts) >= 2:
                teacher = " ".join(parts)
    if teacher:
        # Remove teacher name if it leaked into the course name
        if name_raw.endswith(teacher):
            name_raw = name_raw[: -len(teacher)].rstrip(" -:\u3000")
        elif teacher in name_raw:
            name_raw = name_raw.replace(teacher, "").strip()
        else:
            # Remove trailing/leading teacher tokens (e.g., last surname) from edges
            tokens = [t for t in re.split(r"\s+", teacher) if len(t) >= 3]
            changed = True
            while changed and name_raw:
                changed = False
                for tok in tokens:
                    if name_raw.startswith(tok + " "):
                        name_raw = name_raw[len(tok)+1:]
                        changed = True
                    if name_raw.endswith(" " + tok):
                        name_raw = name_raw[: -len(tok)-1]
                        changed = True
    else:
        # Fallback: infer teacher from a plausible trailing name line without explicit label
        # Prefer Chinese name lines; else English short name lines
        for ln in reversed(lines):
            lns = (ln or "").strip()
            if not lns:
                continue
            # Skip metadata/location/type/marker lines
            if re.search(r"[△★▲☆]|周|节|校区|地点|场地|上课地点|实验|理论|技术|实践|Campus|Area|Teacher|Week|Credit", lns, flags=re.IGNORECASE):
                continue
            if is_probable_name_line_cn(lns) or is_probable_name_line_en(lns):
                teacher = lns
                break
    # Clean up name: remove any metadata tokens if accidentally included (English & Chinese)
    name_raw = re.sub(r"\b(Campus|Area|Teacher|Week)\s*[:：].*$", "", name_raw).strip()
    name_raw = re.sub(r"(校区|教学区|地点|上课地点|场地|任课教师|教师|老师)\s*[:：].*$", "", name_raw).strip()
    # Remove other PDF metadata keys if they leaked into the name
    name_raw = re.sub(r"\b(The class|The makeup of the class|Class selection remarks|Course\s*hours|Week\s*period|Credit)\s*[:：].*$", "", name_raw, flags=re.IGNORECASE).strip()
    # Also cut before any inline '(n Section)'/'(n节)' or 'Week'/'第..周' tokens
    name_raw = re.split(r"\(\d+(?:-\d+)?\s*Section\)|\bWeek\b", name_raw)[0].strip()
    name_raw = re.split(r"\(\d+(?:-\d+)?\s*节\)|第\s*[0-9,\-\s]+\s*周", name_raw)[0].strip()
    # Extra cleanup for stray teacher fragments at start of the name (e.g., '师:王子烨 ...')
    name_raw = re.sub(r"^(?:任课教师|教师|老师|师)\s*[:：]\s*\S+\s*", "", name_raw).strip()
    # Remove stray leading metadata fragments like 'period:3/ ...' or 'hours:Experiment:64/...'
    name_raw = re.sub(r"^(?:Week\s*period|period|hours|Credit)\s*[:：].*$", "", name_raw, flags=re.IGNORECASE).strip()
    # Fix CJK spacing inside names
    name_raw = re.sub(r"([\u4e00-\u9fff])\s+([\u4e00-\u9fff])", r"\1\2", name_raw)
    # Fallback: if name became empty after cleanup, restore original marker-line name
    if not name_raw:
        name_raw = original_name_raw.strip()
    course_name = name_raw.strip()
    return {
        "name": course_name,
        "periods": periods,
        "weeks": weeks,
        "location": loc,
        "teacher": teacher,
        "type": TYPE_MAP.get(type_char, ""),
        "type_char": type_char,
    }


def split_blocks_smart(cell_text: str) -> list[list[str]]:
    """Smart block splitter: include name lines just above first marker; stop at next marker."""
    lines = [l.strip() for l in (cell_text or "").split("\n") if l and l.strip()]
    if not lines:
        return []
    marker_idxs = [i for i, ln in enumerate(lines) if re.search(r"[△★▲☆]", ln)]
    if not marker_idxs:
        return []

    def is_meta_line(ln: str) -> bool:
        # English meta
        if re.search(r"\(\d+(?:-\d+)?\s*Section\)|Week\b|(Campus|Area)[:：]|Teacher[s]?:", ln):
            return True
        # Chinese meta
        if re.search(r"\(\d+(?:-\d+)?\s*节\)|第\s*[0-9,\-\s]+\s*周", ln):
            return True
        if re.search(r"(校区|教学区|地点|上课地点|场地|任课教师|教师|老师)[:：]", ln):
            return True
        # Additional metadata keys to ignore in name prelude
        if re.search(r"^(The class|The makeup of the class|Class selection remarks|Course\s*hours|Week\s*period|Credit)\s*[:：]", ln, flags=re.IGNORECASE):
            return True
        if re.search(r"^(?:Week\s*)?period\s*[:：]", ln, flags=re.IGNORECASE):
            return True
        if re.search(r"^hours\s*[:：]", ln, flags=re.IGNORECASE):
            return True
        return False

    blocks: list[list[str]] = []
    prev_marker = -1
    for idx_i, mi in enumerate(marker_idxs):
        # Backtrack to include name prelude
        start = mi
        j = mi - 1
        while j > prev_marker and j >= 0 and not is_meta_line(lines[j]) and not re.search(r"[△★▲☆]", lines[j]):
            start = j
            j -= 1
        end = marker_idxs[idx_i + 1] if idx_i + 1 < len(marker_idxs) else len(lines)
        block = lines[start:end]
        blocks.append(block)
        prev_marker = mi
    return blocks


def trim_to_first_marker_line(text: str) -> str:
    lines = [l for l in (text or "").split("\n")]
    for i, ln in enumerate(lines):
        if re.search(r"[△★▲☆]", ln):
            return "\n".join(lines[i:]).strip()
    return text.strip()


def merge_continuation_rows(headers: list[str], rows: list[list[str]]) -> list[list[str]]:
    """Stitch PDF-split continuation rows (empty period/section + day fragments)."""
    if not rows:
        return rows
    # Identify key columns
    col_period = 0
    col_section = 1
    day_cols = [i for i in range(2, len(headers))]
    out = [r[:] for r in rows]
    # Track last non-empty row index per day column
    last_nonempty_in_col: dict[int, int | None] = {j: None for j in day_cols}
    for i, r in enumerate(out):
        # If this looks like a continuation row (no period/section)
        p = (r[col_period] or "").strip()
        s = (r[col_section] or "").strip()
        if p == "" and s == "":
            changed = False
            for j in day_cols:
                frag = (r[j] or "").strip()
                if not frag:
                    continue
                # Typical fragments start with Campus/Area/Teachers/Week; accept any text
                # Prefer the tracked last non-empty row for this column
                prev_idx = last_nonempty_in_col.get(j)
                # Safety net: if tracker is None (e.g., edge cases), scan a larger window
                if prev_idx is None:
                    for k in range(i - 1, max(-1, i - 20), -1):
                        if (out[k][j] or "").strip():
                            prev_idx = k
                            break
                if prev_idx is not None:
                    # Append with newline
                    base = out[prev_idx][j].rstrip()
                    joiner = "\n" if not base.endswith("\n") else ""
                    out[prev_idx][j] = base + joiner + frag
                    out[i][j] = ""
                    changed = True
            # If we consumed all day columns, drop this row by marking a tombstone
            if changed and all((out[i][j] or "").strip() == "" for j in day_cols) and p == "" and s == "":
                out[i] = None
            # Do NOT update tracker on pure continuation rows; continue to next row
            continue
        # Non-continuation row: update tracker after handling continuation logic
        for j in day_cols:
            if (r[j] or "").strip():
                last_nonempty_in_col[j] = i
    # Compact rows removing None
    out2 = [r for r in out if r is not None]
    return out2


def extract_student_info(metadata_lines: list[str]) -> dict:
    """Extract student info (e.g., ID, name) from metadata lines above the table header.

    Looks for labels like 'Student ID', 'ID', or Chinese '学号'. Returns keys: id, name (if found).
    """
    info = {"id": None, "name": None}
    for line in metadata_lines or []:
        s = (line or "").replace("：", ":")
        # ID patterns
        m = re.search(r"\b(Student\s*ID|ID|学号)\s*:\s*([A-Za-z0-9_-]{4,})", s, flags=re.IGNORECASE)
        if m and not info["id"]:
            info["id"] = m.group(2).strip()
        # Name patterns (optional)
        m2 = re.search(r"\b(Name|姓名)\s*:\s*([A-Za-z\u4e00-\u9fff\s.]{2,})", s)
        if m2 and not info["name"]:
            info["name"] = " ".join(m2.group(2).split())
        # English header lines where term/ID is injected before 's Curriculum
        if not info["name"] and re.search(r"\bCurriculum\b", s, flags=re.IGNORECASE) and "'s" in s:
            pre = re.split(r"'s\b", s, maxsplit=1, flags=re.IGNORECASE)[0]
            x = pre
            # Normalize dashes/fullwidth digits
            dash_chars = "\u2010\u2011\u2012\u2013\u2014\u2212\ufe63\uff0d"
            trans = {ord(ch): '-' for ch in dash_chars}
            for i in range(10):
                trans[0xFF10 + i] = ord('0') + i
            x = x.translate(trans)
            # Remove academic year phrases like '2025-2026 academic year 1 term'
            x = re.sub(r"\b\d{4}-\d{4}\b.*?academic\s*year\s*[1-2]\s*term", " ", x, flags=re.IGNORECASE)
            # Remove 'student ID: XXXXX'
            x = re.sub(r"\bstudent\s*id\s*:\s*[A-Za-z0-9_-]+", " ", x, flags=re.IGNORECASE)
            # Collapse spaces and trim
            cand = " ".join(x.split()).strip(" -:·.")
            if cand:
                info["name"] = cand
        # Chinese title header: <NAME>课表 or <NAME>课程表
        if not info["name"]:
            mtc = re.search(r"^\s*([A-Za-z\u4e00-\u9fff][A-Za-z\u4e00-\u9fff\s.\-']{1,}?)\s*(?:课表|课程表)\s*$", s)
            if mtc:
                info["name"] = " ".join(mtc.group(1).split())
    return info


def extract_student_info_from_pdf(pdf_path: str, metadata_lines: list[str]) -> dict:
    """Extract student info using metadata lines first, then fallback to scanning PDF text.

    Handles title headers such as "<NAME>'s Curriculum" (EN) and "<NAME>课表/课程表" (CN)
    that may not be part of table metadata rows.
    """
    info = extract_student_info(metadata_lines or [])
    if info.get("name"):
        return info
    # Fallback: scan first 2 pages text
    try:
        import pdfplumber  # type: ignore
        with pdfplumber.open(pdf_path) as pdf:
            pages = [p for i, p in enumerate(pdf.pages) if i < 2]
            for p in pages:
                txt = p.extract_text() or ""
                # Normalize colons and spaces
                lines = [l.strip() for l in txt.splitlines() if l.strip()]
                for s in lines:
                    if info.get("name"):
                        break
                    # English header: <NAME>'s … Curriculum (with possible injected term/ID)
                    if re.search(r"\bCurriculum\b", s, flags=re.IGNORECASE) and "'s" in s:
                        pre = re.split(r"'s\b", s, maxsplit=1, flags=re.IGNORECASE)[0]
                        x = pre
                        dash_chars = "\u2010\u2011\u2012\u2013\u2014\u2212\ufe63\uff0d"
                        trans = {ord(ch): '-' for ch in dash_chars}
                        for i in range(10):
                            trans[0xFF10 + i] = ord('0') + i
                        x = x.translate(trans)
                        x = re.sub(r"\b\d{4}-\d{4}\b.*?academic\s*year\s*[1-2]\s*term", " ", x, flags=re.IGNORECASE)
                        x = re.sub(r"\bstudent\s*id\s*:\s*[A-Za-z0-9_-]+", " ", x, flags=re.IGNORECASE)
                        cand = " ".join(x.split()).strip(" -:·.")
                        if cand:
                            info["name"] = cand
                            break
                    # Chinese header: <NAME>课表 or <NAME>课程表
                    m_cn = re.search(r"^\s*([A-Za-z\u4e00-\u9fff][A-Za-z\u4e00-\u9fff\s.\-']{1,}?)\s*(?:课表|课程表)\s*$", s)
                    if m_cn and not info.get("name"):
                        info["name"] = " ".join(m_cn.group(1).split())
                        break
                if info.get("name"):
                    break
    except Exception:
        pass
    return info


def extract_term_from_pdf(pdf_path: str) -> str | None:
    """Extract academic term like '2025-2026-1' from the PDF filename if present."""
    base = os.path.splitext(os.path.basename(pdf_path or ""))[0]
    m = re.search(r"(\d{4}-\d{4}-\d)", base)
    return m.group(1) if m else None


def extract_term_from_content(pdf_path: str, metadata_lines: list[str]) -> str | None:
    """Extract academic term (YYYY-YYYY-N) from content: metadata first, then page text.

    Handles Unicode dashes and CN/EN phrasing like:
    - 2025-2026-1
    - 2025‑2026 academic year 1 term
    - 2025‑2026学年第1学期
    """
    def norm(s: str) -> str:
        if not s:
            return ""
        dash_chars = "\u2010\u2011\u2012\u2013\u2014\u2212\ufe63\uff0d"
        trans = {ord(ch): '-' for ch in dash_chars}
        for i in range(10):
            trans[0xFF10 + i] = ord('0') + i
        return s.translate(trans)

    def from_text_list(lines: list[str]) -> str | None:
        pat_direct = re.compile(r"(\d{4})-(\d{4})-([1-2])")
        pat_en = re.compile(r"(\d{4})-(\d{4}).{0,8}academic\s*year\s*([1-2])\s*term", re.IGNORECASE)
        pat_cn = re.compile(r"(\d{4})-(\d{4})\s*学年\s*第\s*([一二三123])\s*学期")
        cn_map = {"一": "1", "二": "2", "三": "3"}
        for raw in lines or []:
            s = norm(raw)
            m = pat_direct.search(s)
            if m:
                return f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
            m = pat_en.search(s)
            if m:
                return f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
            m = pat_cn.search(s)
            if m:
                sem = cn_map.get(m.group(3), m.group(3))
                if sem in ("1", "2"):
                    return f"{m.group(1)}-{m.group(2)}-{sem}"
        return None

    # 1) Metadata lines
    term = from_text_list(metadata_lines or [])
    if term:
        return term
    # 2) Fallback: scan first 2 pages text
    try:
        import pdfplumber  # type: ignore
        with pdfplumber.open(pdf_path) as pdf:
            lines: list[str] = []
            for i, p in enumerate(pdf.pages):
                if i >= 2:
                    break
                txt = p.extract_text() or ""
                lines.extend([l.strip() for l in txt.splitlines() if l.strip()])
        return from_text_list(lines)
    except Exception:
        return None


def derive_term_from_monday(monday_date: str) -> str:
    """Derive a plausible term from the Monday date when not present in the filename.

    Rule of thumb:
    - If month >= 8 (Aug-Dec): semester 1, start_year = year
    - Else (Jan-Jul): semester 2, start_year = year - 1
    """
    dt = datetime.strptime(monday_date, "%Y-%m-%d")
    if dt.month >= 8:
        start = dt.year
        sem = 1
    else:
        start = dt.year - 1
        sem = 2
    return f"{start}-{start+1}-{sem}"


def extract_courses_from_table(headers: list[str], rows: list[list[str]], preserve_newlines: bool) -> list[dict]:
    # Map day columns (English and Chinese)
    cn_day_map = {
        "周一": "Mon", "星期一": "Mon",
        "周二": "Tue", "星期二": "Tue",
        "周三": "Wed", "星期三": "Wed",
        "周四": "Thu", "星期四": "Thu",
        "周五": "Fri", "星期五": "Fri",
        "周六": "Sat", "星期六": "Sat",
        "周日": "Sun", "星期日": "Sun",
    }
    days = []
    for idx, h in enumerate(headers):
        hh_raw = (h or "").strip()
        hh = hh_raw.lower()
        if hh in ("mon", "tue", "wed", "thu", "fri", "sat", "sun"):
            days.append((idx, hh_raw if hh_raw in ("Mon","Tue","Wed","Thu","Fri","Sat","Sun") else hh_raw))
        else:
            # Chinese header may contain additional text; match by substring
            for key, eng in cn_day_map.items():
                if key in hh_raw:
                    days.append((idx, eng))
                    break
    day_by_col = {c: d for c, d in days}
    courses: list[dict] = []
    for row in rows:
        if len(row) < 3:
            continue
        # section number in column 2 (English 'Sections' or Chinese '节次/节')
        sec_text = (row[1] or "").strip()
        sec_num = None
        m_sec = re.search(r"^(\d+)$", sec_text)
        if not m_sec:
            m_sec = re.search(r"^(\d+)\s*节", sec_text)
        if m_sec:
            try:
                sec_num = int(m_sec.group(1))
            except Exception:
                sec_num = None
        for c_idx in range(2, len(row)):
            day = day_by_col.get(c_idx)
            if not day:
                continue
            cell = row[c_idx] or ""
            if not cell.strip():
                continue
            # Try line-based blocks first; if it fails, fallback to marker-based across full text
            # Prefer smart splitting with preserved newlines
            blocks = split_blocks_smart(cell) if preserve_newlines else []
            blocks_text: list[str] = []
            if blocks:
                # If a block contains multiple markers (rare), split into sub-blocks
                bt_list: list[str] = []
                for bl in blocks:
                    text_bl = "\n".join(bl)
                    # Generic: if multiple markers are present, split into separate sub-blocks by markers
                    subs = split_blocks_by_marker(text_bl)
                    if subs and len(subs) > 1:
                        bt_list.extend(subs)
                    else:
                        bt_list.append(text_bl)
                blocks_text = bt_list
            else:
                blocks_text = split_blocks_by_marker(cell)
            for bt in blocks_text:
                parsed = parse_block_text(bt, sec_num)
                if parsed and parsed.get("periods") and parsed.get("weeks"):
                    parsed["day"] = day
                    courses.append(parsed)
    return courses


def extract_outside_courses(metadata_lines: list[str]) -> list[dict]:
    courses: list[dict] = []
    for line in metadata_lines:
        # Normalize punctuation variants
        text = (line or "").replace("：", ":").replace("（", "(").replace("）", ")").replace("；", ";")
        # Find course marker
        m = re.search(r"^(.*?)([△★▲☆])", text)
        if not m:
            continue
        base = m.group(1).strip()
        # Strip category prefixes (English/Chinese)
        base = re.sub(r"^(Practice course|Practical course|Other courses|实践课程|其它课程|其他课程)[:：]\s*", "", base, flags=re.IGNORECASE)
        # Remove '(total N week)' and '(共N周)'
        base = re.sub(r"\(total\s*\d+\s*week\)\s*", "", base, flags=re.IGNORECASE)
        base = re.sub(r"\(共\s*\d+\s*周\)\s*", "", base)
        type_char = m.group(2)
        # Teacher right after marker until (, /, 'Week', '周', ';'
        teacher = ""
        mteach = re.search(r"[△★▲☆]\s*([A-Za-z\u4e00-\u9fff][A-Za-z\u4e00-\u9fff\s]{0,30}?)(?=\(|/|Week|周|;|$)", text)
        if mteach:
            teacher = mteach.group(1).strip()
        # Weeks (English or Chinese)
        weeks: list[int] = []
        w_m = re.search(r"Week[:\s]*([0-9,\-\s]+)", text)
        if w_m:
            weeks = parse_weeks(w_m.group(1).replace(" ", ""))
        else:
            w1 = re.search(r"/([0-9,\-\s]+)\s*Week", text)
            if w1:
                weeks = parse_weeks(w1.group(1).replace(" ", ""))
            else:
                wcn = re.search(r"第\s*([0-9,\-\s]+)\s*周", text)
                if wcn:
                    weeks = parse_weeks(wcn.group(1).replace(" ", ""))
                else:
                    parts = re.findall(r"(\d+(?:-\d+)?)\s*周", text)
                    if parts:
                        expanded: list[int] = []
                        for p in parts:
                            if "-" in p:
                                a, b = p.split("-", 1)
                                try:
                                    a_i = int(a); b_i = int(b)
                                    if a_i <= b_i:
                                        expanded.extend(list(range(a_i, b_i + 1)))
                                except Exception:
                                    pass
                            else:
                                try:
                                    expanded.append(int(p))
                                except Exception:
                                    pass
                        if expanded:
                            weeks = sorted(set(expanded))
        # Location / QQ (English 'Not Yet' or Chinese '未定' + QQ)
        loc = ""
        loc_m = re.search(r"Not Yet:?\s*([^;]+)", text, flags=re.IGNORECASE)
        if loc_m:
            qq = re.sub(r"[^0-9]", "", loc_m.group(1))
            loc = f"Online {qq}" if qq else "Online"
        else:
            if "未定" in text or "未排" in text:
                qqm = re.search(r"课程QQ群号[:]\s*(\d+)", text)
                if qqm:
                    loc = f"Online {qqm.group(1)}"
                else:
                    loc = "Online"
        # Append course
        courses.append({
            "name": base,
            "teacher": teacher,
            "weeks": weeks or [],
            "location": loc or "",
            "outside": True,
            "type": TYPE_MAP.get(type_char, ""),
            "type_char": type_char,
        })
    return courses


def process_pdf(pdf_path: str, monday_date: str) -> list[dict]:
    """Process a single PDF and return courses list."""
    print(f"Processing: {pdf_path}")
    
    # Detect tables
    tables = extract_tables(pdf_path, strategy="lines")
    
    # Merge while preserving newlines for robust block parsing
    headers, rows, meta, _, is_chinese = merge_main_table(tables, collapse_newlines=False)
    if not headers:
        print(f"Could not detect main timetable header for {pdf_path}; skipping.")
        return []
    
    # Stitch continuation fragments split by PDF extraction
    rows = merge_continuation_rows(headers, rows)
    
    # Extract courses from main table and outside-of-table metadata
    set_active_type_map(use_chinese=is_chinese)
    courses_from_table = extract_courses_from_table(headers, rows, preserve_newlines=True)
    courses_from_meta = extract_outside_courses(meta)
    courses = courses_from_table + courses_from_meta
    if not courses:
        print(f"No courses detected for {pdf_path}; skipping.")
        return []
    
    # Show summary
    print(summarize_courses(courses, is_chinese))
    
    # Extract term and student for each course
    term = extract_term_from_content(pdf_path, meta) or derive_term_from_monday(monday_date)
    student = extract_student_info_from_pdf(pdf_path, meta)
    
    # Prepare courses data
    db_courses = []
    for course in courses:
        # Map day to number
        day_map = {"Mon": 1, "Tue": 2, "Wed": 3, "Thu": 4, "Fri": 5, "Sat": 6, "Sun": 7}
        day_of_week = day_map.get(course.get("day"), None)
        
        # Periods as array
        periods = course.get("periods", [])
        if isinstance(periods, int):
            periods = [periods]
        
        # Weeks as array
        weeks = course.get("weeks", [])
        if isinstance(weeks, int):
            weeks = [weeks]
        
        db_course = {
            "title": course.get("name", ""),
            "teacher": course.get("teacher", ""),
            "location": course.get("location", ""),
            "term": term,
            "week_pattern": weeks,
            "day_of_week": day_of_week,
            "periods": periods,
            "course_type": course.get("type", ""),
            "first_week_monday": monday_date,
            "student_name": student.get("name", ""),
            "student_id": student.get("id", ""),
        }
        db_courses.append(db_course)
    
    return db_courses


def main() -> None:
    # Known terms and their Monday dates
    known_terms = {
        "2025-2026-1": "2025-09-08",
    }
    
    # Paths
    script_dir = os.path.dirname(__file__)
    pdf_folder = os.path.join(script_dir, "..", "..", "reference", "pdf")
    seed_file = os.path.join(script_dir, "..", "..", "backend", "accounts", "seed_data", "courses.json")
    
    # Load existing courses
    if os.path.exists(seed_file):
        with open(seed_file, "r", encoding="utf-8") as f:
            content = f.read().strip()
            if content:
                existing_courses = json.loads(content)
                # Remove source_filename from existing courses for consistency
                existing_courses = [{k: v for k, v in course.items() if k != 'source_filename'} for course in existing_courses]
            else:
                existing_courses = []
    else:
        existing_courses = []
    
    # Find PDFs
    pdf_files = glob.glob(os.path.join(pdf_folder, "*.pdf"))
    if not pdf_files:
        print(f"No PDF files found in {pdf_folder}")
        return
    
    total_new = 0
    total_skipped = 0
    
    for pdf_path in pdf_files:
        # Extract term
        term = extract_term_from_pdf(pdf_path)
        if not term:
            # Try from content
            tables = extract_tables(pdf_path, strategy="lines")
            _, _, meta, _, _ = merge_main_table(tables, collapse_newlines=False)
            term = extract_term_from_content(pdf_path, meta)
        
        if not term:
            print(f"Could not extract term from {pdf_path}; skipping.")
            continue
        
        # Check if known
        if term not in known_terms:
            monday_date = input(f"Enter Monday date for term {term} (YYYY-MM-DD): ").strip()
            try:
                datetime.strptime(monday_date, "%Y-%m-%d")
                known_terms[term] = monday_date
            except ValueError:
                print("Invalid date format; skipping this PDF.")
                continue
        else:
            monday_date = known_terms[term]
        
        # Process PDF
        try:
            courses = process_pdf(pdf_path, monday_date)
        except Exception as e:
            print(f"Error processing {pdf_path}: {e}")
            continue
        
        # Add unique courses
        for course in courses:
            if course not in existing_courses:
                existing_courses.append(course)
                total_new += 1
            else:
                total_skipped += 1
    
    # Save updated courses
    os.makedirs(os.path.dirname(seed_file), exist_ok=True)
    json_str = json.dumps(existing_courses, ensure_ascii=False, indent=2)
    # Compact week_pattern and periods arrays to single line
    import re
    json_str = re.sub(r'("week_pattern": )\[\s*((?:\s*\d+\s*,)*\s*\d+\s*)\s*\]', lambda m: f'{m.group(1)}[{m.group(2).replace(" ", "").replace("\n", "")}]', json_str, flags=re.MULTILINE | re.DOTALL)
    json_str = re.sub(r'("periods": )\[\s*((?:\s*\d+\s*,)*\s*\d*\s*)\s*\]', lambda m: f'{m.group(1)}[{m.group(2).replace(" ", "").replace("\n", "")}]', json_str, flags=re.MULTILINE | re.DOTALL)
    with open(seed_file, "w", encoding="utf-8") as f:
        f.write(json_str)
    
    print(f"Updated {seed_file} with {total_new} new courses, skipped {total_skipped} duplicates.")
    print(f"Total courses: {len(existing_courses)}")
 

if __name__ == "__main__":
    main()
