import { expect, test as base } from '@playwright/test';

import type { Page } from '@playwright/test';

const pixel =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="60"><rect width="120" height="60" rx="25" fill="orange"/></svg>'
  );
const ingredients = [
  { _id: 'bun-1', name: 'Космическая булка', type: 'bun', price: 100 },
  { _id: 'bun-2', name: 'Вторая булка', type: 'bun', price: 150 },
  { _id: 'main-1', name: 'Метеоритная котлета', type: 'main', price: 50 },
  { _id: 'main-2', name: 'Лунный сыр', type: 'main', price: 30 },
  { _id: 'sauce-1', name: 'Соус комета', type: 'sauce', price: 20 },
].map((item) => ({
  ...item,
  proteins: 10,
  fat: 5,
  carbohydrates: 20,
  calories: 200,
  image: pixel,
  image_mobile: pixel,
  image_large: pixel,
}));
const makeOrder = (number = 123, status = 'done') => ({
  _id: `order-${number}`,
  number,
  name: 'Космический бургер',
  status,
  ingredients: ['bun-1', 'main-1', 'bun-1'],
  createdAt: '2026-10-24T10:00:00.000Z',
  updatedAt: '2026-10-24T10:00:00.000Z',
});
type Order = ReturnType<typeof makeOrder>;
type Api = {
  user: { name: string; email: string };
  orders: Order[];
  requests: { path: string; method: string; body: Record<string, unknown> }[];
  failOrder: boolean;
  failIngredients: boolean;
};

const test = base.extend<{ api: Api }>({
  api: async ({ page }, use) => {
    const api: Api = {
      user: { name: 'Никита', email: 'nikita@example.com' },
      orders: [makeOrder()],
      requests: [],
      failOrder: false,
      failIngredients: false,
    };
    await page.route('https://norma.ffapi.ru/api/**', async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname.replace('/api', '');
      const method = request.method();
      const body = request.postData()
        ? (request.postDataJSON() as Record<string, unknown>)
        : {};
      api.requests.push({ path, method, body });
      let status = 200;
      let response: unknown = { success: true };
      if (path === '/ingredients') {
        if (api.failIngredients) {
          status = 500;
          response = { success: false, message: 'Ошибка ингредиентов' };
        } else response = { success: true, data: ingredients };
      } else if (path === '/auth/login' || path === '/auth/register') {
        if (body.password === 'wrong') {
          status = 401;
          response = { success: false, message: 'Неверные данные' };
        } else {
          if (path === '/auth/register')
            api.user = { name: String(body.name), email: String(body.email) };
          response = {
            success: true,
            user: api.user,
            accessToken: 'Bearer test-access',
            refreshToken: 'test-refresh',
          };
        }
      } else if (path === '/auth/token') {
        response = {
          success: true,
          accessToken: 'Bearer test-access',
          refreshToken: 'test-refresh',
        };
      } else if (path === '/auth/user') {
        if (request.headers().authorization === 'Bearer expired') {
          status = 403;
          response = { success: false, message: 'jwt expired' };
        } else if (!request.headers().authorization) {
          status = 401;
          response = { success: false, message: 'You should be authorised' };
        } else {
          if (method === 'PATCH') api.user = { ...api.user, ...body } as Api['user'];
          response = { success: true, user: api.user };
        }
      } else if (path === '/orders/all')
        response = { success: true, orders: api.orders, total: 100, totalToday: 10 };
      else if (path === '/orders' && method === 'POST') {
        if (api.failOrder) {
          status = 500;
          response = { success: false, message: 'Заказ не принят' };
        } else {
          const order = { ...makeOrder(124), ingredients: body.ingredients as string[] };
          api.orders = [order, ...api.orders];
          response = { success: true, name: order.name, order };
        }
      } else if (path === '/orders') response = { success: true, orders: api.orders };
      else if (path.startsWith('/orders/'))
        response = {
          success: true,
          orders: api.orders.filter(
            (order) => order.number === Number(path.split('/').pop())
          ),
        };
      await route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(response),
      });
    });
    await use(api);
  },
});
test.beforeEach(async ({ api }) => {
  void api;
});

const authorize = async (page: Page): Promise<void> => {
  await page
    .context()
    .addCookies([
      {
        name: 'accessToken',
        value: encodeURIComponent('Bearer test-access'),
        url: 'http://localhost:4000',
      },
    ]);
  await page.addInitScript(() => {
    localStorage.setItem('refreshToken', 'test-refresh');
  });
};
const add = async (page: Page, name: string): Promise<void> => {
  await page
    .getByRole('listitem')
    .filter({ has: page.getByRole('link', { name, exact: false }) })
    .getByRole('button', { name: 'Добавить' })
    .click();
};

