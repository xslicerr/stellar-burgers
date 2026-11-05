import ingredientsResponse from './fixtures/ingredients.json' with { type: 'json' };
import orderResponse from './fixtures/order.json' with { type: 'json' };
import userResponse from './fixtures/user.json' with { type: 'json' };
import { expect, test } from './helpers/api';

import type { Page } from '@playwright/test';

const authorize = async (page: Page): Promise<void> => {
  await page.context().addCookies([
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

test.describe('Ингредиенты', () => {
  test.describe('Модальное окно ингредиента', () => {
    const selectedIngredient = ingredientsResponse.data.find(
      ({ _id }) => _id === 'main-2'
    )!;

    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await page.getByRole('link', { name: selectedIngredient.name }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
    });

    test('показывает название, изображение и пищевую ценность выбранного ингредиента', async ({
      page,
    }) => {
      const modal = page.getByRole('dialog');
      await expect(page).toHaveURL(/\/ingredients\/main-2$/);
      await expect(page.getByRole('heading', { name: 'Соберите бургер' })).toBeVisible();
      await expect(
        modal.getByRole('heading', { name: 'Лунный сыр', exact: true })
      ).toBeVisible();
      await expect(
        modal.getByRole('heading', { name: 'Космическая булка', exact: true })
      ).toHaveCount(0);
      await expect(
        modal.getByRole('img', { name: 'изображение ингредиента.' })
      ).toHaveAttribute('src', selectedIngredient.image_large);
      for (const [label, value] of [
        ['Калории, ккал', selectedIngredient.calories],
        ['Белки, г', selectedIngredient.proteins],
        ['Жиры, г', selectedIngredient.fat],
        ['Углеводы, г', selectedIngredient.carbohydrates],
      ] as const) {
        const nutrient = modal
          .getByRole('listitem')
          .filter({ has: page.getByText(label, { exact: true }) });
        await expect(nutrient.getByText(String(value), { exact: true })).toBeVisible();
      }
    });

    test('закрывается по крестику', async ({ page }) => {
      await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Закрыть', exact: true })
        .click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(page.getByTestId('modal-overlay')).toHaveCount(0);
      await expect(page).toHaveURL('http://localhost:4000/');
    });

    test('закрывается по Escape', async ({ page }) => {
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(page.getByTestId('modal-overlay')).toHaveCount(0);
      await expect(page).toHaveURL('http://localhost:4000/');
    });

    test('закрывается по клику на оверлей', async ({ page }) => {
      // Позиция относительно самого оверлея: его центр занят диалогом.
      await page.getByTestId('modal-overlay').click({ position: { x: 10, y: 10 } });
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(page.getByTestId('modal-overlay')).toHaveCount(0);
      await expect(page).toHaveURL('http://localhost:4000/');
    });
  });

  test('прямая ссылка показывает отдельную страницу; неизвестный id не зависает', async ({
    page,
  }) => {
    await page.goto('/ingredients/bun-1');
    await expect(
      page.getByRole('heading', { name: 'Детали ингредиента' })
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Космическая булка' })).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.goto('/ingredients/unknown');
    await expect(page.getByText('Ингредиент не найден', { exact: true })).toBeVisible();
  });

  test('ошибка ингредиентов допускает повтор; она не блокирует форму входа', async ({
    page,
    api,
  }) => {
    await api.useHar('scenarios/ingredients-error');
    await page.goto('/');
    await expect(page.getByRole('alert')).toContainText('Ошибка ингредиентов');
    await api.useHar('ingredients');
    await page.getByRole('button', { name: 'Повторить запрос' }).click();
    await expect(page.getByRole('link', { name: /Космическая булка/ })).toBeVisible();
    await api.useHar('scenarios/ingredients-error');
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Вход', exact: true })).toBeVisible();
  });
});

test.describe('Конструктор бургера', () => {
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
    await expect(constructor.getByText('Космическая булка (верх)')).toBeVisible();
    await expect(constructor.getByText('Космическая булка (низ)')).toBeVisible();
    await expect(
      constructor.getByText('Метеоритная котлета', { exact: true })
    ).toHaveCount(2);
    await expect(constructor.getByText('Лунный сыр', { exact: true })).toBeVisible();
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

  for (const height of [720, 1000]) {
    test(`длинный бургер прокручивается внутри конструктора при высоте окна ${height}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1440, height });
      await page.goto('/');
      await add(page, 'Космическая булка');
      for (let index = 0; index < 16; index++) await add(page, 'Метеоритная котлета');
      await add(page, 'Лунный сыр');

      const constructor = page.locator('section').filter({
        has: page.getByRole('button', { name: 'Оформить заказ' }),
      });
      const filling = constructor.locator('ul');
      const submit = constructor.getByRole('button', { name: 'Оформить заказ' });
      const topBun = constructor.getByText('Космическая булка (верх)', { exact: true });
      await expect(filling.getByRole('listitem')).toHaveCount(17);
      const metrics = await filling.evaluate((element) => ({
        height: element.clientHeight,
        contentHeight: element.scrollHeight,
        bottom: element.getBoundingClientRect().bottom,
      }));
      expect(metrics.height).toBeGreaterThan(0);
      expect(metrics.contentHeight).toBeGreaterThan(metrics.height);
      const submitBox = await submit.boundingBox();
      expect(submitBox).not.toBeNull();
      expect(metrics.bottom).toBeLessThan(submitBox!.y);
      expect(submitBox!.y + submitBox!.height).toBeLessThanOrEqual(height);
      const bunBox = await topBun.boundingBox();

      await filling.hover();
      await page.mouse.wheel(0, 10000);
      await expect
        .poll(() => filling.evaluate((element) => element.scrollTop))
        .toBeGreaterThan(0);
      await expect(filling.getByRole('listitem').last()).toBeInViewport();
      expect(await topBun.boundingBox()).toEqual(bunBox);
    });
  }
});

test.describe('Оформление заказа', () => {
  test('заказ с моковыми токенами показывает номер, очищает конструктор и закрывается', async ({
    page,
    api,
  }) => {
    await authorize(page);
    await api.useHar('scenarios/order-with-sauce');
    await page.goto('/');
    await expect(
      page.getByRole('link', { name: userResponse.user.name, exact: true })
    ).toBeVisible();
    await add(page, 'Космическая булка');
    await add(page, 'Метеоритная котлета');
    await add(page, 'Соус комета');

    const constructor = page.locator('section').filter({
      has: page.getByRole('button', { name: 'Оформить заказ' }),
    });
    await expect(constructor.getByRole('listitem')).toHaveCount(2);
    await expect(constructor.getByText('270', { exact: true })).toBeVisible();
    const requestPromise = page.waitForRequest(
      (request) =>
        new URL(request.url()).pathname === '/api/orders' && request.method() === 'POST'
    );
    await page.getByRole('button', { name: 'Оформить заказ' }).click();
    const request = await requestPromise;
    expect(request.headers().authorization).toBe('Bearer test-access');
    expect(request.postDataJSON()).toEqual({
      ingredients: ['bun-1', 'main-1', 'sauce-1', 'bun-1'],
    });
    expect(api.requests.some(({ path }) => path === '/auth/user')).toBe(true);

    const modal = page.getByRole('dialog', { name: 'Заказ оформлен' });
    await expect(modal).toBeVisible();
    await expect(
      modal.getByRole('heading', {
        name: String(orderResponse.order.number),
        exact: true,
      })
    ).toBeVisible();
    await expect(modal.getByText('Ваш заказ начали готовить')).toBeVisible();
    await expect(constructor.getByText('Выберите булки', { exact: true })).toHaveCount(
      2
    );
    await expect(
      constructor.getByText('Выберите начинку', { exact: true })
    ).toBeVisible();
    await expect(constructor.getByText('0', { exact: true })).toBeVisible();
    await expect(
      constructor.getByText('Метеоритная котлета', { exact: true })
    ).toHaveCount(0);
    await expect(constructor.getByText('Соус комета', { exact: true })).toHaveCount(0);

    await modal.getByRole('button', { name: 'Закрыть', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page).toHaveURL('http://localhost:4000/');
    await expect(
      constructor.getByText('Выберите начинку', { exact: true })
    ).toBeVisible();
  });

  test('оформление гостем ведёт на вход, после входа состав сохраняется и заказ виден в истории', async ({
    page,
    api,
  }) => {
    await api.useHar('scenarios/order-created');
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

  test('ошибка заказа не теряет конструктор, повторное оформление работает', async ({
    page,
    api,
  }) => {
    await authorize(page);
    await api.useHar('scenarios/order-error');
    await page.goto('/');
    await add(page, 'Космическая булка');
    await add(page, 'Метеоритная котлета');
    await page.getByRole('button', { name: 'Оформить заказ' }).click();
    await expect(page.getByRole('alert')).toContainText('Заказ не принят');
    await expect(page.getByText('250', { exact: true })).toBeVisible();
    await api.useHar('scenarios/order-created');
    await page.getByRole('button', { name: 'Оформить заказ' }).click();
    await expect(page.getByRole('dialog')).toContainText('124');
  });
});

test.describe('Авторизация и профиль', () => {
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

  test('регистрация создаёт сессию и закрывает гостевые страницы', async ({
    page,
    api,
  }) => {
    await api.useHar('scenarios/registered-user');
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
    await expect(
      page.getByRole('link', { name: 'Новый пользователь', exact: true })
    ).toBeVisible();
  });

  test('профиль: отмена возвращает данные, сохранение отправляет только изменения, выход закрывает профиль', async ({
    page,
    api,
  }) => {
    await authorize(page);
    await page.goto('/profile');
    const name = page.locator('input[name="name"]');
    await expect(name).toHaveValue('Никита');
    await expect(
      page.getByRole('button', { name: 'Сохранить', exact: true })
    ).toHaveCount(0);
    await name.fill('Другое имя');
    await page.getByRole('button', { name: 'Отменить', exact: true }).click();
    await expect(name).toHaveValue('Никита');
    await name.fill('Новое имя');
    await api.useHar('scenarios/profile-updated');
    await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Сохранить', exact: true })
    ).toHaveCount(0);
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

  test('просроченная сессия обновляется без показа формы входа', async ({
    page,
    api,
  }) => {
    await page.context().addCookies([
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
});

test.describe('Лента и история заказов', () => {
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
    await api.useHar('scenarios/orders-pending');
    await authorize(page);
    await page.goto('/profile/orders');
    await expect(page.getByText('Готовится', { exact: true })).toBeVisible();
    await api.useHar('api');
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

  test('оверлей заказа перекрывает карточки и не пропускает клик к другому заказу', async ({
    page,
    api,
  }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await api.useHar('scenarios/orders-multiple');
    await page.goto('/feed');
    const secondImage = page
      .getByRole('link', { name: /#000124/ })
      .locator('img')
      .first();
    const imageBox = await secondImage.boundingBox();
    expect(imageBox).not.toBeNull();
    const point = {
      x: imageBox!.x + imageBox!.width / 2,
      y: imageBox!.y + imageBox!.height / 2,
    };

    await page.getByRole('link', { name: /#000123/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    const modalBox = await page.getByRole('dialog').boundingBox();
    expect(point.x).toBeLessThan(modalBox!.x);
    const overlayReceivesClick = await page
      .getByTestId('modal-overlay')
      .evaluate(
        (overlay, { x, y }) => document.elementFromPoint(x, y) === overlay,
        point
      );
    expect(overlayReceivesClick).toBe(true);
    const overlayBox = await page.getByTestId('modal-overlay').boundingBox();
    expect(overlayBox).not.toBeNull();
    await page.getByTestId('modal-overlay').click({
      position: { x: point.x - overlayBox!.x, y: point.y - overlayBox!.y },
    });
    await expect(page).toHaveURL('http://localhost:4000/feed');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
});

test.describe('Маршрутизация', () => {
  test('неизвестный адрес показывает 404', async ({ page }) => {
    await page.goto('/unknown');
    await expect(
      page.getByText('Страница не найдена. Ошибка 404.', { exact: true })
    ).toBeVisible();
  });
});
