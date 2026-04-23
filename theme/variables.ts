import { Dimensions } from "react-native";

let { height, width } = Dimensions.get('window');

let base10 = width / 40;

export const MetricsSizes = {
    //Default Metrics
    SCREEN_WIDTH: width,
    SCREEN_HEIGHT: height,
    BASE_HEIGHT: base10 * 6.4,
    BASE_RADIUS: base10,

    //Sizes Metrics
    TINY: base10 / 2,
    SMALL: base10,
    REGULAR: base10 * 1.5,
    MEDIUM: base10 * 2,
    LARGE: base10 * 3,
    XLARGE: base10 * 4,
    XXLARGE: base10 * 5,
    BASE80: base10 * 8,
    BASE100: base10 * 10,
    BASE200: base10 * 20,

    //Negative Metrics
    NEG_TINY: -base10 / 2,
    NEG_SMALL: -base10,
    NEG_REGULAR: -base10 * 1.5,

    //Rating width
    RATING_SMALL: width / 4,
    RATING_MEDIUM: width / 3,
    RATING_LARGE: width / 2,
    RATING_XLARGE: width / 1.5,
    RATING_XXLARGE: width,
};

const { SMALL, REGULAR, LARGE, MEDIUM } = MetricsSizes;

/**
 * FontSize
 */
export const FontSize = {
    xs: SMALL, //  10
    sm: SMALL * 1.2, //12
    bs: SMALL * 1.4, //14 i.e. base size
    rg: SMALL * 1.4, // 15
    md: REGULAR * 1.2, // 18
    lg: LARGE * 0.8, // 24
    xl: LARGE, //30
    xxl: LARGE * 1.2, //36
};

/**
 * ButtonSizes
 */

export const ButtonSizes = {
    SMALL: SMALL * 2,
    REGULAR: REGULAR * 2,
    SEMI: MEDIUM * 1.5,
    MEDIUM: MEDIUM * 2,
    SMLARGE: LARGE * 1.5,
    LARGE: LARGE * 2,
};

/**
 * FontFamily
 */

let fontPrefix = 'Poppins'; //REPLACE WITH YOUR FONT NAME

export const FontFamily = {
    BLACK: fontPrefix + '-Black',
    BLACK_ITALIC: fontPrefix + '-BlackItalic',
    BOLD: fontPrefix + '-Bold',
    BOLD_ITALIC: fontPrefix + '-BoldItalic',
    EXTRA_BOLD: fontPrefix + '-ExtraBold',
    EXTRA_BOLD_ITALIC: fontPrefix + '-ExtraBoldItalic',
    EXTRA_LIGHT: fontPrefix + '-ExtraLight',
    EXTRA_LIGHT_ITALIC: fontPrefix + '-ExtraLightItalic',
    ITALIC: fontPrefix + '-Italic',
    LIGHT: fontPrefix + '-Light',
    LIGHT_ITALIC: fontPrefix + '-LightItalic',
    MEDIUM: fontPrefix + '-Medium',
    MEDIUM_ITALIC: fontPrefix + '-MediumItalic',
    REGULAR: fontPrefix + '-Regular',
    SEMI_BOLD: fontPrefix + '-SemiBold',
    SEMI_BOLD_ITALIC: fontPrefix + '-SemiBoldItalic',
    THIN: fontPrefix + '-Thin',
    THIN_ITALIC: fontPrefix + '-ThinItalic',
};