test('ингредиент открывается над конструктором; крестик, Escape и фон закрывают окно', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('link', { name: /Космическая булка/ }).click();
  await expect(page).toHaveURL(/\/ingredients\/bun-1$/);
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Соберите бургер' })).toBeVisible();
  await page.getByRole('button', { name: 'Закрыть', exact: true }).click();
  await expect(page).toHaveURL('http://localhost:4000/');
  await page.getByRole('link', { name: /Космическая булка/ }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('link', { name: /Космическая булка/ }).click();
  await page.mouse.click(5, 150);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
test('прямая ссылка показывает отдельную страницу; неизвестный id не зависает', async ({
  page,
}) => {
  await page.goto('/ingredients/bun-1');
  await expect(page.getByRole('heading', { name: 'Детали ингредиента' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Космическая булка' })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.goto('/ingredients/unknown');
  await expect(page.getByText('Ингредиент не найден', { exact: true })).toBeVisible();
});
test('гость собирает бургер; булка считается дважды, экземпляры удаляются и перемещаются', async ({
  page,
}) => {
  await page.goto('/');
  await add(page, 'Космическая булка');
  await add(page, 'Метеоритная котлета');
  await add(page, 'Метеоритная котлета');
  await add(page, 'Лунный сыр');
  const constructor = page
    .locator('section')
    .filter({ has: page.getByRole('button', { name: 'Оформить заказ' }) });
  await expect(constructor.getByText('330', { exact: true })).toBeVisible();
  await expect(constructor.getByRole('listitem')).toHaveCount(3);
  await add(page, 'Вторая булка');
  await expect(constructor.getByText('430', { exact: true })).toBeVisible();
  // Кнопки библиотеки имеют aria-label; проверяем перестановку по порядку строк.
  const rows = constructor.getByRole('listitem');
  const up = rows
    .nth(2)
    .getByRole('button')
    .filter({ has: page.locator('svg') });
  await up.first().click();
  await expect(rows.nth(1)).toContainText('Лунный сыр');
  const closeButton = rows.nth(0).locator('[class*="action"]').last();
  await closeButton.click();
  await expect(rows).toHaveCount(2);
});
test('оформление гостем ведёт на вход, после входа состав сохраняется и заказ виден в истории', async ({
  page,
  api,
}) => {
  await page.goto('/');
  await add(page, 'Космическая булка');
  await add(page, 'Метеоритная котлета');
  await page.getByRole('button', { name: 'Оформить заказ' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.locator('input[name="email"]').fill('nikita@example.com');
  await page.locator('input[name="password"]').fill('password123');
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(page).toHaveURL('http://localhost:4000/');
  await expect(page.getByText('250', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Оформить заказ' }).click();
  await expect(page.getByRole('dialog')).toContainText('124');
  expect(
    api.requests.find(
      (request) => request.path === '/orders' && request.method === 'POST'
    )?.body
  ).toEqual({ ingredients: ['bun-1', 'main-1', 'bun-1'] });
  await page.getByRole('button', { name: 'Закрыть', exact: true }).click();
  await expect(page.getByText('Выберите начинку')).toBeVisible();
  await page.getByRole('link', { name: 'Никита', exact: true }).click();
  await page.getByRole('link', { name: 'История заказов' }).click();
  await expect(page.getByText('#000124')).toBeVisible();
});
test('защищённая ссылка возвращает пользователя к исходному заказу после входа', async ({
  page,
}) => {
  await page.goto('/profile/orders/123');
  await expect(page).toHaveURL(/\/login$/);
  await page.locator('input[name="email"]').fill('nikita@example.com');
  await page.locator('input[name="password"]').fill('password123');
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(page).toHaveURL(/\/profile\/orders\/123$/);
  await expect(page.getByRole('heading', { name: '#123' })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
test('регистрация создаёт сессию и закрывает гостевые страницы', async ({ page }) => {
  await page.goto('/register');
  await page.locator('input[name="name"]').fill('Новый пользователь');
  await page.locator('input[name="email"]').fill('new@example.com');
  await page.locator('input[name="password"]').fill('password123');
  await page.getByRole('button', { name: 'Зарегистрироваться', exact: true }).click();
  await expect(page).toHaveURL('http://localhost:4000/');
  await expect(
    page.getByRole('link', { name: 'Новый пользователь', exact: true })
  ).toBeVisible();
  await page.goto('/login');
  await expect(page).toHaveURL('http://localhost:4000/');
});
test('профиль: отмена возвращает данные, сохранение отправляет только изменения, выход закрывает профиль', async ({
  page,
  api,
}) => {
  await authorize(page);
  await page.goto('/profile');
  const name = page.locator('input[name="name"]');
  await expect(name).toHaveValue('Никита');
  await expect(page.getByRole('button', { name: 'Сохранить', exact: true })).toHaveCount(
    0
  );
  await name.fill('Другое имя');
  await page.getByRole('button', { name: 'Отменить', exact: true }).click();
  await expect(name).toHaveValue('Никита');
  await name.fill('Новое имя');
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Сохранить', exact: true })).toHaveCount(
    0
  );
  expect(api.requests.find((request) => request.method === 'PATCH')?.body).toEqual({
    name: 'Новое имя',
  });
  await page.reload();
  await expect(name).toHaveValue('Новое имя');
  await page.getByRole('button', { name: 'Выход', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(
    (await page.context().cookies()).some((cookie) => cookie.name === 'accessToken')
  ).toBe(false);
  expect(await page.evaluate(() => localStorage.getItem('refreshToken'))).toBeNull();
});
test('просроченная сессия обновляется без показа формы входа', async ({ page, api }) => {
  await page
    .context()
    .addCookies([
      {
        name: 'accessToken',
        value: encodeURIComponent('Bearer expired'),
        url: 'http://localhost:4000',
      },
    ]);
  await page.addInitScript(() => localStorage.setItem('refreshToken', 'test-refresh'));
  await page.goto('/profile');
  await expect(page.locator('input[name="name"]')).toHaveValue('Никита');
  expect(api.requests.some((request) => request.path === '/auth/token')).toBe(true);
});
test('ошибка входа отображается на странице', async ({ page }) => {
  await page.goto('/login');
  await page.locator('input[name="email"]').fill('nikita@example.com');
  await page.locator('input[name="password"]').fill('wrong');
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(page.getByText('Неверные данные', { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});
test('восстановление пароля проходит оба шага; прямой reset перенаправляет на начало', async ({
  page,
  api,
}) => {
  await page.goto('/reset-password');
  await expect(page).toHaveURL(/\/forgot-password$/);
  await page.locator('input[name="email"]').fill('nikita@example.com');
  await page.getByRole('button', { name: 'Восстановить', exact: true }).click();
  await expect(page).toHaveURL(/\/reset-password$/);
  await page.locator('input[name="password"]').fill('new-password123');
  await page.locator('input[name="token"]').fill('123456');
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(
    api.requests.find((request) => request.path === '/password-reset/reset')?.body
  ).toEqual({ password: 'new-password123', token: '123456' });
});
test('лента: стоимость, статистика, отдельная страница заказа и активная ссылка', async ({
  page,
}) => {
  await page.goto('/feed');
  await expect(
    page.getByRole('heading', { name: 'Лента заказов', exact: true })
  ).toBeVisible();
  await expect(page.getByText('250', { exact: true })).toBeVisible();
  await expect(page.getByText('100', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: /#000123/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Лента заказов', exact: true })
  ).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('dialog')).toContainText('2 x 100');
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/\/feed$/);
  await page.goto('/feed/123');
  await expect(page.getByRole('heading', { name: '#123' })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.goto('/feed/not-a-number');
  await expect(page.getByRole('alert')).toContainText('Некорректный номер заказа');
});
test('история автоматически обновляет статусы, модалка сохраняет исходную страницу', async ({
  page,
  api,
}) => {
  await page.clock.install();
  api.orders = [makeOrder(123, 'pending')];
  await authorize(page);
  await page.goto('/profile/orders');
  await expect(page.getByText('Готовится', { exact: true })).toBeVisible();
  api.orders = [makeOrder(123, 'done')];
  await page.clock.fastForward(5100);
  await expect(page.getByText('Выполнен', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: /#000123/ }).click();
  await expect(page).toHaveURL(/\/profile\/orders\/123$/);
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'История заказов', exact: true })
  ).toHaveAttribute('aria-current', 'page');
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/\/profile\/orders$/);
});
test('ошибка заказа не теряет конструктор, повторное оформление работает', async ({
  page,
  api,
}) => {
  await authorize(page);
  api.failOrder = true;
  await page.goto('/');
  await add(page, 'Космическая булка');
  await add(page, 'Метеоритная котлета');
  await page.getByRole('button', { name: 'Оформить заказ' }).click();
  await expect(page.getByRole('alert')).toContainText('Заказ не принят');
  await expect(page.getByText('250', { exact: true })).toBeVisible();
  api.failOrder = false;
  await page.getByRole('button', { name: 'Оформить заказ' }).click();
  await expect(page.getByRole('dialog')).toContainText('124');
});
test('ошибка ингредиентов допускает повтор; она не блокирует форму входа', async ({
  page,
  api,
}) => {
  api.failIngredients = true;
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('Ошибка ингредиентов');
  api.failIngredients = false;
  await page.getByRole('button', { name: 'Повторить запрос' }).click();
  await expect(page.getByRole('link', { name: /Космическая булка/ })).toBeVisible();
  api.failIngredients = true;
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Вход', exact: true })).toBeVisible();
});
test('неизвестный адрес показывает 404', async ({ page }) => {
  await page.goto('/unknown');
  await expect(
    page.getByText('Страница не найдена. Ошибка 404.', { exact: true })
  ).toBeVisible();
});
