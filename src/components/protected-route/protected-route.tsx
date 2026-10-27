import { Preloader } from '@ui';
import { Navigate, useLocation } from 'react-router-dom';

import { selectUserState } from '@services/slices/user-slice';
import { useSelector } from '@services/store';

import type { Location } from 'react-router-dom';

type TProtectedRouteProps = {
  children: React.JSX.Element;
  onlyUnAuth?: boolean;
};

export const ProtectedRoute = ({
  children,
  onlyUnAuth = false,
}: TProtectedRouteProps): React.JSX.Element => {
  const { data: user, isAuthChecked } = useSelector(selectUserState);
  const location = useLocation();
  const state = location.state as { from?: Location } | null;
  if (!isAuthChecked) return <Preloader />;
  if (!onlyUnAuth && !user)
    return <Navigate to="/login" replace state={{ from: location }} />;
  if (onlyUnAuth && user) {
    const from = state?.from;
    return (
      <Navigate to={from ? `${from.pathname}${from.search}${from.hash}` : '/'} replace />
    );
  }
  return children;
};
