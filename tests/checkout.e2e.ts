import { test, expect } from '@playwright/test';

/**
 * Public smoke tests — must not depend on Supabase auth or seeded data so they
 * remain stable in CI. They verify the SPA boots, the splash/login routes are
 * reachable, and the document title is correct.
 */
test.describe('App smoke', () => {
  test('boots the SPA and shows the correct document title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/BloodLyn/i);
    // Root mounts something — confirm we have a non-empty body.
    await expect(page.locator('#root')).not.toBeEmpty();
  });

  test('login route renders without crashing', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/BloodLyn/i);
    await expect(page.locator('#root')).not.toBeEmpty();
  });
});
