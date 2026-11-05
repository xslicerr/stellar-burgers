import { getIngredientsApi } from '@api';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import type { RootState } from '../store';
import type { TIngredient } from '@utils-types';

type IngredientsState = {
  items: TIngredient[];
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;
};

const initialState: IngredientsState = {
  items: [],
  isLoading: false,
  isLoaded: false,
  error: null,
};

export const fetchIngredients = createAsyncThunk(
  'ingredients/fetch',
  getIngredientsApi,
  {
    condition: (_, { getState }) => {
      const { ingredients } = getState() as { ingredients: IngredientsState };
      return !ingredients.isLoading && !ingredients.isLoaded;
    },
  }
);

const ingredientsSlice = createSlice({
  name: 'ingredients',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchIngredients.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchIngredients.fulfilled, (state, action) => {
        state.items = action.payload;
        state.isLoading = false;
        state.isLoaded = true;
      })
      .addCase(fetchIngredients.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message ?? 'Не удалось загрузить ингредиенты';
      });
  },
});

export const ingredientsReducer = ingredientsSlice.reducer;
export const selectIngredientsState = (state: RootState): IngredientsState =>
  state.ingredients;
export const selectIngredients = (state: RootState): TIngredient[] =>
  state.ingredients.items;
