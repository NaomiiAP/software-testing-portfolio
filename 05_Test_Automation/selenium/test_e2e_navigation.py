"""
E2E - Navigation, routing, branding and responsive layout.
Test cases: TC_E2E_23 … TC_E2E_26
"""
from flows import book_ticket, iso, login_demo
from pages import BasePage, MyBookingsPage


def test_TC_E2E_23_unknown_route_and_footer_pages(driver, base_url, shot):
    """Regression D13/D17/D04: unknown URLs show 'not found'; footer links reach real pages;
    the old /book page (dead 'Get Tickets' button in v1.0) now leads to the working search form."""
    page = BasePage(driver, base_url).open("/no-such-page")
    assert "not found" in page.text("not-found")
    shot("404")
    page.open("/book")
    page.el("search-form")
    assert page.url_path == "/"
    page.open("/")
    page.click("footer-about")
    assert "irctc-clone" in page.text("about-text")
    page.click("footer-refund")
    assert "More than 48 hours" in page.text("refund-rules")


def test_TC_E2E_24_my_bookings_lists_user_tickets(driver, base_url, today, shot):
    """Regression D12: My Bookings is a real page - empty state first, then the new ticket."""
    login_demo(driver, base_url)
    page = MyBookingsPage(driver, base_url).open()
    assert "no bookings yet" in page.text("no-bookings")
    pnr = book_ticket(driver, base_url, date=iso(today, 30)).pnr()
    page.open()
    assert page.pnrs() == [pnr]
    assert page.status_of(pnr) == "Confirmed"
    shot("list")


def test_TC_E2E_25_title_and_branding(driver, base_url):
    """Regression D15: the browser title names the application."""
    assert driver.title == "RailReserve | Railway Reservation System"
    assert "RailReserve" in BasePage(driver, base_url).text("brand")


def test_TC_E2E_26_no_horizontal_scroll_and_mobile_menu(driver, base_url, shot):
    """Regression D16: no horizontal scrolling at desktop or phone width; the mobile menu works."""
    page = BasePage(driver, base_url)
    overflow = {}
    for width, height in ((1366, 900), (390, 844)):
        driver.set_window_size(width, height)
        for path in ("/", "/trains"):
            page.open(path)
            page.el("brand")
            px = driver.execute_script("return document.documentElement.scrollWidth - document.documentElement.clientWidth")
            if px > 0:
                overflow[f"{path} @{width}px"] = px
    assert not overflow, f"Horizontal overflow (px): {overflow}"
    page.open("/")
    page.click("menu-toggle")
    links = [a.text for a in driver.find_elements("css selector", "header nav a, header .md\\:hidden a")]
    assert "PNR Status" in " ".join(links)
    shot("mobile_menu")
