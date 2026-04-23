import { Dimensions, Image, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

import SafeScreen from '@/components/tmplts/SafeScreen';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type AuthLayoutProps = {
  children: React.ReactNode;
  hideBackground?: boolean; // Optional prop to hide background for certain screens
};

const AuthLayout = ({ children, hideBackground = false }: AuthLayoutProps) => {
  const { colors } = useTheme();

  return (
    <SafeScreen>
    <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.container, { backgroundColor: colors.white }]}
      >
     
            {/* Background Image */}
            <View style={styles.backgroundContainer}>
            <Image
                source={require('@/theme/assets/images/authBg.png')}
                style={styles.backgroundImage}
                resizeMode="cover"
            />
            </View>

            {/* Content Container */}
            <View style={styles.contentWrapper}>
            <View
                style={[styles.contentContainer, { backgroundColor: colors.white }]}
            >
                {children}
            </View>
            </View>

      </KeyboardAvoidingView>
    </SafeScreen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundContainer: {
    height: SCREEN_HEIGHT * 0.3, // 30% of screen height for background
    width: SCREEN_WIDTH,
    overflow: 'hidden',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  contentWrapper: {
    flex: 1,
    marginTop: -20, // Overlap with background
  },
  contentContainer: {
    flex: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    // Add shadow for elevation effect
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: -2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 5,
      },
    }),
  },
});

export default AuthLayout;
