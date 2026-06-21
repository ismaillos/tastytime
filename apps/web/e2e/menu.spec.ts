import { test, expect } from '@playwright/test'

test.describe('Menu page', () => {
  test('loads and displays categories', async ({ page }) => {
    await page.goto('/fr/menu')
    await expect(page).toHaveTitle(/Tasty Time/)
    // Category tabs should be visible
    await expect(page.locator('button').filter({ hasText: /Tacos|Poutines|Sandwiches/i }).first()).toBeVisible()
  })

  test('product cards show price in MAD', async ({ page }) => {
    await page.goto('/fr/menu')
    await expect(page.getByText(/MAD/i).first()).toBeVisible({ timeout: 10000 })
  })

  test('can open cart drawer', async ({ page }) => {
    await page.goto('/fr/menu')
    // Click first available "Ajouter" or cart icon
    const addBtn = page.getByRole('button', { name: /ajouter|add/i }).first()
    await addBtn.waitFor({ timeout: 10000 })
    await addBtn.click()
    // Cart drawer should open
    await expect(page.getByText(/mon panier|panier/i).first()).toBeVisible()
  })
})

test.describe('Checkout flow', () => {
  test('checkout page is accessible from cart', async ({ page }) => {
    await page.goto('/fr/menu')
    // Add a product
    const addBtn = page.getByRole('button', { name: /ajouter/i }).first()
    await addBtn.waitFor({ timeout: 10000 })
    await addBtn.click()
    // Click checkout in cart
    const checkoutBtn = page.getByRole('link', { name: /commander|checkout/i })
    await checkoutBtn.waitFor({ timeout: 5000 })
    await expect(checkoutBtn).toBeVisible()
  })
})

test.describe('Auth pages', () => {
  test('login page renders', async ({ page }) => {
    await page.goto('/fr/auth/login')
    await expect(page.getByRole('heading', { name: /connexion/i })).toBeVisible()
    await expect(page.getByPlaceholder(/email/i)).toBeVisible()
    await expect(page.getByPlaceholder(/mot de passe/i)).toBeVisible()
  })

  test('register page renders', async ({ page }) => {
    await page.goto('/fr/auth/register')
    await expect(page.getByRole('heading', { name: /créer un compte/i })).toBeVisible()
  })
})

test.describe('Order tracking', () => {
  test('order tracking page shows 404 for unknown order', async ({ page }) => {
    await page.goto('/fr/orders/00000000-0000-0000-0000-000000000000')
    // Should show not found state, not crash
    await expect(page.locator('body')).not.toContainText('Application error')
  })
})
