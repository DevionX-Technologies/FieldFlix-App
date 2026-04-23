import FieldFlicksLogo from "@/theme/assets/images/fieldflicks-logo.svg";
import FieldFlicksWordmark from "@/theme/assets/images/feildflicks-appnane.svg";
import { View } from "react-native";

type Props = {
  compact?: boolean;
};

export function AuthLogoHeader({ compact = false }: Props) {
  const logoW = compact ? 72 : 88;
  const logoH = compact ? 52 : 64;
  const wordW = compact ? 160 : 182;
  const wordH = compact ? 40 : 45;

  return (
    <View style={{ alignItems: "center", marginBottom: compact ? 16 : 24 }}>
      <FieldFlicksLogo width={logoW} height={logoH} />
      <View style={{ marginTop: compact ? -10 : -12 }}>
        <FieldFlicksWordmark width={wordW} height={wordH} />
      </View>
    </View>
  );
}
