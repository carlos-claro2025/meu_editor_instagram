import { test, expect } from '@playwright/test';

const tinyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
);

async function preparePage(page) {
  await page.route('https://images.unsplash.com/**', route => route.fulfill({
    status: 200,
    contentType: 'image/png',
    body: tinyPng
  }));
  await page.route('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js', route => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: 'window.html2canvas = undefined;'
  }));
  await page.goto('/index.html');
  await expect(page.locator('#loadingOverlay')).toBeHidden();
  await page.evaluate(async () => {
    localStorage.clear();
    if (window.indexedDB) {
      await new Promise(resolve => {
        const request = indexedDB.deleteDatabase('myStoryMakerDB');
        request.onsuccess = request.onerror = request.onblocked = resolve;
      });
    }
  });
  await page.reload();
  await expect(page.locator('#loadingOverlay')).toBeHidden();
}

async function openMobileTools(page) {
  const toggle = page.locator('#toolsToggle');
  if (await toggle.isVisible()) {
    await toggle.click();
    await expect(page.locator('#tools')).toHaveClass(/open/);
  }
}

test.describe('editor mobile', () => {
  test.beforeEach(async ({ page }) => {
    await preparePage(page);
  });

  test('carrega o canvas no viewport móvel e alterna proporção', async ({ page }) => {
    await expect(page.locator('#phone')).toBeVisible();
    await expect(page.locator('#ratioLabel')).toHaveText('Story • 9:16');
    await page.locator('.overlay-chip[data-ratio="1:1"]').click();
    await expect(page.locator('#ratioLabel')).toHaveText('Post • 1:1');
    await expect(page.locator('#statusRatio')).toHaveText('Proporção: 1:1');
  });

  test('abre o drawer, navega entre painéis e adiciona texto', async ({ page }) => {
    await page.locator('[data-nav="texto"]').click();
    await expect(page.locator('#tools')).toHaveClass(/open/);
    await page.locator('[data-action="add-text"]').click();
    await expect(page.locator('#elements > [data-el="text"]')).toHaveCount(1);
    await expect(page.locator('#statusLayers')).toHaveText('Camadas: 1');
  });

  test('insere imagem por upload e mantém a camada no canvas', async ({ page }) => {
    await page.locator('[data-nav="midia"]').click();
    await page.locator('#fileInput').setInputFiles({
      name: 'foto-teste.png',
      mimeType: 'image/png',
      buffer: tinyPng
    });
    await expect(page.locator('#feedGrid img')).toHaveCount(1);
    await page.locator('#feedGrid .feed-item').click();
    await expect(page.locator('#elements > [data-el="image"], #gridCells .cell-img')).toHaveCount(1);
  });

  test('simula drag-and-drop de imagem no canvas', async ({ page }) => {
    await page.evaluate(async (png) => {
      const bytes = Uint8Array.from(atob(png), char => char.charCodeAt(0));
      const file = new File([bytes], 'arrastada.png', { type: 'image/png' });
      const transfer = new DataTransfer();
      transfer.items.add(file);
      document.querySelector('#phone').dispatchEvent(new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer: transfer
      }));
    }, tinyPng.toString('base64'));
    await expect(page.locator('#elements > [data-el="image"], #gridCells .cell-img')).toHaveCount(1);
  });

  test('desfaz e refaz uma alteração', async ({ page }) => {
    await page.locator('[data-nav="texto"]').click();
    await page.locator('[data-action="add-text"]').click();
    await expect(page.locator('#elements > [data-el="text"]')).toHaveCount(1);
    await page.locator('.tab[data-panel="history"]').click();
    await page.locator('#btnUndo').click();
    await expect(page.locator('#elements > [data-el="text"]')).toHaveCount(0);
    await page.locator('#btnRedo').click();
    await expect(page.locator('#elements > [data-el="text"]')).toHaveCount(1);
  });

  test('seleciona, alinha, agrupa e desagrupa elementos', async ({ page }) => {
    await page.locator('[data-nav="texto"]').click();
    await page.locator('[data-action="add-text"]').click();
    await page.locator('[data-nav="elementos"]').click({ force: true });
    await page.locator('[data-action="add-shape"]').click({ force: true });

    await page.evaluate(() => {
      window.switchTab('style');
      document.getElementById('selectAllBtn').click();
    });
    await expect.poll(() => page.evaluate(() => window.State.selectedElements.length)).toBe(2);

    await page.evaluate(() => document.querySelector('[data-align="center"]').click());
    const centered = await page.evaluate(() =>
      [...window.State.selectedElements].map(element => element.offsetLeft)
    );
    expect(new Set(centered).size).toBe(1);

    await page.evaluate(() => document.getElementById('groupSelectedBtn').click());
    await expect(page.locator('#elements > [data-group="true"]')).toHaveCount(1);
    await page.evaluate(() => document.getElementById('ungroupSelectedBtn').click());
    await expect(page.locator('#elements > [data-group="true"]')).toHaveCount(0);
  });

  test('exporta PNG pela interface móvel', async ({ page }) => {
    await page.evaluate(() => {
      window.html2canvas = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = 2;
        canvas.height = 2;
        return canvas;
      };
    });
    const download = page.waitForEvent('download');
    await page.locator('#exportBtn').click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/^story-.*\.png$/);
    await expect(page.locator('#toast')).toContainText('Imagem exportada em PNG');
  });

  test('oferece PNG, JPG e WEBP no menu de exportação', async ({ page }) => {
    await page.locator('#exportDropdownBtn').click();
    await expect(page.locator('#exportMenu')).toBeVisible();
    await expect(page.locator('#exportMenu [data-format="png"]')).toBeVisible();
    await expect(page.locator('#exportMenu [data-format="jpg"]')).toBeVisible();
    await expect(page.locator('#exportMenu [data-format="webp"]')).toBeVisible();
  });
});
