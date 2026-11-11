import { expect, test } from '@playwright/test';

for (const width of [320, 390, 768, 801, 1280]) {
  test(`static content and native navigation at ${width}px without JavaScript`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/devps/');
    const projectTrigger = page.getByLabel('Project: devps', { exact: true });
    await expect(projectTrigger).toBeVisible();
    // Phones keep the header to one row; the Source fact and the footer repeat these links.
    const siteLinks = page.getByRole('navigation', { name: 'Site links' });
    if (width <= 640) await expect(siteLinks).toBeHidden();
    else await expect(siteLinks.getByRole('link')).toHaveText(['GitHub', 'Releases']);
    // The appearance picker needs JavaScript and is not rendered without it.
    await expect(page.getByRole('group', { name: 'Color theme' })).toHaveCount(0);
    await expect(page.locator('.fg-capture__expand')).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('#install code')).toHaveText('brew install filipgutica/tap/devps');
    await expect(page.getByRole('tab')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Copy code' })).toHaveCount(0);
    for (const id of ['pick', 'orphan', 'list', 'stop'])
      await expect(page.locator(`#frame-${id} .term`)).toBeVisible();
    await expect(page.locator('#frame-stop')).toContainText('Proceed? [y/N]');
    // The project menu is a native details element. Close it again so it does
    // not cover the rail toggle on narrow screens.
    const projectMenu = page.getByRole('navigation', { name: 'Projects' });
    await expect(projectMenu).toBeHidden();
    await projectTrigger.click();
    await expect(projectMenu).toBeVisible();
    await expect(projectMenu.getByRole('link', { name: 'UI', exact: true })).toHaveAttribute(
      'href',
      'https://filipgutica.github.io/ui/',
    );
    await expect(projectMenu.locator('[aria-current="page"]')).toHaveText('devps');
    await projectTrigger.click();
    await expect(projectMenu).toBeHidden();
    if (width <= 800) await page.locator('.fg-site-rail__menu > summary').click();
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
  await expect(page.locator('#limits-title')).toBeVisible();
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
  const projectHue = () => page.locator('html').evaluate((element) =>
    getComputedStyle(element).getPropertyValue('--color-project').trim(),
  );
  expect(await projectHue()).toBe('#f39a62');
  expect(await page.locator('html').evaluate((element) =>
    getComputedStyle(element).getPropertyValue('--color-project-dark').trim(),
  )).toBe('#f39a62');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect.poll(projectHue).toBe('#b4440b');
  await expect
    .poll(() =>
      page.locator('body').evaluate((element) => getComputedStyle(element).backgroundColor),
    )
    .toBe(lightBackground);
});
