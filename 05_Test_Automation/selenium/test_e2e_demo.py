"""
E2E - Demo control room and notifications (REQ-22).
Test cases: TC_E2E_27, TC_E2E_28
"""
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait

from pages import BasePage, MyBookingsPage


def _toasts(driver, min_count=1):
    WebDriverWait(driver, 8).until(lambda d: len(d.find_elements(By.CSS_SELECTOR, "[data-testid='toast']")) >= min_count)
    return driver.find_elements(By.CSS_SELECTOR, "[data-testid='toast']")


def test_TC_E2E_27_demo_scenario_with_toast_and_testing_lens(driver, base_url, shot):
    """A one-click scenario opens the right screen; the outcome is announced by a toast naming the test case."""
    page = BasePage(driver, base_url).open("/")
    page.click("demo-dock-toggle")
    page.el("demo-panel")
    shot("panel")
    page.click("demo-scenario-ep-unknown-pnr")
    page.wait_for_path("/pnr-status?pnr=0000000000")
    assert page.text("pnr-error") == "PNR not found"
    toasts = _toasts(driver, 2)
    titles = [t.find_element(By.CSS_SELECTOR, "[data-testid='toast-title']").text for t in toasts]
    assert "PNR not found" in titles
    lens = [t.text for t in driver.find_elements(By.CSS_SELECTOR, "[data-testid='toast-lens']")]
    assert any("TC_IT_10" in chip for chip in lens), lens
    shot("toasts")


def test_TC_E2E_28_demo_seeds_promotion_scenario(driver, base_url, shot):
    """The promotion scenario signs in as demo and books CNF, RAC and WL tickets through the real engine."""
    page = BasePage(driver, base_url).open("/")
    page.click("demo-dock-toggle")
    page.click("demo-scenario-st-promotion")
    bookings = MyBookingsPage(driver, base_url).wait_for_path("/bookings")
    assert bookings.logged_in_user() == "demo"
    pnrs = bookings.pnrs()
    assert len(pnrs) == 3
    assert sorted(bookings.status_of(p) for p in pnrs) == ["Confirmed", "RAC", "Waitlisted"]
    shot("seeded")
