import { Box } from "@/components/ui/box";

import React from "react";
import TurfDisclaimerScreen from "./terms_and_condition";

export default function Recording() {
  return (
    <Box
      className="flex-1 items-center justify-center bg-app-backgroundColor"
      style={{ flex: 1, backgroundColor: "#0C0C11" }}
    >
      <TurfDisclaimerScreen />
    </Box>
  );
}
