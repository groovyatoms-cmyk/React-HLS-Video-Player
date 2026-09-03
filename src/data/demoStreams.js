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
  {
    id: 'apple-bipbop-4x3',
    label: 'Apple BipBop 4x3 (multi-bitrate + captions)',
    type: 'hls',
    url: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_4x3/bipbop_4x3_variant.m3u8',
    poster: '',
  },
  {
    id: 'apple-bipbop-adv-fmp4',
    label: 'Apple BipBop Advanced (fMP4, multi-audio + subtitles)',
    type: 'hls',
    url: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8',
    poster: '',
  },
  {
    id: 'unified-tears-of-steel',
    label: 'Tears of Steel (Unified Streaming, fMP4)',
    type: 'hls',
    url: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
    poster: '',
  },
  {
    id: 'bitmovin-art-of-motion',
    label: 'Art of Motion (Bitmovin, multi-bitrate)',
    type: 'hls',
    url: 'https://bitmovin-a.akamaihd.net/content/MI201109210084_1/m3u8s/f08e80da-bf1d-4e3d-8899-f0f6155f6efa.m3u8',
    poster: '',
  },
]

// Generated placeholder thumbnail sprite for the seek-bar scrub-preview
// demo — a 5x2 grid of labeled tiles, entirely inline (no network request),
// standing in for a real per-video storyboard sprite in production use.
function buildDemoThumbnailSprite() {
  const columns = 5
  const rows = 2
  const tileWidth = 120
  const tileHeight = 68
  const colors = ['#7c3aed', '#8b5cf6', '#a78bfa', '#6d28d9', '#5b21b6', '#4c1d95', '#9333ea', '#7e22ce', '#6b21a8', '#581c87']
  let cells = ''
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < columns; col += 1) {
      const index = row * columns + col
      const x = col * tileWidth
      const y = row * tileHeight
      cells += `<rect x="${x}" y="${y}" width="${tileWidth}" height="${tileHeight}" fill="${colors[index % colors.length]}"/>`
      cells += `<text x="${x + tileWidth / 2}" y="${y + tileHeight / 2 + 5}" font-family="sans-serif" font-size="16" fill="#fff" text-anchor="middle">${index}</text>`
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${columns * tileWidth}" height="${rows * tileHeight}">${cells}</svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

export const DEMO_THUMBNAILS = {
  url: buildDemoThumbnailSprite(),
  interval: 10, // seconds per tile
  columns: 5,
  rows: 2,
  tileWidth: 120,
  tileHeight: 68,
}

export default DEMO_STREAM
