"""Reusable multi-page user journeys built from the page objects."""
import datetime as dt

from pages import BookingPage, LoginPage, PaymentPage, ResultsPage, TicketPage
from pages.pages import Passenger

DEMO_USER = ("demo", "Demo@123")
FAMILY = [Passenger("Asha Rao", "62", "F"), Passenger("Ravi Rao", "4", "M"), Passenger("Kiran Rao", "35", "M")]
COUPLE = [Passenger("Meera Iyer", "30", "F"), Passenger("Arjun Iyer", "33", "M")]


def iso(day: dt.date, offset: int = 0) -> str:
    return (day + dt.timedelta(days=offset)).isoformat()


def next_weekday(day: dt.date, weekday: int) -> dt.date:
    """Next date after `day` that falls on `weekday` (Mon=0 … Sun=6)."""
    ahead = (weekday - day.weekday()) % 7 or 7
    return day + dt.timedelta(days=ahead)


def login_demo(driver, base_url):
    LoginPage(driver, base_url).open().login(*DEMO_USER).wait_for_path("/bookings")


def open_booking(driver, base_url, train: str, frm: str, to: str, date: str, cls: str, quota: str = "GN") -> BookingPage:
    """Search -> select class -> Book Now (user must already be logged in)."""
    results = ResultsPage(driver, base_url).open_search(frm, to, date, quota)
    results.book(train, cls)
    return BookingPage(driver, base_url).wait_for_path(f"/book/{train}")


def book_ticket(driver, base_url, *, train="12951", frm="MMCT", to="NDLS", date: str, cls="1A",
                quota="GN", passengers=COUPLE, upi="tester@okbank") -> TicketPage:
    """Complete booking journey ending on the e-ticket page."""
    booking = open_booking(driver, base_url, train, frm, to, date, cls, quota)
    booking.fill_passengers(passengers).proceed()
    PaymentPage(driver, base_url).wait_for_path("/payment").pay_upi(upi)
    return TicketPage(driver, base_url).wait_for_path("/ticket/")
