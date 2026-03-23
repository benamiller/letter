import { test, expect } from '@playwright/test'

test.use({ baseURL: 'http://localhost:5173' })

test('full letter reading flow', async ({ page }) => {
  // 1. Visit root -> login
  await page.goto('/')
  await expect(page).toHaveURL(/\/login/)
  // 2. Perform login
  await page.fill('input[name="email"]', 'test@example.com')
  await page.fill('input[name="password"]', 'password123')
  await page.click('button[type="submit"]')
  // Wait for main letter
  const letter = page.locator('.letter')
  await expect(letter).toBeVisible()
  // 3. Check font and background
  const fontFamily = await letter.evaluate(el => getComputedStyle(el).fontFamily)
  expect(fontFamily).toContain('Lora')
  const bgColor = await letter.evaluate(el => getComputedStyle(el).backgroundColor)
  expect(bgColor).toBe('rgb(13, 12, 11)')
  // 4. Ghost nav appears/hides
  const nav = page.locator('.ghost-nav')
  await expect(nav).toBeHidden()
  await page.mouse.move(100, 100)
  await expect(nav).toBeVisible()
  await page.waitForTimeout(2100)
  await expect(nav).toBeHidden()
  // 5. Archive list
  await page.goto('/archive')
  await expect(page).toHaveURL('/archive')
  const firstItem = page.locator('.archive-item').first()
  await expect(firstItem).toBeVisible()
  // 6. Open a past letter
  await firstItem.click()
  await expect(page.locator('.full-letter')).toBeVisible()
  // 7. Share page form
  await page.goto('/share')
  await page.fill('textarea[name="message"]', 'Hello world')
  await page.click('button[type="submit"]')
  // 8. After submit
  await expect(page.locator('.received-message')).toHaveText('Received')
})
