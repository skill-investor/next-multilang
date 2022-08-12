import CheapWatch from 'cheap-watch'
import type { Redirect, Rewrite } from 'next/dist/lib/load-custom-routes'

import Webpack from 'webpack'

import { existsSync, readdirSync, Stats, utimesSync } from 'node:fs'

import { extname } from 'node:path'

import {
  highlight,
  highlightFilePath,
  isLocale,
  log,
  normalizeLocale,
  queryToRewriteParameters,
} from '../'

import {
  getMessagesFilePath,
  getSourceFilePath,
  keySegmentRegExp,
  keySegmentRegExpDescription,
  slugify,
  SLUG_KEY_ID,
} from '../messages'

import { parsePropertiesFile } from '../messages/properties'

import type { WebpackConfigContext } from 'next/dist/server/config-shared'

import type { NextConfig } from 'next'

/**
 * Possible `pages` directories used by Next.js.
 *
 * @see https://nextjs.org/docs/advanced-features/src-directory
 */
export const PAGES_DIRECTORIES = ['pages', 'src/pages']

/**
 * These are the pages file extensions Next.js will use (in this order) if duplicate pages are found.
 */
export const PAGE_FILE_EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js']

/**
 * These are special page files used by Next.js that will not have their own routes. Extensions is excluded since they
 * can vary. The paths are relative to the `pages` directory.
 */
export const NON_ROUTABLE_PAGE_FILES = [
  'index',
  '_app',
  '_document',
  '_error',
  '404',
  '404/index',
  '500',
  '500/index',
]

/**
 * Next.js did not define any types for its Webpack configs.
 *
 * @see https://github.com/vercel/next.js/blob/canary/packages/next/compiled/webpack/webpack.d.ts
 * @see https://github.com/vercel/next.js/blob/60c8e5c29e4da99ac1aa458b1ba3bdf829111115/packages/next/server/config-shared.ts#L67
 */
export interface WebpackContext extends WebpackConfigContext {
  webpack: typeof Webpack
}

/**
 * Get all possible permutations of the non-routable app-root-relative pages file paths.
 */
export function getNonRoutablePages(): string[] {
  const nonRoutablePages: string[] = []
  PAGES_DIRECTORIES.forEach((pagesDirectory) => {
    NON_ROUTABLE_PAGE_FILES.forEach((nonRoutablePageFile) => {
      PAGE_FILE_EXTENSIONS.forEach((pageFileExtension) =>
        nonRoutablePages.push(`${pagesDirectory}/${nonRoutablePageFile}${pageFileExtension}`)
      )
    })
  })
  return nonRoutablePages
}

/**
 * All possible permutations of the non-routable app-root-relative pages file paths. Pre-generating these will
 * avoid complex path manipulations and allow to deal with complete file paths only.
 */
export const NON_ROUTABLE_PAGES = getNonRoutablePages()

/**
 * Get the `pages` directory path from a directory entry path (file or directory).
 *
 * @param filesystemPath - A filesystem path (file or directory).
 *
 * @return The `pages` directory path.
 */
export function getPagesDirectoryPath(filesystemPath: string): string {
  for (const pagesDirectory of PAGES_DIRECTORIES) {
    if (filesystemPath === pagesDirectory || filesystemPath.startsWith(`${pagesDirectory}/`)) {
      return pagesDirectory
    }
  }
  throw new Error(`invalid filesystem path: ${filesystemPath}`)
}

/**
 * Remove a file extension from a filesystem path if present.
 *
 * @param filesystemPath - A filesystem path (file or directory).
 *
 * @return The filesystem path without the extension.
 */
export function removeFileExtension(filesystemPath: string): string {
  const pathComponents = filesystemPath.split('/')
  const basename = pathComponents.pop() as string

  if (!basename.includes('.')) {
    return filesystemPath
  }

  const filename = `${basename.split('.').slice(0, -1).join('.')}`
  const directoryPath = pathComponents.join('/')

  return directoryPath.length === 0 ? filename : `${directoryPath}/${filename}`
}

/**
 * Remove the pages directory from a filesystem path if present.
 *
 * @param filesystemPath - A filesystem path (file or directory).
 *
 * @return The filesystem path without the pages directory.
 */
