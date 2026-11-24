"""
Selenium WebDriver E2E suite for RailReserve v2.0.

Prerequisite: the application is running (default http://127.0.0.1:5173):
    npm run dev                     (from the repository root)
Run:
    .venv\\Scripts\\python -m pytest 05_Test_Automation/selenium
Options (environment variables):
    BASE_URL=http://host:port   target another server
    HEADED=1                    watch the browser instead of running headless

One Chrome instance is shared by the session; before every test the browser's
localStorage / sessionStorage are wiped, so each test starts as a brand-new
visitor (no users except the demo account, no bookings).
"""
import datetime as dt
import os
import re
from pathlib import Path

import pytest
from selenium import webdriver

from driver_factory import new_chrome

ROOT = Path(__file__).resolve().parents[2]
SHOT_DIR = ROOT / "07_Screenshots" / "release_v2"
DOWNLOAD_DIR = ROOT / ".e2e-downloads"


@pytest.fixture(scope="session")
def base_url():
    return os.environ.get("BASE_URL", "http://127.0.0.1:5173").rstrip("/")


@pytest.fixture(scope="session")
def browser():
    DOWNLOAD_DIR.mkdir(exist_ok=True)
    opts = webdriver.ChromeOptions()
    if os.environ.get("HEADED") != "1":
        opts.add_argument("--headless=new")
    opts.add_argument("--window-size=1366,900")
    opts.add_argument("--disable-gpu")
    opts.add_argument("--lang=en-IN")
    # UI animations honour prefers-reduced-motion: tests always see final states, never mid-animation text
    opts.add_argument("--force-prefers-reduced-motion")
    opts.add_experimental_option("prefs", {
        "download.default_directory": str(DOWNLOAD_DIR),
        "download.prompt_for_download": False,
    })
    drv = new_chrome(opts)
    yield drv
    drv.quit()


@pytest.fixture
def driver(browser, base_url, request):
    """Fresh application state for every test + final screenshot as evidence."""
    browser.set_window_size(1366, 900)
    browser.get(base_url + "/")
    browser.execute_script("window.localStorage.clear(); window.sessionStorage.clear();")
    browser.get(base_url + "/")
    yield browser
    SHOT_DIR.mkdir(parents=True, exist_ok=True)
    browser.save_screenshot(str(SHOT_DIR / f"{_test_id(request)}__final.png"))


@pytest.fixture
def shot(driver, request):
    """shot('step-name') saves an evidence screenshot for the current test."""
    def _shot(step: str):
        SHOT_DIR.mkdir(parents=True, exist_ok=True)
        driver.save_screenshot(str(SHOT_DIR / f"{_test_id(request)}__{step}.png"))
    return _shot


@pytest.fixture
def today():
    return dt.date.today()


def _test_id(request) -> str:
    m = re.search(r"(TC_E2E_\d+)", request.node.name, re.IGNORECASE)
    return m.group(1).upper() if m else request.node.name


def iso(day: dt.date, offset: int = 0) -> str:
    return (day + dt.timedelta(days=offset)).isoformat()


def next_weekday(day: dt.date, weekday: int) -> dt.date:
    """Next date (after `day`) falling on `weekday` (Mon=0 … Sun=6, Python convention)."""
    ahead = (weekday - day.weekday()) % 7 or 7
    return day + dt.timedelta(days=ahead)
