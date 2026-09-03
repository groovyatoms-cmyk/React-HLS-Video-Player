// Small curated set of publicly available demo HLS / MP4 streams used to
// exercise the player during development. These are third-party test
// assets, not something this project hosts or controls.

export const DEMO_STREAM = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'

export const DEMO_STREAMS = [
  {
    id: 'x36xhzz',
    label: 'Big Buck Bunny (multi-bitrate HLS)',
    type: 'hls',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    poster: '',
  },
  {
    id: 'sintel',
    label: 'Sintel (multi-audio HLS)',
    type: 'hls',
    url: 'https://test-streams.mux.dev/pts_shift/master.m3u8',
    poster: '',
  },
  {
    id: 'live-akamai',
    label: 'Akamai Live Stream (simulated live)',
    type: 'hls',
    url: 'https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8',
    poster: '',
  },
  {
    id: 'mp4-demo',
    label: 'Big Buck Bunny (progressive MP4)',
    type: 'mp4',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    poster: '',
  },
]

export default DEMO_STREAM