export function removePagesDirectoryPath(filesystemPath: string): string {
  const pagesDirectory = getPagesDirectoryPath(filesystemPath)
  const pagesRegExp = new RegExp(`^${pagesDirectory}\\/`)
  return filesystemPath.replace(pagesRegExp, '')
}

/**
 * Get the non-localized URL path from a directory entre path (e.g., `pages/hello/index.tsx` -> `/hello`).
 *
 * @param filesystemPath - A filesystem path (file or directory).
 *
 * @returns The non-localized URL path (e.g., `pages/hello/index.tsx` -> `/hello`).
 */
export function getNonLocalizedUrlPath(filesystemPath: string): string {
  const urlPath = removeFileExtension(removePagesDirectoryPath(filesystemPath))
    .replace(/\\/g, '/')
    .replace(/\/index$/, '')

  return urlPath.length === 0 ? '/' : urlPath[0] !== '/' ? `/${urlPath}` : urlPath
}

/**
 * Is a URL path an API Route?
 *
 * @param urlPath - The URL path.
 *
 * @return True if the URL path is an API Route, otherwise false.
 */
export function isApiRoute(urlPath: string): boolean {
  return urlPath === '/api' || urlPath.startsWith('/api/')
}

/**
 * Is a URL path a dynamic route?
 *
 * @param urlPath - The URL path.
 *
 * @return True if the URL path is a dynamic Route, otherwise false.
 */
export function isDynamicRoute(urlPath: string): boolean {
  const urlSegment = urlPath.split('/').pop() as string
  return urlSegment.startsWith('[') && urlSegment.endsWith(']')
}

/**
 * Is `next-multilingual` running in debug mode?
 *
 * The current implementation only works on the server side.
 *
 * @returns True when running in debug mode, otherwise false.
 */
export function isInDebugMode(): boolean {
  if (typeof process !== 'undefined' && process?.env?.nextMultilingualDebug) {
    return true
  }
  return false
}

export class MultilingualRoute {
  /** The filesystem path (file or directory). */
  public filesystemPath: string
  /** The non-localized URL path of a route. */
  public nonLocalizedUrlPath: string
  /** An array of localized URL path objects. */
  public localizedUrlPaths: LocalizedUrlPath[] = []

