import {
  forgotPasswordApi,
  getUserApi,
  loginUserApi,
  logoutApi,
  refreshToken,
  registerUserApi,
  resetPasswordApi,
  updateUserApi,
} from '@api';
import { createAsyncThunk, createSlice, isAnyOf } from '@reduxjs/toolkit';

import { deleteCookie, getCookie, setCookie } from '@utils/cookie';

import type { RootState } from '../store';
import type { TLoginData, TRegisterData } from '@api';
import type { TUser } from '@utils-types';

type UserState = {
  data: TUser | null;
  isAuthChecked: boolean;
  isChecking: boolean;
  isLoading: boolean;
  error: string | null;
};

const initialState: UserState = {
  data: null,
  isAuthChecked: false,
  isChecking: false,
  isLoading: false,
  error: null,
};

const clearTokens = (): void => {
  deleteCookie('accessToken');
  localStorage.removeItem('refreshToken');
};

const saveSession = (data: {
  accessToken: string;
  refreshToken: string;
  user: TUser;
}): TUser => {
  setCookie('accessToken', data.accessToken, { sameSite: 'Lax' });
  localStorage.setItem('refreshToken', data.refreshToken);
  return data.user;
};

export const checkAuth = createAsyncThunk(
  'user/checkAuth',
  async (): Promise<TUser | null> => {
    if (!getCookie('accessToken') && !localStorage.getItem('refreshToken')) return null;
    try {
      if (!getCookie('accessToken')) await refreshToken();
      return (await getUserApi()).user;
    } catch {
      clearTokens();
      return null;
    }
  },
  {
    condition: (_, { getState }) => {
      const { user } = getState() as { user: UserState };
      return !user.isChecking && !user.isAuthChecked;
    },
  }
);

export const login = createAsyncThunk(
  'user/login',
  async (data: TLoginData): Promise<TUser> => saveSession(await loginUserApi(data))
);
export const register = createAsyncThunk(
  'user/register',
  async (data: TRegisterData): Promise<TUser> => saveSession(await registerUserApi(data))
);
export const updateUser = createAsyncThunk(
  'user/update',
  async (data: Partial<TRegisterData>): Promise<TUser> =>
    (await updateUserApi(data)).user
);
export const logout = createAsyncThunk('user/logout', async (): Promise<void> => {
  try {
    await logoutApi();
  } finally {
    clearTokens();
  }
});
export const forgotPassword = createAsyncThunk(
  'user/forgotPassword',
  async (email: string): Promise<void> => {
    await forgotPasswordApi({ email });
    sessionStorage.setItem('resetPassword', 'true');
  }
);
export const resetPassword = createAsyncThunk(
  'user/resetPassword',
  async (data: { password: string; token: string }): Promise<void> => {
    await resetPasswordApi(data);
    sessionStorage.removeItem('resetPassword');
  }
);

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    clearUserError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(checkAuth.pending, (state) => {
        state.isChecking = true;
      })
      .addCase(checkAuth.fulfilled, (state, action) => {
        state.data = action.payload;
        state.isAuthChecked = true;
        state.isChecking = false;
      })
      .addCase(checkAuth.rejected, (state) => {
        state.isAuthChecked = true;
        state.isChecking = false;
      })
      .addCase(logout.fulfilled, (state) => {
        state.data = null;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(logout.rejected, (state) => {
        state.data = null;
        state.isLoading = false;
        state.error = null;
      })
      .addMatcher(
        isAnyOf(
          login.pending,
          register.pending,
          updateUser.pending,
          logout.pending,
          forgotPassword.pending,
          resetPassword.pending
        ),
        (state) => {
          state.isLoading = true;
          state.error = null;
        }
      )
      .addMatcher(
        isAnyOf(login.fulfilled, register.fulfilled, updateUser.fulfilled),
        (state, action) => {
          state.data = action.payload;
          state.isAuthChecked = true;
          state.isLoading = false;
        }
      )
      .addMatcher(
        isAnyOf(forgotPassword.fulfilled, resetPassword.fulfilled),
        (state) => {
          state.isLoading = false;
        }
      )
      .addMatcher(
        isAnyOf(
          login.rejected,
          register.rejected,
          updateUser.rejected,
          forgotPassword.rejected,
          resetPassword.rejected
        ),
        (state, action) => {
          state.isLoading = false;
          state.error = action.error.message ?? 'Не удалось выполнить запрос';
        }
      );
  },
});

export const { clearUserError } = userSlice.actions;
export const userReducer = userSlice.reducer;
export const selectUserState = (state: RootState): UserState => state.user;
export const selectUser = (state: RootState): TUser | null => state.user.data;
