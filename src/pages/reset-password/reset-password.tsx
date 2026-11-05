import { ResetPasswordUI } from '@ui-pages';
import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import {
  clearUserError,
  resetPassword,
  selectUserState,
} from '@services/slices/user-slice';
import { useDispatch, useSelector } from '@services/store';

import type { SyntheticEvent } from 'react';

export const ResetPassword = (): React.JSX.Element => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { error, isLoading } = useSelector(selectUserState);
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  useEffect(() => {
    dispatch(clearUserError());
  }, [dispatch]);
  const handleSubmit = (event: SyntheticEvent): void => {
    event.preventDefault();
    if (isLoading) return;
    void dispatch(resetPassword({ password, token }))
      .unwrap()
      .then(() => {
        void navigate('/login', { replace: true });
      })
      .catch(() => {
        /* Ошибка запроса уже сохранена в слайсе. */
      });
  };
  if (!sessionStorage.getItem('resetPassword'))
    return <Navigate to="/forgot-password" replace />;
  return (
    <ResetPasswordUI
      errorText={error ?? undefined}
      isLoading={isLoading}
      password={password}
      token={token}
      setPassword={setPassword}
      setToken={setToken}
      handleSubmit={handleSubmit}
    />
  );
};
