"""
E2E - PNR enquiry, cancellation, refund and waiting-list promotion.
Test cases: TC_E2E_19 … TC_E2E_22
"""
import time

from flows import COUPLE, book_ticket, iso, login_demo
from pages import MyBookingsPage, PnrPage, TicketPage
from conftest import DOWNLOAD_DIR


def test_TC_E2E_19_pnr_enquiry(driver, base_url, today, shot):
    """Regression D06/D07/D08: invalid -> validation; unknown -> not found; booked -> same result every time."""
    pnr_page = PnrPage(driver, base_url).open()
    pnr_page.query("12345")
    assert pnr_page.error() == "PNR must be exactly 10 digits"
    pnr_page.query("0000000000")
    assert pnr_page.error() == "PNR not found"
    shot("not_found")

    login_demo(driver, base_url)
    pnr = book_ticket(driver, base_url, date=iso(today, 20)).pnr()
    pnr_page.open()
    for _ in range(3):
        pnr_page.query(pnr)
        assert pnr_page.text("pnr-train") == "12951 - Mumbai Rajdhani Express"
        assert pnr_page.text("pnr-status") == "Confirmed"
        assert pnr_page.el("pnr-status").get_attribute("data-status") == "CNF"
        assert [pnr_page.text(f"pnr-passenger-{i}") for i in range(2)] == ["H1/1", "H1/2"]
    shot("found")


def test_TC_E2E_20_cancel_refund_and_promotion(driver, base_url, today, shot):
    """Cancelling the CNF ticket refunds (flat charge, >48 h) and promotes the RAC ticket to CNF."""
    login_demo(driver, base_url)
    date = iso(today, 20)
    first = book_ticket(driver, base_url, date=date, passengers=COUPLE)
    cnf_pnr = first.pnr()
    rac_pnr = book_ticket(driver, base_url, date=date, passengers=COUPLE).pnr()

    ticket = TicketPage(driver, base_url).open(f"/ticket/{cnf_pnr}")
    total = ticket.total()  # ₹10,482 = 2 x 5231 + 20
    assert total == "₹10,482"
    ticket.start_cancel()
    assert ticket.refund_preview() == "₹9,982"  # 10,462 refundable - 2 x ₹240
    shot("refund_preview")
    ticket.confirm_cancel()
    assert ticket.refund_amount() == "₹9,982"
    assert ticket.status() == "Cancelled"
    assert rac_pnr in ticket.text("promoted-info")
    shot("cancelled")

    bookings = MyBookingsPage(driver, base_url).open()
    assert bookings.status_of(rac_pnr) == "Confirmed"
    assert bookings.status_of(cnf_pnr) == "Cancelled"


def test_TC_E2E_21_keep_ticket_leaves_it_unchanged(driver, base_url, today):
    """Opening the cancel dialog and choosing 'Keep ticket' does not cancel."""
    login_demo(driver, base_url)
    ticket = book_ticket(driver, base_url, date=iso(today, 20))
    ticket.start_cancel()
    ticket.click("abort-cancel")
    assert ticket.status() == "Confirmed"
    assert ticket.exists("cancel-ticket")


def test_TC_E2E_22_download_eticket_pdf(driver, base_url, today):
    """The e-ticket downloads as a PDF named after the PNR."""
    for f in DOWNLOAD_DIR.glob("*.pdf"):
        f.unlink()
    login_demo(driver, base_url)
    ticket = book_ticket(driver, base_url, date=iso(today, 20))
    pnr = ticket.pnr()
    ticket.click("download-ticket")
    target = DOWNLOAD_DIR / f"RailReserve-{pnr}.pdf"
    for _ in range(40):
        if target.exists() and target.stat().st_size > 0:
            break
        time.sleep(0.25)
    assert target.exists(), "PDF was not downloaded"
    assert target.read_bytes()[:4] == b"%PDF"
