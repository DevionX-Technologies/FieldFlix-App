import { Paths } from "@/data/paths";
import { useRecordingReadyToast } from "@/hooks/useRecordingReadyToast";
import {
  createShareLink,
  getMyRecordings,
  getSharedWithMe,
} from "@/lib/fieldflix-api";
import { FieldflixBottomNav } from "@/screens/fieldflix/BottomNav";
import { WebShell } from "@/screens/fieldflix/WebShell";
import { BG } from "@/screens/fieldflix/bundledBackgrounds";
import { FF } from "@/screens/fieldflix/fonts";
import { RECORDINGS_REC_LOCAL } from "@/screens/fieldflix/recordingsAssets";
import { WEB } from "@/screens/fieldflix/webDesign";
import {
  formatRecordingListWhen,
  highlightCountFromRecording,
  recordingDurationLabel,
  recordingIsReady,
  recordingThumbUrl,
} from "@/utils/recordingDisplay";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ImageSourcePropType,
} from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

const REC_BG = "#020617";
const ACCENT = "#22C55E";
const MUTED = "#94a3b8";

type TabId = "my" | "shared" | "find";

function parseClockOnDay(base: Date, clock: string): number | null {
  const t = clock.trim().toLowerCase();
  const m = t.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const ap = m[3]?.toLowerCase();
  if (ap === "pm" && h < 12) h += 12;
  if (ap === "am" && h === 12) h = 0;
  const d = new Date(base);
  d.setHours(h, min, 0, 0);
  return d.getTime();
}

