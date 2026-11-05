import { FeedInfoUI } from '@ui';

import { selectOrdersState } from '@services/slices/orders-slice';
import { useSelector } from '@services/store';

import type { TOrder } from '@utils-types';

const getOrders = (orders: TOrder[], status: string): number[] =>
  orders
    .filter((item) => item.status === status)
    .map((item) => item.number)
    .slice(0, 20);

export const FeedInfo = (): React.JSX.Element => {
  const { feed, feedLoading, feedError } = useSelector(selectOrdersState);
  return (
    <FeedInfoUI
      readyOrders={getOrders(feed.orders, 'done')}
      pendingOrders={feed.orders
        .filter((item) => item.status === 'pending' || item.status === 'created')
        .map((item) => item.number)
        .slice(0, 20)}
      feed={{ ...feed, isLoading: feedLoading, error: feedError }}
    />
  );
};
