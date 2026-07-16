import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

async function expectNoWcagViolations(page: import("@playwright/test").Page) {
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(result.violations, result.violations.map(item => `${item.id}: ${item.help}`).join("\n")).toEqual([]);
}

test("login cumple WCAG A y AA automatizable", async ({ page }) => {
  await page.goto("/login");
  await expectNoWcagViolations(page);
});

test("recuperación cumple WCAG A y AA automatizable", async ({ page }) => {
  await page.goto("/recuperar-contrasena?token=axe-test");
  await expectNoWcagViolations(page);
});
