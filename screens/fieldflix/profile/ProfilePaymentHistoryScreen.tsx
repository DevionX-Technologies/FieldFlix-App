import { FF } from '@/screens/fieldflix/fonts';
import { WebShell } from '@/screens/fieldflix/WebShell';
import { BackHeader } from '@/screens/fieldflix/profile/BackHeader';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BG = '#00050A';

/** Mirrors `web/src/screens/ProfilePaymentHistoryScreen.tsx`. */
export default function FieldflixProfilePaymentHistoryScreen() {
  const insets = useSafeAreaInsets();

  return (
    <WebShell backgroundColor={BG}>
      <View style={styles.flex}>
        <BackHeader title="Payment History" />
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: 40 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.emptyIcon}>
            <MaterialCommunityIcons name="wallet-outline" size={40} color="rgba(255,255,255,0.3)" />
          </View>
          <Text style={styles.emptyCopy}>
            No transactions yet. When you subscribe or make a purchase, your receipts will appear here.
          </Text>
        </ScrollView>
      </View>
    </WebShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 80,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyCopy: {
    textAlign: 'center',
    fontFamily: FF.regular,
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.55)',
  },
});
