import Head from 'next-multilingual/head'
import Link from 'next-multilingual/link'
import { useMessages } from 'next-multilingual/messages'
import type { ReactNode } from 'react'

import Footer from '@/components/footer/Footer'
import LanguagePicker from '@/components/language-picker/LanguagePicker'

import styles from './Layout.module.css'

type LayoutProps = {
  /** The title of the page. */
  title: string
  /** The child node of the `Layout` component. */
  children: ReactNode
}

/**
 * Component used for the general layout of a page.
 *
 * @param title - The title of the page.
 */
export default function Layout({ title, children }: LayoutProps): JSX.Element {
  const messages = useMessages()
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"></meta>
        {/** Normally, this should have its own localized `description` content, but to avoid
         * unnecessary LightHouse warnings we are adding this line. */}
        <meta name="description" content={title}></meta>
      </Head>
      <header id="header" className={styles.header}>
        <div>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/">{messages.format('header')}</a>
        </div>
        <LanguagePicker />
        <nav className={styles.nav}>
          <Link href="/">
            <a>{messages.format('home')}</a>
          </Link>
          {/* The link below uses a trailing slash by design to test that the behavior is the same as Next.js (no impact). */}
          <Link href="/about-us/">
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
  )
}