  /**
   * A unique route entry, including its localized URL paths.
   *
   * @param filesystemPath - The filesystem path (file or directory).
   * @param locales - The locales that will support localized URL paths.
   * @param routes - The current route object array being constructed during a recursive call.
   */
  constructor(filesystemPath: string, locales: string[], routes: MultilingualRoute[]) {
    this.filesystemPath = filesystemPath
    this.nonLocalizedUrlPath = getNonLocalizedUrlPath(filesystemPath)

    const nonLocalizedSlug = this.nonLocalizedUrlPath.split('/').pop()
    const isDynamic = isDynamicRoute(this.nonLocalizedUrlPath)

    const parentNonLocalizedUrlPath =
      (this.nonLocalizedUrlPath.match(/\//g) || []).length > 1
        ? this.nonLocalizedUrlPath.split('/').slice(0, -1).join('/')
        : undefined

    const parentRoute =
      parentNonLocalizedUrlPath !== undefined
        ? routes.find((route) => route.nonLocalizedUrlPath === parentNonLocalizedUrlPath)
        : undefined

    locales.forEach((locale) => {
      const localizedSlug = !isDynamic ? this.getLocalizedSlug(filesystemPath, locale) : ''
      const applicableSlug = localizedSlug !== '' ? localizedSlug : (nonLocalizedSlug as string)
      const urlPath = `${
        parentRoute !== undefined
          ? parentRoute.localizedUrlPaths.find(
              (localizedUrlPath) => localizedUrlPath.locale === locale
            )?.urlPath ?? ''
          : ''
      }/${applicableSlug}`

      this.localizedUrlPaths.push({
        locale,
        urlPath,
      })
    })
  }

  /**
   * Get a localized slug.
   *
   * @param filesystemPath - The filesystem path (file or directory).
   * @param locale - The locale of the slug.
   *
   * @return The localized slug.
   */
  private getLocalizedSlug(filesystemPath: string, locale: string): string {
    const messagesFilePath = getMessagesFilePath(filesystemPath, locale)

    if (!existsSync(messagesFilePath)) {
      log.warn(
        `unable to create the ${highlight(normalizeLocale(locale))} slug for ${highlightFilePath(
          filesystemPath
        )}. The message file ${highlightFilePath(messagesFilePath)} does not exist.`
      )
      return ''
    }

    const keyValueObject = parsePropertiesFile(messagesFilePath)
    const slugKey = Object.keys(keyValueObject).find((key) => key.endsWith(`.${SLUG_KEY_ID}`))
    if (!slugKey) {
      log.warn(
        `unable to create the ${highlight(normalizeLocale(locale))} slug for ${highlightFilePath(
          filesystemPath
        )}. The message file ${highlightFilePath(
          messagesFilePath
        )} must include a key with the ${highlight(SLUG_KEY_ID)} identifier.`
      )
      return ''
    }
    return slugify(keyValueObject[slugKey], locale)
  }

  /**
   * Get a localized URL path.
   *
   * @param locale - The locale of the the path.
   *
   * @returns The localize URL path.
   */
  public getLocalizedUrlPath(locale: string): string {
    const localizedUrlPath = this.localizedUrlPaths.find(
      (localizedUrlPath) => localizedUrlPath.locale === locale
    )
    return localizedUrlPath?.urlPath ?? ''
  }
}

/**
 * An object that represents a localized URL path.
 */
export type LocalizedUrlPath = {
  /** The locale of the URL path. */
  locale: string
  /** The localized URL path. */
  urlPath: string
}

export class Config {
  /** The actual desired locales of the multilingual application. */
  private readonly actualLocales: string[]
  /** The locales used by the Next.js configuration. */
  private readonly locales: string[]
  /** The default locale used by the Next.js configuration. */
  private readonly defaultLocale: string
  /** The directory path where the Next.js pages can be found. */
  private readonly pagesDirectoryPath: string = PAGES_DIRECTORIES[0]
  /** The Next.js application's multilingual routes. */
  private routes: MultilingualRoute[]

  /**
   * A multilingual configuration handler.
   *
   * @param applicationId - The unique application identifier that will be used as a messages key prefix.
   * @param locales - The actual desired locales of the multilingual application. The first locale will be the default locale. Only BCP 47 language tags following the `language`-`country` format are accepted.
   * @param debug - Enable debug mode to see extra information about `next-multilingual`.
   *
   * @throws Error when one of the arguments is invalid.
   */
  constructor(applicationId: string, locales: string[], debug = false) {
    // Set the application identifier if valid.
    if (!keySegmentRegExp.test(applicationId)) {
      throw new Error(
        `invalid application identifier '${applicationId}'. Application identifiers ${keySegmentRegExpDescription}.`
      )
    }

    // Add `applicationId` to environment variables so that it is available at build time (by Babel), without extra config.
    process.env.nextMultilingualApplicationId = applicationId

    // Verify if the locale identifiers are using the right format.
    locales.forEach((locale) => {
      if (!isLocale(locale)) {
        throw new Error(
          'invalid locale `' +
            locale +
            '` . `next-multilingual` only uses locale identifiers following the `language`-`country` format.'
        )
      }
    })

    // Set the actual desired locales of the multilingual application.
    this.actualLocales = locales.map((locale) => normalizeLocale(locale))
    // The `mul` (multilingual) default locale is required for dynamic locale resolution for requests on `/`.
    this.defaultLocale = 'mul'
    // By convention, the first locale configured in Next.js will be the default locale.
    this.locales = [this.defaultLocale, ...this.actualLocales]

    // Set the correct `pages` directory used by the Next.js application.
    let pagesDirectoryExists = false
    for (const pageDirectory of PAGES_DIRECTORIES) {
      if (existsSync(pageDirectory)) {
        this.pagesDirectoryPath = pageDirectory
        pagesDirectoryExists = true
        break
      }
    }

    if (!pagesDirectoryExists) {
      throw new Error('unable to find the pages directory')
    }

    this.routes = this.fetchRoutes()

    // During development, add an extra watcher to trigger recompile when a `.properties` file changes.
    if (process.env.NODE_ENV === 'development') {
      let routesSnapshot = this.routes

      const watch = new CheapWatch({
        dir: process.cwd(),
        filter: ({ path, stats }: { path: string; stats: Stats }) =>
          (stats.isFile() && path.includes('.properties')) ||
          (stats.isDirectory() && !path.includes('node_modules') && !path.includes('.next')),
      })

      void watch.init()

      watch.on('+', ({ path, stats }: { path: string; stats: Stats }) => {
        routesSnapshot = this.recompileSourceFile(path, stats, routesSnapshot)
      })
      watch.on('-', ({ path, stats }: { path: string; stats: Stats }) => {
        routesSnapshot = this.recompileSourceFile(path, stats, routesSnapshot)
      })
    }

    // Check if debug mode was enabled.
    if (debug) {
      process.env.nextMultilingualDebug = 'true' // Set flag on the server to re-use in other modules.
      console.log('==== ROUTES ====')
      console.dir(this.getRoutes(), { depth: undefined })
      console.log('==== REWRITES ====')
      console.dir(this.getRewrites(), { depth: undefined })
      console.log('==== REDIRECTS ====')
      console.dir(this.getRedirects(), { depth: undefined })
    }
  }

  /**
   * Force recompile a source file when a message file is modified.
   *
   * @param messagesFilePath - The file path of a message file.
   * @param messagesFileStats - The file stats of the message file.
   * @param routesSnapshot - The previous snapshot of routes to detect changes.
   *
   * @returns The most recent route snapshot.
   */
  private recompileSourceFile(
    messagesFilePath: string,
    messagesFileStats: Stats,
    routesSnapshot: MultilingualRoute[]
  ): MultilingualRoute[] {
    if (!messagesFileStats.isFile()) return routesSnapshot

    for (const pageFileExtension of PAGE_FILE_EXTENSIONS) {
      const sourceFilePath = getSourceFilePath(messagesFilePath, pageFileExtension)

      if (existsSync(sourceFilePath)) {
        // "touch" the file without any changes to trigger recompile.
        utimesSync(sourceFilePath, new Date(), new Date())
        const currentRoutes = this.fetchRoutes()
        if (JSON.stringify(currentRoutes) !== JSON.stringify(routesSnapshot)) {
          log.warn(
            `Found a change impacting localized URLs. Restart the server to see the changes in effect.`
          )
          return currentRoutes // Update snapshot to avoid logging all subsequent changes.
        }
        break
      }
    }
    return routesSnapshot
  }

  /**
   * Get the the multilingual routes.
   *
   * @returns The multilingual routes.
   */
  public getRoutes(): MultilingualRoute[] {
    return this.routes
  }

  /**
   * Get the URL locale prefixes.
   *
   * @return The locales prefixes, all in lowercase.
   */
  public getUrlLocalePrefixes(): string[] {
    return this.locales.map((locale) => locale.toLowerCase())
  }

  /**
   * Get the URL default locale prefix.
   *
   * @return The default locale prefix, in lowercase.
   */
  public getDefaultUrlLocalePrefix(): string {
    return this.defaultLocale.toLowerCase()
  }

  /**
   * Add a Next.js page route into a routes array.
   *
   * @param pageFilePath - The file path of a Next.js page.
   * @param routes - The current route object array being constructed during a recursive call.
   */
  private addPageRoute(pageFilePath: string, routes: MultilingualRoute[]): void {
    if (extname(pageFilePath) === '') {
      throw new Error(`invalid page file path ${pageFilePath}`)
    }

    const nonLocalizedUrlPath = getNonLocalizedUrlPath(pageFilePath)

    const filePathsWithSlug = this.getFilePathsWithSlug(pageFilePath).map((filePathWithSlug) =>
      highlightFilePath(filePathWithSlug)
    )

    // Check if the route is a non-routable page file.
    if (NON_ROUTABLE_PAGES.includes(pageFilePath)) {
      if (filePathsWithSlug.length > 0) {
        log.warn(
          `invalid slug${filePathsWithSlug.length > 1 ? 's' : ''} found in ${filePathsWithSlug.join(
            ', '
          )} since ${highlightFilePath(pageFilePath)} is a non-routable page file.`
        )
      }
      return // Skip as the file is non-routable.
    }

    // Check if the route already exists.
    const duplicateRoute = routes.find((route) => route.nonLocalizedUrlPath === nonLocalizedUrlPath)

    if (duplicateRoute !== undefined) {
      if (filePathsWithSlug.length > 0) {
        log.warn(
          `the slug${filePathsWithSlug.length > 1 ? 's' : ''} found in ${filePathsWithSlug.join(
            ', '
          )} will be ignored since a duplicate page was detected. ${highlightFilePath(
            duplicateRoute.filesystemPath
          )} and ${highlightFilePath(pageFilePath)} both resolve to ${highlight(
            nonLocalizedUrlPath
          )}.`
        )
      }
      return // Skip since we do not want duplicate routes.
    }

    // Check if the page is a dynamic route.
    if (isDynamicRoute(getNonLocalizedUrlPath(pageFilePath)) && filePathsWithSlug.length > 0) {
      log.warn(
        `the slug${filePathsWithSlug.length > 1 ? 's' : ''} found in ${filePathsWithSlug.join(
          ', '
        )} will be ignored since ${highlight(nonLocalizedUrlPath)} is a dynamic route.`
      )
    }
    // Do not skip, since URLs that contain dynamic segments might still be localized.

    routes.push(new MultilingualRoute(pageFilePath, this.actualLocales, routes))
  }

  /**
   * Fetch the Next.js routes from a specific directory.
   *
   * @param directoryPath - The directory being currently inspected for routes.
   * @param routes - The current route object array being constructed during a recursive call.
   *
   * @return The Next.js routes.
   */
  private fetchRoutes(
    directoryPath = this.pagesDirectoryPath,
    routes: MultilingualRoute[] = []
  ): MultilingualRoute[] {
    const nonLocalizedUrlPath = getNonLocalizedUrlPath(directoryPath)
    const isHomepage = nonLocalizedUrlPath === '/' ? true : false

    if (isApiRoute(nonLocalizedUrlPath)) {
      return routes // Skip if the URL path is a Next.js' API Route.
    }

    let indexFound = false
    let pageFilename, pageExtension, pageFilePath
    const directoryEntries = readdirSync(directoryPath, { withFileTypes: true })

    // Start by checking indexes.
    pageFilename = 'index'
    for (pageExtension of PAGE_FILE_EXTENSIONS) {
      pageFilePath = `${directoryPath}/${pageFilename}${pageExtension}`
      if (existsSync(pageFilePath)) {
        indexFound = true
        this.addPageRoute(pageFilePath, routes)
        break // Only one index per directory.
      }
    }

    // If there is no index, try to add a localized route on the directory, as long ad its not the homepage.
    if (!indexFound && !isHomepage) {
      routes.push(new MultilingualRoute(directoryPath, this.actualLocales, routes))
    }

    // Check all other files.
    directoryEntries.forEach((directoryEntry) => {
      if (directoryEntry.isFile()) {
        pageExtension = extname(directoryEntry.name)
        pageFilename = removeFileExtension(directoryEntry.name)
        pageFilePath = `${directoryPath}/${pageFilename}${pageExtension}`

        if (!PAGE_FILE_EXTENSIONS.includes(pageExtension)) {
          return // Skip this file if the extension is not in scope.
        }

        if (pageFilename === 'index') {
          return // Skip index file since it was already done first.
        }

        this.addPageRoute(pageFilePath, routes)
      }
    })

    // Look for sub-directories to build child routes.
    for (const directoryEntry of directoryEntries) {
      if (directoryEntry.isDirectory()) {
        this.fetchRoutes(`${directoryPath}/${directoryEntry.name}`, routes)
      }
    }

    return routes
  }

  /**
   * Get the paths of messages files that contains a `slug` key and that are associated with a Next.js page.
   *
   * @param pageFilePath - The file path of a Next.js page.
   *
   * @returns The paths of messages files that contains a `slug` key.
   */
  private getFilePathsWithSlug(pageFilePath: string): string[] {
    const messageFilePaths: string[] = []

    this.actualLocales.forEach((locale) => {
      const messagesFilePath = getMessagesFilePath(pageFilePath, locale)
      if (!existsSync(messagesFilePath)) {
        return
      }
      const keyValueObject = parsePropertiesFile(messagesFilePath)

      if (Object.keys(keyValueObject).some((key) => key.endsWith(`.${SLUG_KEY_ID}`))) {
        messageFilePaths.push(messagesFilePath)
      }
    })
    return messageFilePaths
  }

  /**
   * Encode a URL path.
   *
   * @param urlPath - The URL path.
   *
   * @returns The encoded URL path.
   */
  private encodeUrlPath(urlPath: string): string {
    return encodeURIComponent(urlPath).replace(/%2F/g, '/')
  }

  /**
   * Normalizes the path based on the locale and case.
   *
   * @param urlPath - The URL path (excluding the locale from the path).
   * @param locale - The locale of the path.
   * @param encode - Set to `true` to return an encode URL (by default it's not encoded)
   *
   * @returns The normalized path with the locale.
   */
  private normalizeUrlPath(urlPath: string, locale?: string | undefined, encode = false): string {
    let normalizedUrlPath = `${
      locale !== undefined ? `/${locale}` : ''
    }${urlPath}`.toLocaleLowerCase(locale)

    if (encode) {
      // Normalize to NFC as per https://tools.ietf.org/html/rfc3987#section-3.1
      normalizedUrlPath = this.encodeUrlPath(normalizedUrlPath)
    }

    // Need to unescape both rewrite and query parameters since we use the same method in `getRedirects`.
    normalizedUrlPath = normalizedUrlPath
      .split('/')
      .map((pathSegment) => {
        if (/%3A(.+)/.test(pathSegment)) {
          // Unescape rewrite parameters (e.g., `/:example`) if present.
          return `:${pathSegment.slice(3)}`
        } else if (/%5B(.+)%5D/.test(pathSegment)) {
          // Unescape query parameters (e.g., `/[example]`) if present.
          return `:${pathSegment.slice(3, -3)}`
        }
        return pathSegment
      })
      .join('/')

    return queryToRewriteParameters(normalizedUrlPath)
  }

  /**
   * Get Next.js rewrites directives.
   *
   * @returns An array of Next.js `Rewrite` objects.
   */
  public getRewrites(): Rewrite[] {
    const rewrites: Rewrite[] = []
    for (const route of this.routes) {
      for (const locale of this.actualLocales) {
        const source = this.normalizeUrlPath(route.getLocalizedUrlPath(locale), locale, true)
        const destination = this.normalizeUrlPath(route.nonLocalizedUrlPath, locale)

        if (source !== destination) {
          rewrites.push({
            source,
            destination,
            locale: false,
          })
        }
      }
    }
    return rewrites
  }

  /**
   * Get Next.js redirects directives.
   *
   * @returns An array of Next.js `Redirect` objects.
   */
  public getRedirects(): Redirect[] {
    const redirects: Redirect[] = []
    for (const route of this.routes) {
      for (const locale of this.actualLocales) {
        const source = this.normalizeUrlPath(route.getLocalizedUrlPath(locale), locale)
        const canonical = this.normalizeUrlPath(source.normalize('NFC'), undefined, true)

        const alreadyIncluded = [canonical]
        for (const alternative of [
          source, // UTF-8
          this.normalizeUrlPath(source.normalize('NFD'), undefined, true),
          this.normalizeUrlPath(source.normalize('NFKC'), undefined, true),
          this.normalizeUrlPath(source.normalize('NFKD'), undefined, true),
        ]) {
          if (!alreadyIncluded.includes(alternative) && canonical !== alternative) {
            redirects.push({
              source: alternative,
              destination: canonical,
              locale: false,
              permanent: true,
            })
            alreadyIncluded.push(alternative)
          }
        }
      }
    }
    return redirects
  }
}

/**
 * Handles the Webpack configuration.
 *
 * @param config - The Webpack configuration options.
 * @param context - The Webpack context
 *
 * @returns A Webpack configuration object.
 */
export function webpackConfigurationHandler(
  config: Webpack.Configuration,
  context: WebpackContext
): Webpack.Configuration {
  if (context.isServer) {
    // Override APIs with SSR-specific versions that use different ways to get URLs.
    const alias = config.resolve?.alias as { [index: string]: string }
    // eslint-disable-next-line unicorn/prefer-module
    alias['next-multilingual/head$'] = require.resolve('next-multilingual/head/ssr')
    // eslint-disable-next-line unicorn/prefer-module
    alias['next-multilingual/link$'] = require.resolve('next-multilingual/link/ssr')
    // eslint-disable-next-line unicorn/prefer-module
    alias['next-multilingual/url$'] = require.resolve('next-multilingual/url/ssr')
  }

  /**
   * Add support for the `node:` scheme available since Node.js 16.
   *
   * `next-multilingual` uses the `node:` scheme to increase code clarity.
   *
   * @see https://github.com/webpack/webpack/issues/13290
   */
  config.plugins = config.plugins ?? []
  config.plugins.push(
    new context.webpack.NormalModuleReplacementPlugin(/^node:/, (resource: { request: string }) => {
      resource.request = resource.request.replace(/^node:/, '')
    })
  )

  return config
}

/**
 * Returns the Next.js multilingual config.
 *
 * @param applicationId - The unique application identifier that will be used as a messages key prefix.
 * @param locales - The actual desired locales of the multilingual application. The first locale will be the default locale. Only BCP 47 language tags following the `language`-`country` format are accepted.
 * @param options - Next.js configuration options.
 *
 * @return The Next.js configuration.
 *
 * @throws Error when one of the arguments is invalid.
 */
export function getConfig(
  applicationId: string,
  locales: string[],
  options?: NextConfig | ((phase: string, defaultConfig: NextConfig) => void)
): NextConfig {
  if (options instanceof Function) {
    throw new Error('Function config is not supported. Please use the `Config` object instead')
  }

  if (options !== undefined) {
    // Check if option is unsupported.
    const unsupportedOptions = ['env', 'i18n', 'webpack', 'rewrites', 'redirects']
    unsupportedOptions.forEach((option) => {
      if (options[option] !== undefined) {
        throw new Error(
          `the \`${option}\` option is not supported by \`getConfig\`. Please use the \`Config\` object instead`
        )
      }
    })
  }

  const nextConfig: NextConfig = options ?? {}
  const debug = typeof options?.debug !== 'undefined' ? true : false
  const config = new Config(applicationId, locales, debug)

  // Sets lowercase locales used as URL prefixes, including the default 'mul' locale used for language detection.
  nextConfig.i18n = {
    locales: config.getUrlLocalePrefixes(),
    defaultLocale: config.getDefaultUrlLocalePrefix(),
    localeDetection: false, // This is important to use the improved language detection feature.
  }

  // Add strict mode by default.
  if (nextConfig?.reactStrictMode !== false) {
    nextConfig.reactStrictMode = true
  }

  if (nextConfig?.experimental?.esmExternals !== undefined) {
    /* This is required since Next.js 11.1.3-canary.69 until we support ESM. */
    throw new Error(
      'the `esmExternals` option is not supported by `next-multilingual` until we support ESM'
    )
  }
  if (nextConfig.experimental && typeof nextConfig.experimental !== 'object') {
    throw new Error('invalid value for the `experimental` option')
  }
  if (nextConfig.experimental) {
    nextConfig.experimental.esmExternals = false
  } else {
    nextConfig.experimental = {
      esmExternals: false,
    }
  }

  // Set the Webpack configuration handler.
  nextConfig.webpack = webpackConfigurationHandler

  // Sets localized URLs as rewrites rules.
  nextConfig.rewrites = async () => {
    return await Promise.resolve(config.getRewrites())
  }

  // Sets redirect rules to normalize URL encoding.
  nextConfig.redirects = async () => {
    return await Promise.resolve(config.getRedirects())
  }

  return nextConfig
}
