"""
Baseline defect probe for the ORIGINAL application (v1.0).

Each test asserts what the application SHOULD do.  On v1.0 these are expected
to FAIL — every failure is a reproducible defect, logged with the same id in
04_Defect_Reports/Defect_Report.md and evidenced by a screenshot in
07_Screenshots/baseline_v1/<test name>.png.
"""
import datetime as dt
import time

from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import Select

SET_VALUE_JS = """
const el = arguments[0], v = arguments[1];
const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
setter.call(el, v);
el.dispatchEvent(new Event('input', { bubbles: true }));
el.dispatchEvent(new Event('change', { bubbles: true }));
"""


def _iso(days_from_today: int) -> str:
    return (dt.date.today() + dt.timedelta(days=days_from_today)).isoformat()


def _fill_home_search(driver, base_url, frm, to, date):
    driver.get(base_url + "/")
    selects = driver.find_elements(By.CSS_SELECTOR, "form select")
    Select(selects[0]).select_by_value(frm)
    Select(selects[1]).select_by_value(to)
    date_input = driver.find_element(By.CSS_SELECTOR, "form input[type=date]")
    driver.execute_script(SET_VALUE_JS, date_input, date)
    driver.find_element(By.CSS_SELECTOR, "form button[type=submit]").click()
    time.sleep(1)


# ---------------------------------------------------------------- Home search
def test_V1_D01_home_search_shows_results(driver, base_url):
    """Valid search (Mumbai -> Delhi, +7 days) must navigate to a results page."""
    _fill_home_search(driver, base_url, "Mumbai", "Delhi", _iso(7))
    assert "/trains" in driver.current_url, "Search Trains button does nothing"


def test_V1_D02_same_source_destination_rejected(driver, base_url):
    """Source == destination must be rejected with a validation message."""
    _fill_home_search(driver, base_url, "Mumbai", "Mumbai", _iso(7))
    body = driver.find_element(By.TAG_NAME, "body").text.lower()
    assert "same" in body or "different" in body, "No validation for identical stations"


def test_V1_D03_journey_date_restricted_to_booking_window(driver, base_url):
    """Date picker must block past dates and dates beyond the 120-day window."""
    driver.get(base_url + "/")
    date_input = driver.find_element(By.CSS_SELECTOR, "form input[type=date]")
    assert date_input.get_attribute("min") == _iso(0), "Past dates selectable (no min)"
    assert date_input.get_attribute("max") == _iso(120), "No 120-day upper limit (no max)"


# ------------------------------------------------------------ /book page
def test_V1_D04_get_tickets_button_works(driver, base_url):
    """'Get Tickets' on /book must lead to train results."""
    driver.get(base_url + "/book")
    driver.find_element(By.XPATH, "//button[normalize-space()='Get Tickets']").click()
    time.sleep(1)
    assert "/trains" in driver.current_url, "Get Tickets button has no action"


def test_V1_D05_adult_counter_has_upper_limit(driver, base_url):
    """Max 6 passengers per booking (as on the Home page) must be enforced."""
    driver.get(base_url + "/book")
    plus = driver.find_elements(By.XPATH, "//button[normalize-space()='+']")[0]
    for _ in range(10):
        plus.click()
    adults_text = driver.find_element(By.XPATH, "//span[contains(., 'Adults')]").text
    adults = int(adults_text.split()[0])
    assert adults <= 6, f"Adult counter reached {adults}"


# ------------------------------------------------------------ PNR status
def _query_pnr(driver, pnr):
    box = driver.find_element(By.CSS_SELECTOR, "input[placeholder*='PNR']")
    box.clear()
    box.send_keys(pnr)
    driver.find_element(By.XPATH, "//button[contains(., 'Get Status')]").click()
    time.sleep(0.3)


def test_V1_D06_unknown_pnr_reports_not_found(driver, base_url):
    """A PNR that was never booked must give a 'not found' message."""
    driver.get(base_url + "/pnr-status")
    _query_pnr(driver, "0000000000")
    body = driver.find_element(By.TAG_NAME, "body").text.lower()
    assert "not found" in body or "invalid" in body, "Fake booking shown for unknown PNR"


def test_V1_D07_pnr_result_is_consistent(driver, base_url):
    """The same PNR queried repeatedly must return the same train."""
    driver.get(base_url + "/pnr-status")
    seen = set()
    for _ in range(5):
        _query_pnr(driver, "1234567890")
        label = driver.find_element(By.XPATH, "//p[text()='Train Number/Name']/following-sibling::p")
        seen.add(label.text)
    assert len(seen) == 1, f"Same PNR returned {len(seen)} different trains: {sorted(seen)}"


