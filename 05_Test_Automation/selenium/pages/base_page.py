from selenium.common.exceptions import TimeoutException
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.remote.webelement import WebElement
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select, WebDriverWait

# React ignores plain `element.value = x`; use the native setter + input event.
_SET_VALUE_JS = """
const el = arguments[0], v = arguments[1];
const proto = el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
el.dispatchEvent(new Event('input', { bubbles: true }));
el.dispatchEvent(new Event('change', { bubbles: true }));
"""


class BasePage:
    path = "/"

    def __init__(self, driver: WebDriver, base_url: str):
        self.driver = driver
        self.base_url = base_url
        self.wait = WebDriverWait(driver, 8)

    # ------------------------------------------------------------ navigation
    def open(self, path: str | None = None):
        self.driver.get(self.base_url + (path or self.path))
        return self

    @property
    def url_path(self) -> str:
        return self.driver.current_url.replace(self.base_url, "", 1)

    def wait_for_path(self, prefix: str):
        self.wait.until(lambda d: self.url_path.startswith(prefix))
        return self

    # ------------------------------------------------------------ elements
    @staticmethod
    def _css(test_id: str) -> tuple[str, str]:
        return By.CSS_SELECTOR, f"[data-testid='{test_id}']"

    def el(self, test_id: str) -> WebElement:
        return self.wait.until(EC.visibility_of_element_located(self._css(test_id)))

    def els(self, prefix: str) -> list[WebElement]:
        return self.driver.find_elements(By.CSS_SELECTOR, f"[data-testid^='{prefix}']")

    def wait_any(self, *test_ids: str):
        """Explicit wait until at least one of the given elements is in the DOM (page has rendered)."""
        self.wait.until(lambda d: any(d.find_elements(*self._css(t)) for t in test_ids))
        return self

    def exists(self, test_id: str, timeout: float = 1.5) -> bool:
        try:
            WebDriverWait(self.driver, timeout).until(EC.presence_of_element_located(self._css(test_id)))
            return True
        except TimeoutException:
            return False

    def text(self, test_id: str) -> str:
        return self.el(test_id).text.strip()

    def click(self, test_id: str):
        el = self.wait.until(EC.element_to_be_clickable(self._css(test_id)))
        self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", el)
        el.click()

    def type(self, test_id: str, value: str, clear: bool = True):
        el = self.el(test_id)
        if clear:
            # Clear like a user (select all + delete). WebElement.clear() sets the value
            # directly, which React's change tracking ignores - a re-render can then
            # restore the old value (found when the CVV field started re-rendering on focus).
            el.send_keys(Keys.CONTROL, "a")
            el.send_keys(Keys.DELETE)
        el.send_keys(value)

    def select(self, test_id: str, value: str):
        Select(self.el(test_id)).select_by_value(value)

    def set_value(self, test_id: str, value: str):
        """Sets a value the way a user could not (e.g. a date outside min/max) - for negative/boundary tests."""
        self.driver.execute_script(_SET_VALUE_JS, self.el(test_id), value)

    # ------------------------------------------------------------ header
    def logged_in_user(self) -> str | None:
        return self.text("nav-user") if self.exists("nav-user", 0.5) else None
