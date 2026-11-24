"""
Creates Chrome WebDriver sessions for both Selenium suites.

Normally Selenium Manager (selenium-manager.exe) finds or downloads the matching
ChromeDriver. On 2026-11-24 Windows Application Control started blocking
selenium-manager.exe on the test machine ("An Application Control policy has
blocked this file"), while chromedriver.exe itself is still allowed. So:

  1. CHROMEDRIVER=<path to chromedriver.exe>  -> use that driver
  2. otherwise try Selenium Manager as usual
  3. if that fails, use the newest ChromeDriver already in Selenium's cache
     (~/.cache/selenium/chromedriver/<platform>/<version>/)
"""
import os
from pathlib import Path

from selenium import webdriver
from selenium.common.exceptions import NoSuchDriverException
from selenium.webdriver.chrome.service import Service


def _cached_chromedriver() -> str | None:
    root = Path.home() / ".cache" / "selenium" / "chromedriver"
    candidates = list(root.glob("*/*/chromedriver.exe")) + list(root.glob("*/*/chromedriver"))

    def version(p: Path) -> tuple[int, ...]:
        try:
            return tuple(int(x) for x in p.parent.name.split("."))
        except ValueError:
            return (0,)

    return str(max(candidates, key=version)) if candidates else None


def new_chrome(options: webdriver.ChromeOptions) -> webdriver.Chrome:
    explicit = os.environ.get("CHROMEDRIVER")
    if explicit:
        return webdriver.Chrome(options=options, service=Service(executable_path=explicit))
    try:
        return webdriver.Chrome(options=options)
    except NoSuchDriverException:
        cached = _cached_chromedriver()
        if not cached:
            raise
        return webdriver.Chrome(options=options, service=Service(executable_path=cached))
