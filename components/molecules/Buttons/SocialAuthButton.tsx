import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';
import { MetricsSizes } from '@/theme/variables';

import { Clickable, CText, IconByVariant } from '@/components/atoms';
import { IClickableProps } from '@/components/atoms/Clickable/Clickable';

interface ISocialAuthButtonProps extends IClickableProps {
  children?: React.ReactNode | string;
  Icon?: React.ReactNode;
  IconPath?: string;
  text ?: string
}

const SocialAuthButton = ({ children, onPress, style, Icon, IconPath , text }: ISocialAuthButtonProps) => {
  const { colors, fonts } = useTheme();
  return (
    <Clickable
      onPress={onPress}
      style={[styles.container, { backgroundColor: colors.white,borderColor: colors.outline }, style]}
    >
    
     <CText style={[fonts.text, fonts.size_16]}> {text} </CText>

      <View style={[styles.iconContainer]}>
        {Icon ? Icon : IconPath && <IconByVariant path={IconPath} height={MetricsSizes.XLARGE} />}
      </View>
    </Clickable>
  );
};

export default SocialAuthButton;

const styles = StyleSheet.create({
  container: {
    height: MetricsSizes.BASE_HEIGHT ,
    borderRadius: MetricsSizes.XXLARGE,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#9BEEAD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  iconContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: MetricsSizes.BASE_HEIGHT,
    height: MetricsSizes.BASE_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
