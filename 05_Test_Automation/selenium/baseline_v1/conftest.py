"""
Fixtures for the *baseline* probe suite that runs against the ORIGINAL
irctc-clone (v1.0, https://github.com/krishanmurariji/irctc-clone).

Every test here encodes an EXPECTED behaviour taken from the original
project's README / common railway-reservation requirements.  A failing test
is therefore evidence of a defect in v1.0; each one is logged in
04_Defect_Reports/Defect_Report.md under the same Dxx id.

Run (original app must be running, default http://127.0.0.1:5174):
    pytest 05_Test_Automation/selenium/baseline_v1
"""
import os
import sys
from pathlib import Path

import pytest
from selenium import webdriver

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from driver_factory import new_chrome  # noqa: E402

ROOT = Path(__file__).resolve().parents[3]
SHOT_DIR = ROOT / "07_Screenshots" / "baseline_v1"


@pytest.fixture(scope="session")
def base_url():
    return os.environ.get("V1_BASE_URL", "http://127.0.0.1:5174").rstrip("/")


@pytest.fixture
def driver(request):
    opts = webdriver.ChromeOptions()
    if os.environ.get("HEADED") != "1":
        opts.add_argument("--headless=new")
    opts.add_argument("--window-size=1366,900")
    opts.add_argument("--disable-gpu")
    drv = new_chrome(opts)
    drv.implicitly_wait(2)
    yield drv
    # Evidence: always capture the final screen of every probe.
    SHOT_DIR.mkdir(parents=True, exist_ok=True)
    drv.save_screenshot(str(SHOT_DIR / f"{request.node.name}.png"))
    drv.quit()
