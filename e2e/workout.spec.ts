import { test, expect } from '@playwright/test';

test.describe('Workout Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[placeholder*="E-Mail"]', 'admin@functional-wiehl.de');
    await page.fill('input[placeholder*="Passwort"]', 'admin123');
    await page.click('text=Anmelden');
    await page.waitForURL(/\/(tabs|trainer-tabs|admin-tabs)/, { timeout: 10000 });
  });

  test('should show workout tab', async ({ page }) => {
    // Navigate to workout tab
    await page.click('text=Workout');
    await expect(page.locator('text=Neues Workout')).toBeVisible({ timeout: 5000 });
  });

  test('should start a workout', async ({ page }) => {
    await page.click('text=Workout');

    // Click on starting a workout (quick start or from routine)
    const quickStart = page.locator('text=Leeres Workout starten');
    if (await quickStart.isVisible()) {
      await quickStart.click();
      await expect(page.locator('text=Aktives Workout')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should show exercises list', async ({ page }) => {
    // Navigate to exercises tab
    await page.click('text=Übungen');
    await expect(page.locator('text=Brust')).toBeVisible({ timeout: 5000 });
  });

  test('should show stats tab', async ({ page }) => {
    await page.click('text=Statistiken');
    await expect(page.locator('text=Übersicht')).toBeVisible({ timeout: 5000 });
  });
});
