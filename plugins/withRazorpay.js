const withRazorpayAndroid = require('./withRazorpayAndroid');
const withRazorpayIos = require('./withRazorpayIos');

const withRazorpay = (config, options = {}) => {
  const merchantId = options.merchantId || 'RQbGJa98EUfITd';
  
  // Apply Android modifications
  config = withRazorpayAndroid(config, { merchantId });
  
  // Apply iOS modifications
  config = withRazorpayIos(config, { merchantId });
  
  return config;
};

module.exports = withRazorpay;