import { IngredientDetailsUI, Preloader } from '@ui';
import { useParams } from 'react-router-dom';

import {
  selectIngredientsState,
  fetchIngredients,
} from '@services/slices/ingredients-slice';
import { useDispatch, useSelector } from '@services/store';

import { RequestError } from '../request-error';

export const IngredientDetails = (): React.JSX.Element => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { items, isLoaded, error } = useSelector(selectIngredientsState);
  if (error)
    return (
      <RequestError
        message={error}
        onRetry={() => {
          void dispatch(fetchIngredients());
        }}
      />
    );
  if (!isLoaded) return <Preloader />;
  const ingredientData = items.find((item) => item._id === id);
  if (!ingredientData)
    return <p className="text text_type_main-default mt-10">Ингредиент не найден</p>;
  return <IngredientDetailsUI ingredientData={ingredientData} />;
};
