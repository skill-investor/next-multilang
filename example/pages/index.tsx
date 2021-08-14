import {
  getActualLocales,
  getActualDefaultLocale,
  normalizeLocale,
  getActualLocale,
  getPreferredLocale,
  getCookieLocale
} from 'next-multilingual';
import type { NextPageContext } from 'next';
import { useRouter } from 'next/router';
import { ReactElement } from 'react';
import Layout from '@/layout';
import { useMessages } from 'next-multilingual/messages';
import styles from './index.module.css';
import {
  ResolvedLocaleServerSideProps,
  setCookieLocale
} from 'next-multilingual';

export default function IndexPage({
  resolvedLocale
}: ResolvedLocaleServerSideProps): ReactElement {
  const router = useRouter();
  const { locales, defaultLocale } = router;

  // Overwrite the locale with the resolved locale.
  router.locale = resolvedLocale;
  setCookieLocale(router.locale);

  // Load the messages in the correct locale.
  const messages = useMessages();

  return (
    <Layout title={messages.format('title')}>
      <h1 className={styles.headline}>{messages.format('headline')}</h1>
      <div>
        <h2 className={styles.subHeader}>{messages.format('subHeader')}</h2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{messages.format('columnInformation')}</th>
              <th>{messages.format('columnNextJs')}</th>
              <th>{messages.format('columnActual')}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{messages.format('rowDefaultLocale')}</td>
              <td>{normalizeLocale(defaultLocale)}</td>
              <td>
                {normalizeLocale(
                  getActualDefaultLocale(locales, defaultLocale)
                )}
              </td>
            </tr>
            <tr>
              <td>{messages.format('rowConfiguredLocales')}</td>
              <td>
                {locales.map((locale) => normalizeLocale(locale)).join(', ')}
              </td>
              <td>
                {getActualLocales(locales, defaultLocale)
                  .map((locale) => normalizeLocale(locale))
                  .join(', ')}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Layout>
  );
}

export async function getServerSideProps(
  nextPageContext: NextPageContext
): Promise<{ props: ResolvedLocaleServerSideProps }> {
  const { req, locale, locales, defaultLocale } = nextPageContext;

  const actualLocales = getActualLocales(locales, defaultLocale);
  const actualDefaultLocale = getActualDefaultLocale(locales, defaultLocale);
  const cookieLocale = getCookieLocale(nextPageContext, actualLocales);
  let resolvedLocale = getActualLocale(locale, defaultLocale, locales);

  // When Next.js tries to use the default locale, try to find a better one.
  if (locale === defaultLocale) {
    resolvedLocale = cookieLocale
      ? cookieLocale
      : getPreferredLocale(
          req.headers['accept-language'],
          actualLocales,
          actualDefaultLocale
        ).toLowerCase();
  }

  return {
    props: {
      resolvedLocale
    }
  };
}
