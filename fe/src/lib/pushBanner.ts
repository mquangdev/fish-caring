/** Remembers that the user tapped "Để sau" on the push banner. Storage can be blocked, so it never throws. */

const KEY = 'fishcaring.pushBannerDismissed'

export function isBannerDismissed(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function rememberBannerDismissed(): void {
  try {
    localStorage.setItem(KEY, '1')
  } catch {
    // the banner simply comes back next time
  }
}
