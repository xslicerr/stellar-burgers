import { ProfileMenu, OrdersList } from '@components';

import type { ProfileOrdersUIProps } from './type';

import styles from './profile-orders.module.css';

export const ProfileOrdersUI = ({ orders }: ProfileOrdersUIProps): React.JSX.Element => (
  <main className={`${styles.main}`}>
    <div className={`mt-30 mr-15 ${styles.menu}`}>
      <ProfileMenu />
    </div>
    <div className={`mt-10 ${styles.orders}`}>
      {!orders.length && (
        <p className="text text_type_main-default">
          Вы пока не сделали ни одного заказа
        </p>
      )}
      <OrdersList orders={orders} />
    </div>
  </main>
);
