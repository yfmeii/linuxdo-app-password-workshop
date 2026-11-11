import { test, expect } from '@playwright/test';

async function installHost(page, permission = true) {
  await page.addInitScript((hasThemePermission) => {
    const theme = new Promise((resolve, reject) => {
      window.resolveTheme = resolve;
      window.rejectTheme = () => reject(new Error('Theme unavailable'));
    });
    window.miniApp = {
      ready: Promise.resolve(),
      permissions: { has: () => hasThemePermission },
      theme: {
        get: () => theme,
        onChange: (listener) => { window.changeTheme = listener; return () => {}; },
      },
      lifecycle: { ready: async () => { window.hostReady = true; } },
    };
    window.sawDarkTheme = false;
    new MutationObserver((records) => {
      window.sawDarkTheme ||= document.documentElement.classList.contains('dark')
        || records.some((record) => /\bdark\b/.test(record.oldValue ?? ''));
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ['class'], attributeOldValue: true });
  }, permission);
}

test('copy feedback expires relative to the latest successful copy', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => {} } });
  });
  await page.goto('/');
  const copyButton = page.locator('#copy');
  await expect(copyButton).toBeEnabled();
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  await copyButton.click();
  await expect(copyButton).toHaveAttribute('data-copied', 'true');
  await page.clock.runFor(1500);
  await copyButton.click();
  await expect(copyButton).toBeEnabled();
  await page.clock.runFor(800);
  await expect(copyButton).toHaveAttribute('data-copied', 'true');
  await page.clock.runFor(1399);
  await expect(copyButton).toHaveAttribute('data-copied', 'true');
  await page.clock.runFor(1);
  await expect(copyButton).toHaveAttribute('data-copied', 'false');
  await copyButton.click();
  await expect(copyButton).toHaveAttribute('data-copied', 'true');
  await page.locator('#regenerate').click();
  await expect(copyButton).toHaveAttribute('data-copied', 'false');
});

test('result live region survives regeneration, visibility and keyboard mode changes', async ({ page }) => {
  await page.goto('/');
  const output = page.locator('#password');
  await expect(output).toBeVisible();
  const originalNode = await output.elementHandle();
  const originalPassword = await output.textContent();
  await page.locator('#regenerate').click();
  await expect(output).not.toHaveText(originalPassword);
  await expect(output).toHaveAttribute('aria-live', 'polite');
  await expect(output).toHaveAttribute('aria-atomic', 'true');
  await page.locator('#visibility').click();
  await expect(output.locator('[aria-label]')).toHaveAttribute('aria-label', '密码已隐藏');
  await page.locator('#visibility').click();
  await page.locator('#mode-random').focus();
  for (const mode of ['memorable', 'pin', 'random']) {
    await page.keyboard.press('ArrowRight');
    await expect(page.locator(`#mode-${mode}`)).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#mode-panel')).toHaveAttribute('aria-labelledby', `mode-${mode}`);
    expect(await originalNode.evaluate((element) => element === document.querySelector('#password'))).toBe(true);
  }
  await output.focus();
  await page.locator('#regenerate').evaluate((button) => button.click());
  await expect(output).toBeFocused();
  await originalNode.dispose();
});

test('pending host light theme never applies the dark system preference', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'no-preference' });
  await installHost(page);
  await page.goto('/');
  await expect(page.locator('#password')).toBeVisible();
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await page.emulateMedia({ colorScheme: 'light' });
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.evaluate(() => window.resolveTheme({ mode: 'light' }));
  await page.waitForFunction(() => window.hostReady);
  expect(await page.evaluate(() => window.sawDarkTheme)).toBe(false);
  await page.evaluate(() => window.changeTheme({ mode: 'dark' }));
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.evaluate(() => window.changeTheme({ mode: 'light' }));
  await expect(page.locator('html')).not.toHaveClass(/dark/);
});

for (const scenario of ['standalone', 'permission denied', 'theme failure']) {
  test(`system theme remains available: ${scenario}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    if (scenario !== 'standalone') await installHost(page, scenario !== 'permission denied');
    await page.goto('/');
    if (scenario === 'theme failure') await page.evaluate(() => window.rejectTheme());
    await expect(page.locator('html')).toHaveClass(/dark/);
    await page.emulateMedia({ colorScheme: 'light' });
    await expect(page.locator('html')).not.toHaveClass(/dark/);
  });
}

for (const colorScheme of ['light', 'dark']) {
  for (const community of [false, true]) {
    test(`unchecked controls have 3:1 contrast: ${colorScheme}, community=${community}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      if (community) await installHost(page);
      await page.goto('/');
      if (community) {
        await page.evaluate((mode) => window.resolveTheme({
          mode,
          background: mode === 'light' ? '#ffffff' : '#141615',
          text: mode === 'light' ? '#252a28' : '#e7eae8',
          accent: mode === 'light' ? '#258355' : '#78c69a',
          border: mode === 'light' ? '#e4e7e5' : '#303631',
        }), colorScheme);
        await expect(page.locator('html')).toHaveAttribute('data-community-theme', '');
      }
      await page.locator('#upper').click();
      await page.locator('#exclude-similar').click();
      await expect(page.locator('#upper')).toHaveAttribute('data-state', 'unchecked');
      await expect(page.locator('#exclude-similar')).toHaveAttribute('data-state', 'unchecked');
      await page.locator('label[for="upper"]').hover();
      const ratios = await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 1;
        const context = canvas.getContext('2d');
        function readColor(color) {
          context.clearRect(0, 0, 1, 1);
          context.fillStyle = color;
          context.fillRect(0, 0, 1, 1);
          return [...context.getImageData(0, 0, 1, 1).data];
        }
        function blend(foreground, background) {
          const opacity = foreground[3] / 255;
          return foreground.slice(0, 3).map((channel, index) => channel * opacity + background[index] * (1 - opacity));
        }
        function backgroundOf(element) {
          if (!element) return [255, 255, 255];
          return blend(readColor(getComputedStyle(element).backgroundColor), backgroundOf(element.parentElement));
        }
        function luminance(channels) {
          const linear = channels.map((channel) => {
            const value = channel / 255;
            return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
          });
          return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
        }
        function contrast(first, second) {
          const values = [luminance(first), luminance(second)].sort((left, right) => right - left);
          return (values[0] + 0.05) / (values[1] + 0.05);
        }
        const checkbox = document.querySelector('#upper');
        const track = document.querySelector('#exclude-similar');
        const thumb = track.querySelector('[data-slot="switch-thumb"]');
        const checkboxBackground = backgroundOf(checkbox);
        const checkboxBorder = blend(readColor(getComputedStyle(checkbox).borderTopColor), checkboxBackground);
        return {
          checkbox: contrast(checkboxBorder, checkboxBackground),
          track: contrast(backgroundOf(track), backgroundOf(track.parentElement)),
          thumb: contrast(backgroundOf(thumb), backgroundOf(track)),
        };
      });
      for (const [control, ratio] of Object.entries(ratios)) {
        expect(ratio, `${control}: ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(3);
      }
    });
  }
}
