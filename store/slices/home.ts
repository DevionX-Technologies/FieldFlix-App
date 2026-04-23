import axiosInstance from "@/utils/axiosInstance";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

export interface HomeSchema {
  activeSport: string;
  address: any | null; // Location address object from expo-location
  notificationCount: number;
}

const initialState: HomeSchema = {
  activeSport: "Pickle",
  address: null,
  notificationCount: 0,
};


// ✅ Async thunk to fetch notification count
export const fetchNotificationCount = createAsyncThunk(
  "home/fetchNotificationCount",
  async (_, thunkAPI) => {
    try {
      const response = await axiosInstance.get<number | { count?: number }>(
        "/notification/user/count"
      );
      const d = response.data;
      if (typeof d === "number" && !Number.isNaN(d)) return d;
      if (d && typeof d === "object" && "count" in d) {
        const c = (d as { count?: number }).count;
        return typeof c === "number" && !Number.isNaN(c) ? c : 0;
      }
      return 0;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error.message || "Failed to fetch");
    }
  }
);

const homeSlice = createSlice({
  name: "activeSport",
  initialState,
  reducers: {
    setActiveSports: (state, action) => {
      state.activeSport = action.payload;
    },
    setAddress: (state, action) => {
      state.address = action.payload;
    },
    setNotificationCount: (state, action) => {
      state.notificationCount = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotificationCount.pending, (state) => {
      })
      .addCase(fetchNotificationCount.fulfilled, (state, action) => {
        state.notificationCount = action.payload;
      })
      .addCase(fetchNotificationCount.rejected, (state, action) => {
        console.error("Failed to fetch notification count:", action.payload);
      });
  },
});

export const { setActiveSports, setAddress ,setNotificationCount} = homeSlice.actions;
export default homeSlice.reducer;
