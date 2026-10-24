import { useEffect } from 'react';

import { fetchFeed, fetchUserOrders } from './slices/orders-slice';
import { useDispatch } from './store';

// Сервер задания предоставляет REST API. Обновляем открытую страницу каждые
// пять секунд; после создания заказа оба списка обновляются немедленно в thunk.
export const useOrdersUpdates = (scope: 'feed' | 'user'): void => {
  const dispatch = useDispatch();
  useEffect(() => {
    const reload = (): void => {
      if (scope === 'feed') void dispatch(fetchFeed());
      else void dispatch(fetchUserOrders());
    };
    const handleVisibility = (): void => {
      if (document.visibilityState === 'visible') reload();
    };
    reload();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') reload();
    }, 5000);
    document.addEventListener('visibilitychange', handleVisibility);
    return (): void => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [dispatch, scope]);
};
