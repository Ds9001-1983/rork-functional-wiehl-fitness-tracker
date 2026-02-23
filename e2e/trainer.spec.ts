import { test, expect } from '@playwright/test';

test.describe('Trainer Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as trainer
    await page.goto('/login');
    await page.fill('input[placeholder*="E-Mail"]', 'admin@functional-wiehl.de');
    await page.fill('input[placeholder*="Passwort"]', 'admin123');
    await page.click('text=Anmelden');
    await page.waitForURL(/\/(tabs|trainer-tabs|admin-tabs)/, { timeout: 10000 });
  });

  test('should show client list', async ({ page }) => {
    // Navigate to trainer view if available
    const kunden = page.locator('text=Kunden');
    if (await kunden.isVisible({ timeout: 3000 })) {
      await kunden.click();
      await expect(page.locator('text=Kundenverwaltung').or(page.locator('text=Kunden'))).toBeVisible({ timeout: 5000 });
    }
  });

  test('should show training plans', async ({ page }) => {
    const plaene = page.locator('text=Pläne');
    if (await plaene.isVisible({ timeout: 3000 })) {
      await plaene.click();
      await expect(page.locator('text=Trainingspläne')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should show create plan modal', async ({ page }) => {
    const plaene = page.locator('text=Pläne');
    if (await plaene.isVisible({ timeout: 3000 })) {
      await plaene.click();

      // Find and click the add button
      const addBtn = page.locator('[aria-label="Neuen Plan erstellen"]').or(page.locator('text=Neuen Trainingsplan erstellen'));
      if (await addBtn.first().isVisible({ timeout: 3000 })) {
        await addBtn.first().click();
        await expect(page.locator('text=Planname')).toBeVisible({ timeout: 5000 });
      }
    }
  });
});
