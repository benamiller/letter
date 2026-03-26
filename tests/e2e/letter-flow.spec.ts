import { test, expect, type APIRequestContext, type Page } from '@playwright/test'

const TEST_EMAIL = 'ci@letter.test'
const TEST_PASSWORD = 'ci-password-123'

// supabase-js v2 storage key: sb-{hostname.split('.')[0]}-auth-token
function storageKey(supabaseUrl: string): string {
  return `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`
}

async function injectSession(request: APIRequestContext, page: Page) {
  const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!
  const anonKey = process.env.PUBLIC_SUPABASE_ANON_KEY!

  const res = await request.post(
    `${supabaseUrl}/auth/v1/token?grant_type=password`,
    {
      headers: { apikey: anonKey, 'Content-Type': 'application/json' },
      data: { email: TEST_EMAIL, password: TEST_PASSWORD }
    }
  )
  expect(res.ok(), `Auth sign-in failed: ${await res.text()}`).toBeTruthy()
  const session = await res.json()

  const key = storageKey(supabaseUrl)
  await page.addInitScript(({ key, session }) => {
    localStorage.setItem(key, JSON.stringify(session))
  }, { key, session })
}

test('unauthenticated user is redirected to login', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
})

test('login page renders correctly', async ({ page }) => {
  await page.goto('/login')
  await expect(page.locator('input[type="email"]')).toBeVisible()
  await expect(page.locator('button[type="submit"]')).toBeVisible()
})

test('full letter reading flow', async ({ request, page }) => {
  await injectSession(request, page)

  // Authenticated root: letter is shown (no login redirect)
  await page.goto('/')
  await expect(page).toHaveURL('/')
  const letter = page.locator('.letter-container')
  await expect(letter).toBeVisible({ timeout: 10000 })

  // Font — --font-letter is declared in app.css so this works without network
  const fontFamily = await page.locator('.letter-body').evaluate(el => getComputedStyle(el).fontFamily)
  expect(fontFamily).toMatch(/lora/i)

  // Ghost nav appears on mouse move, hides after 2s
  const nav = page.locator('.ghost-nav')
  await page.mouse.move(100, 100)
  await expect(nav).toBeVisible({ timeout: 3000 })
  await page.waitForTimeout(2800) // 2000ms JS timeout + 600ms CSS transition + buffer
  await expect(nav).toBeHidden()

  // Archive shows the seeded letter
  await page.goto('/archive')
  await expect(page).toHaveURL('/archive')
  await expect(page.locator('.archive-item').first()).toBeVisible({ timeout: 5000 })

  // Open the letter detail
  await page.locator('.archive-item').first().click()
  await expect(page.locator('.full-letter, .letter-container')).toBeVisible({ timeout: 5000 })

  // Share page: submit a text entry
  await page.goto('/share')
  await page.fill('textarea', 'Hello Nia, this is a CI test entry.')
  await page.click('button[type="submit"]')
  await expect(page.locator('.done-state')).toBeVisible({ timeout: 5000 })
})
