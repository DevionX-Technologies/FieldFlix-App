/**
 * Static rows from `web/src/screens/HomeScreen.tsx` — used when API returns empty
 * so the home layout matches web pixel structure; real API rows replace these when present.
 */
export const WEB_ARENA_CARDS = [
  {
    id: 'a1',
    name: 'TSG Arena',
    location: 'Andheri West',
    status: 'Indoor • Available Now',
    rating: 4.5,
    distanceKm: 1.2,
    pricePerHr: 200,
  },
  {
    id: 'a2',
    name: 'Velocity Padel Mumbai',
    location: 'Bandra East',
    status: 'Indoor • Available Now',
    rating: 4.8,
    distanceKm: 2.1,
    pricePerHr: 350,
  },
  {
    id: 'a3',
    name: 'Greenline Pickleball Hub',
    location: 'Powai',
    status: 'Outdoor • Available Now',
    rating: 4.6,
    distanceKm: 3.4,
    pricePerHr: 250,
  },
  {
    id: 'a4',
    name: 'Urban Court Padel',
    location: 'Lower Parel',
    status: 'Indoor • Opens 6 PM',
    rating: 4.3,
    distanceKm: 0.8,
    pricePerHr: 400,
  },
  {
    id: 'a5',
    name: 'Rally Point Pickleball',
    location: 'Juhu',
    status: 'Indoor • Available Now',
    rating: 4.7,
    distanceKm: 4.2,
    pricePerHr: 280,
  },
  {
    id: 'a6',
    name: 'Coastal Padel Club',
    location: 'Worli',
    status: 'Rooftop • Available Now',
    rating: 4.4,
    distanceKm: 2.6,
    pricePerHr: 320,
  },
] as const;

export const WEB_RECENT_SESSIONS = [
  {
    id: 's1',
    arenaName: 'TSG Arena',
    location: 'Santacruz West',
    timeLabel: 'Today at 04:57 PM',
    thumbTime: '15:00',
    score: 23,
  },
  {
    id: 's2',
    arenaName: 'Velocity Padel Mumbai',
    location: 'Bandra East',
    timeLabel: 'Yesterday at 06:30 PM',
    thumbTime: '18:00',
    score: 18,
  },
  {
    id: 's3',
    arenaName: 'Greenline Pickleball Hub',
    location: 'Powai',
    timeLabel: 'Mon at 07:15 AM',
    thumbTime: '07:00',
    score: 31,
  },
  {
    id: 's4',
    arenaName: 'Urban Court Padel',
    location: 'Lower Parel',
    timeLabel: 'Sun at 05:00 PM',
    thumbTime: '17:00',
    score: 12,
  },
  {
    id: 's5',
    arenaName: 'Rally Point Pickleball',
    location: 'Juhu',
    timeLabel: 'Sat at 11:20 AM',
    thumbTime: '11:00',
    score: 27,
  },
] as const;
