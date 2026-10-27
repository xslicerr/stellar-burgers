import { BurgerIngredients, BurgerConstructor } from '@components';
import { Preloader } from '@ui';

import { RequestError } from '@components/request-error';
import {
  fetchIngredients,
  selectIngredientsState,
} from '@services/slices/ingredients-slice';
import { useDispatch, useSelector } from '@services/store';

import styles from './constructor-page.module.css';

export const ConstructorPage = (): React.JSX.Element => {
  const dispatch = useDispatch();
  const { isLoaded, error, items } = useSelector(selectIngredientsState);
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
  if (!items.length)
    return <p className="text text_type_main-default mt-10">Нет ингредиентов</p>;
  return (
    <main className={styles.containerMain}>
      <h1 className={`${styles.title} text text_type_main-large mt-10 mb-5 pl-5`}>
        Соберите бургер
      </h1>
      <div className={`${styles.main} pl-5 pr-5`}>
        <BurgerIngredients />
        <BurgerConstructor />
      </div>
    </main>
  );
};
