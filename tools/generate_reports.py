"""
Builds the execution artefacts from the machine-readable results of the last test runs:

  inputs   06_Test_Reports/unit/junit.xml                 (Vitest, JUnit XML)
           06_Test_Reports/e2e/junit.xml                  (pytest + Selenium, JUnit XML)
           06_Test_Reports/baseline_v1/v1_probe_junit.xml (baseline probe on v1.0)
           06_Test_Reports/coverage/coverage-summary.json (V8 coverage)
           06_Test_Reports/mutation/mutation-report.json  (StrykerJS)
  outputs  03_Test_Execution/Test_Execution_Log.md        every executed test case with its result
           06_Test_Reports/Execution_Metrics.md           totals per suite / technique, coverage, mutation score
           06_Test_Reports/Test_Execution_Workbook.xlsx   the same data as an Excel workbook

Nothing in these files is typed by hand, so the documented "actual results" are
exactly what the tools observed.

Usage:  .venv\\Scripts\\python tools/generate_reports.py
"""
from __future__ import annotations

import datetime as dt
import json
import re
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPORTS = ROOT / "06_Test_Reports"

TECHNIQUES = {
    "EP": "Equivalence Partitioning",
    "BVA": "Boundary Value Analysis",
    "DT": "Decision Table",
    "ST": "State Transition",
    "UT": "Unit (functional)",
    "IT": "Integration (component)",
    "E2E": "System / E2E (Selenium)",
    "V1": "Baseline defect probe (v1.0)",
}
ID_RE = re.compile(r"(TC_[A-Z0-9]+(?:_[A-Z0-9]+)*?_\d+)")
V1_RE = re.compile(r"V1_(D\d+)")


@dataclass
class Case:
    suite: str
    tc_id: str
    technique: str
    module: str
    title: str
    status: str  # PASS | FAIL | SKIP
    seconds: float
    message: str


def _technique(tc_id: str) -> str:
    key = tc_id.split("_")[1] if tc_id.startswith("TC_") else "V1"
    return TECHNIQUES.get(key, "Other")


def read_junit(path: Path, suite: str) -> list[Case]:
    if not path.exists():
        return []
    cases = []
    for tc in ET.parse(path).getroot().iter("testcase"):
        name = tc.get("name", "")
        classname = tc.get("classname", "")
        failure = tc.find("failure")
        if failure is None:
            failure = tc.find("error")
        skipped = tc.find("skipped") is not None
        status = "SKIP" if skipped else ("FAIL" if failure is not None else "PASS")
        message = ""
        if failure is not None:
            message = (failure.get("message") or failure.text or "").strip().splitlines()[0][:160]

        if suite == "Baseline v1.0":
            m = V1_RE.search(name)
            tc_id = f"V1-{m.group(1)}" if m else name
            title = name.split(m.group(0), 1)[1].strip("_").replace("_", " ") if m else name
        else:
            m = ID_RE.search(name)
            tc_id = m.group(1) if m else "-"
            if suite == "E2E (Selenium)":
                title = name.split(tc_id, 1)[-1].strip("_").replace("_", " ") if m else name
            else:
                title = name.split(">")[-1].strip()
                # it.each() titles look like  'TC_EP_CVV_04': CVV "'12a'"  - drop the ID and the quotes
                title = re.sub(r"^'?" + re.escape(tc_id) + r"'?\s*:?\s*", "", title).replace("'", "")
        if suite == "Unit & Integration":
            module = re.sub(r"\.test\.tsx?$", "", Path(classname).name)
        else:
            module = Path(classname.replace(".", "/")).stem.removeprefix("test_")
        cases.append(Case(suite, tc_id, _technique(tc_id), module, title, status,
                          float(tc.get("time", 0) or 0), message))
    return cases


def coverage_summary() -> dict | None:
    p = REPORTS / "coverage" / "coverage-summary.json"
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else None


def mutation_summary() -> dict | None:
    p = REPORTS / "mutation" / "mutation-report.json"
    if not p.exists():
        return None
    data = json.loads(p.read_text(encoding="utf-8"))
    per_file: dict[str, Counter] = {}
    total = Counter()
    for file, info in data["files"].items():
        c = Counter(m["status"] for m in info["mutants"])
        per_file[Path(file).name] = c
        total.update(c)
    detected = total["Killed"] + total["Timeout"]
    undetected = total["Survived"] + total["NoCoverage"]
    score = 100 * detected / (detected + undetected) if detected + undetected else 0
    return {"total": total, "per_file": per_file, "score": score}


