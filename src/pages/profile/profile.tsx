import { ProfileUI } from '@ui-pages';
import { useEffect, useState } from 'react';

import {
  clearUserError,
  selectUserState,
  updateUser,
} from '@services/slices/user-slice';
import { useDispatch, useSelector } from '@services/store';

import type { ChangeEvent, SyntheticEvent } from 'react';

export const Profile = (): React.JSX.Element | null => {
  const dispatch = useDispatch();
  const { data: user, error, isLoading } = useSelector(selectUserState);
  const [formValue, setFormValue] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
    password: '',
  });

  useEffect(() => {
    setFormValue({ name: user?.name ?? '', email: user?.email ?? '', password: '' });
  }, [user]);
  useEffect(() => {
    dispatch(clearUserError());
  }, [dispatch]);
  if (!user) return null;

  const isFormChanged =
    formValue.name !== user.name ||
    formValue.email !== user.email ||
    !!formValue.password;
  const handleSubmit = (event: SyntheticEvent): void => {
    event.preventDefault();
    if (isLoading || !isFormChanged) return;
    const changes = {
      ...(formValue.name !== user.name ? { name: formValue.name } : {}),
      ...(formValue.email !== user.email ? { email: formValue.email } : {}),
      ...(formValue.password ? { password: formValue.password } : {}),
    };
    void dispatch(updateUser(changes));
  };
  const handleCancel = (event: SyntheticEvent): void => {
    event.preventDefault();
    setFormValue({ name: user.name, email: user.email, password: '' });
    dispatch(clearUserError());
  };
  const handleInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setFormValue((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));
  };
  return (
    <ProfileUI
      formValue={formValue}
      isFormChanged={isFormChanged}
      isLoading={isLoading}
      updateUserError={error ?? undefined}
      handleCancel={handleCancel}
      handleSubmit={handleSubmit}
      handleInputChange={handleInputChange}
    />
  );
};
