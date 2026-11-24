"""
E2E - Authentication and access control (state transition through the UI).
Test cases: TC_E2E_09 … TC_E2E_12
"""
from flows import DEMO_USER, iso
from pages import BookingPage, LoginPage, MyBookingsPage, RegisterPage, ResultsPage


def test_TC_E2E_09_booking_requires_login_and_returns(driver, base_url, today, shot):
    """Book Now while logged out -> login -> back on the booking page for the same train."""
    results = ResultsPage(driver, base_url).open_search("MMCT", "NDLS", iso(today, 10))
    results.book("12951", "2A")
    login = LoginPage(driver, base_url).wait_for_path("/login?next=")
    shot("redirected_to_login")
    login.login(*DEMO_USER)
    booking = BookingPage(driver, base_url).wait_for_path("/book/12951")
    assert "AC 2 Tier (2A)" in booking.text("journey-summary")
    assert booking.logged_in_user() == "demo"


def test_TC_E2E_10_account_locks_after_three_failures(driver, base_url, shot):
    """State transition S0 -> S1 -> S2 -> LOCKED; correct password is refused while locked."""
    login = LoginPage(driver, base_url).open()
    login.login("demo", "wrong-1")
    assert "2 attempt(s) left" in login.error()
    login.login("demo", "wrong-2")
    assert "1 attempt(s) left" in login.error()
    login.login("demo", "wrong-3")
    assert "Account locked" in login.error()
    login.login("demo", DEMO_USER[1])
    assert "Account locked" in login.error()
    assert login.url_path.startswith("/login")
    shot("locked")


def test_TC_E2E_11_registration_validation_and_new_account(driver, base_url, shot):
    """Regression D14: users can register (EP on each field) and then log in."""
    reg = RegisterPage(driver, base_url).open()
    reg.register(fullName="N", username="1bad", email="bad", mobile="12345", password="weak", confirm="other")
    assert reg.field_error("fullName") == "Name must be 3-40 characters"
    assert reg.field_error("username").startswith("Username must be 4-15 characters")
    assert reg.field_error("email") == "Enter a valid email address"
    assert reg.field_error("mobile") == "Enter a valid 10-digit Indian mobile number"
    assert reg.field_error("password") == "Password must be 8-20 characters"
    assert reg.field_error("confirm") == "Passwords do not match"
    shot("validation_errors")

    reg.register(fullName="Priya Nair", username="demo", email="priya@example.com",
                 mobile="9123456780", password="Priya@2026", confirm="Priya@2026")
    assert reg.field_error("username") == "Username is already taken"

    reg.register(fullName="Priya Nair", username="priya_n", email="priya@example.com",
                 mobile="9123456780", password="Priya@2026", confirm="Priya@2026")
    assert "Account priya_n created" in reg.text("reg-success")
    login = LoginPage(driver, base_url).open()
    login.login("priya_n", "Priya@2026")
    login.wait_for_path("/bookings")
    assert login.logged_in_user() == "priya_n"


def test_TC_E2E_12_logout_protects_my_bookings(driver, base_url):
    """After logout, My Bookings redirects to login again."""
    LoginPage(driver, base_url).open().login(*DEMO_USER).wait_for_path("/bookings")
    page = MyBookingsPage(driver, base_url)
    page.click("nav-logout")
    page.wait_for_path("/")
    assert page.logged_in_user() is None
    page.open()
    page.wait_for_path("/login?next=%2Fbookings")
