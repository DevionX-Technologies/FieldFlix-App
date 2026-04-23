const { withInfoPlist } = require('expo/config-plugins');

const withRazorpayIos = (config, options = {}) => {
  const merchantId = options.merchantId || 'RQbGJa98EUfITd';

  return withInfoPlist(config, config => {
    // Add Razorpay configuration to Info.plist
    config.modResults.RazorpayMerchantId = merchantId;
    
    // Add URL scheme for Razorpay if not already present
    if (!config.modResults.CFBundleURLTypes) {
      config.modResults.CFBundleURLTypes = [];
    }

    // Check if Razorpay URL scheme already exists
    const hasRazorpayScheme = config.modResults.CFBundleURLTypes.some(urlType =>
      urlType.CFBundleURLSchemes?.some(scheme => scheme.startsWith('rzp_'))
    );

    if (!hasRazorpayScheme) {
      config.modResults.CFBundleURLTypes.push({
        CFBundleURLName: 'razorpay',
        CFBundleURLSchemes: [`rzp_${merchantId}`],
      });
    }

    return config;
  });
};

module.exports = withRazorpayIos;