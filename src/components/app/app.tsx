import { AppHeader, IngredientDetails, Modal, OrderInfo } from '@components';
import {
  ConstructorPage,
  Feed,
  ForgotPassword,
  Login,
  NotFound404,
  Profile,
  ProfileOrders,
  Register,
  ResetPassword,
} from '@pages';
import { useEffect } from 'react';
import { Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';

import { fetchIngredients } from '@services/slices/ingredients-slice';
import { checkAuth } from '@services/slices/user-slice';
import { useDispatch } from '@services/store';

import { ProtectedRoute } from '../protected-route/protected-route';

import type { Location } from 'react-router-dom';

import '../../index.css';

import styles from './app.module.css';

const IngredientPage = (): React.JSX.Element => (
  <main className={styles.detailPageWrap}>
    <h1 className={`${styles.detailHeader} text text_type_main-large`}>
      Детали ингредиента
    </h1>
    <IngredientDetails />
  </main>
);

const OrderPage = (): React.JSX.Element => {
  const { number } = useParams();
  return (
    <main className={styles.detailPageWrap}>
      <h1 className={`${styles.detailHeader} text text_type_digits-default`}>
        #{number}
      </h1>
      <OrderInfo />
    </main>
  );
};

const App = (): React.JSX.Element => {
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { background?: Location } | null;
  const background = state?.background;
  const closeModal = (): void => {
    void navigate(-1);
  };

  useEffect(() => {
    void dispatch(fetchIngredients());
    void dispatch(checkAuth());
  }, [dispatch]);

  return (
    <div className={styles.app}>
      <AppHeader />
      <Routes location={background ?? location}>
        <Route path="/" element={<ConstructorPage />} />
        <Route path="/feed" element={<Feed />} />
        <Route
          path="/login"
          element={
            <ProtectedRoute onlyUnAuth>
              <Login />
            </ProtectedRoute>
          }
        />
        <Route
          path="/register"
          element={
            <ProtectedRoute onlyUnAuth>
              <Register />
            </ProtectedRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <ProtectedRoute onlyUnAuth>
              <ForgotPassword />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reset-password"
          element={
            <ProtectedRoute onlyUnAuth>
              <ResetPassword />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/orders"
          element={
            <ProtectedRoute>
              <ProfileOrders />
            </ProtectedRoute>
          }
        />
        <Route path="/ingredients/:id" element={<IngredientPage />} />
        <Route path="/feed/:number" element={<OrderPage />} />
        <Route
          path="/profile/orders/:number"
          element={
            <ProtectedRoute>
              <OrderPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFound404 />} />
      </Routes>
      {background && (
        <Routes>
          <Route
            path="/ingredients/:id"
            element={
              <Modal title="Детали ингредиента" onClose={closeModal}>
                <IngredientDetails />
              </Modal>
            }
          />
          <Route
            path="/feed/:number"
            element={
              <Modal title="Информация о заказе" onClose={closeModal}>
                <OrderInfo />
              </Modal>
            }
          />
          <Route
            path="/profile/orders/:number"
            element={
              <ProtectedRoute>
                <Modal title="Информация о заказе" onClose={closeModal}>
                  <OrderInfo />
                </Modal>
              </ProtectedRoute>
            }
          />
        </Routes>
      )}
    </div>
  );
};

export default App;
