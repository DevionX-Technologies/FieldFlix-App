import { Clickable, CText } from "@/components/atoms";
import { IClickableProps } from "@/components/atoms/Clickable/Clickable";
import { useTheme } from "@/theme";
import { MetricsSizes } from "@/theme/variables";
import { Dimensions, StyleSheet } from "react-native";
interface IDefaultButtonProps extends IClickableProps {
  children: string | React.ReactNode;
}

const DefaultButton = ({
  children,
  onPress,
  ...props
}: IDefaultButtonProps) => {
  const { colors, fonts } = useTheme();
  const screenWidth = Dimensions.get('window').width;
  const calculatedWidth = screenWidth - 30;

  const styles = StyleSheet.create({
  container: {
    height: MetricsSizes.BASE_HEIGHT,
    width: calculatedWidth,
    borderRadius: MetricsSizes.REGULAR,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#9BEEAD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    backgroundColor: "#55DB26",
    marginTop:25
  },
  btn: {
    color: "#181A27",
    fontSize: 20
  }
})
  return (
    <Clickable onPress={onPress} style={[styles.container]} {...props} >
      {typeof children === 'string' ? (
        <CText style={[styles.btn]}> {children} </CText>
      ) : (
        children
      )}
    </Clickable>
  )
}

export default DefaultButton;

