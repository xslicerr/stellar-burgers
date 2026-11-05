import {
  addIngredient,
  clearConstructor,
  constructorReducer,
  moveIngredient,
  removeIngredient,
} from './constructor-slice';

import type { TIngredient } from '@utils-types';

const ingredient: TIngredient = {
  _id: 'filling',
  name: 'Начинка',
  type: 'main',
  price: 100,
  proteins: 1,
  fat: 2,
  carbohydrates: 3,
  calories: 4,
  image: '',
  image_large: '',
  image_mobile: '',
};

describe('Конструктор бургера', () => {
  describe('Начальное состояние', () => {
    test('неизвестный экшен с undefined возвращает начальное состояние', () => {
      expect(constructorReducer(undefined, { type: 'UNKNOWN' })).toEqual({
        bun: null,
        ingredients: [],
      });
    });
  });

  describe('Добавление ингредиентов', () => {
    test('добавление начинки сохраняет её данные и присваивает id', () => {
      const action = addIngredient(ingredient);
      expect(action.payload.id).toEqual(expect.any(String));
      expect(action.payload.id).not.toBe('');
      expect(constructorReducer(undefined, action)).toEqual({
        bun: null,
        ingredients: [action.payload],
      });
      expect(ingredient).not.toHaveProperty('id');
    });

    test('добавление соуса сохраняет булку и существующую начинку', () => {
      let state = constructorReducer(
        undefined,
        addIngredient({ ...ingredient, type: 'bun', _id: 'bun' })
      );
      state = constructorReducer(state, addIngredient(ingredient));
      const action = addIngredient({ ...ingredient, type: 'sauce', _id: 'sauce' });
      expect(constructorReducer(state, action)).toEqual({
        bun: state.bun,
        ingredients: [...state.ingredients, action.payload],
      });
      expect(state.ingredients).toHaveLength(1);
    });

    test('булка заменяет предыдущую и не попадает в начинку', () => {
      let state = constructorReducer(
        undefined,
        addIngredient({ ...ingredient, _id: 'bun1', type: 'bun' })
      );
      state = constructorReducer(
        state,
        addIngredient({ ...ingredient, _id: 'bun2', type: 'bun' })
      );
      expect(state.bun?._id).toBe('bun2');
      expect(state.ingredients).toEqual([]);
    });
  });

  describe('Удаление ингредиентов', () => {
    test('одинаковые ингредиенты имеют разные id; удаляется только выбранный экземпляр', () => {
      let state = constructorReducer(undefined, addIngredient(ingredient));
      state = constructorReducer(state, addIngredient(ingredient));
      expect(state.ingredients[0].id).not.toBe(state.ingredients[1].id);
      const retainedId = state.ingredients[1].id;
      state = constructorReducer(state, removeIngredient(state.ingredients[0].id));
      expect(state.ingredients.map((item) => item.id)).toEqual([retainedId]);
    });

    test('удаление неизвестного id не меняет состав бургера', () => {
      const state = constructorReducer(undefined, addIngredient(ingredient));
      expect(constructorReducer(state, removeIngredient('missing'))).toEqual(state);
    });
  });

  describe('Перемещение ингредиентов', () => {
    test('перемещение вниз меняет порядок и сохраняет состав', () => {
      let state = constructorReducer(undefined, addIngredient(ingredient));
      state = constructorReducer(state, addIngredient({ ...ingredient, _id: 'second' }));
      state = constructorReducer(state, moveIngredient({ from: 0, to: 1 }));
      expect(state.ingredients.map((item) => item._id)).toEqual(['second', 'filling']);
    });

    test('отрицательная целевая позиция не меняет три начинки и булку', () => {
      const state = {
        bun: { ...ingredient, type: 'bun', _id: 'bun', id: 'bun-instance' },
        ingredients: [
          { ...ingredient, _id: 'first', id: 'first-instance' },
          { ...ingredient, _id: 'second', id: 'second-instance' },
          { ...ingredient, _id: 'third', id: 'third-instance' },
        ],
      };
      // На двух элементах splice(0, 1), затем splice(-1, 0, item)
      // случайно восстанавливают исходный порядок. На трёх ошибка становится видна.
      const result = constructorReducer(state, moveIngredient({ from: 0, to: -1 }));
      expect(result).toBe(state);
      expect(result).toEqual({
        bun: state.bun,
        ingredients: [
          { ...ingredient, _id: 'first', id: 'first-instance' },
          { ...ingredient, _id: 'second', id: 'second-instance' },
          { ...ingredient, _id: 'third', id: 'third-instance' },
        ],
      });
    });

    test.each([
      { from: -1, to: 0 },
      { from: 2, to: 0 },
      { from: 0, to: 2 },
      { from: 1, to: 1 },
    ])('перемещение %j не меняет порядок', (positions) => {
      let state = constructorReducer(undefined, addIngredient(ingredient));
      state = constructorReducer(state, addIngredient({ ...ingredient, _id: 'second' }));
      expect(constructorReducer(state, moveIngredient(positions))).toEqual(state);
    });

    test('перемещение вверх сохраняет экземпляры и исходное состояние', () => {
      let state = constructorReducer(undefined, addIngredient(ingredient));
      state = constructorReducer(state, addIngredient({ ...ingredient, _id: 'second' }));
      const [first, second] = state.ingredients;
      expect(constructorReducer(state, moveIngredient({ from: 1, to: 0 }))).toEqual({
        bun: null,
        ingredients: [second, first],
      });
      expect(state.ingredients).toEqual([first, second]);
      expect(constructorReducer(state, { type: 'UNKNOWN' })).toBe(state);
    });
  });

  describe('Очистка конструктора', () => {
    test('очистка возвращает пустой конструктор', () => {
      let state = constructorReducer(
        undefined,
        addIngredient({ ...ingredient, _id: 'bun', type: 'bun' })
      );
      state = constructorReducer(state, addIngredient(ingredient));
      expect(constructorReducer(state, clearConstructor())).toEqual({
        bun: null,
        ingredients: [],
      });
    });
  });
});
