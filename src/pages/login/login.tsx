import { LoginUI } from '@ui-pages';
import { useEffect, useState } from 'react';

import { clearUserError, login, selectUserState } from '@services/slices/user-slice';
import { useDispatch, useSelector } from '@services/store';

import type { SyntheticEvent } from 'react';

export const Login = (): React.JSX.Element => {
  const dispatch = useDispatch();
  const { error, isLoading } = useSelector(selectUserState);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  useEffect(() => {
    dispatch(clearUserError());
  }, [dispatch]);
  const handleSubmit = (event: SyntheticEvent): void => {
    event.preventDefault();
    if (!isLoading) void dispatch(login({ email, password }));
  };
  return (
    <LoginUI
      errorText={error ?? undefined}
      isLoading={isLoading}
      email={email}
      password={password}
      setEmail={setEmail}
      setPassword={setPassword}
      handleSubmit={handleSubmit}
    />
  );
};
