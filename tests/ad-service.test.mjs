import test from 'node:test'
import assert from 'node:assert/strict'

import { AdService } from '../js/services/AdService.js'

const enabledConfig = {
  enabled: true,
  adUnitIds: { rewardedVideo: 'reward-id', interstitial: 'interstitial-id' },
  interstitial: { everySuccessfulBreaks: 3, cooldownMs: 600000 }
}

function tick() {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

function rewardedPlatform(overrides = {}) {
  let closeHandler = () => {}
  let errorHandler = () => {}
  const calls = { create: 0, show: 0, load: 0 }
  const ad = {
    onClose(handler) { closeHandler = handler },
    onError(handler) { errorHandler = handler },
    show() { calls.show += 1; return Promise.resolve() },
    load() { calls.load += 1; return Promise.resolve() },
    ...overrides
  }
  return {
    calls,
    ad,
    platform: {
      createRewardedVideoAd(options) {
        calls.create += 1
        calls.options = options
        return ad
      }
    },
    close(result) { closeHandler(result) },
    error(error) { errorHandler(error) }
  }
}

test('disabled, missing and unsupported ad configurations degrade without API calls', async () => {
  let creates = 0
  const platform = { createRewardedVideoAd() { creates += 1 } }
  const disabled = new AdService(platform, { ...enabledConfig, enabled: false })
  assert.equal(disabled.rewardedAvailable, false)
  assert.deepEqual(await disabled.showRewardedVideo(), { status: 'unavailable' })
  assert.equal(creates, 0)

  const missing = new AdService(platform, { enabled: true, adUnitIds: {} })
  assert.deepEqual(await missing.showRewardedVideo(), { status: 'unavailable' })
  assert.equal(creates, 0)

  const unsupported = new AdService({}, enabledConfig)
  assert.equal(unsupported.rewardedAvailable, false)
  assert.equal(unsupported.interstitialAvailable, false)
  assert.deepEqual(await unsupported.maybeShowInterstitial({ successful: true }), { status: 'unavailable' })
})

test('rewarded video grants only after a completed close callback', async () => {
  const mock = rewardedPlatform()
  const service = new AdService(mock.platform, enabledConfig)
  const pending = service.showRewardedVideo()
  await tick()
  assert.equal(service.rewardedBusy, true)
  assert.deepEqual(mock.calls.options, { adUnitId: 'reward-id', multiton: true, disableFallbackSharePage: true })
  mock.close({ isEnded: true })
  assert.deepEqual(await pending, { status: 'rewarded' })
  assert.equal(service.rewardedBusy, false)
})

test('rewarded video does not grant when the viewer closes early', async () => {
  const mock = rewardedPlatform()
  const service = new AdService(mock.platform, enabledConfig)
  const pending = service.showRewardedVideo()
  await tick()
  mock.close({ isEnded: false })
  assert.deepEqual(await pending, { status: 'skipped' })
})

test('rewarded video does not grant for an ambiguous legacy close callback', async () => {
  const mock = rewardedPlatform()
  const service = new AdService(mock.platform, enabledConfig)
  const pending = service.showRewardedVideo()
  await tick()
  mock.close(undefined)
  assert.deepEqual(await pending, { status: 'skipped' })
})

test('rewarded video loads and retries once when the first show fails', async () => {
  const mock = rewardedPlatform()
  let first = true
  mock.ad.show = () => {
    mock.calls.show += 1
    if (first) { first = false; return Promise.reject(new Error('not loaded')) }
    return Promise.resolve()
  }
  const service = new AdService(mock.platform, enabledConfig)
  const pending = service.showRewardedVideo()
  await tick()
  assert.equal(mock.calls.show, 2)
  assert.equal(mock.calls.load, 1)
  mock.close({ isEnded: true })
  assert.deepEqual(await pending, { status: 'rewarded' })
})

test('rewarded load failure returns an error and permits a later retry', async () => {
  const mock = rewardedPlatform()
  mock.ad.show = () => { mock.calls.show += 1; return Promise.reject(new Error('show failed')) }
  mock.ad.load = () => { mock.calls.load += 1; return Promise.reject(new Error('no fill')) }
  const service = new AdService(mock.platform, enabledConfig)
  const result = await service.showRewardedVideo()
  assert.equal(result.status, 'error')
  assert.match(result.error.message, /no fill/)
  assert.equal(service.rewardedBusy, false)
  assert.equal((await service.showRewardedVideo()).status, 'error')
})

test('concurrent rewarded requests never create or show a second video', async () => {
  const mock = rewardedPlatform()
  const service = new AdService(mock.platform, enabledConfig)
  const first = service.showRewardedVideo()
  const second = await service.showRewardedVideo()
  assert.deepEqual(second, { status: 'busy' })
  assert.equal(mock.calls.create, 1)
  assert.equal(mock.calls.show, 1)
  mock.close({ isEnded: true })
  await first
})

function interstitialPlatform(show = () => Promise.resolve()) {
  const instances = []
  return {
    instances,
    platform: {
      createInterstitialAd(options) {
        const instance = {
          options,
          destroyed: 0,
          onClose(handler) { this.close = handler },
          onError(handler) { this.error = handler },
          show() {
            const result = show.call(this)
            Promise.resolve(result).then(() => queueMicrotask(() => this.close?.()), () => {})
            return result
          },
          load() { return Promise.resolve() },
          destroy() { this.destroyed += 1 }
        }
        instances.push(instance)
        return instance
      }
    }
  }
}

test('interstitial counts only successful natural breaks and shows every third one', async () => {
  const mock = interstitialPlatform()
  const service = new AdService(mock.platform, enabledConfig, { now: () => 1000000 })
  assert.deepEqual(await service.maybeShowInterstitial({ successful: false }), { status: 'ineligible' })
  assert.deepEqual(await service.maybeShowInterstitial({ successful: true }), { status: 'frequency' })
  assert.deepEqual(await service.maybeShowInterstitial({ successful: true }), { status: 'frequency' })
  assert.deepEqual(await service.maybeShowInterstitial({ successful: false }), { status: 'ineligible' })
  assert.deepEqual(await service.maybeShowInterstitial({ successful: true }), { status: 'shown' })
  assert.equal(mock.instances.length, 1)
  assert.deepEqual(mock.instances[0].options, { adUnitId: 'interstitial-id' })
})

test('interstitial is suppressed during cooldown and can show after time advances', async () => {
  let now = 1000000
  const mock = interstitialPlatform()
  const service = new AdService(mock.platform, enabledConfig, { now: () => now })
  for (let index = 0; index < 3; index += 1) await service.maybeShowInterstitial({ successful: true })
  assert.equal(mock.instances.length, 1)
  assert.equal((await service.maybeShowInterstitial({ successful: true })).status, 'frequency')
  assert.equal((await service.maybeShowInterstitial({ successful: true })).status, 'frequency')
  assert.equal((await service.maybeShowInterstitial({ successful: true })).status, 'cooldown')
  now += 600001
  assert.equal((await service.maybeShowInterstitial({ successful: true })).status, 'shown')
  assert.equal(mock.instances.length, 2)
})

test('interstitial destroys each new instance after close', async () => {
  const mock = interstitialPlatform()
  const config = { ...enabledConfig, interstitial: { everySuccessfulBreaks: 1, cooldownMs: 0 } }
  const service = new AdService(mock.platform, config)
  assert.equal((await service.maybeShowInterstitial({ successful: true })).status, 'shown')
  const instance = mock.instances[0]
  instance.close()
  instance.close()
  assert.equal(instance.destroyed, 1)
})

test('interstitial platform frequency and rendering errors are returned without throwing', async () => {
  const platformError = Object.assign(new Error('frequency limited'), { errCode: 2002 })
  const mock = interstitialPlatform(() => Promise.reject(platformError))
  const config = { ...enabledConfig, interstitial: { everySuccessfulBreaks: 1, cooldownMs: 0 } }
  const service = new AdService(mock.platform, config)
  const result = await service.maybeShowInterstitial({ successful: true })
  assert.equal(result.status, 'error')
  assert.equal(result.error.errCode, 2002)
  assert.equal(mock.instances[0].destroyed, 1)
})


test('rewarded onError plus rejected show keeps the lock through load retry', async () => {
  const mock = rewardedPlatform()
  let firstShow = true
  let releaseLoad
  mock.ad.show = () => {
    mock.calls.show += 1
    if (!firstShow) return Promise.resolve()
    firstShow = false
    const error = new Error('first show failed')
    mock.error(error)
    return Promise.reject(error)
  }
  mock.ad.load = () => {
    mock.calls.load += 1
    return new Promise((resolve) => { releaseLoad = resolve })
  }
  const service = new AdService(mock.platform, enabledConfig)
  const first = service.showRewardedVideo()
  await tick()
  assert.equal(service.rewardedBusy, true)
  assert.deepEqual(await service.showRewardedVideo(), { status: 'busy' })
  assert.equal(mock.calls.show, 1)
  releaseLoad()
  await tick()
  assert.equal(mock.calls.show, 2)
  mock.close({ isEnded: true })
  assert.deepEqual(await first, { status: 'rewarded' })
})

test('concurrent eligible interstitial requests create only one instance', async () => {
  let releaseShow
  const mock = interstitialPlatform(() => new Promise((resolve) => { releaseShow = resolve }))
  const config = { ...enabledConfig, interstitial: { everySuccessfulBreaks: 1, cooldownMs: 0 } }
  const service = new AdService(mock.platform, config)
  const first = service.maybeShowInterstitial({ successful: true })
  assert.deepEqual(await service.maybeShowInterstitial({ successful: true }), { status: 'busy' })
  assert.equal(mock.instances.length, 1)
  releaseShow()
  assert.deepEqual(await first, { status: 'shown' })
})

test('event-only interstitial errors do not report shown or start cooldown', async () => {
  let errorHandler = () => {}
  let destroyed = 0
  const eventError = Object.assign(new Error('too early'), { errCode: 2001 })
  const platform = {
    createInterstitialAd() {
      return {
        onClose() {},
        onError(handler) { errorHandler = handler },
        show() { errorHandler(eventError); return Promise.resolve() },
        destroy() { destroyed += 1 }
      }
    }
  }
  const config = { ...enabledConfig, interstitial: { everySuccessfulBreaks: 1, cooldownMs: 0 } }
  const service = new AdService(platform, config, { now: () => 456 })
  const result = await service.maybeShowInterstitial({ successful: true })
  assert.equal(result.status, 'error')
  assert.equal(result.error.errCode, 2001)
  assert.equal(service.lastInterstitialAt, -Infinity)
  assert.equal(destroyed, 1)
})

test('interstitial event and Promise errors settle once and destroy once', async () => {
  let errorHandler = () => {}
  let destroyed = 0
  const platformError = Object.assign(new Error('render failed'), { errCode: 2004 })
  const platform = {
    createInterstitialAd() {
      return {
        onClose() {},
        onError(handler) { errorHandler = handler },
        show() { errorHandler(platformError); return Promise.reject(platformError) },
        destroy() { destroyed += 1 }
      }
    }
  }
  const config = { ...enabledConfig, interstitial: { everySuccessfulBreaks: 1, cooldownMs: 0 } }
  const service = new AdService(platform, config)
  const result = await service.maybeShowInterstitial({ successful: true })
  assert.equal(result.status, 'error')
  assert.equal(result.error.errCode, 2004)
  assert.equal(destroyed, 1)
})


test('late events from an old rewarded multiton instance cannot settle a new request', async () => {
  const instances = []
  const platform = {
    createRewardedVideoAd(options) {
      let closeHandler = () => {}
      let errorHandler = () => {}
      const instance = {
        options,
        onClose(handler) { closeHandler = handler },
        onError(handler) { errorHandler = handler },
        show() { return Promise.resolve() },
        load() { return Promise.resolve() },
        emitClose(result) { closeHandler(result) },
        emitError(error) { errorHandler(error) },
        destroy() {}
      }
      instances.push(instance)
      return instance
    }
  }
  const service = new AdService(platform, enabledConfig)
  const first = service.showRewardedVideo()
  await tick()
  instances[0].emitClose({ isEnded: false })
  assert.deepEqual(await first, { status: 'skipped' })

  const second = service.showRewardedVideo()
  await tick()
  instances[0].emitClose({ isEnded: true })
  instances[0].emitError(new Error('late old error'))
  assert.equal(service.rewardedBusy, true)
  instances[1].emitClose({ isEnded: true })
  assert.deepEqual(await second, { status: 'rewarded' })
  assert.equal(instances.length, 2)
  assert.ok(instances.every((item) => item.options.multiton === true))
})

test('delayed interstitial onError wins over a resolved show until terminal event', async () => {
  let errorHandler = () => {}
  let destroyed = 0
  const delayedError = Object.assign(new Error('render delayed'), { errCode: 2004 })
  const platform = {
    createInterstitialAd() {
      return {
        onClose() {},
        onError(handler) { errorHandler = handler },
        show() { setTimeout(() => errorHandler(delayedError), 0); return Promise.resolve() },
        destroy() { destroyed += 1 }
      }
    }
  }
  const config = { ...enabledConfig, interstitial: { everySuccessfulBreaks: 1, cooldownMs: 0 } }
  const service = new AdService(platform, config, { now: () => 777 })
  const result = await service.maybeShowInterstitial({ successful: true })
  assert.equal(result.status, 'error')
  assert.equal(result.error.errCode, 2004)
  assert.equal(service.lastInterstitialAt, -Infinity)
  assert.equal(destroyed, 1)
})