def _md_table(headers: list[str], rows: list[list]) -> str:
    out = ["| " + " | ".join(headers) + " |", "|" + "|".join("---" for _ in headers) + "|"]
    out += ["| " + " | ".join(str(c).replace("|", "\\|") for c in r) + " |" for r in rows]
    return "\n".join(out)


def _icon(status: str) -> str:
    return {"PASS": "✅ Pass", "FAIL": "❌ Fail", "SKIP": "⏭ Skip"}[status]


def write_execution_log(suites: dict[str, list[Case]], stamp: str):
    lines = [
        "# Test Execution Log",
        "",
        f"_Generated by `tools/generate_reports.py` on {stamp} from the JUnit XML files of the last runs. "
        "Do not edit by hand - re-run the suites and the generator instead._",
        "",
        "Legend: **Expected result** for every case is defined in `02_Test_Case_Design`; "
        "**Actual result** below is what the automated run observed (Pass = actual matched expected).",
        "",
    ]
    for suite, cases in suites.items():
        if not cases:
            continue
        c = Counter(x.status for x in cases)
        lines += [f"## {suite}", "", f"Executed **{len(cases)}** · Passed **{c['PASS']}** · Failed **{c['FAIL']}** · Skipped **{c['SKIP']}**", ""]
        rows = [[x.tc_id, x.technique, x.module, x.title, _icon(x.status) + (f" - {x.message}" if x.message else ""), f"{x.seconds:.3f}s"] for x in cases]
        lines += [_md_table(["Test case", "Technique", "Module", "Description", "Actual result", "Time"], rows), ""]
    (ROOT / "03_Test_Execution" / "Test_Execution_Log.md").write_text("\n".join(lines), encoding="utf-8")


def write_metrics(suites: dict[str, list[Case]], cov: dict | None, mut: dict | None, stamp: str):
    lines = ["# Execution Metrics", "", f"_Generated by `tools/generate_reports.py` on {stamp}._", "", "## Results by suite", ""]
    rows = []
    for suite, cases in suites.items():
        c = Counter(x.status for x in cases)
        rate = f"{100 * c['PASS'] / len(cases):.1f}%" if cases else "-"
        rows.append([suite, len(cases), c["PASS"], c["FAIL"], c["SKIP"], rate])
    lines += [_md_table(["Suite", "Executed", "Passed", "Failed", "Skipped", "Pass rate"], rows), ""]

    lines += ["## Test cases by design technique (v2.0 suites)", ""]
    by_tech: dict[str, Counter] = defaultdict(Counter)
    for suite, cases in suites.items():
        if suite == "Baseline v1.0":
            continue
        for x in cases:
            by_tech[x.technique][x.status] += 1
    rows = [[t, sum(c.values()), c["PASS"], c["FAIL"]] for t, c in sorted(by_tech.items())]
    lines += [_md_table(["Technique", "Test cases", "Passed", "Failed"], rows), ""]

    if cov:
        lines += ["## Code coverage (business rules: app/src/lib, data, store)", ""]
        t = cov["total"]
        lines += [_md_table(["Metric", "Covered", "Total", "%"],
                            [[k.title(), t[k]["covered"], t[k]["total"], f"{t[k]['pct']:.2f}%"] for k in ("statements", "branches", "functions", "lines")]), ""]
    if mut:
        tot = mut["total"]
        lines += ["## Mutation testing (StrykerJS on app/src/lib)", "",
                  f"**Mutation score: {mut['score']:.2f}%**  (killed + timeout) / (all mutants except compile errors / ignored)", ""]
        rows = []
        for f, c in sorted(mut["per_file"].items()):
            det = c["Killed"] + c["Timeout"]
            und = c["Survived"] + c["NoCoverage"]
            rows.append([f, det + und, c["Killed"], c["Timeout"], c["Survived"], c["NoCoverage"], f"{100 * det / (det + und):.1f}%" if det + und else "-"])
        det = tot["Killed"] + tot["Timeout"]
        und = tot["Survived"] + tot["NoCoverage"]
        rows.append(["**Total**", det + und, tot["Killed"], tot["Timeout"], tot["Survived"], tot["NoCoverage"], f"**{mut['score']:.1f}%**"])
        lines += [_md_table(["File", "Mutants", "Killed", "Timeout", "Survived", "No coverage", "Score"], rows), ""]
    (REPORTS / "Execution_Metrics.md").write_text("\n".join(lines), encoding="utf-8")


