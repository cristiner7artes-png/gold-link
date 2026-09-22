export const GOOGLE_TAG_ID = 'AW-18466543528';

export const trackConversion = (label) => {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', 'conversion', {
      send_to: `${GOOGLE_TAG_ID}/${label}`,
    });
  }
};
