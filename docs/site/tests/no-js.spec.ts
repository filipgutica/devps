import { expect, test } from '@playwright/test';

for (const width of [320, 390, 768, 801, 1280]) {
  test(`static content and native navigation at ${width}px without JavaScript`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/devps/');
    await expect(page.getByRole('link', { name: 'devps home' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
    await expect(page.locator('.capture-open')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'devps', exact: true })).toBeVisible();
    await expect(page.locator('#install code')).toHaveText('brew install filipgutica/tap/devps');
    await expect(page.getByRole('tab')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Copy code' })).toHaveCount(0);
    for (const id of ['pick', 'orphan', 'list', 'stop'])
      await expect(page.locator(`#frame-${id} .term`)).toBeVisible();
    await expect(page.locator('#frame-stop')).toContainText('Proceed? [y/N]');
    if (width <= 800) await page.locator('.site-menu > summary').click();
    await expect(page.getByRole('navigation', { name: 'Projects' })).toBeVisible();
    const sectionNav = page.getByRole('navigation', { name: 'On this page' });
    await expect(sectionNav).toBeVisible();
    await sectionNav.getByRole('link', { name: 'Commands', exact: true }).click();
    await expect(page).toHaveURL(/#commands-title$/);
    await expect(page.locator('#commands-title')).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
}

test('no-JavaScript deep link reaches content after every capture', async ({ page }) => {
  await page.goto('/devps/#keys-title');
  await expect(page.locator('#keys-title')).toBeInViewport();
  await expect(page.locator('#limits-title')).toHaveText('Good to know');
});

test('no-JavaScript readers follow the OS dark theme from the library palette', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/devps/');
  const lightBackground = await page
    .locator('body')
    .evaluate((element) => getComputedStyle(element).backgroundColor);
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect
    .poll(() => page.locator('html').evaluate((element) => getComputedStyle(element).colorScheme))
    .toBe('dark');
  await expect
    .poll(() =>
      page.locator('body').evaluate((element) => getComputedStyle(element).backgroundColor),
    )
    .not.toBe(lightBackground);
  await expect(page.locator('#install code')).toHaveText('brew install filipgutica/tap/devps');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect
    .poll(() =>
      page.locator('body').evaluate((element) => getComputedStyle(element).backgroundColor),
    )
    .toBe(lightBackground);
});