def write_workbook(suites: dict[str, list[Case]], stamp: str):
    try:
        from openpyxl import Workbook
        from openpyxl.styles import Alignment, Font, PatternFill
        from openpyxl.utils import get_column_letter
    except ImportError:
        print("openpyxl not installed - skipping workbook")
        return
    wb = Workbook()
    summary = wb.active
    summary.title = "Summary"
    head_fill = PatternFill("solid", fgColor="4F46E5")
    head_font = Font(bold=True, color="FFFFFF")
    fills = {"PASS": PatternFill("solid", fgColor="DCFCE7"), "FAIL": PatternFill("solid", fgColor="FEE2E2"), "SKIP": PatternFill("solid", fgColor="F3F4F6")}

    def header(ws, cols):
        ws.append(cols)
        for i, _ in enumerate(cols, 1):
            cell = ws.cell(row=ws.max_row, column=i)
            cell.fill, cell.font = head_fill, head_font
        ws.freeze_panes = ws.cell(row=ws.max_row + 1, column=1)

    summary.append(["RailReserve - Test Execution Workbook"])
    summary["A1"].font = Font(bold=True, size=14)
    summary.append([f"Generated {stamp} from JUnit XML results"])
    summary.append([])
    header(summary, ["Suite", "Executed", "Passed", "Failed", "Skipped"])
    for suite, cases in suites.items():
        c = Counter(x.status for x in cases)
        summary.append([suite, len(cases), c["PASS"], c["FAIL"], c["SKIP"]])

    for suite, cases in suites.items():
        if not cases:
            continue
        ws = wb.create_sheet(suite.replace("&", "and").replace("(", "").replace(")", "")[:31])
        header(ws, ["Test case ID", "Technique", "Module", "Description", "Status", "Time (s)", "Failure message"])
        for x in cases:
            ws.append([x.tc_id, x.technique, x.module, x.title, x.status, round(x.seconds, 3), x.message])
            ws.cell(row=ws.max_row, column=5).fill = fills[x.status]
        for col, width in zip(range(1, 8), (22, 26, 22, 70, 9, 9, 60)):
            ws.column_dimensions[get_column_letter(col)].width = width
        for row in ws.iter_rows(min_row=2):
            for cell in row:
                cell.alignment = Alignment(vertical="top", wrap_text=cell.column in (4, 7))
    for col, width in zip(range(1, 6), (28, 10, 10, 10, 10)):
        summary.column_dimensions[get_column_letter(col)].width = width
    wb.save(REPORTS / "Test_Execution_Workbook.xlsx")


def main():
    stamp = dt.datetime.now().strftime("%Y-%m-%d %H:%M")
    suites = {
        "Unit & Integration": read_junit(REPORTS / "unit" / "junit.xml", "Unit & Integration"),
        "E2E (Selenium)": read_junit(REPORTS / "e2e" / "junit.xml", "E2E (Selenium)"),
        "Baseline v1.0": read_junit(REPORTS / "baseline_v1" / "v1_probe_junit.xml", "Baseline v1.0"),
    }
    cov, mut = coverage_summary(), mutation_summary()
    write_execution_log(suites, stamp)
    write_metrics(suites, cov, mut, stamp)
    write_workbook(suites, stamp)
    for suite, cases in suites.items():
        c = Counter(x.status for x in cases)
        print(f"{suite:22} executed={len(cases):4} pass={c['PASS']:4} fail={c['FAIL']:3} skip={c['SKIP']}")
    if cov:
        print(f"coverage statements={cov['total']['statements']['pct']}% branches={cov['total']['branches']['pct']}%")
    if mut:
        print(f"mutation score={mut['score']:.2f}% {dict(mut['total'])}")


if __name__ == "__main__":
    main()
