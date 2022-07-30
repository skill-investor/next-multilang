# Things to do

To make tracking of to-dos easier, this file can be used to track progress on the overall maturity of the package.

### To-do 📝

- Add ESM module support to remove `esmExternals: false`
- Compiler plugin related:
  - Add SWC support
  - Add anchor links support on language switcher (requires Babel plugin?)
  - Find way to split languages in different assets to speed up page load
- Replace `intl-messageformat` with a smaller alternative to reduce package size
- Copy example repo into https://github.com/vercel/next.js/tree/canary/examples/with-next-multilingual (automate pipeline?)
- Add pre-build check to validate all `.properties` files
  - Check for key collisions
  - Check for invalid suffix across languages
  - Check for deltas
  - Track problematic files and have a consistent behavior across `Messages` and localized URLs
- Add naming best practice for message key in documentation
- Export/import CLI
- Profiling, package size optimization (e.g. intl-messageformat strip down)
- Look to see if we can use middleware to redirect default (fake) locale: https://nextjs.org/docs/advanced-features/i18n-routing
- bug: the Babel plugin does not check if an hijack target (import) is used before injecting. This cause the import to be removed for optimization and cause a 500 error when trying to inject the non-existing import.
- bug: only get the latest API responses abort previous one on the homepage API test (to reproduce, click 3 times no the language picker)
- Check if we can add `title` attributes on `Link` components (not supported by Next.js?) (ref: https://backlinko.com/google-ranking-factors)
- Add automated test:
  - Test when a string file changes, the page is updated (developer experience?)
  - Test with a 3rd language (language switcher hydration issues?)
- In the `config` API, gracefully merge options passed in argument as an object instead of overwriting
- In the `config` API, support options passed functions (see Next.js doc)
- Try Javascript support?
- Automatically restart Next.js routes changes (e.g. use `forever`?)
- Lorem ipsum generator?
- schema.org markup support (e.g. breadcrumbs)
- Waiting on @TomFreudenberg to provide details
  - add new API to call keys by "messages" - this will be indexed by Babel
    - also add support to fallback to the message when not found
    - needs to be a new configurable option since it will increase bundle size because of the index
    - add new i18.config file that will allow Jest and other tools (check fork)

### In Progress 🚧

- Deploy example and re-align files if necessary (Eslint, Prettier, etc)

### Done ✔️

- Post ESLint refactoring
- Implement new ESLint + Prettier rules
- Externalize the Babel plugin into a "Messages Modules" package
- Try to get rid of `noImplicitThis`
- implement `properties-files` and add warnings on key collisions
- JSX.element VS ReactElement?
- Replicate Next.js' behavior with trailing slashes in URLs
- Move to strict mode
- support links that include protocol
- Add tests for default (mul) language and its impact to headers and SSR (e.g. http://localhost:3000/mul/about-us)
- Add anchor link tests
- Test anchor links (including translation and doc)
- support "mailto:", "tel:" in `Link` URLs to avoid localization.
- Add missing client tests for inline JSX
- Move `experimental: { esmExternals: false }` to `esmExternals: false`
- HTML inside properties files (as JSX)
- Refactor to arrow functions
- Test UTF-8 encoding and add warnings
- Add automated test:
  - Test language detection
  - Test Header
  - Test links
  - Test for: http://localhost:3000/about-us
  - Test fallback to default locale
- Add `useLocalizedUrl` for other components
- Fix missing SSR links on `Head`
- Update Next.js 12
- Refactor 'identifier' to 'id' to make code less verbose
- Check paths (don't use absolute) and logs (use highlight) in all files other than MulConfig
- Prevent [] escapes for dynamic routes
- Rename `MulConfig` to `Config` (and methods)
- Rename `MulHead` to `Head` to be a hot replace of `next/head`
- Rename `MulLink` to `Link` to be a hot replace of `next/link`
- Support dynamic routes (with placeholders)
- Add `'` in URL replace
- Fix nested directory localized URL bug
- Support Next.js API
- Bug: intermittent 500 internal server error when using the API
- Change minimum 3 char key too 1 char
- Remove erroneous API warning
- Make separation between `slug` and `title`
- Make it work with Netlify (looks like their Next.js script does not support our configs)
- Add other docs: contribution, design doc, etc.
- Make it work on Vercel (https://github.com/vercel/vercel/discussions/6710)
- Demo app is up on
- Add ICU support in `useMessage`
- Localized error pages
- Launch our beta npm package
- Shared message
- Redo an easier readme based on an end-to-end configuration
- Log warnings when a route changes (warn about restart)
- Log easy to fix warnings when messages are missing
- English (en-US) titles are not used in routes (e.g. contact-us2) -> need to implement this if we want non-english default locale
- Check if we need this route: /en-us/homepage -> /en-us
- Automatically rebuild when modifying a properties file
- Add key suffix to all file and exclude them in `useMessages`
- Test new Babel plugin modular string loader
- Fix contact-us pages (add localized strings and CSS)
- Add license doc
- Add browser side cookie to persist selected locale on initial page load
- Move `nookies` to `next-multilingual` -> `getCookieLocale`
- Move `resolve-accept-language` to `next-multilingual` -> `getPreferredLocale`
- Add `next-multilingual/properties` to avoid the extra Webpack loader dependency
- Understand/tweak/document `MulHead`
  - Canonical links?
- Test/learn/refactor alternate links
  - Cleanup extra `x-default` links?
- Test browsing of non-localized URLs
- Fix bug when / SSR lang on HTML tag is wrong
- Understand/tweak/document `MulLink`
- Understand/tweak/document `MulRouter`
- Fix console error when loading non-english pages: Warning: Prop `href` did not match. Server: "/fr-ca/%C3%A0-propos-de-nous" Client: "/fr-ca/about-us"s
- Fix `npm run build`
