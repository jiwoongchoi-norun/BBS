var test = require('@playwright/test').test;
var expect = require('@playwright/test').expect;

async function firstPostHref(page) {
  await page.goto('/bbs/list');
  var firstPost = page.locator('tbody a[href^="/bbs/read?brdno="]').first();
  await expect(firstPost).toBeVisible();
  return firstPost.getAttribute('href');
}

async function loginAsAdmin(page) {
  await page.goto('/bbs/login');
  await page.locator('#id').fill('admin');
  await page.locator('#password').fill('Password123!');
  await page.getByRole('button', { name: '로그인' }).click();
  await expect(page).toHaveURL(/\/bbs\/list/);
}

test.describe('BBS UI smoke checks', function () {
  test('list renders, dates stay compact, and sort headers cycle back to default', async function ({
    page
  }) {
    await page.goto('/bbs/list');
    await expect(page.getByRole('heading', { name: '자유게시판' })).toBeVisible();
    await expect(page.locator('tbody tr').first()).toBeVisible();

    var dateCells = await page.locator('tbody tr td:last-child').allTextContents();
    expect(dateCells.length).toBeGreaterThan(0);
    dateCells.forEach(function (dateText) {
      expect(dateText.trim()).toMatch(/^(\d{2}:\d{2}|\d{2}\.\d{2}\.\d{2})$/);
    });

    var createdAtHeader = page.locator('th a', { hasText: '작성일' });
    await expect(createdAtHeader).toHaveAttribute(
      'href',
      /\/bbs\/list\?pageSize=\d+&sort=created_at&order=desc/
    );

    await createdAtHeader.click();
    await expect(page).toHaveURL(/sort=created_at&order=desc/);
    await expect(page.locator('th a', { hasText: '작성일' })).toContainText('▼');

    await page.locator('th a', { hasText: '작성일' }).click();
    await expect(page).toHaveURL(/sort=created_at&order=asc/);
    await expect(page.locator('th a', { hasText: '작성일' })).toContainText('▲');

    await page.locator('th a', { hasText: '작성일' }).click();
    await expect(page).toHaveURL(function (url) {
      return url.pathname === '/bbs/list' && !url.searchParams.has('sort');
    });
  });

  test('login signup link opens the signup form', async function ({ page }) {
    await page.goto('/bbs/login');
    await page.getByRole('main').getByRole('link', { name: '회원가입' }).click();
    await expect(page).toHaveURL(/\/bbs\/signup$/);
    await expect(page.getByRole('heading', { name: '회원가입' })).toBeVisible();
    await expect(page.locator('#checkIdButton')).toBeVisible();
    await expect(page.locator('#id')).toBeVisible();
    await expect(page.locator('#pw1')).toBeVisible();
    await expect(page.locator('#pw2')).toBeVisible();
  });

  test('post read page exposes content, comments, reactions, and back navigation', async function ({
    page
  }) {
    await loginAsAdmin(page);
    var href = await firstPostHref(page);
    await page.goto(href);

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: '댓글' })).toBeVisible();
    await expect(page.getByRole('button', { name: /^좋아요/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /^싫어요/ })).toBeVisible();
    await expect(page.getByRole('link', { name: '목록' }).first()).toBeVisible();
  });

  test('admin can log in and reach the dashboard controls', async function ({ page }) {
    await loginAsAdmin(page);
    await page.goto('/bbs/admin');

    await expect(page.getByRole('heading', { name: '관리자 대시보드' })).toBeVisible();
    await expect(page.getByRole('link', { name: '게시글' })).toBeVisible();
    await expect(page.getByRole('link', { name: '신고' })).toBeVisible();
    await expect(page.getByRole('link', { name: '회원' })).toBeVisible();
    await expect(page.getByRole('link', { name: '카테고리' })).toBeVisible();
  });
});
