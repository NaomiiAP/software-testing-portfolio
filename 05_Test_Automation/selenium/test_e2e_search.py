"""
E2E - Train search (system-level EP / BVA through the real UI).
Test cases: 02_Test_Case_Design/05_Functional_Test_Cases.md (TC_E2E_01 … TC_E2E_08)
"""
import datetime as dt

from flows import iso, next_weekday
from pages import HomePage, ResultsPage


def test_TC_E2E_01_valid_search_lists_trains(driver, base_url, today, shot):
    """Regression D01: Search Trains must show results."""
    home = HomePage(driver, base_url)
    home.search("MMCT", "NDLS", iso(today, 10))
    results = ResultsPage(driver, base_url).wait_for_path("/trains?")
    assert results.train_numbers() == ["12951"]
    assert results.availability("12951", "3A") == "AVAILABLE 40"
    assert results.fare("12951", "3A") == "₹2,180"  # 2076 base + 104 GST
    shot("results")


def test_TC_E2E_02_same_source_and_destination_rejected(driver, base_url, today):
    """Regression D02 (EP invalid partition: same station)."""
    home = HomePage(driver, base_url)
    home.search("MMCT", "MMCT", iso(today, 10))
    assert home.error() == "Source and destination cannot be the same"
    assert home.url_path == "/"


def test_TC_E2E_03_journey_date_lower_boundary(driver, base_url, today, shot):
    """Regression D03 (BVA): today-1 rejected, today accepted."""
    home = HomePage(driver, base_url)
    home.search("NDLS", "LKO", iso(today, -1))
    assert home.error() == "Journey date cannot be in the past"
    shot("yesterday_rejected")
    home.search("NDLS", "LKO", iso(today, 0))
    ResultsPage(driver, base_url).wait_for_path("/trains?")


def test_TC_E2E_04_journey_date_upper_boundary(driver, base_url, today):
    """BVA: today+121 rejected, today+120 accepted; the picker advertises the same limits."""
    home = HomePage(driver, base_url)
    date_input = home.el("journey-date")
    assert date_input.get_attribute("min") == iso(today, 0)
    assert date_input.get_attribute("max") == iso(today, 120)
    home.search("NDLS", "LKO", iso(today, 121))
    assert home.error() == "Bookings open only 120 days in advance"
    home.search("NDLS", "LKO", iso(today, 120))
    ResultsPage(driver, base_url).wait_for_path("/trains?")


def test_TC_E2E_05_tatkal_only_for_tomorrow(driver, base_url, today):
    """Decision rule: Tatkal quota is valid only when the journey date is tomorrow."""
    home = HomePage(driver, base_url)
    home.search("NDLS", "LKO", iso(today, 5), quota="TQ")
    assert home.error() == "Tatkal tickets can be booked only one day before the journey date"
    home.search("NDLS", "LKO", iso(today, 1), quota="TQ")
    results = ResultsPage(driver, base_url).wait_for_path("/trains?")
    assert results.train_numbers() == ["12230"]


def test_TC_E2E_06_weekly_train_only_on_running_day(driver, base_url, today, shot):
    """Poorna Express (ERS->PUNE) runs on Sundays only."""
    results = ResultsPage(driver, base_url)
    monday = next_weekday(today, 0)
    results.open_search("ERS", "PUNE", monday.isoformat())
    assert "No trains found" in results.text("no-trains")
    shot("monday_no_trains")
    sunday = next_weekday(today, 6)
    results.open_search("ERS", "PUNE", sunday.isoformat())
    assert results.train_numbers() == ["11098"]


def test_TC_E2E_07_timetable_filter_is_stable(driver, base_url, shot):
    """Regression D09/D10: filtering keeps the listed train; data does not change on reload."""
    results = ResultsPage(driver, base_url).open("/trains")
    before = results.timetable_rows()
    assert len(before) == 16
    results.filter_trains("12951")
    assert results.timetable_rows() == ["12951"]
    shot("filtered")
    driver.refresh()
    assert ResultsPage(driver, base_url).timetable_rows() == before


def test_TC_E2E_08_departed_trains_not_bookable_today(driver, base_url, today, shot):
    """
    A train whose departure time today has already passed must not be bookable.
    (Found during exploratory testing of v2.0 -> DEF-V2-02.)
    Route CSMT->PUNE has departures at 06:40 and 20:30.
    """
    results = ResultsPage(driver, base_url).open_search("CSMT", "PUNE", iso(today, 0))
    now = dt.datetime.now().strftime("%H:%M")
    checked = 0
    for train in results.train_numbers():
        if results.departure(train) <= now:
            checked += 1
            assert not results.book_enabled(train), f"Train {train} already left at {results.departure(train)} but is bookable"
            assert "Departed" in results.text(f"train-card-{train}")
    shot("today")
    if checked == 0:
        # Before 06:40 nothing has departed yet - nothing to verify, the test is vacuous today.
        assert now < "06:40"
