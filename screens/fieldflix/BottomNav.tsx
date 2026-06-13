import { Paths } from "@/data/paths";
import { WEB } from "@/screens/fieldflix/webDesign";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const COLORS = {
  barBg: WEB.bottomNavBg,
  barBorder: "rgba(255,255,255,0.14)",
  barInner: "rgba(255,255,255,0.03)",
  iconActive: WEB.green,
  iconIdle: "rgba(255,255,255,0.68)",
  fabBg: WEB.green,
  fabIcon: "#03120A",
  fabRing: WEB.navBarBg,
  indicator: WEB.green,
  shadow: "#000000",
} as const;

type Tab = "home" | "sessions" | "flix" | "recordings";

const BAR_HEIGHT = 68;
const FAB_SIZE = 60;
export const FIELD_FLIX_BOTTOM_NAV_SPACE = 110;

/**
 * Bottom navigation tabs configured in left-to-right rendering order, with a
 * `centerSlot` marker indicating where the QR-scanner FAB sits between the
 * Sessions and FlickShorts items. We previously used `CurvedBottomBarExpo`
 * here, but its tab-slot layout silently dropped Home + Recordings on
 * tablet / floating-window widths, leaving only 3 visible items. The custom
 * flex layout below renders all 5 reliably at any width.
 */
const TABS: {
  key: Tab;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  appRoute: string;
}[] = [
  { key: "home", icon: "home-variant", label: "Home", appRoute: Paths.home },
  { key: "sessions", icon: "video-outline", label: "Sessions", appRoute: Paths.sessions },
  { key: "flix", icon: "play-circle-outline", label: "FlickShorts", appRoute: Paths.flixshorts },
  { key: "recordings", icon: "camera-iris", label: "Recordings", appRoute: Paths.recordings },
];

export function FieldflixBottomNav({
  active,
}: {
  active: Tab;
  centerAction?: "scan";
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const leftTabs = TABS.slice(0, 2); // Home, Sessions
  const rightTabs = TABS.slice(2); // FlickShorts, Recordings

  const renderTab = (cfg: (typeof TABS)[number]) => {
    const isActive = active === cfg.key;
    return (
      <Pressable
        key={cfg.key}
        onPress={() => router.replace(cfg.appRoute as never)}
        style={styles.tabSlot}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={cfg.label}
      >
        <MaterialCommunityIcons
          name={cfg.icon}
          size={26}
          color={isActive ? COLORS.iconActive : COLORS.iconIdle}
        />
        <Text
          style={[
            styles.tabLabel,
            isActive ? styles.tabLabelActive : styles.tabLabelIdle,
          ]}
          numberOfLines={1}
        >
          {cfg.label}
        </Text>
        {isActive ? <View style={styles.indicator} /> : null}
      </Pressable>
    );
  };

  return (
    <View pointerEvents="box-none" style={styles.wrap}>
      <View
        pointerEvents="none"
        style={[styles.bottomFill, { height: Math.max(insets.bottom, 12) }]}
      />
      <View style={styles.bar}>
        <View style={styles.tabGroup}>{leftTabs.map(renderTab)}</View>
        {/* Center spacer that the FAB sits over. Keeps tab widths balanced. */}
        <View style={styles.centerSlot} />
        <View style={styles.tabGroup}>{rightTabs.map(renderTab)}</View>
        <Pressable
          accessibilityLabel="Open QR scanner"
          accessibilityRole="button"
          onPress={() => router.replace(Paths.scan as never)}
          style={styles.fab}
        >
          <MaterialCommunityIcons
            name="qrcode-scan"
            size={26}
            color={COLORS.fabIcon}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 60,
    paddingHorizontal: 0,
    backgroundColor: "transparent",
  },
  bottomFill: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.barBg,
  },
  bar: {
    flexDirection: "row",
    alignItems: "stretch",
    height: BAR_HEIGHT,
    backgroundColor: COLORS.barBg,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.barBorder,
    overflow: "visible",
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.34,
    shadowRadius: 18,
    elevation: 14,
  },
  tabGroup: {
    flex: 1,
    flexDirection: "row",
    alignItems: "stretch",
  },
  centerSlot: {
    width: FAB_SIZE + 16, // breathing room around the FAB
  },
  tabSlot: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingTop: 4,
    paddingBottom: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
  tabLabelActive: {
    color: "#F8FAFC",
  },
  tabLabelIdle: {
    color: COLORS.iconIdle,
  },
  indicator: {
    position: "absolute",
    bottom: 4,
    width: 38,
    height: 4,
    borderRadius: 999,
    backgroundColor: COLORS.indicator,
  },
  fab: {
    position: "absolute",
    left: "50%",
    top: -FAB_SIZE / 3,
    width: FAB_SIZE,
    height: FAB_SIZE,
    marginLeft: -FAB_SIZE / 2,
    borderRadius: FAB_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.fabBg,
    borderWidth: 6,
    borderColor: COLORS.fabRing,
    shadowColor: COLORS.fabBg,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.32,
    shadowRadius: 12,
    elevation: 12,
  },
});
