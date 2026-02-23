import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test('should show login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('text=Anmelden')).toBeVisible();
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[placeholder*="E-Mail"]', 'invalid@test.de');
    await page.fill('input[placeholder*="Passwort"]', 'wrongpassword');
    await page.click('text=Anmelden');

    // Should show error message
    await expect(page.locator('text=Anmeldedaten')).toBeVisible({ timeout: 5000 });
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[placeholder*="E-Mail"]', 'admin@functional-wiehl.de');
    await page.fill('input[placeholder*="Passwort"]', 'admin123');
    await page.click('text=Anmelden');

    // Should redirect to home/dashboard
    await expect(page).toHaveURL(/\/(tabs|trainer-tabs|admin-tabs)/, { timeout: 10000 });
  });

  test('should have password reset link', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('text=Passwort vergessen')).toBeVisible();
  });
});
