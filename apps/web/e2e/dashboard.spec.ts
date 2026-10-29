import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const API_URL = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:3001/api/v1';

test('dashboard stays responsive and opens a payment detail sheet', async ({ page, request }) => {
  const productsResponse = await request.get(`${API_URL}/products`);
  expect(productsResponse.ok()).toBeTruthy();
  const products = (await productsResponse.json()) as Array<{ id: string; currency: string }>;
  const product = products.find((item) => item.currency === 'EUR');
  expect(product).toBeDefined();

  const createResponse = await request.post(`${API_URL}/payments`, {
    headers: { 'x-demo-key': 'demo_sk_local' },
    data: {
      productId: product?.id,
      quantity: 1,
      provider: 'mock',
      method: 'card',
      customer: { name: 'Dashboard Test', email: 'dashboard@example.com' },
    },
  });
  expect(createResponse.ok()).toBeTruthy();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/fr/dashboard');
  await expect(page.getByRole('heading', { name: 'Transactions et webhooks.' })).toBeVisible();

  const overflow = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(overflow.scroll).toBeLessThanOrEqual(overflow.client);

  await page.locator('ul li button').first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText('Chronologie des événements')).toBeVisible();
  await page.getByRole('button', { name: 'Fermer' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
