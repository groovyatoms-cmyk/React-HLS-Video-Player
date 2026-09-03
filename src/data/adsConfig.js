// Google IMA SDK loader (official CDN — required by Google's terms, not
// something that can be self-hosted/bundled).
export const IMA_SDK_URL = 'https://imasdk.googleapis.com/js/sdkloader/ima3.js'

// Google's own public single-linear-ad sample VAST tag, published for IMA
// SDK integration testing. Not real ad inventory — safe to ship as a demo
// default. See: https://developers.google.com/interactive-media-ads/docs/sdks/html5/client-side/tags
export const DEMO_AD_TAG_URL =
  'https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/single_ad_samples&sz=640x480&cust_params=sample_ct%3Dlinear&ciu_szs=300x250%2C728x90&gdfp_req=1&output=vast&unviewed_position_start=1&env=vp&impl=s&correlator='

export default DEMO_AD_TAG_URL
