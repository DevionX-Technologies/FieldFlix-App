const { withAndroidManifest, AndroidConfig } = require('expo/config-plugins');

const withRazorpayAndroid = (config, options = {}) => {
  const merchantId = options.merchantId || 'RQbGJa98EUfITd';

  return withAndroidManifest(config, config => {
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);

    // Ensure meta-data array exists
    if (!mainApplication['meta-data']) {
      mainApplication['meta-data'] = [];
    }

    // Add Razorpay merchant ID as meta-data
    mainApplication['meta-data'].push({
      $: {
        'android:name': 'com.razorpay.merchant_id',
        'android:value': merchantId,
      },
    });

    return config;
  });
};

module.exports = withRazorpayAndroid;