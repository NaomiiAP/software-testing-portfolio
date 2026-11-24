"""Page objects for every RailReserve screen used by the E2E tests."""
from dataclasses import dataclass

from .base_page import BasePage


@dataclass
class Passenger:
    name: str
    age: str
    gender: str  # 'M' | 'F' | 'T' | ''


class HomePage(BasePage):
    path = "/"

    def pick_station(self, test_id: str, code: str):
        """Station autocomplete: focus, type the code, choose the matching suggestion."""
        self.click(test_id)
        self.type(test_id, code)
        self.click(f"{test_id}-option-{code}")

    def search(self, frm: str, to: str, date: str, quota: str = "GN", travel_class: str = ""):
        if frm:
            self.pick_station("from-station", frm)
        if to:
            self.pick_station("to-station", to)
        self.set_value("journey-date", date)
        self.click(f"quota-{quota}")
        if travel_class:
            self.click(f"travel-class-{travel_class}")
        self.click("search-btn")
        return self

    def error(self) -> str:
        return self.text("search-error")


class ResultsPage(BasePage):
    path = "/trains"

    def open_search(self, frm: str, to: str, date: str, quota: str = "GN"):
        return self.open(f"/trains?from={frm}&to={to}&date={date}&quota={quota}")

    def train_numbers(self) -> list[str]:
        self.wait_any("results-list", "no-trains", "search-error")
        return [c.get_attribute("data-testid").removeprefix("train-card-") for c in self.els("train-card-")]

    def availability(self, train: str, cls: str) -> str:
        return self.text(f"availability-{train}-{cls}")

    def fare(self, train: str, cls: str) -> str:
        return self.text(f"fare-{train}-{cls}")

    def departure(self, train: str) -> str:
        return self.text(f"departure-{train}")

    def book(self, train: str, cls: str):
        self.click(f"class-option-{train}-{cls}")
        self.click(f"book-btn-{train}")
        return self

    def book_enabled(self, train: str) -> bool:
        return self.el(f"book-btn-{train}").is_enabled()

    # All-trains timetable
    def filter_trains(self, text: str):
        self.type("trains-filter", text)
        return self

    def timetable_rows(self) -> list[str]:
        self.wait_any("trains-table")
        return [r.get_attribute("data-testid").removeprefix("train-row-") for r in self.els("train-row-")]


class LoginPage(BasePage):
    path = "/login"

    def login(self, username: str, password: str):
        self.type("login-username", username)
        self.type("login-password", password)
        self.click("login-submit")
        return self

    def error(self) -> str:
        return self.text("login-error")


class RegisterPage(BasePage):
    path = "/register"
    FIELDS = ("fullName", "username", "email", "mobile", "password", "confirm")

    def register(self, **values: str):
        for f in self.FIELDS:
            self.type(f"reg-{f}", values.get(f, ""))
        self.click("reg-submit")
        return self

    def field_error(self, field: str) -> str | None:
        return self.text(f"reg-error-{field}") if self.exists(f"reg-error-{field}", 0.5) else None


class BookingPage(BasePage):
    def fill_passenger(self, index: int, p: Passenger):
        self.type(f"passenger-name-{index}", p.name)
        self.type(f"passenger-age-{index}", p.age)
        if p.gender:
            self.select(f"passenger-gender-{index}", p.gender)

    def fill_passengers(self, passengers: list[Passenger]):
        for i, p in enumerate(passengers):
            if i > 0:
                self.click("add-passenger")
            self.fill_passenger(i, p)
        return self

    def set_contact(self, mobile: str, email: str):
        self.type("contact-mobile", mobile)
        self.type("contact-email", email)

    def proceed(self):
        self.click("proceed-payment")
        return self

    def passenger_error(self, index: int, field: str) -> str | None:
        tid = f"passenger-error-{index}-{field}"
        return self.text(tid) if self.exists(tid, 0.5) else None

    def form_error(self) -> str | None:
        return self.text("booking-error") if self.exists("booking-error", 0.8) else None

    def fare_total(self) -> str:
        return self.text("fare-total")


class PaymentPage(BasePage):
    path = "/payment"

    def pay_upi(self, upi: str):
        self.click("pay-method-upi")
        self.type("upi-id", upi)
        self.click("pay-btn")
        return self

    def pay_card(self, number: str, expiry: str, cvv: str):
        self.click("pay-method-card")
        self.type("card-number", number)
        self.type("card-expiry", expiry)
        self.type("card-cvv", cvv)
        self.click("pay-btn")
        return self

    def error(self, test_id: str = "pay-error") -> str | None:
        return self.text(test_id) if self.exists(test_id, 0.8) else None


class TicketPage(BasePage):
    def pnr(self) -> str:
        return self.text("ticket-pnr")

    def status(self) -> str:
        return self.text("ticket-status")

    def berths(self) -> list[str]:
        self.wait_any("passenger-berth-0")
        return [e.text for e in self.els("passenger-berth-")]

    def total(self) -> str:
        return self.text("ticket-total")

    def start_cancel(self):
        self.click("cancel-ticket")
        return self

    def refund_preview(self) -> str:
        return self.text("refund-preview-amount")

    def confirm_cancel(self):
        self.click("confirm-cancel")
        return self

    def refund_amount(self) -> str:
        return self.text("refund-amount")


class PnrPage(BasePage):
    path = "/pnr-status"

    def query(self, pnr: str):
        self.type("pnr-input", pnr)
        self.click("pnr-submit")
        return self

    def error(self) -> str | None:
        return self.text("pnr-error") if self.exists("pnr-error", 0.8) else None


class MyBookingsPage(BasePage):
    path = "/bookings"

    def pnrs(self) -> list[str]:
        self.wait_any("bookings-list", "no-bookings")
        return [b.get_attribute("data-testid").removeprefix("booking-") for b in self.els("booking-4")]

    def status_of(self, pnr: str) -> str:
        return self.text(f"booking-status-{pnr}")
