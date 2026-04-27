/** Codia S3 assets — ids from exported Codia `project-…/src/page/index.css` (2026-04-10). */
export const CODIA = 'https://codia-f2c.s3.us-west-1.amazonaws.com/image/2026-04-10'

export const img = (id: string) => `${CODIA}/${id}.png`

export const P = {
  rateBack: img('TkQk87cLEi'),
  rateCardBg: img('aXHSpKYgP2'),
  rateStar1: img('TRQtAWQxjt'),
  rateStar2: img('MRGVz6Et9v'),
  rateStar3: img('Wjs3Y1y2SX'),
  rateStar4: img('7p8wbvqP0u'),
  rateStar5: img('MRqCVoYmOb'),
  contactBack: img('G5Fo7v6FZY'),
  contactIssue: img('pb14ANqAH2'),
  contactDetails: img('RbqaU4Ldfr'),
  contactName: img('Ve9MjdYZXp'),
  contactPhone: img('PsbVp8Sigq'),
  privacyBack: img('Cx2RaQzOKk'),
  privacyLock: img('AJaAsWUw2J'),
  privacyDivider: img('GqaWzrehc4'),
  privacyPolicy: img('TqDzdOOdd8'),
  appBack: img('10rankyCdi'),
  appVisibility: img('5w848Y3Gcq'),
  appDivider: img('pNrEMoeWoV'),
  appData: img('9rZ8AF2G9z'),
  appChevron: img('YuujFdKYym'),
  notifBack: img('5asuY3O7Lf'),
  notifActivity: img('o7m2QaRztF'),
  notifSchedule: img('5TQLBEF4sv'),
  notifPersonal: img('HvCWxknCfO'),
  notifInsights: img('ZWyvTm8DDR'),
  previewTopBg: img('C1GViFqMjT'),
  previewIcon: img('EWyoJsVV3F'),
  previewSection: img('Tdo8nT5p2q'),
} as const

export const RATE_STARS = [P.rateStar1, P.rateStar2, P.rateStar3, P.rateStar4, P.rateStar5] as const
