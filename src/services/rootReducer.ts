import { combineReducers } from '@reduxjs/toolkit';

import { constructorReducer } from './slices/constructor-slice';
import { ingredientsReducer } from './slices/ingredients-slice';
import { ordersReducer } from './slices/orders-slice';
import { userReducer } from './slices/user-slice';

export const rootReducer = combineReducers({
  ingredients: ingredientsReducer,
  burgerConstructor: constructorReducer,
  user: userReducer,
  orders: ordersReducer,
});
