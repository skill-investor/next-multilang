import { highlight, log, normalizeLocale } from '..'
import { getRewrites } from '../helpers/client/get-rewrites'
import { getLocalizedUrlFromRewrites } from '../helpers/get-localized-url-from-rewrites'
import { hydrateRouteParameters, LocalizedRouteParameters, useRouter } from '../router'

let locales: string[]

/**
 * Get the correct URL to be used by a language switcher component.
 *
 * @param router - A `next-multilingual` `useRouter` object.
 * @param localizedRouteParameters - The localized route parameters, if the page is using a dynamic route.
 *
 * @returns The correct URL to be used by a language switcher component.
 */
export const getLanguageSwitcherUrl = (
  router: ReturnType<typeof useRouter>,
  localizedRouteParameters?: LocalizedRouteParameters
): string => {
  const { asPath, pathname, locale, defaultLocale } = router
  // Special rule for 404 pages to avoid hydration issues related to https://github.com/vercel/next.js/issues/41741
  if (pathname === '/404') {
    return pathname
  }
  if (locale !== defaultLocale) {
    return !localizedRouteParameters
      ? // We presume it's a static route so we can use `pathname` directly (if there are missing parameters it will show errors later).
        pathname
      : // Hydrate back the dynamic route into the default locale URL to allow proper fallback.
        hydrateRouteParameters(pathname, localizedRouteParameters[defaultLocale])
  }
  return asPath
}

/**
 * React hook to get the localized URL specific to a Next.js context.
 *
 * @param url - A non-localized Next.js URL path without a locale prefix (e.g., `/contact-us`).
 * @param locale - The locale of the localized URL. When not specified, the current locale is used.
 * @param localizedRouteParameters - Localized route parameters, if the page is using a dynamic route.
 * @param absolute - Returns the absolute URL, including the protocol and
 * domain (e.g., https://example.com/en-us/contact-us). By default relative URLs are used.
 * @param includeBasePath - Include Next.js' `basePath` in the returned URL. By default Next.js does not require it, but
 * if `absolute` is used, this will be forced to `true`.
 *
 * @returns The localized URL path when available, otherwise fallback to a standard non-localized Next.js URL.
 */
export function useLocalizedUrl(
  url: string,
  locale?: string,
  localizedRouteParameters?: LocalizedRouteParameters,
  absolute = false,
  includeBasePath = false
): string {
  const router = useRouter()
  const applicableLocale = locale?.toLowerCase() ?? router.locale

  // Make sure the locale is valid.
  if (!router.locales.includes(applicableLocale)) {
    log.warn(
      `invalid locale ${highlight(applicableLocale)} specified for ${highlight(
        url
      )}. Valid values are ${router.locales
        .map((locale) => highlight(normalizeLocale(locale)))
        .join(', ')}`
    )
  }

  return getLocalizedUrlFromRewrites(
    getRewrites(),
    url,
    applicableLocale,
    router.basePath,
    localizedRouteParameters,
    absolute,
    includeBasePath
  )
}

/**
 * Get the localized URL path when available, otherwise fallback to a standard non-localized Next.js URL.
 *
 * @param url - A non-localized Next.js URL path without a locale prefix (e.g., `/contact-us`).
 * @param locale - The locale of the localized URL.
 * @param localizedRouteParameters - Localized route parameters, if the page is using a dynamic route.
 * @param absolute - Returns the absolute URL, including the protocol and domain (e.g., https://example.com/en-us/contact-us).
 * @param includeBasePath - Include Next.js' `basePath` in the returned URL. By default Next.js does not require it, but
 * if `absolute` is used, this will be forced to `true`.
 *
 * @returns The localized URL path when available, otherwise fallback to a standard non-localized Next.js URL.
 */
export function getLocalizedUrl(
  url: string,
  locale: string,
  localizedRouteParameters?: LocalizedRouteParameters,
  absolute = false,
  includeBasePath = false
): string {
  const applicableLocale = locale.toLowerCase()
  locales = locales ?? (window.next.router.locales?.map((locale) => locale.toLowerCase()) || [])

  // Make sure the locale is valid.
  if (!locales.includes(applicableLocale)) {
    log.warn(
      `invalid locale ${highlight(locale)} specified for ${highlight(
        url
      )}. Valid values are ${locales
        .map((locale) => highlight(normalizeLocale(locale)))
        .join(', ')}`
    )
  }

  return getLocalizedUrlFromRewrites(
    getRewrites(),
    url,
    applicableLocale,
    window.next.router.basePath,
    localizedRouteParameters,
    absolute,
    includeBasePath
  )
}
