import { cookies } from 'next/headers';
import { isRegion, type Region } from './region-config';

export async function getRegion(): Promise<Region> {
  const store = await cookies();
  const value = store.get('region')?.value;
  return isRegion(value) ? value : 'FR';
}
