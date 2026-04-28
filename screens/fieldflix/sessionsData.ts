import type { ImageSourcePropType } from 'react-native';

/** Codia PNGs bundled under `assets/fieldflix-web/codia/` (same files as web CDN). */
export const SESSIONS_BACK_ARROW: ImageSourcePropType = require('@/assets/fieldflix-web/codia/XHJRSR0WCk.png');

export type SessionRowLocal = {
  id: string;
  sport: string;
  arena: string;
  area: string;
  when: string;
  sportIcon: ImageSourcePropType;
  pinIcon: ImageSourcePropType;
  clockIcon: ImageSourcePropType;
  playIcon: ImageSourcePropType | null;
};

/** Mirrors `web/src/screens/SessionsScreen.tsx` `SESSIONS` + local Codia assets. */
export const SESSIONS_ROW: SessionRowLocal[] = [
  {
    id: '1',
    sport: 'Pickleball',
    arena: 'TGS Sports Arena, Andheri West',
    area: 'Santacruz West, Mumbai',
    when: 'Feb 27, 2026 | 04:57 PM',
    sportIcon: require('@/assets/fieldflix-web/codia/F2Lt6xWdi4.png'),
    pinIcon: require('@/assets/fieldflix-web/codia/t2o4G2tzSv.png'),
    clockIcon: require('@/assets/fieldflix-web/codia/tnWa17XveT.png'),
    playIcon: require('@/assets/fieldflix-web/codia/gtK2TDyjSo.png'),
  },
  {
    id: '2',
    sport: 'Badminton',
    arena: 'TGS Sports Arena, Andheri West',
    area: 'Andheri East, Mumbai',
    when: 'Mar 02, 2026 | 06:30 PM',
    sportIcon: require('@/assets/fieldflix-web/codia/OHBi5zuOmG.png'),
    pinIcon: require('@/assets/fieldflix-web/codia/NbcnZyGYv1.png'),
    clockIcon: require('@/assets/fieldflix-web/codia/ce0n5YNSD8.png'),
    playIcon: require('@/assets/fieldflix-web/codia/Qjf1YVynD2.png'),
  },
  {
    id: '3',
    sport: 'Tennis',
    arena: 'TGS Sports Arena, Andheri West',
    area: 'Andheri East, Mumbai',
    when: 'Feb 28, 2026 | 05:45 PM',
    sportIcon: require('@/assets/fieldflix-web/codia/hWoQXm2kLA.png'),
    pinIcon: require('@/assets/fieldflix-web/codia/ZWvtyPjATt.png'),
    clockIcon: require('@/assets/fieldflix-web/codia/wNsCgYFjcS.png'),
    playIcon: require('@/assets/fieldflix-web/codia/Vsg7NtV7s1.png'),
  },
  {
    id: '4',
    sport: 'Basketball',
    arena: 'TGS Sports Arena, Andheri West',
    area: 'Lower Parel, Mumbai',
    when: 'Mar 01, 2026 | 09:00 PM',
    sportIcon: require('@/assets/fieldflix-web/codia/KR42zCQtxK.png'),
    pinIcon: require('@/assets/fieldflix-web/codia/vyfo28eHf4.png'),
    clockIcon: require('@/assets/fieldflix-web/codia/17bocFiqGA.png'),
    playIcon: require('@/assets/fieldflix-web/codia/KfNznH0mpg.png'),
  },
  {
    id: '5',
    sport: 'Tennis',
    arena: 'TGS Sports Arena, Andheri West',
    area: 'Juhu, Mumbai',
    when: 'Mar 05, 2026 | 07:15 AM',
    sportIcon: require('@/assets/fieldflix-web/codia/4bhCGySpjn.png'),
    pinIcon: require('@/assets/fieldflix-web/codia/rVGXSijYd9.png'),
    clockIcon: require('@/assets/fieldflix-web/codia/kBEDOT1bQD.png'),
    playIcon: null,
  },
];

const BASE = SESSIONS_ROW[0];

/**
 * Per-sport card chrome aligned with `HomeScreen` / `sportLabelFromTurf` (Cricket, Padel, etc.).
 * Pin/clock/play reuse the Pickleball row so list layout stays consistent.
 */
export const SESSIONS_SPORT_TEMPLATES: Record<'cricket' | 'padel', SessionRowLocal> = {
  cricket: {
    ...BASE,
    id: 'cricket',
    sport: 'Cricket',
    /** Same asset as Home “Cricket” sport tile. */
    sportIcon: require('@/assets/fieldflix-web/coming-soon.png'),
  },
  padel: {
    ...BASE,
    id: 'padel',
    sport: 'Padel',
    sportIcon: require('@/assets/fieldflix-web/padel.png'),
  },
};
