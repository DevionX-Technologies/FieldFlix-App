import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import homeReducer from './slices/home';
import recordingReducer from './slices/recording';
import userReducer from './slices/user';

export const store = configureStore({
  reducer: {
    user: userReducer,
    recording: recordingReducer,
    home: homeReducer,
  },
});

// If you need TS inference:
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;