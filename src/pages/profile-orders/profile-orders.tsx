import { Preloader } from '@ui';
import { ProfileOrdersUI } from '@ui-pages';

import { RequestError } from '@components/request-error';
import {
  fetchIngredients,
  selectIngredientsState,
} from '@services/slices/ingredients-slice';
import { fetchUserOrders, selectOrdersState } from '@services/slices/orders-slice';
import { useDispatch, useSelector } from '@services/store';
import { useOrdersUpdates } from '@services/use-orders-updates';

export const ProfileOrders = (): React.JSX.Element => {
  const dispatch = useDispatch();
  const { userOrders, userOrdersLoaded, userOrdersError } =
    useSelector(selectOrdersState);
  const ingredients = useSelector(selectIngredientsState);
  useOrdersUpdates('user');
  if (!ingredients.isLoaded) {
    if (ingredients.error)
      return (
        <RequestError
          message={ingredients.error}
          onRetry={() => {
            void dispatch(fetchIngredients());
          }}
        />
      );
    return <Preloader />;
  }
  if (!userOrdersLoaded) {
    if (userOrdersError)
      return (
        <RequestError
          message={userOrdersError}
          onRetry={() => {
            void dispatch(fetchUserOrders());
          }}
        />
      );
    return <Preloader />;
  }
  return (
    <>
      {userOrdersError && <RequestError message={userOrdersError} />}
      <ProfileOrdersUI orders={userOrders} />
    </>
  );
};
