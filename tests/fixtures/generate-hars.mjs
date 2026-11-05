import { mkdir, writeFile } from 'node:fs/promises';

import orderResponse from './order.json' with { type: 'json' };
import userResponse from './user.json' with { type: 'json' };

// Только вымышленные данные: генератор не обращается к настоящему API.
const apiUrl = 'https://norma.ffapi.ru/api';
const tokens = {
  accessToken: 'Bearer test-access',
  refreshToken: 'test-refresh',
};
const image = (color) =>
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="60"><rect width="120" height="60" rx="25" fill="${color}"/></svg>`
  );
const ingredients = [
  { _id: 'bun-1', name: 'Космическая булка', type: 'bun', price: 100 },
  { _id: 'bun-2', name: 'Вторая булка', type: 'bun', price: 150 },
  { _id: 'main-1', name: 'Метеоритная котлета', type: 'main', price: 50 },
  { _id: 'main-2', name: 'Лунный сыр', type: 'main', price: 30 },
  { _id: 'sauce-1', name: 'Соус комета', type: 'sauce', price: 20 },
].map((item, index) => ({
  ...item,
  proteins: 10 + index,
  fat: 5 + index,
  carbohydrates: 20 + index,
  calories: 200 + index * 40,
  image: image(['orange', 'gold', 'brown', 'yellow', 'red'][index]),
  image_mobile: image(['orange', 'gold', 'brown', 'yellow', 'red'][index]),
  image_large: image(['orange', 'gold', 'brown', 'yellow', 'red'][index]),
}));
const makeOrder = (number = 123, status = 'done') => ({
  ...orderResponse.order,
  _id: `order-${number}`,
  number,
  status,
});

const entry = (path, response, options = {}) => {
  const { method = 'GET', body, status = 200, authorization } = options;
  const headers = authorization ? [{ name: 'authorization', value: authorization }] : [];
  const text = JSON.stringify(response);
  const postData = body === undefined ? undefined : JSON.stringify(body);
  return {
    startedDateTime: '2026-10-24T10:00:00.000Z',
    time: 0,
    request: {
      method,
      url: `${apiUrl}${path}`,
      httpVersion: 'HTTP/1.1',
      cookies: [],
      headers,
      queryString: [],
      headersSize: -1,
      bodySize: postData ? Buffer.byteLength(postData) : 0,
      ...(postData && {
        postData: { mimeType: 'application/json', text: postData },
      }),
    },
    response: {
      status,
      statusText: {
        200: 'OK',
        401: 'Unauthorized',
        403: 'Forbidden',
        500: 'Internal Server Error',
      }[status],
      httpVersion: 'HTTP/1.1',
      cookies: [],
      headers: [
        { name: 'Content-Type', value: 'application/json; charset=utf-8' },
        { name: 'Access-Control-Allow-Origin', value: '*' },
      ],
      content: { size: Buffer.byteLength(text), mimeType: 'application/json', text },
      redirectURL: '',
      headersSize: -1,
      bodySize: Buffer.byteLength(text),
    },
    cache: {},
    timings: { send: 0, wait: 0, receive: 0 },
  };
};
const saveJson = (name, value) =>
  writeFile(new URL(name, import.meta.url), JSON.stringify(value, null, 2) + '\n');
const saveHar = (name, entries) =>
  saveJson(name, {
    log: {
      version: '1.2',
      creator: { name: 'Stellar Burger test fixtures', version: '1.0' },
      entries,
    },
  });
const ordersEntries = (orders) => [
  entry('/orders', { success: true, orders }, { authorization: tokens.accessToken }),
  entry('/orders/all', { success: true, orders, total: 100, totalToday: 10 }),
  ...orders.map((order) =>
    entry(`/orders/${order.number}`, { success: true, orders: [order] })
  ),
];
const orderBodies = [
  ['bun-1', 'main-1', 'bun-1'],
  ['bun-1', 'main-1', 'sauce-1', 'bun-1'],
];
const createOrderEntries = orderBodies.map((ingredients) =>
  entry(
    '/orders',
    {
      ...orderResponse,
      order: { ...orderResponse.order, ingredients },
    },
    { method: 'POST', body: { ingredients }, authorization: tokens.accessToken }
  )
);

await mkdir(new URL('scenarios/', import.meta.url), { recursive: true });
await Promise.all([
  saveJson('ingredients.json', { success: true, data: ingredients }),
  saveHar('ingredients.har', [
    entry('/ingredients', { success: true, data: ingredients }),
  ]),
  saveHar('api.har', [
    entry('/auth/user', userResponse, { authorization: tokens.accessToken }),
    entry(
      '/auth/user',
      { success: false, message: 'jwt expired' },
      {
        status: 403,
        authorization: 'Bearer expired',
      }
    ),
    entry(
      '/auth/login',
      { ...userResponse, ...tokens },
      {
        method: 'POST',
        body: { email: userResponse.user.email, password: 'password123' },
      }
    ),
    entry(
      '/auth/login',
      { success: false, message: 'Неверные данные' },
      {
        method: 'POST',
        status: 401,
        body: { email: userResponse.user.email, password: 'wrong' },
      }
    ),
    entry(
      '/auth/register',
      {
        success: true,
        ...tokens,
        user: { name: 'Новый пользователь', email: 'new@example.com' },
      },
      {
        method: 'POST',
        body: {
          name: 'Новый пользователь',
          email: 'new@example.com',
          password: 'password123',
        },
      }
    ),
    entry(
      '/auth/token',
      { success: true, ...tokens },
      {
        method: 'POST',
        body: { token: tokens.refreshToken },
      }
    ),
    entry(
      '/auth/logout',
      { success: true },
      {
        method: 'POST',
        body: { token: tokens.refreshToken },
      }
    ),
    entry(
      '/password-reset',
      { success: true },
      {
        method: 'POST',
        body: { email: userResponse.user.email },
      }
    ),
    entry(
      '/password-reset/reset',
      { success: true },
      {
        method: 'POST',
        body: { password: 'new-password123', token: '123456' },
      }
    ),
    ...createOrderEntries,
    ...ordersEntries([makeOrder()]),
  ]),
  saveHar('scenarios/profile-updated.har', [
    entry(
      '/auth/user',
      { success: true, user: { ...userResponse.user, name: 'Новое имя' } },
      {
        method: 'PATCH',
        body: { name: 'Новое имя' },
        authorization: tokens.accessToken,
      }
    ),
    entry(
      '/auth/user',
      { success: true, user: { ...userResponse.user, name: 'Новое имя' } },
      {
        authorization: tokens.accessToken,
      }
    ),
  ]),
  saveHar('scenarios/registered-user.har', [
    entry(
      '/auth/user',
      { success: true, user: { name: 'Новый пользователь', email: 'new@example.com' } },
      { authorization: tokens.accessToken }
    ),
  ]),
  saveHar('scenarios/order-created.har', [
    ...createOrderEntries,
    ...ordersEntries([makeOrder(124), makeOrder()]),
  ]),
  saveHar('scenarios/order-with-sauce.har', [
    createOrderEntries[1],
    ...ordersEntries([{ ...makeOrder(124), ingredients: orderBodies[1] }, makeOrder()]),
  ]),
  saveHar('scenarios/orders-pending.har', ordersEntries([makeOrder(123, 'pending')])),
  saveHar(
    'scenarios/orders-multiple.har',
    ordersEntries([makeOrder(), makeOrder(124), makeOrder(125)])
  ),
  saveHar(
    'scenarios/order-error.har',
    orderBodies.map((ingredients) =>
      entry(
        '/orders',
        { success: false, message: 'Заказ не принят' },
        {
          method: 'POST',
          status: 500,
          body: { ingredients },
          authorization: tokens.accessToken,
        }
      )
    )
  ),
  saveHar('scenarios/ingredients-error.har', [
    entry(
      '/ingredients',
      { success: false, message: 'Ошибка ингредиентов' },
      { status: 500 }
    ),
  ]),
]);
