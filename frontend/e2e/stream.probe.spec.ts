// frontend/e2e/stream.probe.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Streaming E2E (manual probe)", () => {
  test("Run Manual Probe -> toast OR metric table update", async ({
    page,
  }, testInfo) => {
    // Navigate to Dashboard
    await page.goto("/dashboard");

    // Ensure an API is selected (wait for combobox/options)
    const combobox = page.locator('role=combobox[name="Select monitored API"]');
    await expect(combobox).toHaveCount(1); // fail fast if no API selector present

    // Optionally wait for options to populate (avoid "Loading...")
    const options = combobox.locator("role=option");
    const maxWait = 5000;
    const start = Date.now();
    while ((await options.count()) === 0 && Date.now() - start < maxWait) {
      await page.waitForTimeout(200);
    }

    // If nothing selected, fail early
    const selectedOption = combobox.locator("role=option[selected]").first();
    await expect(selectedOption).toBeVisible({ timeout: 3000 });

    // Locate "Run Manual Probe" button and initial table state
    const probeButton = page
      .locator("button", { hasText: "Run Manual Probe" })
      .first();
    await expect(probeButton).toBeVisible();

    // Metrics table selection
    let metricsTable = page
      .locator('h3:has-text("Recent Metrics")')
      .locator("xpath=following::table[1]");
    if (!(await metricsTable.count()))
      metricsTable = page.locator("table").first();
    const initialRowCount = await metricsTable.locator("tr").count();
    const initialTableText = await metricsTable.innerText();

    // Click the probe button (simulate user)
    await probeButton.click();

    // Wait for success signals: toast OR table content contains new timestamp/latency OR row count increase
    const toastLocator = page.locator(
      '.sonner-toast, [role="status"], .toast, .toast-container'
    );
    const timeoutMs = 10000;
    const pollStart = Date.now();
    let toastSeen = false;
    let newRowCount = initialRowCount;
    let tableText = initialTableText;

    while (Date.now() - pollStart < timeoutMs) {
      if ((await toastLocator.count()) > 0) {
        toastSeen = true;
        break;
      }
      newRowCount = await metricsTable.locator("tr").count();
      tableText = await metricsTable.innerText();
      if (newRowCount > initialRowCount) break;
      // optionally check for 'Manual probe' or other text
      if (/Manual probe/i.test(tableText)) break;
      await page.waitForTimeout(300);
    }

    if (toastSeen) {
      await expect(toastLocator.first()).toBeVisible();
    } else if (
      newRowCount > initialRowCount ||
      /Manual probe/i.test(tableText)
    ) {
      // success — test passes
    } else {
      testInfo.attach("manual-probe-debug", {
        body: `initialRows=${initialRowCount} finalRows=${newRowCount} tableText=${tableText.slice(
          0,
          1200
        )}`,
        contentType: "text/plain",
      });
      throw new Error(
        "Manual probe test did not detect a UI update (no toast, no increased rows)."
      );
    }
  });
});
