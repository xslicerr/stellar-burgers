import { fetchIngredients, ingredientsReducer } from './ingredients-slice';

import type { TIngredient } from '@utils-types';

const ingredient: TIngredient = {
  _id: 'main-1',
  name: 'Метеоритная котлета',
  type: 'main',
  proteins: 10,
  fat: 5,
  carbohydrates: 20,
  calories: 200,
  price: 50,
  image: '',
  image_large: '',
  image_mobile: '',
};
const initialState = {
  items: [],
  isLoading: false,
  isLoaded: false,
  error: null,
};

describe('Редьюсер ингредиентов', () => {
  test('неизвестный экшен с undefined возвращает начальное состояние', () => {
    expect(ingredientsReducer(undefined, { type: 'UNKNOWN' })).toEqual(initialState);
  });

  test('неизвестный экшен сохраняет существующее состояние', () => {
    const state = { ...initialState, items: [ingredient], isLoaded: true };
    expect(ingredientsReducer(state, { type: 'UNKNOWN' })).toBe(state);
  });

  test('pending включает загрузку, сбрасывает ошибку и сохраняет ингредиенты', () => {
    const state = { ...initialState, items: [ingredient], error: 'Нет сети' };
    expect(ingredientsReducer(state, fetchIngredients.pending('request'))).toEqual({
      ...initialState,
      items: [ingredient],
      isLoading: true,
    });
    expect(state.error).toBe('Нет сети');
    expect(state.isLoading).toBe(false);
  });

  test('fulfilled заменяет массив ответом сервера и завершает загрузку', () => {
    const state = {
      ...initialState,
      items: [{ ...ingredient, _id: 'old' }],
      isLoading: true,
    };
    expect(
      ingredientsReducer(state, fetchIngredients.fulfilled([ingredient], 'request'))
    ).toEqual({ ...initialState, items: [ingredient], isLoaded: true });
    expect(state.items[0]._id).toBe('old');
  });

  test('fulfilled корректно сохраняет пустой ответ', () => {
    const state = { ...initialState, items: [ingredient], isLoading: true };
    expect(ingredientsReducer(state, fetchIngredients.fulfilled([], 'request'))).toEqual(
      { ...initialState, isLoaded: true }
    );
  });

  test('rejected сохраняет сообщение ошибки и снимает загрузку', () => {
    const state = { ...initialState, items: [ingredient], isLoading: true };
    expect(
      ingredientsReducer(
        state,
        fetchIngredients.rejected(new Error('Нет сети'), 'request')
      )
    ).toEqual({ ...initialState, items: [ingredient], error: 'Нет сети' });
  });

  test('rejected без сообщения использует текст ошибки по умолчанию', () => {
    expect(
      ingredientsReducer(
        { ...initialState, isLoading: true },
        { type: fetchIngredients.rejected.type, error: {} }
      )
    ).toEqual({ ...initialState, error: 'Не удалось загрузить ингредиенты' });
  });
});