def test_V1_D08_pnr_passenger_status_matches_badge(driver, base_url):
    """A 'CNF' passenger must never be shown with a Waitlist/RAC (red/yellow) badge."""
    driver.get(base_url + "/pnr-status")
    mismatches = 0
    for _ in range(10):
        _query_pnr(driver, "1234567890")
        badge = driver.find_element(By.CSS_SELECTOR, "tbody span.rounded-full")
        if badge.text.strip() == "CNF" and "bg-green-100" not in badge.get_attribute("class"):
            mismatches += 1
    assert mismatches == 0, f"'CNF' shown with non-confirmed colour in {mismatches}/10 queries"


# ------------------------------------------------------------ Train list
def test_V1_D09_train_filter_finds_listed_train(driver, base_url):
    """Typing a listed train's number into the filter must keep that train visible."""
    driver.get(base_url + "/trains?from=Mumbai&to=Delhi")
    first_number = driver.find_element(By.CSS_SELECTOR, "tbody tr td").text
    driver.find_element(By.CSS_SELECTOR, "input[placeholder*='Train Number']").send_keys(first_number)
    time.sleep(0.5)
    body = driver.find_element(By.TAG_NAME, "tbody").text
    assert first_number in body, f"Train {first_number} vanished after filtering"


def test_V1_D10_train_schedule_is_stable(driver, base_url):
    """The same route must list the same trains on reload (schedules are not random)."""
    driver.get(base_url + "/trains?from=Mumbai&to=Delhi")
    first = [td.text for td in driver.find_elements(By.CSS_SELECTOR, "tbody tr td:first-child")]
    driver.refresh()
    second = [td.text for td in driver.find_elements(By.CSS_SELECTOR, "tbody tr td:first-child")]
    assert first == second, f"Train numbers changed on reload: {first} -> {second}"


def test_V1_D11_train_list_offers_booking(driver, base_url):
    """Each listed train must offer a Book action (README: 'Ticket Booking')."""
    driver.get(base_url + "/trains?from=Mumbai&to=Delhi")
    book_buttons = driver.find_elements(By.XPATH, "//tbody//*[self::button or self::a][contains(., 'Book')]")
    assert book_buttons, "No way to book a train from the results list"


# ------------------------------------------------------------ Navigation
def test_V1_D12_my_bookings_page_renders(driver, base_url):
    """Header link 'My Bookings' must open a page (not a blank screen)."""
    driver.get(base_url + "/")
    driver.find_element(By.XPATH, "//header//a[normalize-space()='My Bookings']").click()
    time.sleep(0.5)
    main_text = driver.find_element(By.TAG_NAME, "main").text.strip()
    assert main_text, "My Bookings renders an empty page (route not defined)"


def test_V1_D13_unknown_route_shows_404(driver, base_url):
    """Unknown URLs (e.g. footer 'About Us' -> /about) must show a 'not found' page."""
    driver.get(base_url + "/about")
    main_text = driver.find_element(By.TAG_NAME, "main").text.strip().lower()
    assert "not found" in main_text, "Blank page for unknown route /about"


def test_V1_D14_login_available(driver, base_url):
    """README advertises 'User Authentication' - a Login entry point must exist."""
    driver.get(base_url + "/")
    links = driver.find_elements(By.XPATH, "//header//*[self::a or self::button][contains(translate(., 'LOGIN', 'login'), 'login')]")
    assert links, "No Login / Register option anywhere in the header"


def test_V1_D15_page_title_identifies_application(driver, base_url):
    """Browser tab title must name the application."""
    driver.get(base_url + "/")
    assert "vite" not in driver.title.lower(), f"Default scaffold title left in place: '{driver.title}'"


# ------------------------------------------------------------ Layout / footer
def test_V1_D16_no_horizontal_scrolling(driver, base_url):
    """Pages must fit the window (no horizontal scrollbar) at desktop and phone widths.
    Measured as documentElement.scrollWidth vs clientWidth (clientWidth excludes the vertical scrollbar)."""
    overflow = {}
    for width, height in ((1366, 900), (390, 844)):
        driver.set_window_size(width, height)
        for path in ("/", "/trains"):
            driver.get(base_url + path)
            time.sleep(0.8)
            px = driver.execute_script("return document.documentElement.scrollWidth - document.documentElement.clientWidth")
            if px > 0:
                overflow[f"{path} @{width}px"] = px
    assert not overflow, f"Horizontal overflow (px): {overflow}"


def test_V1_D17_footer_policy_links_open_pages(driver, base_url):
    """Footer links Privacy Policy / Terms of Service / Refund Policy must open real pages."""
    blank = []
    for label in ("Privacy Policy", "Terms of Service", "Refund Policy"):
        driver.get(base_url + "/")
        link = driver.find_element(By.XPATH, f"//footer//a[normalize-space()='{label}']")
        driver.execute_script("arguments[0].click();", link)
        time.sleep(0.4)
        if not driver.find_element(By.TAG_NAME, "main").text.strip():
            blank.append(label)
    assert not blank, f"Footer links open blank pages: {blank}"
