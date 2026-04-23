import type { ReactNode } from 'react';
import { Dimensions, View } from 'react-native';

/**
 * Phone-full-width shell. Web uses `max-w-[402px]` letterbox; we scale the
 * interior content via `scale.ts` so the design fills any phone naturally.
 * Still bounded to 480px on tablets so we don't over-stretch.
 */
const TABLET_CAP = 480;

export function WebShell({
  children,
  backgroundColor = '#020617',
}: {
  children: ReactNode;
  backgroundColor?: string;
}) {
  const w = Dimensions.get('window').width;
  const shellW = Math.min(w, TABLET_CAP);

  return (
    <View style={{ flex: 1, backgroundColor: '#000000', alignItems: 'center' }}>
      <View style={{ width: shellW, flex: 1, backgroundColor, overflow: 'hidden' }}>{children}</View>
    </View>
  );
}

export function useShellWidth(): number {
  const w = Dimensions.get('window').width;
  return Math.min(w, TABLET_CAP);
}
