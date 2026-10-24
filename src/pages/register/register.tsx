import { RegisterUI } from '@ui-pages';
import { useEffect, useState } from 'react';

import { clearUserError, register, selectUserState } from '@services/slices/user-slice';
import { useDispatch, useSelector } from '@services/store';

import type { SyntheticEvent } from 'react';

export const Register = (): React.JSX.Element => {
  const dispatch = useDispatch();
  const { error, isLoading } = useSelector(selectUserState);
  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  useEffect(() => {
    dispatch(clearUserError());
  }, [dispatch]);
  const handleSubmit = (event: SyntheticEvent): void => {
    event.preventDefault();
    if (!isLoading) void dispatch(register({ name: userName, email, password }));
  };
  return (
    <RegisterUI
      errorText={error ?? undefined}
      isLoading={isLoading}
      email={email}
      userName={userName}
      password={password}
      setEmail={setEmail}
      setPassword={setPassword}
      setUserName={setUserName}
      handleSubmit={handleSubmit}
    />
  );
};
