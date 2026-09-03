import { useCallback, useEffect, useRef, useState } from 'react'
import { IMA_SDK_URL } from '../data/adsConfig'

let sdkPromise = null

function loadImaSdk() {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'))
  if (window.google?.ima) return Promise.resolve(window.google.ima)
  if (sdkPromise) return sdkPromise

  sdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = IMA_SDK_URL
    script.async = true
    script.onload = () => {
      if (window.google?.ima) resolve(window.google.ima)
      else reject(new Error('IMA SDK loaded but google.ima is unavailable'))
    }
    script.onerror = () => reject(new Error('Failed to load the IMA SDK'))
    document.head.appendChild(script)
  }).catch((err) => {
    sdkPromise = null
    throw err
  })

  return sdkPromise
}

/**
 * Thin wrapper around the Google IMA SDK for a single pre-roll linear ad.
 * Ads are entirely best-effort: any failure to load the SDK, the ad tag, or
 * the creative itself is swallowed and simply resumes/starts content
 * playback — a broken ad must never block the actual video.
 */
export default function useImaAds({ adTagUrl, videoRef, containerRef, onContentPauseRequested, onContentResumeRequested }) {
  const [adState, setAdState] = useState({
    loading: false,
    playing: false,
    skippable: false,
    remaining: 0,
    duration: 0,
    error: null,
  })

  const adsLoaderRef = useRef(null)
  const adsManagerRef = useRef(null)
  const displayContainerRef = useRef(null)
  const requestedRef = useRef(false)
  const callbacksRef = useRef({})
  useEffect(() => {
    callbacksRef.current = { onContentPauseRequested, onContentResumeRequested }
  })

  const destroy = useCallback(() => {
    adsManagerRef.current?.destroy()
    adsManagerRef.current = null
    adsLoaderRef.current?.destroy()
    adsLoaderRef.current = null
  }, [])

  useEffect(() => () => destroy(), [destroy])

  const requestAds = useCallback(async () => {
    if (!adTagUrl || requestedRef.current) return
    if (!videoRef.current || !containerRef.current) return
    requestedRef.current = true

    let ima
    try {
      ima = await loadImaSdk()
    } catch (err) {
      setAdState((s) => ({ ...s, error: err.message }))
      return
    }

    try {
      ima.settings.setDisableCustomPlaybackForIOS10Plus(true)
      const displayContainer = new ima.AdDisplayContainer(containerRef.current, videoRef.current)
      displayContainer.initialize()
      displayContainerRef.current = displayContainer

      const adsLoader = new ima.AdsLoader(displayContainer)
      adsLoaderRef.current = adsLoader

      adsLoader.addEventListener(
        ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
        (event) => {
          const adsRenderingSettings = new ima.AdsRenderingSettings()
          adsRenderingSettings.restoreCustomPlaybackStateOnAdBreakComplete = true
          const adsManager = event.getAdsManager(videoRef.current, adsRenderingSettings)
          adsManagerRef.current = adsManager

          adsManager.addEventListener(ima.AdErrorEvent.Type.AD_ERROR, (e) => {
            setAdState((s) => ({ ...s, error: e.getError?.().toString() || 'Ad error', playing: false }))
            adsManager.destroy()
            callbacksRef.current.onContentResumeRequested?.()
          })
          adsManager.addEventListener(ima.AdEvent.Type.CONTENT_PAUSE_REQUESTED, () => {
            setAdState((s) => ({ ...s, playing: true }))
            callbacksRef.current.onContentPauseRequested?.()
          })
          adsManager.addEventListener(ima.AdEvent.Type.CONTENT_RESUME_REQUESTED, () => {
            setAdState((s) => ({ ...s, playing: false, remaining: 0, duration: 0 }))
            callbacksRef.current.onContentResumeRequested?.()
          })
          adsManager.addEventListener(ima.AdEvent.Type.ALL_ADS_COMPLETED, () => {
            setAdState((s) => ({ ...s, playing: false }))
          })
          adsManager.addEventListener(ima.AdEvent.Type.SKIPPED, () => {
            setAdState((s) => ({ ...s, playing: false }))
          })
          adsManager.addEventListener(ima.AdEvent.Type.AD_PROGRESS, (e) => {
            const data = e.getAdData()
            if (!data) return
            setAdState((s) => ({
              ...s,
              duration: data.duration || 0,
              remaining: Math.max((data.duration || 0) - (data.currentTime || 0), 0),
              skippable: adsManager.getAdSkippableState?.() || false,
            }))
          })

          try {
            adsManager.init(videoRef.current.clientWidth, videoRef.current.clientHeight, ima.ViewMode.NORMAL)
            adsManager.start()
          } catch {
            callbacksRef.current.onContentResumeRequested?.()
          }
        },
      )

      adsLoader.addEventListener(ima.AdErrorEvent.Type.AD_ERROR, (e) => {
        setAdState((s) => ({ ...s, error: e.getError?.().toString() || 'Ad load error' }))
        callbacksRef.current.onContentResumeRequested?.()
      })

      const adsRequest = new ima.AdsRequest()
      adsRequest.adTagUrl = adTagUrl
      adsRequest.linearAdSlotWidth = videoRef.current.clientWidth
      adsRequest.linearAdSlotHeight = videoRef.current.clientHeight
      adsRequest.nonLinearAdSlotWidth = videoRef.current.clientWidth
      adsRequest.nonLinearAdSlotHeight = videoRef.current.clientHeight / 3

      adsLoader.requestAds(adsRequest)
    } catch (err) {
      setAdState((s) => ({ ...s, error: err.message }))
      callbacksRef.current.onContentResumeRequested?.()
    }
  }, [adTagUrl, videoRef, containerRef])

  const skipAd = useCallback(() => {
    adsManagerRef.current?.skip?.()
  }, [])

  const resize = useCallback(() => {
    if (!adsManagerRef.current || !videoRef.current || !window.google?.ima) return
    adsManagerRef.current.resize(
      videoRef.current.clientWidth,
      videoRef.current.clientHeight,
      window.google.ima.ViewMode.NORMAL,
    )
  }, [videoRef])

  return { adState, requestAds, skipAd, resize }
}
