"""Page Object Model for RailReserve - one class per page, tests never touch raw locators."""
from .base_page import BasePage
from .pages import (
    BookingPage,
    HomePage,
    LoginPage,
    MyBookingsPage,
    PaymentPage,
    PnrPage,
    RegisterPage,
    ResultsPage,
    TicketPage,
)

__all__ = [
    "BasePage",
    "BookingPage",
    "HomePage",
    "LoginPage",
    "MyBookingsPage",
    "PaymentPage",
    "PnrPage",
    "RegisterPage",
    "ResultsPage",
    "TicketPage",
]
