from __future__ import annotations


def fmt_time(seconds: float) -> str:
    total = max(0, int(seconds))
    return f"{total // 60}:{total % 60:02d}"


def fmt_gold(value: float) -> str:
    rounded = round(value)
    if rounded == 0:
        return "0"
    return f"{'+' if rounded > 0 else '-'}{abs(rounded):,}"
