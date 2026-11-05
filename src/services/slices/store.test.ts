import { getFeedsApi, getIngredientsApi, getOrdersApi, orderBurgerApi } from '@api';
import { configureStore } from '@reduxjs/toolkit';

import { rootReducer } from '../rootReducer';
import { addIngredient } from './constructor-slice';
import { fetchIngredients } from './ingredients-slice';
import { createOrder, fetchOrder, fetchUserOrders, ordersReducer } from './orders-slice';
import { logout } from './user-slice';

import type { TIngredient, TOrder } from '@utils-types';

jest.mock('@api', () => ({
  getIngredientsApi: jest.fn(),
  getFeedsApi: jest.fn(),
  getOrdersApi: jest.fn(),
  orderBurgerApi: jest.fn(),
  getOrderByNumberApi: jest.fn(),
  forgotPasswordApi: jest.fn(),
  getUserApi: jest.fn(),
  loginUserApi: jest.fn(),
  logoutApi: jest.fn(),
  refreshToken: jest.fn(),
  registerUserApi: jest.fn(),
  resetPasswordApi: jest.fn(),
  updateUserApi: jest.fn(),
}));

const ingredient: TIngredient = {
  _id: 'bun',
  name: 'Булка',
  type: 'bun',
  price: 100,
  proteins: 1,
  fat: 2,
  carbohydrates: 3,
  calories: 4,
  image: '',
  image_large: '',
  image_mobile: '',
};
const order: TOrder = {
  _id: 'order',
  number: 123,
  name: 'Бургер',
  status: 'done',
  createdAt: '2026-10-24T10:00:00Z',
  updatedAt: '2026-10-24T10:00:00Z',
  ingredients: ['bun', 'bun'],
};

beforeEach(() => {
  jest.resetAllMocks();
  jest
    .mocked(getFeedsApi)
    .mockResolvedValue({ success: true, orders: [], total: 0, totalToday: 0 });
});

test('загрузка ингредиентов сохраняет ответ и не дублирует запрос после успеха', async () => {
  jest.mocked(getIngredientsApi).mockResolvedValue([ingredient]);
  const store = configureStore({ reducer: rootReducer });
  await store.dispatch(fetchIngredients());
  await store.dispatch(fetchIngredients());
  expect(getIngredientsApi).toHaveBeenCalledTimes(1);
  expect(store.getState().ingredients).toMatchObject({
    items: [ingredient],
    isLoaded: true,
    isLoading: false,
    error: null,
  });
});

test('ошибка загрузки снимает лоадер и позволяет повторить запрос', async () => {
  jest
    .mocked(getIngredientsApi)
    .mockRejectedValueOnce(new Error('Нет сети'))
    .mockResolvedValueOnce([ingredient]);
  const store = configureStore({ reducer: rootReducer });
  await store.dispatch(fetchIngredients());
  expect(store.getState().ingredients).toMatchObject({
    isLoading: false,
    isLoaded: false,
    error: 'Нет сети',
  });
  await store.dispatch(fetchIngredients());
  expect(store.getState().ingredients.isLoaded).toBe(true);
});

test('неудачный заказ сохраняет собранный бургер', async () => {
  jest.mocked(orderBurgerApi).mockRejectedValue(new Error('Сервер недоступен'));
  const store = configureStore({ reducer: rootReducer });
  store.dispatch(addIngredient(ingredient));
  await store.dispatch(createOrder(['bun', 'bun']));
  expect(store.getState().burgerConstructor.bun?._id).toBe('bun');
  expect(store.getState().orders).toMatchObject({
    orderRequest: false,
    orderError: 'Сервер недоступен',
  });
});

test('успешный заказ очищает конструктор и сохраняет номер', async () => {
  jest
    .mocked(orderBurgerApi)
    .mockResolvedValue({ success: true, name: order.name, order });
  jest.mocked(getOrdersApi).mockResolvedValue([order]);
  const store = configureStore({ reducer: rootReducer });
  store.dispatch(addIngredient(ingredient));
  await store.dispatch(createOrder(['bun', 'bun']));
  expect(store.getState().burgerConstructor.bun).toBeNull();
  expect(store.getState().orders.orderModalData?.number).toBe(123);
});

test('повторное нажатие во время оформления не создаёт второй запрос', async () => {
  let resolveOrder!: (value: { success: boolean; name: string; order: TOrder }) => void;
  jest.mocked(orderBurgerApi).mockImplementation(
    () =>
      new Promise((resolve) => {
        resolveOrder = resolve;
      })
  );
  jest.mocked(getOrdersApi).mockResolvedValue([order]);
  const store = configureStore({ reducer: rootReducer });
  const first = store.dispatch(createOrder(['bun', 'bun']));
  const second = store.dispatch(createOrder(['bun', 'bun']));
  expect(orderBurgerApi).toHaveBeenCalledTimes(1);
  resolveOrder({ success: true, name: order.name, order });
  await Promise.all([first, second]);
  expect(store.getState().orders.orderRequest).toBe(false);
});

test('запоздавший ответ истории не возвращает приватные данные после выхода', () => {
  let state = ordersReducer(undefined, fetchUserOrders.pending('request'));
  state = ordersReducer(state, logout.fulfilled(undefined, 'logout'));
  state = ordersReducer(state, fetchUserOrders.fulfilled([order], 'request'));
  expect(state.userOrders).toEqual([]);
});

test('старый ответ деталей не перезаписывает новый открытый заказ', () => {
  let state = ordersReducer(undefined, fetchOrder.pending('old', 123));
  state = ordersReducer(state, fetchOrder.pending('new', 124));
  state = ordersReducer(state, fetchOrder.fulfilled(order, 'old', 123));
  expect(state.currentNumber).toBe(124);
  expect(state.currentOrder).toBeNull();
});
