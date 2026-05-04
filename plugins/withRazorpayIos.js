const { withInfoPlist } = require('expo/config-plugins');

const withRazorpayIos = (config, options = {}) => {
  const merchantId = options.merchantId || 'RQbGJa98EUfITd';
  const razorpayScheme = `rzp.${merchantId}`;

  return withInfoPlist(config, config => {
    // Add Razorpay configuration to Info.plist
    config.modResults.RazorpayMerchantId = merchantId;
    
    // Add URL scheme for Razorpay if not already present
    if (!config.modResults.CFBundleURLTypes) {
      config.modResults.CFBundleURLTypes = [];
    }

    config.modResults.CFBundleURLTypes = config.modResults.CFBundleURLTypes.map(urlType => {
      if (!urlType.CFBundleURLSchemes) {
        return urlType;
      }

      return {
        ...urlType,
        CFBundleURLSchemes: urlType.CFBundleURLSchemes.map(scheme =>
          scheme.startsWith('rzp_') ? razorpayScheme : scheme
        ),
      };
    });

    // Check if Razorpay URL scheme already exists
    const hasRazorpayScheme = config.modResults.CFBundleURLTypes.some(urlType =>
      urlType.CFBundleURLSchemes?.some(scheme => scheme === razorpayScheme)
    );

    if (!hasRazorpayScheme) {
      config.modResults.CFBundleURLTypes.push({
        CFBundleURLName: 'razorpay',
        CFBundleURLSchemes: [razorpayScheme],
      });
    }

    return config;
  });
};

module.exports = withRazorpayIos;
