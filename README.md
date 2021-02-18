# next-intl-router

Locale-specific Unicode routes for Next.js

## Usage

Add the package as a dependency:

```
npm install --save-dev next-intl-router
```

Then add the following to your `next.config.js` file:

```js
const IntlRouter = require('next-intl-router').default;

const locales = ['en', 'fr'];
const intlRouter = new IntlRouter('pages', locales);

module.exports = {
  i18n: { locales, defaultLocale: 'en' },
  async rewrites() {
    const rewrites = await intlRouter.getRewrites();
    return rewrites;
  },
  async redirects() {
    const redirects = await intlRouter.getRedirects();
    return redirects;
  }
};
```

By itself, this won't change anything.
You'll also need to add `.properties` files next to each page for which you wish to provide an internationalised route, named as `PAGE.LOCALE.properties`, and these must have a `title` value.
For example:

```properties
# contact-us.fr.properties
title = Nous joindre

messageLabel = Message
submitButton = Envoyer
```

Once such are provided, visitors to `/fr/contact-us` will be automatically redirected to `/fr/nous-joindre`, along with support for all Unicode normalisations in page paths.

### IntlRouter

```js
const intlRouter = new IntlRouter(
  directory: string, // The base directory used to browser localizable assets
  locales: string[], // The locales
  extensions?: string[], // The file extensions of the (page) files
  useCasesInUrls?: boolean // Use mixed-case URLs (by default `false`)
);

const rewrites = await intlRouter.getRewrites();
const redirects = await intlRouter.getRedirects();
```

### IntlLink

An `IntlLink` component is provided to use the existing build manifest to allow you to give a link `href` that uses the page's file directory path, and have that rendered as e.g. `<a href="/fr/nous/joindre/message-envoy%C3%A9">` in the French locale:

```js
import { IntlLink } from 'next-intl-router/lib/link';

export default function ContactUs() {
  return (
    <>
      <IntlLink href="/contact-us/message-sent">
        <a>Link using page id</a>
      </IntlLink>
    </>
  );
}
```

As the data for this mapping is not immediately available during rendering, add the following to your `next.config.js` to correctly prerender such links:

```js
module.exports = {
  ...,
  webpack(config, { dev, isServer }) {
    if (isServer && !dev) {
      const ssrLink = require.resolve('next-intl-router/lib/ssr-link');
      config.resolve.alias['next-intl-router/lib/link$'] = ssrLink;
    }
    return config;
  }
};
```
