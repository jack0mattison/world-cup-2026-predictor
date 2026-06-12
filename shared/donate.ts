export const DONATION_PRESET_AMOUNTS = [300, 500, 1000] as const;

export type DonationPresetAmount = (typeof DONATION_PRESET_AMOUNTS)[number];

export function isDonationPresetAmount(amount: number): amount is DonationPresetAmount {
  return (DONATION_PRESET_AMOUNTS as readonly number[]).includes(amount);
}

export function formatDonationLabel(pence: DonationPresetAmount): string {
  return `£${pence / 100}`;
}
