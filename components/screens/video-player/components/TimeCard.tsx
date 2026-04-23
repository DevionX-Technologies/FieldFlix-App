import React from 'react';
import { StyleSheet, Text, TextProps } from 'react-native';

interface WhiteTextProps extends TextProps {
  children: React.ReactNode;
}

const TimeCard: React.FC<WhiteTextProps> = ({ children, style, ...props }) => {
  return (
    <Text style={[styles.text, style]} {...props}>
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  text: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '400',
    // Add more custom styling if needed
  },
});

export default TimeCard;