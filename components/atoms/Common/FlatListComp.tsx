import React from 'react';
import { FlatListProps} from 'react-native';
import { FlatList } from 'react-native-gesture-handler';


const FlatListComp = (props: FlatListProps<any>) => {
  return <FlatList {...props} />;
};

export default FlatListComp;
