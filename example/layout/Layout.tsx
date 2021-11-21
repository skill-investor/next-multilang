import Head from 'next-multilingual/head';
import type { ReactElement, ReactNode } from 'react';
import LanguagePicker from '@/components/LanguagePicker';
import Footer from '@/components/Footer';
import styles from './Layout.module.css';
import Link from 'next-multilingual/link';
import { useMessages } from 'next-multilingual/messages';

type LayoutProps = {
  /** The title of the page. */
  title: string;
  children: ReactNode;
};

/**
 * Component used for the general layout of a page.
 *
 * @param title - The title of the page.
 */
export default function Layout({ title, children }: LayoutProps): ReactElement {
  const messages = useMessages();
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"></meta>
      </Head>
      <header className={styles.header}>
        <div>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/">{messages.format('header')}</a>
        </div>
        <LanguagePicker />
        <nav className={styles.nav}>
          <Link href="/">
            <a>{messages.format('home')}</a>
          </Link>
          <Link href="/about-us">
            <a>{messages.format('aboutUs')}</a>
          </Link>
          <Link href="/contact-us">
            <a>{messages.format('contactUs')}</a>
          </Link>
        </nav>
      </header>
      <main className={styles.main}>{children}</main>
      <Footer />
    </>
  );
}
