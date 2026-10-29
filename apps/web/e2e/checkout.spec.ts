import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('completes a demo card checkout and opens the technical drawer', async ({ page }) => {
  await page.goto('/fr/shop');
  await page
    .getByRole('link', { name: /iPhone 16 128 Go/ })
    .first()
    .click();

  await expect(page.getByRole('heading', { name: 'iPhone 16 128 Go' })).toBeVisible();
  await page.getByRole('link', { name: 'Acheter' }).click();

  await expect(page.getByRole('heading', { name: 'Finalisez votre commande.' })).toBeVisible();

  await page.getByLabel('Email').fill('awa@example.com');
  await page.getByLabel('Nom complet').fill('Awa Diop');
  await page.getByRole('button', { name: 'Continuer' }).click();

  await page.getByLabel('Adresse', { exact: true }).fill('12 rue des Lilas');
  await page.getByLabel('Ville').fill('Paris');
  await page.getByLabel('Code postal').fill('75011');
  await page.getByRole('button', { name: 'Continuer' }).click();

  await expect(page.getByText('Carte — démo')).toBeVisible();
  await page.getByRole('button', { name: 'Continuer' }).click();

  const terms = page.getByRole('checkbox').first();
  await terms.check();
  await expect(terms).toBeChecked();
  await page.getByRole('button', { name: /Payer/ }).first().click();

  await expect(page).toHaveURL(/\/fr\/checkout\/.+/);
  await expect(page.getByRole('heading', { name: 'Confirmation en cours.' })).toBeVisible();
  await page.getByRole('button', { name: 'Approuver le paiement' }).click();

  await expect(page.getByRole('heading', { name: 'Paiement confirmé.' })).toBeVisible();
  await expect(page.getByText(/ORB-/)).toBeVisible();

  await page.getByRole('button', { name: 'Sous le capot' }).click();
  const drawer = page.getByRole('dialog');
  await expect(drawer).toBeVisible();
  await expect(drawer.getByText('ID de paiement')).toBeVisible();
  await expect(drawer.getByRole('heading', { name: 'Webhooks' })).toBeVisible();
});

test('switches to English and preserves a shareable route', async ({ page }) => {
  await page.goto('/fr/shop');
  await page.getByRole('button', { name: 'EN', exact: true }).click();

  await expect(page).toHaveURL(/\/en\/shop$/);
  await expect(page.getByRole('heading', { name: /Real products/ })).toBeVisible();
});

test('checkout has no obvious accessibility violations', async ({ page }) => {
  await page.goto('/fr/checkout?product=iphone-16-128-eur');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
