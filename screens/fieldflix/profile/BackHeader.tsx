import { FieldflixScreenHeader } from '@/screens/fieldflix/FieldflixScreenHeader';

/** Thin wrapper — same chrome as Notifications / Profile. `bottomBorder` accepted for compatibility; divider is always applied. */
export function BackHeader({
  title,
  onBack,
  bottomBorder: _unused,
}: {
  title: string;
  onBack?: () => void;
  bottomBorder?: boolean;
}) {
  return <FieldflixScreenHeader title={title} onBack={onBack} />;
}
