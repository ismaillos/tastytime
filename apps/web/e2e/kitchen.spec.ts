import { test, expect } from '@playwright/test'

test.describe('Kitchen Display (KDS)', () => {
  test('kitchen page renders Kanban columns', async ({ page }) => {
    await page.goto('http://localhost:3001/kitchen')
    await expect(page.getByText('Nouvelles')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('En préparation')).toBeVisible()
    await expect(page.getByText('Prêtes')).toBeVisible()
  })
})

test.describe('Dashboard Orders', () => {
  test('orders page renders status filters', async ({ page }) => {
    await page.goto('http://localhost:3001/orders')
    await expect(page.getByText('Toutes')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('En préparation')).toBeVisible()
  })
})
