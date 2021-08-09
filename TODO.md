# Things to do

To make tracking of to-dos easier, this file can be used to track progress on the overall maturity of the package.

### To-do

- [ ] Automatically rebuild when modifying a properties file?
- [ ] English (en-US) titles are not used in routes (e.g. contact-us2) -> need to implement this if we want non-english default locale
- [ ] Add key suffix to all file and exclude them in `useMessages`
- [ ] Add ICU support in `useMessage`
- [ ] Check if we need this route: /en-us/homepage -> /en-us
- [ ] Test `useMessages` with APIs
- [ ] Check if we can add `title` attributes on `Link` components (not supported by Next.js?)
- [ ] Localized error pages
- [ ] Add automated test:
  - [ ] Test when a string file changes, the page is updated (developer experience?)
  - [ ] Test language detection
  - [ ] Test Header
  - [ ] Test links
  - [ ] Test for: http://localhost:3000/mul/about-us
  - [ ] Test for: http://localhost:3000/about-us
  - [ ] Test with a 3rd language (language switch hydration issues?)
- [ ] In the `config` API, gracefully merge options passed in argument as an object instead of overwriting
- [ ] In the `config` API, support options passed functions (see Next.js doc)
- [ ] Try strict mode
- [ ] sitemap
- [ ] Add other docs: contribution, design doc, etc.

### In Progress

- [ ] Update readme (in messages) for `properties` files, unique keys, etc.
- [ ] Redo an easier readme based on an end-to-end configuration

### Done ✓

- [x] Test new Babel plugin modular string loader
- [x] Fix contact-us pages (add localized strings and CSS)
- [x] Add license doc
- [x] Add browser side cookie to persist selected locale on initial page load
- [x] move `nookies` to  `next-multilingual` -> `getCookieLocale`
- [x] move `resolve-accept-language` to  `next-multilingual` -> `getPreferredLocale`
- [x] add `next-multilingual/properties` to avoid the extra Webpack loader dependency
- [x] Understand/tweak/document `MulHead`
  - [x] Canonical links?
- [x] Test/learn/refactor alternate links
    - [x] Cleanup extra `x-default` links?
- [x] Test browsing of non-localized URLs
- [x] Fix bug when / SSR lang on HTML tag is wrong
- [x] Understand/tweak/document `MulLink`
- [x] Understand/tweak/document `MulRouter`
- [x] Fix console error when loading non-english pages: Warning: Prop `href` did not match. Server: "/fr-ca/%C3%A0-propos-de-nous" Client: "/fr-ca/about-us"s
- [x] Fix `npm run build`

