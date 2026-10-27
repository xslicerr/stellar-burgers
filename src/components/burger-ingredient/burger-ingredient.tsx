import { BurgerIngredientUI } from '@ui';
import { memo } from 'react';
import { useLocation } from 'react-router-dom';

import { addIngredient } from '@services/slices/constructor-slice';
import { useDispatch } from '@services/store';

import type { TBurgerIngredientProps } from './type';

export const BurgerIngredient = memo(function BurgerIngredient({
  ingredient,
  count,
}: TBurgerIngredientProps): React.JSX.Element {
  const location = useLocation();
  const dispatch = useDispatch();

  const handleAdd = (): void => {
    dispatch(addIngredient(ingredient));
  };

  return (
    <BurgerIngredientUI
      ingredient={ingredient}
      count={count}
      locationState={{ background: location }}
      handleAdd={handleAdd}
    />
  );
});
