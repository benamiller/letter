import { test, expect } from '@playwright/test'

// Full auth+letter flow requires a live Supabase instance with a real test user
// and seeded letter data, so we only test what works in CI here.

test('unauthenticated user is redirected to login', async ({ page }) => {
  await page.goto('/')
  // Client-side auth guard redirects via onAuthStateChange; allow time for it
  await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
})

test('login page renders email input and submit button', async ({ page }) => {
  await page.goto('/login')
  await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible()
  await expect(page.locator('button[type="submit"]')).toBeVisible()
})
