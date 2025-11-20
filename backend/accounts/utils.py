from __future__ import annotations

from typing import Optional

from django.utils.text import slugify


GENDER_KEYS = {
    '男': 'male',
    '女': 'female',
    'male': 'male',
    'female': 'female',
    'm': 'male',
    'f': 'female',
}


def to_key(value: Optional[str]) -> str:
    """Create a lowercase slug key (underscored) from any label."""
    label = (value or '').strip()
    if not label:
        return ''
    normalized = slugify(label, allow_unicode=False)
    return normalized.replace('-', '_')


def gender_key(raw: Optional[str]) -> str:
    base = (raw or '').strip()
    lowered = base.lower()
    if lowered in GENDER_KEYS:
        return GENDER_KEYS[lowered]
    if base in GENDER_KEYS:
        return GENDER_KEYS[base]
    return to_key(base)