export default function FieldflixRecordingsScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("my");
  const [my, setMy] = useState<any[]>([]);
  const [shared, setShared] = useState<any[]>([]);

  const [findLocation, setFindLocation] = useState("");
  const [findGround, setFindGround] = useState("");
  const [findDate, setFindDate] = useState("");
  const [findStart, setFindStart] = useState("");
  const [findEnd, setFindEnd] = useState("");
  const [findPhone, setFindPhone] = useState("");
  const [findMatches, setFindMatches] = useState<any[] | null>(null);

  const onShareRecording = useCallback(
    async (recordingId: string, title: string) => {
      try {
        const { shareableLink } = await createShareLink(recordingId);
        await Share.share({
          message: `Watch my game on FieldFlicks: ${shareableLink}`,
          url: shareableLink,
          title,
        });
      } catch {
        // user dismissed or share unavailable — silent
      }
    },
    [],
  );

  const runFindInMyRecordings = useCallback(() => {
    const locQ = findLocation.trim().toLowerCase();
    const g = findGround.trim().toLowerCase();
    const out = my.filter((r: any) => {
      const turf = r.turf;
      const hay = [turf?.name, turf?.address_line, turf?.city, turf?.location]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (locQ) {
        const parts = locQ
          .split(/[,\n]+/)
          .map((p) => p.trim())
          .filter(Boolean);
        const anyPart = parts.some((p) => p.length > 0 && hay.includes(p));
        if (!anyPart && !hay.includes(locQ)) return false;
      }
      if (g && !hay.includes(g)) return false;
      const st = r.startTime ? new Date(String(r.startTime)) : null;
      if (st && findDate.trim()) {
        const fd = Date.parse(findDate);
        if (
          !Number.isNaN(fd) &&
          st.toDateString() !== new Date(fd).toDateString()
        ) {
          return false;
        }
      }
      if (findStart.trim() && findEnd.trim() && st) {
        const t0 = parseClockOnDay(st, findStart);
        const t1 = parseClockOnDay(st, findEnd);
        if (t0 != null && t1 != null) {
          const t = st.getTime();
          const lo = Math.min(t0, t1);
          const hi = Math.max(t0, t1);
          if (t < lo || t > hi) return false;
        }
      }
      return true;
    });
    setFindMatches(out);
  }, [my, findLocation, findGround, findDate, findStart, findEnd]);

  const load = useCallback(async () => {
    try {
      const [a, b] = await Promise.all([getMyRecordings(), getSharedWithMe()]);
      setMy(a);
      setShared(b);
    } catch {
      setMy([]);
      setShared([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const myRows =
    my.length > 0
      ? my.map((s: any, i: number) => {
          const h = highlightCountFromRecording(s);
          return {
            id: String(s?.id ?? i),
            recordingId: s?.id ? String(s.id) : null,
            title: s?.turf?.name ?? s?.recording_name ?? s?.name ?? "Recording",
            location: s?.turf?.city ?? s?.turf?.location ?? s?.location ?? "",
            when: formatRecordingListWhen(s?.startTime),
            duration: recordingDurationLabel(s),
            thumbUrl: recordingThumbUrl(s),
            highlights: h > 0 ? h : null,
            status: String(s?.status ?? "").toLowerCase(),
            isReady: recordingIsReady(s),
            tags: [] as string[],
            moreTags: 0,
          };
        })
      : [];

  const sharedRows =
    shared.length > 0
      ? shared.map((s: any, i: number) => {
          const rec = s?.recording;
          const td = rec?.turf_detail;
          const loc =
            [td?.city, td?.state].filter(Boolean).join(", ") ||
            td?.address_line ||
            "";
          return {
            id: String(s?.id ?? i),
            recordingId: rec?.id ? String(rec.id) : null,
            shareToken: s?.share_token ?? rec?.share_token ?? null,
            title: td?.name ?? rec?.owner_name ?? `Recording #${i + 1}`,
            highlights: Array.isArray(rec?.recordingHighlights)
              ? rec.recordingHighlights.length
              : 0,
            shareWith: s?.shared_with_user_name || "—",
            ownerName: rec?.owner_name ?? "",
            location: loc,
            thumbUrl: recordingThumbUrl(rec),
            duration: recordingDurationLabel(rec),
          };
        })
      : [];

  const { state: readyState, dismiss: dismissReady } = useRecordingReadyToast();

  return (
    <WebShell backgroundColor={REC_BG}>
      <View style={styles.flex}>
        <View style={styles.head}>
          <View style={styles.headLeft}>
            <Pressable
              accessibilityLabel="Back to home"
              onPress={() => router.push(Paths.home)}
              style={styles.logoBtn}
            >
              <Image
                source={RECORDINGS_REC_LOCAL.headLogo}
                style={{ width: 24, height: 24 }}
                resizeMode="cover"
              />
            </Pressable>
            <Text style={styles.headTitle}>Recordings</Text>
          </View>
          <Pressable accessibilityLabel="Filter">
            <Image
              source={RECORDINGS_REC_LOCAL.headFilter}
              style={{ width: 24, height: 24 }}
              resizeMode="cover"
            />
          </Pressable>
        </View>

        <View style={styles.segOuter}>
          <View style={styles.segTrack}>
            <SegTab
              active={tab === "my"}
              onPress={() => setTab("my")}
              iconSource={RECORDINGS_REC_LOCAL.tabMy}
              label="My Recordings"
            />
            <SegTab
              active={tab === "shared"}
              onPress={() => setTab("shared")}
              iconSource={RECORDINGS_REC_LOCAL.tabShared}
              label="Shared Recordings"
            />
            <SegTab
              active={tab === "find"}
              onPress={() => setTab("find")}
              iconSource={RECORDINGS_REC_LOCAL.tabFind}
              label="Find Recordings"
            />
          </View>
        </View>

        {readyState.kind !== "idle" ? (
          <View style={styles.readyToast}>
            <View style={styles.readyToastDot} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.readyToastTitle} numberOfLines={1}>
                {readyState.kind === "ready"
                  ? "Your recording is ready"
                  : readyState.kind === "failed"
                    ? "Recording failed to process"
                    : "Processing your recording…"}
              </Text>
              <Text style={styles.readyToastBody} numberOfLines={2}>
                {readyState.kind === "ready"
                  ? "Open Highlights to watch the preview and unlock the full match."
                  : readyState.kind === "failed"
                    ? "Something went wrong on our side. Please try again."
                    : "Hang tight — we'll let you know the moment it's ready."}
              </Text>
            </View>
            {readyState.kind === "ready" ? (
              <Pressable
                style={styles.readyToastCta}
                onPress={() => {
                  router.push({
                    pathname: Paths.highlights,
                    params: { id: readyState.recordingId },
                  });
                  void dismissReady();
                }}
              >
                <Text style={styles.readyToastCtaText}>Open</Text>
              </Pressable>
            ) : null}
            <Pressable
              style={styles.readyToastClose}
              hitSlop={10}
              onPress={() => void dismissReady()}
              accessibilityLabel="Dismiss"
            >
              <Text style={styles.readyToastCloseText}>×</Text>
            </Pressable>
          </View>
        ) : null}

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.main}
          showsVerticalScrollIndicator={false}
        >
          {tab === "my" && (
            <View style={styles.myList}>
              {myRows.length === 0 ? (
                <Text style={styles.emptyList}>
                  No recordings yet. Scan a court QR and start a session to
                  build your library.
                </Text>
              ) : null}
              {myRows.map((row) => (
                <Pressable
                  key={row.id}
                  style={styles.myRow}
                  onPress={() => {
                    if (!row.recordingId) return;
                    router.push({
                      pathname: Paths.highlights,
                      params: { id: row.recordingId },
                    });
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${row.title} highlights`}
                >
                  <View style={styles.thumb}>
                    <Image
                      source={row.thumbUrl ? { uri: row.thumbUrl } : BG.arena}
                      style={StyleSheet.absoluteFillObject}
                      resizeMode="cover"
                    />
                    <View style={styles.thumbBar} />
                    <View style={styles.thumbDur}>
                      <Text style={styles.thumbDurText}>{row.duration}</Text>
                    </View>
                    <View style={styles.thumbPlayOverlay}>
                      <View style={styles.thumbPlayBtn}>
                        <PlayIcon color="#0a0a0a" size={16} />
                      </View>
                    </View>
                  </View>
                  <View style={styles.myBody}>
                    <Text style={styles.myTitle} numberOfLines={2}>
                      {row.title}
                    </Text>
                    <View style={styles.myLine}>
                      <MapPinIcon color={ACCENT} size={12} />
                      <Text style={styles.myLineText} numberOfLines={1}>
                        {row.location}
                      </Text>
                    </View>
                    <View style={styles.myLine}>
                      <CalendarIcon color={ACCENT} size={12} />
                      <Text style={styles.myLineTextMuted} numberOfLines={1}>
                        {row.when}
                      </Text>
                    </View>
                    {row.highlights != null ? (
                      <View style={styles.myLine}>
                        <TrophyIcon color={ACCENT} size={12} />
                        <Text style={styles.myLineAccent}>
                          {row.highlights} Highlights
                        </Text>
                      </View>
                    ) : null}
                    {!row.isReady ? (
                      <View style={styles.myLine}>
                        <Text style={styles.myLineProcessing} numberOfLines={1}>
                          Processing — your highlights will appear here shortly.
                        </Text>
                      </View>
                    ) : null}
                    <View style={styles.tagRow}>
                      {row.tags.map((t) => (
                        <View key={t} style={styles.tag}>
                          <Text style={styles.tagText}>{t}</Text>
                        </View>
                      ))}
                      <View style={styles.tagMore}>
                        <Text style={styles.tagMoreText}>+{row.moreTags}</Text>
                      </View>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          )}

          {tab === "shared" && (
            <View style={styles.sharedList}>
              {sharedRows.length === 0 ? (
                <Text style={styles.emptyList}>
                  Nothing shared with you yet. When someone shares a recording,
                  it will show here.
                </Text>
              ) : null}
              {sharedRows.map((card) => (
                <Pressable
                  key={card.id}
                  style={styles.sharedCard}
                  onPress={() => {
                    if (card.recordingId) {
                      router.push({
                        pathname: Paths.highlights,
                        params: { id: card.recordingId },
                      });
                    } else if (card.shareToken) {
                      router.push({
                        pathname: Paths.sharedMedia,
                        params: { token: card.shareToken },
                      });
                    }
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${card.title}`}
                >
                  <Image
                    source={card.thumbUrl ? { uri: card.thumbUrl } : BG.arena}
                    style={styles.sharedMedia}
                    resizeMode="cover"
                  />
                  <LinearGradient
                    colors={[
                      "rgba(0,0,0,0.15)",
                      "rgba(0,0,0,0.45)",
                      "rgba(0,0,0,0.94)",
                    ]}
                    locations={[0, 0.55, 1]}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={styles.sharedOverlay}>
                    <View style={styles.sharedTop}>
                      <View style={styles.sharedReady}>
                        <Text style={styles.sharedReadyText}>Ready</Text>
                      </View>
                      <View style={styles.sharedDur}>
                        <ClockIcon color="rgba(255,255,255,0.92)" size={14} />
                        <Text style={styles.sharedDurText}>
                          {card.duration}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.sharedMid}>
                      <Text style={styles.sharedTitle} numberOfLines={1}>
                        {card.title}
                      </Text>
                      <Text style={styles.sharedMeta} numberOfLines={2}>
                        {card.location || "No location available"}
                      </Text>
                    </View>
                    <View style={styles.sharedActions}>
                      <View style={styles.sharedPills}>
                        <View style={styles.sharedPill}>
                          <TrophyIcon color={ACCENT} size={14} />
                          <Text style={styles.sharedPillText}>
                            {card.highlights} Highlights
                          </Text>
                        </View>
                        <View style={styles.sharedPill}>
                          <Text style={styles.sharedPillText} numberOfLines={1}>
                            Share with: {card.shareWith}
                          </Text>
                        </View>
                      </View>
                      <Pressable
                        style={styles.sharedFab}
                        accessibilityLabel="Share"
                        onPress={() => {
                          if (card.recordingId) {
                            void onShareRecording(card.recordingId, card.title);
                          }
                        }}
                        hitSlop={8}
                      >
                        <ShareIcon color="#0a0a0a" size={16} />
                      </Pressable>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          )}

          {tab === "find" && (
            <View style={styles.findWrap}>
              <View style={styles.findHeroOuter}>
                <Image
                  source={RECORDINGS_REC_LOCAL.hero}
                  style={styles.findHeroImg}
                  resizeMode="cover"
                />
                {/* Glowing orb - layered for depth */}
                <View style={styles.findOrbOuter} />
                <View style={styles.findOrbMid} />
                <View style={styles.findOrbCore} />
                <View style={styles.findHeroInner}>
                  <View style={styles.findBadge}>
                    <Image
                      source={RECORDINGS_REC_LOCAL.gameFinderIcon}
                      style={{ width: 16, height: 16 }}
                      resizeMode="contain"
                    />
                    <Text style={styles.findBadgeText}>GAME FINDER</Text>
                  </View>
                  <Text style={styles.findHeadline}>
                    Missed your <Text style={styles.findEm}>game?</Text>
                  </Text>
                  <Text style={styles.findSub}>
                    Enter your match details and find your recording instantly.
                  </Text>
                </View>
                <View style={styles.findPlayRing}>
                  <View style={styles.findPlayCore}>
                    <PlayIcon color={ACCENT} size={22} />
                  </View>
                </View>
              </View>

              <View style={styles.findSteps}>
                <View style={styles.findStep}>
                  <View style={styles.findStepDot} />
                  <Text style={styles.findStepText}>Location</Text>
                </View>
                <View style={styles.findStep}>
                  <View style={styles.findStepDot} />
                  <Text style={styles.findStepText}>Schedule</Text>
                </View>
                <View style={[styles.findStep, styles.findStepMuted]}>
                  <View
                    style={[styles.findStepDot, { backgroundColor: MUTED }]}
                  />
                  <Text style={styles.findStepTextMuted}>Verify</Text>
                </View>
              </View>

              <View style={styles.findPanel}>
                <View style={styles.findLabelRow}>
                  <MapPinIcon color={MUTED} size={14} />
                  <Text style={styles.findLabel}>LOCATION</Text>
                </View>
                <TextInput
                  value={findLocation}
                  onChangeText={setFindLocation}
                  style={styles.findInput}
                  placeholderTextColor="rgba(255,255,255,0.35)"
                />
              </View>

              <View style={styles.findPanel}>
                <View style={styles.findGrid2}>
                  <View style={styles.findGridCol}>
                    <View style={styles.findLabelRow}>
                      <View style={styles.findSmallIcon}>
                        <Svg
                          width={12}
                          height={12}
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <Circle
                            cx={12}
                            cy={12}
                            r={9}
                            stroke={MUTED}
                            strokeWidth={2}
                          />
                        </Svg>
                      </View>
                      <Text style={styles.findLabel}>GROUND / COURT NO.</Text>
                    </View>
                    <TextInput
                      value={findGround}
                      onChangeText={setFindGround}
                      style={styles.findInput}
                      placeholderTextColor="rgba(255,255,255,0.35)"
                    />
                  </View>
                  <View style={styles.findGridCol}>
                    <View style={styles.findLabelRow}>
                      <CalendarIcon color={MUTED} size={14} />
                      <Text style={styles.findLabel}>DATE</Text>
                    </View>
                    <TextInput
                      value={findDate}
                      onChangeText={setFindDate}
                      style={styles.findInput}
                      placeholderTextColor="rgba(255,255,255,0.35)"
                    />
                  </View>
                </View>
              </View>

              <View style={styles.findPanel}>
                <View style={styles.findGrid2}>
                  <View style={styles.findGridCol}>
                    <View style={styles.findLabelRow}>
                      <ClockIcon color={MUTED} size={14} />
                      <Text style={styles.findLabel}>START TIME</Text>
                    </View>
                    <TextInput
                      value={findStart}
                      onChangeText={setFindStart}
                      style={styles.findInput}
                      placeholderTextColor="rgba(255,255,255,0.35)"
                    />
                  </View>
                  <View style={styles.findGridCol}>
                    <View style={styles.findLabelRow}>
                      <ClockIcon color={MUTED} size={14} />
                      <Text style={styles.findLabel}>END TIME</Text>
                    </View>
                    <TextInput
                      value={findEnd}
                      onChangeText={setFindEnd}
                      style={styles.findInput}
                      placeholderTextColor="rgba(255,255,255,0.35)"
                    />
                  </View>
                </View>
              </View>

              <Pressable style={styles.findCta} onPress={runFindInMyRecordings}>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z"
                    stroke="#fff"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
                <Text style={styles.findCtaText}>Find My Game</Text>
              </Pressable>

              {findMatches !== null ? (
                <View style={styles.findResults}>
                  <Text style={styles.findResultsTitle}>
                    {findMatches.length === 0
                      ? "No matches in your recordings for those details."
                      : `${findMatches.length} match${findMatches.length === 1 ? "" : "es"} in your library`}
                  </Text>
                  {findMatches.map((r: any) => {
                    const title = r?.turf?.name ?? r?.name ?? "Recording";
                    const when = formatRecordingListWhen(r?.startTime);
                    return (
                      <View key={String(r.id)} style={styles.findResultRow}>
                        <Text style={styles.findResultName} numberOfLines={2}>
                          {title}
                        </Text>
                        <Text style={styles.findResultWhen}>{when}</Text>
                      </View>
                    );
                  })}
                </View>
              ) : null}

              <View style={[styles.findPanel, styles.findPanelVerify]}>
                <View style={styles.findVerifyTitle}>
                  <View style={styles.verifyIconBox}>
                    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                      <Path
                        d="M12 2L3 7v5c0 5 4 9 9 10 5-1 9-5 9-10V7l-9-5z"
                        stroke={ACCENT}
                        strokeWidth={1.6}
                        strokeLinejoin="round"
                      />
                      <Path
                        d="M9 12l2 2 4-4"
                        stroke={ACCENT}
                        strokeWidth={1.6}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </Svg>
                  </View>
                  <Text style={styles.verifyTitleText}>Verify access</Text>
                </View>
                <Text style={styles.verifyHint}>
                  (Enter the mobile number of the player who started the
                  recording)
                </Text>
                <View style={styles.phoneRow}>
                  <View style={styles.phoneFlagBox}>
                    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                      <Path
                        d="M3 3h18v18H3z"
                        stroke={ACCENT}
                        strokeWidth={1.5}
                        strokeLinejoin="round"
                      />
                    </Svg>
                  </View>
                  <Text style={styles.phoneCc}>+91</Text>
                  <TextInput
                    value={findPhone}
                    onChangeText={(v) =>
                      setFindPhone(v.replace(/\D/g, "").slice(0, 10))
                    }
                    keyboardType="number-pad"
                    placeholder="Enter your mobile..."
                    placeholderTextColor="rgba(255,255,255,0.35)"
                    style={styles.phoneInput}
                  />
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        <FieldflixBottomNav active="recordings" />
      </View>
    </WebShell>
  );
}

function SegTab({
  active,
  onPress,
  iconSource,
  label,
}: {
  active: boolean;
  onPress: () => void;
  iconSource: ImageSourcePropType;
  label: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.segTab, active && styles.segTabActive]}
    >
      <Image
        source={iconSource}
        style={{ width: 24, height: 24 }}
        resizeMode="contain"
      />
      <Text
        style={[styles.segLabel, active && styles.segLabelActive]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function MapPinIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CalendarIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2M5 11h14M5 21h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function TrophyIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8 21h8M12 17v4M7 4h10v3a5 5 0 01-10 0V4zM17 4h2a2 2 0 012 2v1a2 2 0 01-2 2h-2M7 4H5a2 2 0 00-2 2v1a2 2 0 002 2h2"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ClockIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={2} />
      <Path
        d="M12 7v6l3 2"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function PlayIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M8 5v14l11-7z" />
    </Svg>
  );
}

function ShareIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
    width: "100%",
  },
  headLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
  },
  logoBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    padding: 3,
  },
  headTitle: {
    fontFamily: FF.bold,
    fontSize: 20,
    lineHeight: 27,
    color: WEB.white,
  },
  segOuter: {
    paddingHorizontal: 16,
    marginTop: 20,
    width: "100%",
  },
  segTrack: {
    flexDirection: "row",
    borderRadius: 20,
    backgroundColor: "rgba(30, 41, 59, 0.5)",
    padding: 5,
    minHeight: 70,
    width: "100%",
    maxWidth: 370,
    alignSelf: "center",
  },
  segTab: {
    flex: 1,
    minHeight: 60,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    borderRadius: 20,
    paddingHorizontal: 4,
  },
  segTabActive: {
    backgroundColor: REC_BG,
    borderTopWidth: 1,
    borderTopColor: ACCENT,
  },
  segLabel: {
    fontFamily: FF.semiBold,
    fontSize: 10,
    lineHeight: 14,
    textAlign: "center",
    color: MUTED,
  },
  segLabelActive: {
    color: "#fff",
  },
  main: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 128,
    width: "100%",
  },

  myList: { gap: 14, marginTop: 8 },
  myRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#0c1218",
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  thumb: {
    width: 110,
    height: 110,
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
    flexShrink: 0,
  },
  thumbBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: ACCENT,
    zIndex: 10,
  },
  thumbDur: {
    position: "absolute",
    left: 6,
    bottom: 6,
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 4,
    backgroundColor: "rgba(0,0,0,0.85)",
    zIndex: 10,
  },
  thumbDurText: {
    fontFamily: FF.bold,
    fontSize: 10,
    color: "#fff",
    fontVariant: ["tabular-nums"],
  },
  thumbShare: {
    display: "none",
  },
  thumbPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  thumbPlayBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
  },
  myBody: { flex: 1, minWidth: 0, gap: 5 },
  myTitle: {
    fontFamily: FF.bold,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.2,
    color: "#fff",
    marginBottom: 2,
  },
  myLine: { flexDirection: "row", alignItems: "center", gap: 6 },
  myLineText: {
    flex: 1,
    fontFamily: FF.medium,
    fontSize: 12,
    lineHeight: 16,
    color: "rgba(255,255,255,0.7)",
  },
  myLineTextMuted: {
    flex: 1,
    fontFamily: FF.medium,
    fontSize: 12,
    lineHeight: 16,
    color: "rgba(255,255,255,0.6)",
  },
  myLineAccent: {
    flex: 1,
    fontFamily: FF.semiBold,
    fontSize: 12,
    lineHeight: 16,
    color: ACCENT,
  },
  myLineProcessing: {
    flex: 1,
    fontFamily: FF.semiBold,
    fontSize: 11,
    lineHeight: 15,
    color: "rgba(234,179,8,0.95)",
  },
  readyToast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: "rgba(34,197,94,0.14)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.45)",
  },
  readyToastDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: ACCENT,
  },
  readyToastTitle: {
    fontFamily: FF.bold,
    fontSize: 13,
    color: "#fff",
  },
  readyToastBody: {
    marginTop: 2,
    fontFamily: FF.regular,
    fontSize: 12,
    color: "rgba(255,255,255,0.78)",
  },
  readyToastCta: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: ACCENT,
  },
  readyToastCtaText: {
    fontFamily: FF.bold,
    fontSize: 12,
    color: "#fff",
  },
  readyToastClose: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  readyToastCloseText: {
    fontFamily: FF.bold,
    fontSize: 22,
    lineHeight: 26,
    color: "rgba(255,255,255,0.7)",
  },
  tagRow: {
    marginTop: 6,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
  },
  tag: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: "rgba(34,197,94,0.12)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.25)",
  },
  tagText: {
    fontFamily: FF.semiBold,
    fontSize: 11,
    color: ACCENT,
  },
  tagMore: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  tagMoreText: {
    fontFamily: FF.semiBold,
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
  },

  sharedList: { gap: 16, marginTop: 8 },
  sharedCard: {
    position: "relative",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
    height: 180,
    backgroundColor: "#0a0f14",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  sharedMedia: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  sharedOverlay: {
    position: "absolute",
    inset: 0 as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 14,
    paddingHorizontal: 16,
    paddingBottom: 16,
    justifyContent: "space-between",
  },
  sharedTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  sharedReady: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#fff",
  },
  sharedReadyText: {
    fontFamily: FF.bold,
    fontSize: 11,
    color: "#171717",
  },
  sharedDur: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  sharedDurText: {
    fontFamily: FF.semiBold,
    fontSize: 11,
    color: "rgba(255,255,255,0.92)",
  },
  sharedMid: {
    justifyContent: "center",
    paddingVertical: 2,
  },
  sharedTitle: {
    fontFamily: FF.bold,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.3,
    color: "#fff",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  sharedMeta: {
    marginTop: 4,
    fontFamily: FF.medium,
    fontSize: 12,
    lineHeight: 17,
    color: "rgba(255,255,255,0.65)",
  },
  sharedActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingTop: 2,
  },
  sharedPills: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
  },
  sharedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    minHeight: 28,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.25)",
    backgroundColor: "rgba(30, 53, 33, 0.85)",
  },
  sharedPillText: {
    fontFamily: FF.semiBold,
    fontSize: 11,
    color: ACCENT,
  },
  sharedFab: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },

  findWrap: { gap: 12, marginTop: 8 },

  // ── Hero card ──────────────────────────────────────────────
  findHeroOuter: {
    position: "relative",
    overflow: "hidden",
    minHeight: 170,
    width: "100%",
    borderRadius: 16,
    backgroundColor: "#071220",
  },
  findHeroImg: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  // Glowing orb effect - 3 layers for soft glow
  findOrbOuter: {
    position: "absolute",
    width: 180,
    height: 180,
    right: -20,
    top: 0,
    backgroundColor: "rgba(34,197,94,0.15)",
    borderRadius: 90,
    opacity: 0.9,
  },
  findOrbMid: {
    position: "absolute",
    width: 130,
    height: 130,
    right: 5,
    top: 25,
    backgroundColor: "rgba(34,197,94,0.35)",
    borderRadius: 65,
    opacity: 0.85,
  },
  findOrbCore: {
    position: "absolute",
    width: 90,
    height: 90,
    right: 25,
    top: 45,
    backgroundColor: "rgba(34,197,94,0.6)",
    borderRadius: 45,
    opacity: 0.95,
  },
  findHeroInner: {
    padding: 18,
    paddingRight: 100,
    zIndex: 2,
  },
  findBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "rgba(34,197,94,0.12)",
  },
  findBadgeText: {
    fontFamily: FF.semiBold,
    fontSize: 11,
    letterSpacing: 1.2,
    color: ACCENT,
  },
  findHeadline: {
    marginTop: 8,
    fontFamily: FF.bold,
    fontSize: 22,
    lineHeight: 28,
    color: "#fff",
  },
  findEm: {
    fontStyle: "italic",
    color: ACCENT,
  },
  findSub: {
    marginTop: 6,
    maxWidth: 210,
    fontFamily: FF.regular,
    fontSize: 13,
    lineHeight: 18,
    color: "rgba(255,255,255,0.6)",
  },
  findPlayRing: {
    position: "absolute",
    right: 16,
    top: "50%",
    marginTop: -36,
    width: 72,
    height: 72,
    borderRadius: 36,
    // backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",

    zIndex: 3,
  },
  findPlayCore: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(15,23,42,0.85)",
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Step pills ─────────────────────────────────────────────
  findSteps: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    width: "100%",
  },
  findStep: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "rgba(34,197,94,0.1)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.2)",
  },
  findStepMuted: {
    backgroundColor: "rgba(148,163,184,0.07)",
    borderColor: "rgba(148,163,184,0.15)",
  },
  findStepDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: ACCENT,
  },
  findStepText: {
    fontFamily: FF.semiBold,
    fontSize: 12,
    color: ACCENT,
  },
  findStepTextMuted: {
    fontFamily: FF.semiBold,
    fontSize: 12,
    color: MUTED,
  },

  // ── Form panels ────────────────────────────────────────────
  findPanel: {
    width: "100%",
    borderRadius: 16,
    padding: 16,
    backgroundColor: "#0d1626",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  findPanelVerify: {
    borderColor: "rgba(34,197,94,0.3)",
    backgroundColor: "#0a1a12",
  },
  findGrid2: {
    flexDirection: "row",
    gap: 12,
  },
  findGridCol: { flex: 1, minWidth: 0 },
  findLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 8,
  },
  findSmallIcon: {
    width: 14,
    height: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  findLabel: {
    fontFamily: FF.semiBold,
    fontSize: 10,
    letterSpacing: 0.8,
    color: MUTED,
  },
  findInput: {
    width: "100%",
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 12,
    fontFamily: FF.semiBold,
    fontSize: 13,
    color: "#fff",
  },

  // ── CTA button ─────────────────────────────────────────────
  findCta: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 30,
    paddingVertical: 15,
    backgroundColor: ACCENT,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    marginTop: 4,
  },
  findCtaText: {
    fontFamily: FF.bold,
    fontSize: 16,
    color: "#fff",
  },

  // ── Results ────────────────────────────────────────────────
  findResults: {
    width: "100%",
    marginTop: 4,
    gap: 10,
  },
  findResultsTitle: {
    fontFamily: FF.semiBold,
    fontSize: 14,
    color: MUTED,
    marginBottom: 4,
  },
  findResultRow: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  findResultName: {
    fontFamily: FF.semiBold,
    fontSize: 15,
    color: "#fff",
  },
  findResultWhen: {
    marginTop: 4,
    fontFamily: FF.regular,
    fontSize: 13,
    color: MUTED,
  },
  emptyList: {
    fontFamily: FF.regular,
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(255,255,255,0.55)",
    textAlign: "center",
    marginBottom: 12,
  },

  // ── Verify panel ───────────────────────────────────────────
  findVerifyTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  verifyIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(34,197,94,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  verifyTitleText: {
    fontFamily: FF.bold,
    fontSize: 15,
    color: "#fff",
  },
  verifyHint: {
    marginTop: 6,
    fontFamily: FF.regular,
    fontSize: 12,
    lineHeight: 17,
    color: MUTED,
  },
  phoneRow: {
    marginTop: 14,
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 12,
  },
  phoneFlagBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.4)",
    backgroundColor: "rgba(34,197,94,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  phoneCc: {
    fontFamily: FF.semiBold,
    fontSize: 13,
    color: "rgba(255,255,255,0.9)",
  },
  phoneInput: {
    flex: 1,
    minWidth: 0,
    fontFamily: FF.regular,
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
    paddingVertical: 0,
  },
});
