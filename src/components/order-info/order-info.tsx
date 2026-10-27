import { Preloader, OrderInfoUI } from '@ui';
import { useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';

import {
  fetchIngredients,
  selectIngredientsState,
} from '@services/slices/ingredients-slice';
import { fetchOrder, selectOrdersState } from '@services/slices/orders-slice';
import { useDispatch, useSelector } from '@services/store';

import { RequestError } from '../request-error';

import type { TIngredient } from '@utils-types';

export const OrderInfo = (): React.JSX.Element => {
  const { number } = useParams();
  const orderNumber = Number(number);
  const dispatch = useDispatch();
  const ingredientsState = useSelector(selectIngredientsState);
  const { feed, userOrders, currentOrder, currentNumber, detailError } =
    useSelector(selectOrdersState);
  const liveOrder =
    userOrders.find((order) => order.number === orderNumber) ??
    feed.orders.find((order) => order.number === orderNumber);
  const loadedOrder = currentNumber === orderNumber ? currentOrder : null;
  const orderData =
    loadedOrder &&
    (!liveOrder || new Date(loadedOrder.updatedAt) >= new Date(liveOrder.updatedAt))
      ? loadedOrder
      : liveOrder;

  useEffect(() => {
    if (!Number.isInteger(orderNumber) || orderNumber <= 0) return;
    void dispatch(fetchOrder(orderNumber));
    const interval = setInterval(() => {
      void dispatch(fetchOrder(orderNumber));
    }, 15000);
    return (): void => {
      clearInterval(interval);
    };
  }, [dispatch, orderNumber]);

  const orderInfo = useMemo(() => {
    if (!orderData || !ingredientsState.isLoaded) return null;
    const ingredientsInfo: Record<string, TIngredient & { count: number }> = {};
    for (const id of orderData.ingredients) {
      if (ingredientsInfo[id]) ingredientsInfo[id].count++;
      else {
        const ingredient = ingredientsState.items.find((item) => item._id === id);
        if (ingredient) ingredientsInfo[id] = { ...ingredient, count: 1 };
      }
    }
    return {
      ...orderData,
      ingredientsInfo,
      date: new Date(orderData.createdAt),
      total: Object.values(ingredientsInfo).reduce(
        (total, item) => total + item.price * item.count,
        0
      ),
    };
  }, [orderData, ingredientsState]);

  if (!Number.isInteger(orderNumber) || orderNumber <= 0)
    return <RequestError message="Некорректный номер заказа" />;
  if (ingredientsState.error)
    return (
      <RequestError
        message={ingredientsState.error}
        onRetry={() => {
          void dispatch(fetchIngredients());
        }}
      />
    );
  if (!orderInfo && detailError && currentNumber === orderNumber)
    return (
      <RequestError
        message={detailError}
        onRetry={() => {
          void dispatch(fetchOrder(orderNumber));
        }}
      />
    );
  if (!orderInfo) return <Preloader />;
  return <OrderInfoUI orderInfo={orderInfo} />;
};
