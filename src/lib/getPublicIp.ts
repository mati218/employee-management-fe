/**
 * Fetch the user's real public IP address from ipify.
 * Falls back to empty string if the request fails (e.g. offline).
 */
export const getPublicIp = async (): Promise<string> => {
  try {
    const res = await fetch('https://api.ipify.org?format=json', {
      cache: 'no-store',
    });
    const data = await res.json();
    return data.ip as string;
  } catch {
    console.warn('Could not fetch public IP from ipify');
    return '';
  }
};
