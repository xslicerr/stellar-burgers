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
  test('одинаковые ингредиенты имеют разные id; удаляется только выбранный экземпляр', () => {
    let state = constructorReducer(undefined, addIngredient(ingredient));
    state = constructorReducer(state, addIngredient(ingredient));
    expect(state.ingredients[0].id).not.toBe(state.ingredients[1].id);
    const retainedId = state.ingredients[1].id;
    state = constructorReducer(state, removeIngredient(state.ingredients[0].id));
    expect(state.ingredients.map((item) => item.id)).toEqual([retainedId]);
  });
  test('перестановка сохраняет состав, выход за границы ничего не меняет', () => {
    let state = constructorReducer(undefined, addIngredient(ingredient));
    state = constructorReducer(state, addIngredient({ ...ingredient, _id: 'second' }));
    state = constructorReducer(state, moveIngredient({ from: 0, to: 1 }));
    expect(state.ingredients.map((item) => item._id)).toEqual(['second', 'filling']);
    expect(constructorReducer(state, moveIngredient({ from: 0, to: -1 }))).toEqual(
      state
    );
  });
  test('очистка возвращает пустой конструктор', () => {
    const state = constructorReducer(undefined, addIngredient(ingredient));
    expect(constructorReducer(state, clearConstructor())).toEqual({
      bun: null,
      ingredients: [],
    });
  });
});
