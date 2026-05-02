import re
import sys

def patch_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Imports
    content = content.replace(
"""import {
  createShareLink,
  getMyRecordings,
  getSharedByMe,
  getPublicFlickShorts,
  getSharedWithMe,
} from "@/lib/fieldflix-api";""",
"""import {
  createShareLink,
  getMyRecordings,
  getSharedByMe,
  getPublicFlickShorts,
  getSharedWithMe,
  getTurfsPage,
  getCameras,
  findAndClaimRecording,
  type Camera,
} from "@/lib/fieldflix-api";"""
    )

    # 2. States
    content = content.replace(
"""  const [findVenue, setFindVenue] = useState("");
  const [findGround, setFindGround] = useState("");""",
"""  const [findVenue, setFindVenue] = useState("");
  const [findVenueId, setFindVenueId] = useState<string | null>(null);
  const [findGround, setFindGround] = useState("");
  const [findGroundId, setFindGroundId] = useState<string | null>(null);
  const [systemTurfs, setSystemTurfs] = useState<any[]>([]);
  const [systemCameras, setSystemCameras] = useState<Camera[]>([]);"""
    )

    # 3. Load function
    content = content.replace(
"""  const load = useCallback(async () => {
    try {
      const [a, b, c, flickList] = await Promise.all([
        getMyRecordings(),
        getSharedWithMe(),
        getSharedByMe().catch(() => []),
        getPublicFlickShorts(undefined).catch(() => []),
      ]);
      setMy(a);
      setShared(b);
      setSharedByMe(c);""",
"""  const load = useCallback(async () => {
    try {
      const [a, b, c, flickList, turfsRes] = await Promise.all([
        getMyRecordings(),
        getSharedWithMe(),
        getSharedByMe().catch(() => []),
        getPublicFlickShorts(undefined).catch(() => []),
        getTurfsPage(1, 100).catch(() => ({ data: [] })),
      ]);
      setMy(a);
      setShared(b);
      setSharedByMe(c);
      setSystemTurfs(turfsRes.data || []);"""
    )

    # 4. Dropdown options
    content = re.sub(
        r'const optionMaps = useMemo\(\(\) => \{.*?\}, \[my\]\);\s*const venueOptions = useMemo\(\(\) => \{.*?\}, \[my\]\);\s*const venueDropdownOptions = useMemo\(\(\) => \{.*?\}, \[findVenue, venueOptions\]\);\s*const groundOptions = useMemo\(\(\) => \{.*?\}, \[findVenue, findGround, optionMaps\.arenaToGrounds\]\);',
        """const venueDropdownOptions = useMemo(() => {
    const q = findVenue.trim().toLowerCase();
    return systemTurfs
      .filter((x) => !q || (x.name || "").toLowerCase().includes(q))
      .slice(0, 12);
  }, [findVenue, systemTurfs]);

  useEffect(() => {
    if (findVenueId) {
      getCameras(findVenueId).then(setSystemCameras).catch(() => setSystemCameras([]));
    } else {
      setSystemCameras([]);
    }
  }, [findVenueId]);

  const groundOptions = useMemo(() => {
    const q = findGround.trim().toLowerCase();
    return systemCameras
      .filter((x) => !q || (x.name || "").toLowerCase().includes(q))
      .slice(0, 12);
  }, [findGround, systemCameras]);""",
        content,
        flags=re.DOTALL
    )

    # 5. Form validation
    content = content.replace(
"""  const isLocationComplete = findVenue.trim().length > 0;
  const isScheduleComplete =
    findVenue.trim().length > 0 &&
    findGround.trim().length > 0 &&
    findStart.trim().length > 0 &&
    findEnd.trim().length > 0;""",
"""  const isLocationComplete = !!findVenueId;
  const isScheduleComplete =
    !!findVenueId &&
    findStart.trim().length > 0 &&
    findEnd.trim().length > 0;"""
    )

    # 6. Search function
    old_run = re.search(r'const runFindInMyRecordings = useCallback\(\(\) => \{.*?\n  \}, \[my, findVenue, findGround, findDateLabel, findStart, findEnd\]\);', content, re.DOTALL)
    if old_run:
        new_run = """const runFindGame = useCallback(async () => {
    if (!findVenueId || !findStart.trim() || !findEnd.trim() || findPhone.trim().length !== 10) return;
    try {
      const fd = new Date(findPickDate);
      const m = String(fd.getMonth() + 1).padStart(2, "0");
      const d = String(fd.getDate()).padStart(2, "0");
      const payload = {
        turfId: findVenueId,
        cameraId: findGroundId || undefined,
        date: `${fd.getFullYear()}-${m}-${d}`,
        startTime: findStart.trim(),
        endTime: findEnd.trim(),
        phoneLast10: findPhone.trim(),
      };
      const res = await findAndClaimRecording(payload);
      setFindMatches(res);
      // Automatically refresh the library/shared tabs so the claimed recording shows up
      load();
    } catch (e) {
      console.warn("Error finding game", e);
      setFindMatches([]);
    }
    setShowVenueOptions(false);
    setShowGroundOptions(false);
  }, [findVenueId, findGroundId, findPickDate, findStart, findEnd, findPhone, load]);"""
        content = content.replace(old_run.group(0), new_run)

    # 7. JSX updates
    # Venue Input onChangeText
    content = content.replace(
"""onChangeText={(t) => {
                          setFindVenue(t);
                          setShowVenueOptions(true);
                        }}""",
"""onChangeText={(t) => {
                          setFindVenue(t);
                          setFindVenueId(null);
                          setShowVenueOptions(true);
                        }}"""
    )

    # Ground Input onChangeText
    content = content.replace(
"""onChangeText={(t) => {
                          setFindGround(t);
                          setShowGroundOptions(true);
                        }}""",
"""onChangeText={(t) => {
                          setFindGround(t);
                          setFindGroundId(null);
                          setShowGroundOptions(true);
                        }}"""
    )

    # Venue Dropdown Items
    content = content.replace(
"""                    {venueDropdownOptions.map((v) => (
                      <Pressable
                        key={v}
                        style={styles.findDropdownItem}
                        onPress={() => {
                          setFindVenue(v);
                          setShowVenueOptions(false);
                          setTimeout(() => {
                            findGroundInputRef.current?.focus();
                            setShowGroundOptions(true);
                          }, 100);
                        }}
                      >
                        <Text style={styles.findDropdownItemText}>{v}</Text>
                      </Pressable>
                    ))}""",
"""                    {venueDropdownOptions.map((v) => (
                      <Pressable
                        key={v.id}
                        style={styles.findDropdownItem}
                        onPress={() => {
                          setFindVenue(v.name);
                          setFindVenueId(v.id);
                          setShowVenueOptions(false);
                          setTimeout(() => {
                            findGroundInputRef.current?.focus();
                            setShowGroundOptions(true);
                          }, 100);
                        }}
                      >
                        <Text style={styles.findDropdownItemText}>{v.name}</Text>
                      </Pressable>
                    ))}"""
    )

    # Ground Dropdown Items
    content = content.replace(
"""                    {groundOptions.map((g) => (
                      <Pressable
                        key={g}
                        style={styles.findDropdownItem}
                        onPress={() => {
                          setFindGround(g);
                          setShowGroundOptions(false);
                        }}
                      >
                        <Text style={styles.findDropdownItemText}>{g}</Text>
                      </Pressable>
                    ))}""",
"""                    {groundOptions.map((g) => (
                      <Pressable
                        key={g.id}
                        style={styles.findDropdownItem}
                        onPress={() => {
                          setFindGround(g.name);
                          setFindGroundId(g.id);
                          setShowGroundOptions(false);
                        }}
                      >
                        <Text style={styles.findDropdownItemText}>{g.name}</Text>
                      </Pressable>
                    ))}"""
    )

    # "Find My Game" onPress
    content = content.replace(
"""onPress={runFindInMyRecordings}""",
"""onPress={runFindGame}"""
    )

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

    print("Patched successfully")

if __name__ == '__main__':
    patch_file(r"c:\\ff\\frontend\\FieldFlix-App\\screens\\fieldflix\\RecordingsScreen.tsx")
