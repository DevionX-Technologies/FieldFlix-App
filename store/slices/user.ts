import { createSlice } from "@reduxjs/toolkit";

export interface IUserSchema {
  token: string;
  isFirstTimeLogin: false;
  name: string;
  email: string;
  phone_number: string;
  profile_image_path: string;
}

const initialState: IUserSchema = {
  token: "",
  isFirstTimeLogin: false,
  name: "",
  email: "",
  phone_number: "",
  profile_image_path: "",
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setUserInRedux: (state, action) => {
      state.token = action.payload.token;
      state.isFirstTimeLogin = action.payload.isFirstTimeLogin;
      state.name = action.payload.name;
      state.email = action.payload.email;
      state.phone_number = action.payload.phone_number;
      state.profile_image_path = action.payload.profile_image_path;
    },
  },
});

export const { setUserInRedux } = userSlice.actions;
export default userSlice.reducer;
