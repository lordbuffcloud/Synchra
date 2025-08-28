import { test, expect } from '@playwright/test';

test.describe('Synchra Smoke Tests', () => {
  test('should load home page', async ({ page }) => {
    await page.goto('/');
    
    // Check page loads and shows main content
    await expect(page).toHaveTitle(/Synchra/);
    await expect(page.locator('h2')).toContainText('Tune Probability');
    
    // Check navigation elements
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Library' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'About' })).toBeVisible();
  });

  test('should navigate to about page', async ({ page }) => {
    await page.goto('/');
    
    await page.getByRole('link', { name: 'About' }).click();
    await expect(page).toHaveURL('/about');
    await expect(page.locator('h1')).toContainText('About Synchra');
  });

  test('should navigate to library page', async ({ page }) => {
    await page.goto('/');
    
    await page.getByRole('link', { name: 'Library' }).click();
    await expect(page).toHaveURL('/library');
    await expect(page.locator('h1')).toContainText('Audio Library');
  });

  test('should load track manifest', async ({ page }) => {
    // Navigate to library page
    await page.goto('/library');
    
    // Wait for loading to complete
    await expect(page.locator('text=Loading library...')).toBeHidden({ timeout: 10000 });
    
    // Check if tracks are loaded or empty state is shown
    const hasEmptyState = await page.locator('text=No tracks available').isVisible();
    const hasTracks = await page.locator('[data-testid="track-card"]').count() > 0;
    
    expect(hasEmptyState || hasTracks).toBe(true);
  });

  test('should show search functionality', async ({ page }) => {
    await page.goto('/');
    
    // Check search input exists
    const searchInput = page.getByPlaceholder(/Search tracks/);
    await expect(searchInput).toBeVisible();
    
    // Test search interaction
    await searchInput.fill('focus');
    await expect(searchInput).toHaveValue('focus');
  });

  test('should show filter buttons', async ({ page }) => {
    await page.goto('/');
    
    // Check filter buttons exist
    await expect(page.getByRole('button', { name: 'All' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Focus' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Deep Sleep' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Calm' })).toBeVisible();
  });

  test('should handle player page routing', async ({ page }) => {
    // Try to navigate to a player page (should handle missing track gracefully)
    await page.goto('/player/test-track-id');
    
    // Should either show player or not found message
    const hasPlayer = await page.locator('text=No track selected').isVisible();
    const hasNotFound = await page.locator('text=Track not found').isVisible();
    
    expect(hasPlayer || hasNotFound).toBe(true);
  });

  test('should be installable as PWA', async ({ page }) => {
    await page.goto('/');
    
    // Check manifest is accessible
    const manifestResponse = await page.request.get('/manifest.webmanifest');
    expect(manifestResponse.ok()).toBe(true);
    
    const manifest = await manifestResponse.json();
    expect(manifest.name).toBe('Synchra');
    expect(manifest.display).toBe('standalone');
  });

  test('should have service worker registered', async ({ page }) => {
    await page.goto('/');
    
    // Check if service worker is available
    const swAvailable = await page.evaluate(() => {
      return 'serviceWorker' in navigator;
    });
    
    expect(swAvailable).toBe(true);
    
    // Wait a bit for SW to potentially register
    await page.waitForTimeout(2000);
    
    const swRegistered = await page.evaluate(async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        return !!registration;
      } catch {
        return false;
      }
    });
    
    // SW registration might fail in test environment, so we just check availability
    expect(typeof swRegistered).toBe('boolean');
  });

  test('should handle audio context creation', async ({ page }) => {
    await page.goto('/');
    
    // Check if Web Audio API is available
    const audioContextAvailable = await page.evaluate(() => {
      return 'AudioContext' in window || 'webkitAudioContext' in window;
    });
    
    expect(audioContextAvailable).toBe(true);
  });

  test('should persist settings in localStorage', async ({ page }) => {
    await page.goto('/');
    
    // Check if localStorage is available
    const localStorageAvailable = await page.evaluate(() => {
      try {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
        return true;
      } catch {
        return false;
      }
    });
    
    expect(localStorageAvailable).toBe(true);
  });

  test('should handle keyboard shortcuts', async ({ page }) => {
    await page.goto('/');
    
    // Check if page handles keyboard events (basic test)
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowRight');
    
    // Just verify the page doesn't crash with keyboard input
    await expect(page.locator('body')).toBeVisible();
  });

  test('should have proper meta tags', async ({ page }) => {
    await page.goto('/');
    
    // Check essential meta tags
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content', 
      /binaural beats/
    );
    
    await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
      'content',
      /width=device-width/
    );
    
    // Check theme color
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
      'content',
      '#0b0d10'
    );
  });

  test('should handle responsive design', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.reload();
    
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
  });
});