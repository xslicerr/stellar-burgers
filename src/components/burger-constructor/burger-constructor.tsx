import { BurgerConstructorUI } from '@ui';
import { useLocation, useNavigate } from 'react-router-dom';

import { selectConstructor } from '@services/slices/constructor-slice';
import {
  closeOrder,
  createOrder,
  selectOrdersState,
} from '@services/slices/orders-slice';
import { selectUser } from '@services/slices/user-slice';
import { useDispatch, useSelector } from '@services/store';

import { RequestError } from '../request-error';

import styles from './burger-constructor.module.css';

export const BurgerConstructor = (): React.JSX.Element => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const constructorItems = useSelector(selectConstructor);
  const user = useSelector(selectUser);
  const { orderRequest, orderModalData, orderError } = useSelector(selectOrdersState);

  const onOrderClick = (): void => {
    if (orderRequest) return;
    if (!user) {
      void navigate('/login', { state: { from: location } });
      return;
    }
    if (!constructorItems.bun) return;
    const ids = [
      constructorItems.bun._id,
      ...constructorItems.ingredients.map((item) => item._id),
      constructorItems.bun._id,
    ];
    void dispatch(createOrder(ids));
  };
  const closeOrderModal = (): void => {
    if (!orderRequest) dispatch(closeOrder());
  };
  const price =
    (constructorItems.bun?.price ?? 0) * 2 +
    constructorItems.ingredients.reduce((total, item) => total + item.price, 0);

  return (
    <div className={styles.container}>
      <BurgerConstructorUI
        price={price}
        orderRequest={orderRequest}
        constructorItems={constructorItems}
        orderModalData={orderModalData}
        onOrderClick={onOrderClick}
        closeOrderModal={closeOrderModal}
      />
      {orderError && <RequestError message={orderError} />}
    </div>
  );
};
