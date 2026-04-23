'use strict';

const React = require('react');
const { View } = require('react-native');

/**
 * Web stub: react-native-maps is native-only. Screens that use maps get a placeholder on web.
 */
const MapView = React.forwardRef(({ children, style }, ref) =>
  React.createElement(
    View,
    {
      ref,
      style: [{ minHeight: 200, backgroundColor: '#e8e8e8' }, style],
    },
    children
  )
);

function Marker() {
  return null;
}

MapView.Marker = Marker;
module.exports = MapView;
module.exports.default = MapView;
module.exports.Marker = Marker;
