# Things to do

To make tracking of to-dos easier, this file can be used to track progress on the overall maturity of the package.

### To-do

- [ ] Add strings key prefix support (`next-multilingual/properties-loader` ?)
- [ ] Check if we need this route: /en-us/homepage -> /en-us
- [ ] Check if we can add `title` attributes on `Link` components (not supported by Next.js?)
- [ ] Add browser side cookie to persist selected locale on initial page load
- [ ] Localized error pages
- [ ] Add automated test:
  - [ ] Test when a string file changes, the page is updated (deveoper experience?)
  - [ ] Test language detection
  - [ ] Test Header
  - [ ] Test links
  - [ ] Test for: http://localhost:3000/mul/about-us
  - [ ] Test for: http://localhost:3000/about-us
  - [ ] Test with a 3rd language (language switch hydratation issues?)


### In Progress

- [ ] Redo an easier readme based on an end-to-end configuration
- [ ] Test browsing of non-localized URLs
- [ ] Fix contact-us pages (add localized strings and CSS)
- [ ] Understand/tweak/document `MulHead`
    - [ ] Canonical links?
    - [ ] Cleanup extra `x-default` links?

### Done ✓

- [x] Understand/tweak/document `MulLink`
- [x] Understand/tweak/document `MulRouter`
- [x] Fix console error when loading non-english pages: Warning: Prop `href` did not match. Server: "/fr-ca/%C3%A0-propos-de-nous" Client: "/fr-ca/about-us"s
- [x] Fix `npm run build`

