import { getFeedsApi, getOrderByNumberApi, getOrdersApi, orderBurgerApi } from '@api';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { clearConstructor } from './constructor-slice';
import { logout } from './user-slice';

import type { RootState } from '../store';
import type { TOrder, TOrdersData } from '@utils-types';

type OrdersState = {
  feed: TOrdersData;
  userOrders: TOrder[];
  feedLoading: boolean;
  userOrdersLoading: boolean;
  feedLoaded: boolean;
  userOrdersLoaded: boolean;
  userOrdersRequestId: string | null;
  feedError: string | null;
  userOrdersError: string | null;
  currentOrder: TOrder | null;
  currentNumber: number | null;
  detailLoading: boolean;
  detailError: string | null;
  detailRequestId: string | null;
  orderRequest: boolean;
  orderModalData: TOrder | null;
  orderError: string | null;
};

const initialState: OrdersState = {
  feed: { orders: [], total: 0, totalToday: 0 },
  userOrders: [],
  feedLoading: false,
  userOrdersLoading: false,
  feedLoaded: false,
  userOrdersLoaded: false,
  userOrdersRequestId: null,
  detailRequestId: null,
  feedError: null,
  userOrdersError: null,
  currentOrder: null,
  currentNumber: null,
  detailLoading: false,
  detailError: null,
  orderRequest: false,
  orderModalData: null,
  orderError: null,
};

export const fetchFeed = createAsyncThunk('orders/feed', getFeedsApi, {
  condition: (_, { getState }) =>
    !(getState() as { orders: OrdersState }).orders.feedLoading,
});
export const fetchUserOrders = createAsyncThunk('orders/userOrders', getOrdersApi, {
  condition: (_, { getState }) =>
    !(getState() as { orders: OrdersState }).orders.userOrdersLoading,
});
export const fetchOrder = createAsyncThunk(
  'orders/detail',
  async (number: number): Promise<TOrder> => {
    const response = await getOrderByNumberApi(number);
    if (!response.orders?.length) throw new Error('Заказ не найден');
    return response.orders[0];
  }
);
export const createOrder = createAsyncThunk(
  'orders/create',
  async (ids: string[], { dispatch }): Promise<TOrder> => {
    const response = await orderBurgerApi(ids);
    dispatch(clearConstructor());
    void dispatch(fetchFeed());
    void dispatch(fetchUserOrders());
    return response.order;
  },
  {
    condition: (_, { getState }) =>
      !(getState() as { orders: OrdersState }).orders.orderRequest,
  }
);

const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    closeOrder: (state) => {
      state.orderModalData = null;
      state.orderError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFeed.pending, (state) => {
        state.feedLoading = true;
        state.feedError = null;
      })
      .addCase(fetchFeed.fulfilled, (state, action) => {
        const { orders, total, totalToday } = action.payload;
        state.feed = { orders, total, totalToday };
        state.feedLoading = false;
        state.feedLoaded = true;
      })
      .addCase(fetchFeed.rejected, (state, action) => {
        state.feedLoading = false;
        state.feedError = action.error.message ?? 'Не удалось загрузить ленту';
      })
      .addCase(fetchUserOrders.pending, (state, action) => {
        state.userOrdersLoading = true;
        state.userOrdersError = null;
        state.userOrdersRequestId = action.meta.requestId;
      })
      .addCase(fetchUserOrders.fulfilled, (state, action) => {
        if (state.userOrdersRequestId !== action.meta.requestId) return;
        state.userOrders = action.payload;
        state.userOrdersLoading = false;
        state.userOrdersLoaded = true;
      })
      .addCase(fetchUserOrders.rejected, (state, action) => {
        if (state.userOrdersRequestId !== action.meta.requestId) return;
        state.userOrdersLoading = false;
        state.userOrdersError = action.error.message ?? 'Не удалось загрузить историю';
      })
      .addCase(fetchOrder.pending, (state, action) => {
        if (state.currentNumber !== action.meta.arg) state.currentOrder = null;
        state.currentNumber = action.meta.arg;
        state.detailRequestId = action.meta.requestId;
        state.detailLoading = true;
        state.detailError = null;
      })
      .addCase(fetchOrder.fulfilled, (state, action) => {
        if (state.detailRequestId !== action.meta.requestId) return;
        state.currentOrder = action.payload;
        state.detailLoading = false;
      })
      .addCase(fetchOrder.rejected, (state, action) => {
        if (state.detailRequestId !== action.meta.requestId) return;
        state.detailLoading = false;
        state.detailError = action.error.message ?? 'Не удалось загрузить заказ';
      })
      .addCase(createOrder.pending, (state) => {
        state.orderRequest = true;
        state.orderError = null;
        state.orderModalData = null;
      })
      .addCase(createOrder.fulfilled, (state, action) => {
        state.orderRequest = false;
        state.orderModalData = action.payload;
      })
      .addCase(createOrder.rejected, (state, action) => {
        state.orderRequest = false;
        state.orderError = action.error.message ?? 'Не удалось оформить заказ';
      })
      .addCase(logout.fulfilled, (state) => {
        state.userOrders = [];
        state.userOrdersLoaded = false;
        state.userOrdersLoading = false;
        state.userOrdersRequestId = null;
        state.detailRequestId = null;
        state.currentOrder = null;
        state.orderModalData = null;
      })
      .addCase(logout.rejected, (state) => {
        state.userOrders = [];
        state.userOrdersLoaded = false;
        state.userOrdersLoading = false;
        state.userOrdersRequestId = null;
        state.detailRequestId = null;
        state.currentOrder = null;
        state.orderModalData = null;
      });
  },
});

export const { closeOrder } = ordersSlice.actions;
export const ordersReducer = ordersSlice.reducer;
export const selectOrdersState = (state: RootState): OrdersState => state.orders;
