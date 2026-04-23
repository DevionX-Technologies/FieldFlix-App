import React from 'react';

import { TouchableOpacity, TouchableOpacityProps } from 'react-native-gesture-handler';

export interface IClickableProps extends TouchableOpacityProps {}

const Clickable = ({children, ...props}: IClickableProps) => {
  return (
    <TouchableOpacity activeOpacity={0.7} {...props}  >
      {children}
    </TouchableOpacity>
  );
};

export default Clickable;

