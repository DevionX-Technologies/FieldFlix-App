import { Recording } from "@/app/screens/video-player/type";
import { createSlice } from "@reduxjs/toolkit";

export interface IRecordingSchema {
  recordings: Recording[] | null;
}

const initialState: IRecordingSchema = {
  recordings: null,
};

const recordingSlice = createSlice({
  name: "recordings",
  initialState,
  reducers: {
    setRecording: (state, action) => {
      state.recordings = action.payload;
    },
   
  },
});

export const { setRecording } = recordingSlice.actions;
export default recordingSlice.reducer;
