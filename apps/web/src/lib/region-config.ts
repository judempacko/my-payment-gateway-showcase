export const REGIONS = {
  FR: {
    code: 'FR',
    country: 'FR',
    currency: 'EUR',
    labelKey: 'common.france',
    dialCode: '+33',
    postalCodeRequired: true,
  },
  SN: {
    code: 'SN',
    country: 'SN',
    currency: 'XOF',
    labelKey: 'common.senegal',
    dialCode: '+221',
    postalCodeRequired: false,
  },
} as const;

export type Region = keyof typeof REGIONS;

export function isRegion(value: string | undefined): value is Region {
  return value === 'FR' || value === 'SN';
}

export function regionConfig(region: Region) {
  return REGIONS[region];
}
