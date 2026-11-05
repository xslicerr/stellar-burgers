import { Preloader } from '@ui';
import { FeedUI } from '@ui-pages';

import { RequestError } from '@components/request-error';
import {
  fetchIngredients,
  selectIngredientsState,
} from '@services/slices/ingredients-slice';
import { fetchFeed, selectOrdersState } from '@services/slices/orders-slice';
import { useDispatch, useSelector } from '@services/store';
import { useOrdersUpdates } from '@services/use-orders-updates';

export const Feed = (): React.JSX.Element => {
  const dispatch = useDispatch();
  const { feed, feedLoaded, feedError } = useSelector(selectOrdersState);
  const ingredients = useSelector(selectIngredientsState);
  useOrdersUpdates('feed');
  const handleGetFeeds = (): void => {
    void dispatch(fetchFeed());
  };
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
  if (!feedLoaded) {
    if (feedError) return <RequestError message={feedError} onRetry={handleGetFeeds} />;
    return <Preloader />;
  }
  return (
    <>
      {feedError && <RequestError message={feedError} onRetry={handleGetFeeds} />}
      <FeedUI orders={feed.orders} handleGetFeeds={handleGetFeeds} />
    </>
  );
};
