import { test, expect } from '@playwright/test';

test.describe('Onboarding Flow', () => {
  test('should show onboarding for new users', async ({ page }) => {
    // Navigate to onboarding page directly
    await page.goto('/onboarding');

    // Step 1: Goal selection
    await expect(page.locator('text=Was ist dein Ziel')).toBeVisible({ timeout: 5000 });
  });

  test('should navigate through onboarding steps', async ({ page }) => {
    await page.goto('/onboarding');

    // Step 1: Select a goal
    await expect(page.locator('text=Was ist dein Ziel')).toBeVisible({ timeout: 5000 });
    const goalOption = page.locator('text=Muskelaufbau').or(page.locator('text=Abnehmen'));
    if (await goalOption.first().isVisible()) {
      await goalOption.first().click();
    }

    // Step 2: Select level
    const nextBtn = page.locator('text=Weiter');
    if (await nextBtn.isVisible({ timeout: 3000 })) {
      await nextBtn.click();
    }

    // Should show level selection
    await expect(
      page.locator('text=Anfänger')
        .or(page.locator('text=Erfahrung'))
    ).toBeVisible({ timeout: 5000 });
  });
});
