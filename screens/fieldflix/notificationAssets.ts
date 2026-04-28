import type { ImageSourcePropType } from 'react-native';
import type { NotificationIconId } from '@/screens/fieldflix/notificationsSections';

/** `web/public/notifications/*.png` — same art as web notifications list. */
export const NOTIFICATION_ICON_SRC: Record<NotificationIconId, ImageSourcePropType> = {
  trophy: require('@/assets/fieldflix-web/notifications/trophy.png'),
  chart: require('@/assets/fieldflix-web/notifications/chart.png'),
  video: require('@/assets/fieldflix-web/notifications/video.png'),
  whistle: require('@/assets/fieldflix-web/notifications/whistle.png'),
  bulb: require('@/assets/fieldflix-web/notifications/bulb.png'),
};
