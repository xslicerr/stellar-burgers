import { ProfileMenuUI } from '@ui';
import { useLocation } from 'react-router-dom';

import { logout, selectUserState } from '@services/slices/user-slice';
import { useDispatch, useSelector } from '@services/store';

export const ProfileMenu = (): React.JSX.Element => {
  const { pathname } = useLocation();
  const dispatch = useDispatch();
  const { isLoading } = useSelector(selectUserState);
  const handleLogout = (): void => {
    if (!isLoading) void dispatch(logout());
  };
  return <ProfileMenuUI handleLogout={handleLogout} pathname={pathname} />;
};
