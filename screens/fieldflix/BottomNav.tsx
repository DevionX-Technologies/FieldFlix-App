import { Paths } from "@/data/paths";
import { WEB } from "@/screens/fieldflix/webDesign";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useRouter } from "expo-router";
import { Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
import { CurvedBottomBarExpo } from "react-native-curved-bottom-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const COLORS = {
  barBg: "#0D141A",
  barBorder: "rgba(255,255,255,0.14)",
  barInner: "rgba(255,255,255,0.03)",
  iconActive: WEB.green,
  iconIdle: "rgba(255,255,255,0.68)",
  fabBg: WEB.green,
  fabIcon: "#03120A",
  fabRing: "rgba(5,10,14,0.95)",
  indicator: WEB.green,
  shadow: "#000000",
} as const;

type Tab = "home" | "sessions" | "flix" | "recordings";
type BarRoute = "home" | "sessions" | "flix" | "recordings";

const DUMMY = () => null;
const TAB_WIDTH = Dimensions.get("window").width;
const BAR_HEIGHT = 80;
const FAB_SIZE = 68;
export const FIELD_FLIX_BOTTOM_NAV_SPACE = 124;

const ROUTE_CONFIG: {
  key: BarRoute;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  appRoute: string;
  position: "LEFT" | "RIGHT";
}[] = [
  {
    key: "home",
    icon: "home-variant",
    label: "Home",
    appRoute: Paths.home,
    position: "LEFT",
  },
  {
    key: "sessions",
    icon: "video-outline",
    label: "Sessions",
    appRoute: Paths.sessions,
    position: "LEFT",
  },
  {
    key: "flix",
    icon: "play-circle-outline",
    label: "FlickShorts",
    appRoute: Paths.flixshorts,
    position: "RIGHT",
  },
  {
    key: "recordings",
    icon: "camera-iris",
    label: "Recordings",
    appRoute: Paths.recordings,
    position: "RIGHT",
  },
];

function initialTab(active: Tab): BarRoute {
  if (active === "home") return "home";
  if (active === "sessions") return "sessions";
  if (active === "flix") return "flix";
  if (active === "recordings") return "recordings";
  return "home";
}

export function FieldflixBottomNav({
  active,
}: {
  active: Tab;
  centerAction?: "scan";
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const startTab = initialTab(active);

  return (
    <View pointerEvents="box-none" style={styles.wrap}>
      <View
        pointerEvents="none"
        style={[styles.bottomFill, { height: Math.max(insets.bottom, 12) }]}
      />
      <CurvedBottomBarExpo.Navigator
        key={`nav-${active}`}
        id="fieldflix-bottom-nav"
        type="DOWN"
        circlePosition="CENTER"
        width={TAB_WIDTH}
        height={BAR_HEIGHT}
        circleWidth={60}
        borderTopLeftRight={false}
        bgColor={COLORS.barBg}
        borderColor={COLORS.barBorder}
        borderWidth={1}
        initialRouteName={startTab}
        backBehavior="initialRoute"
        screenListeners={{}}
        screenOptions={{ headerShown: false }}
        defaultScreenOptions={{}}
        style={styles.navigatorShell}
        shadowStyle={styles.navigatorShadow}
        tabBar={({
          routeName,
          selectedTab,
          navigate,
        }: {
          routeName: string;
          selectedTab: string;
          navigate: (tab: string) => void;
        }) => {
          const cfg = ROUTE_CONFIG.find((x) => x.key === routeName);
          if (!cfg) return <View style={styles.tabSlot} />;
          const isActive = selectedTab === routeName;
          return (
            <Pressable
              onPress={() => {
                navigate(routeName);
                router.replace(cfg.appRoute as any);
              }}
              style={styles.tabSlot}
              hitSlop={8}
            >
              <MaterialCommunityIcons
                name={cfg.icon}
                size={29}
                color={isActive ? COLORS.iconActive : COLORS.iconIdle}
              />
              <Text style={[styles.tabLabel, isActive ? styles.tabLabelActive : styles.tabLabelIdle]}>
                {cfg.label}
              </Text>
              {isActive ? <View style={styles.indicator} /> : null}
            </Pressable>
          );
        }}
        renderCircle={() => (
          <Pressable
            accessibilityLabel="Open QR scanner"
            onPress={() => router.replace(Paths.scan as any)}
            style={styles.fab}
          >
            <MaterialCommunityIcons
              name="qrcode-scan"
              size={28}
              color={COLORS.fabIcon}
            />
          </Pressable>
        )}
      >
        <CurvedBottomBarExpo.Screen
          name="home"
          position="LEFT"
          component={DUMMY}
        />
        <CurvedBottomBarExpo.Screen
          name="sessions"
          position="LEFT"
          component={DUMMY}
        />
        <CurvedBottomBarExpo.Screen
          name="flix"
          position="RIGHT"
          component={DUMMY}
        />
        <CurvedBottomBarExpo.Screen
          name="recordings"
          position="RIGHT"
          component={DUMMY}
        />
      </CurvedBottomBarExpo.Navigator>
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
  navigatorShell: {
    borderWidth: 1,
    borderColor: COLORS.barInner,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  navigatorShadow: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.34,
    shadowRadius: 18,
    elevation: 14,
  },
  tabSlot: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingTop: 6,
    paddingBottom: 10,
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
    width: FAB_SIZE,
    height: FAB_SIZE,
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
    bottom: 4,
  },
});
