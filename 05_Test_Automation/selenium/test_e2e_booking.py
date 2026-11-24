"""
E2E - Passenger details, payment and seat allocation.
Test cases: TC_E2E_13 … TC_E2E_18
"""
from flows import COUPLE, FAMILY, book_ticket, iso, login_demo, open_booking
from pages import PaymentPage, ResultsPage, TicketPage
from pages.pages import Passenger


def test_TC_E2E_13_passenger_and_contact_validation(driver, base_url, today, shot):
    """EP/BVA through the UI: empty name, age 0, missing gender, invalid mobile."""
    login_demo(driver, base_url)
    booking = open_booking(driver, base_url, "12951", "MMCT", "NDLS", iso(today, 10), "3A")
    booking.fill_passenger(0, Passenger("", "0", ""))
    booking.set_contact("12345", "demo@railreserve.test")
    booking.proceed()
    assert booking.passenger_error(0, "name") == "Passenger name is required"
    assert booking.passenger_error(0, "age") == "Age must be between 1 and 120"
    assert booking.passenger_error(0, "gender") == "Please select a gender"
    assert booking.text("contact-error-mobile") == "Enter a valid 10-digit Indian mobile number"
    assert booking.url_path.startswith("/book/12951")
    shot("errors")


def test_TC_E2E_14_maximum_six_passengers(driver, base_url, today):
    """Regression D05 (BVA): 6 passengers allowed, the 7th cannot be added."""
    login_demo(driver, base_url)
    booking = open_booking(driver, base_url, "12951", "MMCT", "NDLS", iso(today, 10), "3A")
    for _ in range(5):
        booking.click("add-passenger")
    assert booking.text("passenger-count") == "6 of 6 passengers"
    assert not booking.el("add-passenger").is_enabled()
    assert len(booking.els("passenger-name-")) == 6


def test_TC_E2E_15_family_booking_confirmed_with_concessions(driver, base_url, today, shot):
    """Full journey: search -> login -> passengers -> UPI -> e-ticket, with fare and berths verified."""
    login_demo(driver, base_url)
    booking = open_booking(driver, base_url, "12951", "MMCT", "NDLS", iso(today, 10), "1A")
    booking.fill_passengers(FAMILY)
    assert booking.fare_total() == "₹7,867"
    shot("passengers")
    booking.proceed()
    payment = PaymentPage(driver, base_url).wait_for_path("/payment")
    assert payment.text("payment-total") == "₹7,867"
    payment.pay_upi("asha.rao@okbank")
    ticket = TicketPage(driver, base_url).wait_for_path("/ticket/")
    assert ticket.pnr().isdigit() and len(ticket.pnr()) == 10
    assert ticket.status() == "Confirmed"
    assert ticket.berths() == ["H1/1", "No berth", "H1/2"]
    assert ticket.text("passenger-concession-0") == "Senior citizen (F 58+) - 50%"
    assert ticket.total() == "₹7,867"
    assert "Booking successful" in ticket.text("booking-success")
    shot("ticket")


def test_TC_E2E_16_payment_validation(driver, base_url, today, shot):
    """Invalid UPI and a card failing the Luhn check are rejected; a valid card succeeds."""
    login_demo(driver, base_url)
    booking = open_booking(driver, base_url, "12229", "LKO", "NDLS", iso(today, 15), "SL")
    booking.fill_passengers([Passenger("Vikram Singh", "45", "M")]).proceed()
    payment = PaymentPage(driver, base_url).wait_for_path("/payment")
    payment.pay_upi("vikram")
    assert payment.error("pay-error-upi") == "Enter a valid UPI ID (e.g. name@bank)"
    payment.pay_card("4111 1111 1111 1112", "12/30", "123")
    assert payment.error("pay-error-card") == "Enter a valid 16-digit card number"
    shot("card_rejected")
    payment.pay_card("4111 1111 1111 1111", "12/30", "123")
    ticket = TicketPage(driver, base_url).wait_for_path("/ticket/")
    assert ticket.status() == "Confirmed"
    assert "CARD-XXXX-1111" in driver.page_source


def test_TC_E2E_17_allocation_cnf_rac_wl_regret(driver, base_url, today, shot):
    """12951 1A has 2 berths / 2 RAC / 2 WL: successive 2-passenger bookings move through every status."""
    login_demo(driver, base_url)
    date = iso(today, 12)
    results = ResultsPage(driver, base_url)
    statuses = []
    for expected_label in ("AVAILABLE 2", "RAC 1", "WL 1"):
        results.open_search("MMCT", "NDLS", date)
        assert results.availability("12951", "1A") == expected_label
        statuses.append(book_ticket(driver, base_url, date=date, passengers=COUPLE).status())
    assert statuses == ["Confirmed", "RAC", "Waitlisted"]
    results.open_search("MMCT", "NDLS", date)
    results.click("class-option-12951-1A")
    assert results.availability("12951", "1A") == "REGRET"
    assert not results.book_enabled("12951")
    shot("regret")


def test_TC_E2E_18_group_too_large_rejected_before_payment(driver, base_url, today, shot):
    """
    3 adults cannot fit any 1A pool on 12951 (2/2/2) - the user must be told on the
    passenger page, not after entering payment details. (Found in v2.0 -> DEF-V2-03.)
    """
    login_demo(driver, base_url)
    booking = open_booking(driver, base_url, "12951", "MMCT", "NDLS", iso(today, 14), "1A")
    booking.fill_passengers([Passenger("Anil Kumar", "40", "M"), Passenger("Sunita Kumar", "38", "F"),
                             Passenger("Rahul Kumar", "18", "M")])
    booking.proceed()
    shot("after_continue")
    assert booking.url_path.startswith("/book/12951"), "User was sent to payment for a booking that cannot succeed"
    assert "No seats available" in (booking.form_error() or "")
