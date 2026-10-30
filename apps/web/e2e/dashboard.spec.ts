import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const API_URL = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:3001/api/v1';

test('dashboard overview, payments and pipeline are separate pages', async ({ page, request }) => {
  test.setTimeout(90_000);

  const productsResponse = await request.get(`${API_URL}/products`);
  expect(productsResponse.ok()).toBeTruthy();
  const products = (await productsResponse.json()) as Array<{ id: string; currency: string }>;
  const product = products.find((item) => item.currency === 'EUR');
  expect(product).toBeDefined();

  const customerName = `Dashboard Test ${Date.now()}`;

  const createResponse = await request.post(`${API_URL}/payments`, {
    headers: { 'x-demo-key': 'demo_sk_local' },
    data: {
      productId: product?.id,
      quantity: 1,
      provider: 'mock',
      method: 'card',
      customer: { name: customerName, email: 'dashboard@example.com' },
    },
  });
  expect(createResponse.ok()).toBeTruthy();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/fr/dashboard');
  await expect(page.getByRole('heading', { name: 'Tableau de bord' })).toBeVisible();
  await expect(page.getByText('Volume traité')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Flux de paiements' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Pipeline webhooks' })).toBeHidden();

  const overviewOverflow = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(overviewOverflow.scroll).toBeLessThanOrEqual(overviewOverflow.client);

  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('link', { name: 'Paiements' }).click();
  await expect(page).toHaveURL(/\/fr\/dashboard\/payments$/);
  await expect(page.getByRole('heading', { name: 'Paiements', level: 1 })).toBeVisible();
  await expect(
    page.getByRole('textbox', { name: 'Rechercher par identifiant de paiement' }),
  ).toBeVisible();
  await expect(
    page.getByRole('textbox', { name: 'Rechercher par nom ou email du client' }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Filtres' }).click();
  await expect(page.getByRole('combobox', { name: 'Filtrer par statut' })).toBeVisible();
  await page.getByRole('button', { name: 'Fermer' }).click();

  await page
    .getByRole('textbox', { name: 'Rechercher par nom ou email du client' })
    .fill(customerName);
  await page.locator('ul li button').filter({ hasText: customerName }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText('Chronologie des événements')).toBeVisible();
  await page.getByRole('button', { name: 'Fermer' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();

  await page.getByRole('button', { name: 'Effacer le client' }).click();
  await page.getByRole('button', { name: 'Plus récents' }).click();
  await page.getByRole('menuitemradio', { name: 'Plus anciens' }).click();

  for (let index = 0; index < 10; index += 1) {
    const seedResponse = await request.post(`${API_URL}/payments`, {
      headers: { 'x-demo-key': 'demo_sk_local' },
      data: {
        productId: product?.id,
        quantity: 1,
        provider: 'mock',
        method: 'card',
        customer: {
          name: `Pagination Seed ${index}`,
          email: `pagination-${index}@example.com`,
        },
      },
    });
    expect(seedResponse.ok()).toBeTruthy();
  }

  await page.reload();
  const pagination = page.getByRole('navigation', { name: /Pagination/ });
  await expect(pagination.getByRole('button', { name: 'Page 1' })).toBeVisible();
  await page.getByRole('button', { name: 'Suivant' }).click();
  await expect(pagination.getByRole('button', { name: 'Page 2' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Précédent' })).toBeEnabled();

  const paymentsA11y = await new AxeBuilder({ page }).analyze();
  expect(paymentsA11y.violations).toEqual([]);

  await page.getByRole('combobox', { name: 'Nombre de paiements par page' }).click();
  await page.getByRole('option', { name: '25', exact: true }).click();
  await expect(pagination.getByRole('button', { name: 'Page 1' })).toBeVisible();

  await page.goto('/fr/dashboard/pipeline');
  await expect(page.getByRole('heading', { name: 'Pipeline', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Pipeline webhooks' })).toBeVisible();

  const pipelineOverflow = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(pipelineOverflow.scroll).toBeLessThanOrEqual(pipelineOverflow.client);

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
