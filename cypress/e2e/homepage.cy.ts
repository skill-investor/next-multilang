import {
  ACTUAL_DEFAULT_LOCALE,
  ACTUAL_LOCALES,
  BASE_PATH,
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_NAMES,
  ORIGIN,
} from '../constants'

export const ABOUT_US_URLS = {
  'en-US': '/about-us',
  'fr-CA': '/%C3%A0-propos-de-nous',
}

export const HEADERS = {
  'en-US': 'English header',
  'fr-CA': 'En-tête française',
}

export const LANGUAGE_DIRECTIVES = {
  'en-US': 'fr;q=0.8, en;q=0.9',
  'fr-CA': 'fr;q=0.9, en;q=0.8',
}

export const FRUITS = {
  'en-US': 'Banana',
  'fr-CA': 'Banane',
}

export const PLURAL_MESSAGES = {
  'en-US': ['No candy left.', 'Got 1 candy left.', 'Got 2 candies left.'],
  'fr-CA': ['Il ne reste aucun bonbon.', 'Il reste 1 bonbon.', 'Il reste 2 bonbons.'],
}

export const API_RESPONSES = {
  'en-US': `API response: the URL of the "Contact Us" page is: ${ORIGIN}${BASE_PATH}/en-us/contact-us`,
  'fr-CA': `Réponse de l'API: l'URL de la page "Nous joindre" est: ${ORIGIN}${BASE_PATH}/fr-ca/nous-joindre`,
}

describe('The homepage', () => {
  // Check that the HTML tag has the default locale on the SSR markup.
  const invalidLocale = 'invalid'
  const htmlTagMarkup = `<html lang="${ACTUAL_DEFAULT_LOCALE}"`
  it(`returns SSR html that contains '${htmlTagMarkup}' (actual default locale) when a client locale is invalid`, () => {
    cy.request({
      method: 'GET',
      url: `${BASE_PATH}/`,
      headers: {
        'Accept-Language': invalidLocale,
        Cookie: 'L=',
      },
    }).then((response) => {
      expect(response.body).to.contain(htmlTagMarkup)
    })
  })

  // Check that the content renders using the default locale on the client side.
  it(`dynamically renders content with the actual default locale when a client locale is invalid`, () => {
    cy.visit({
      url: `${BASE_PATH}/`,
      headers: {
        'Accept-Language': invalidLocale,
        Cookie: 'L=',
      },
    })
    cy.get('#header').contains(HEADERS[ACTUAL_DEFAULT_LOCALE] as string)
  })

  LOCALES.forEach((locale) => {
    const localeName = LOCALE_NAMES[locale] as string
    // If the default locale is being checked, expect the same result as the actual default locale.
    locale = locale === DEFAULT_LOCALE ? ACTUAL_DEFAULT_LOCALE : locale

    // Set localized variables
    const localizedAboutUsUrl = ABOUT_US_URLS[locale] as string
    const localizedHeader = HEADERS[locale] as string
    const localizedLanguageDirective = LANGUAGE_DIRECTIVES[locale] as string
    const localizedFruit = FRUITS[locale] as string
    const localizedPluralMessages = PLURAL_MESSAGES[locale] as string[]
    const localizedApiResponse = API_RESPONSES[locale] as string

    let source: string

    // Check that the HTML tag has the correct locale on the SSR markup.
    const htmlTagMarkup = `<html lang="${locale}"`
    it(`returns SSR html that contains '${htmlTagMarkup}' for '${localeName}'`, () => {
      cy.request({
        method: 'GET',
        url: `${BASE_PATH}/${locale.toLowerCase()}`,
        headers: {
          'Accept-Language': locale,
          Cookie: 'L=',
        },
      }).then((response) => {
        source = response.body as string
        expect(source).to.contain(htmlTagMarkup)
      })
    })

    // Check that the canonical link points on the default locale on the SSR markup.
    const canonicalLinkMarkup = `<link rel="canonical" href="${ORIGIN}${BASE_PATH}/${locale.toLowerCase()}"/>`
    it(`returns SSR html that contains '${canonicalLinkMarkup}' for '${localeName}'`, () => {
      expect(source).to.contain(canonicalLinkMarkup)
    })

    // Check that all alternate links or all locales are present on the SSR markup.
    it(`returns SSR html that contains all alternate links for '${localeName}'`, () => {
      ACTUAL_LOCALES.forEach((locale) => {
        const alternateLinkMarkup = `<link rel="alternate" href="${ORIGIN}${BASE_PATH}/${locale.toLowerCase()}" hrefLang="${locale}"/>`
        expect(source).to.contain(alternateLinkMarkup)
      })
    })

    // Test the localized SSR URL for the "about us" page.
    const aboutUsAnchorMarkup = `<a href="${BASE_PATH}/${locale.toLowerCase()}${localizedAboutUsUrl}">`
    it(`returns SSR html that contains '${aboutUsAnchorMarkup}' for '${localeName}'`, () => {
      expect(source).to.contain(aboutUsAnchorMarkup)
    })

    // Check that the content renders dynamically on the client side.
    it(`dynamically renders content with the correct 'Accept-Language' header for '${localeName}'`, () => {
      cy.visit({
        url: `${BASE_PATH}/`,
        headers: {
          'Accept-Language': localizedLanguageDirective,
          Cookie: 'L=',
        },
      })
      cy.get('#header').contains(localizedHeader)
    })

    // Check that the correct canonical link is present on the client side markup.
    it(`dynamically renders client side html that contains the correct canonical link for '${localeName}'`, () => {
      cy.get(`head link[rel=canonical]`)
        .should('have.attr', 'href')
        .then((href) => {
          expect(href).eq(`${ORIGIN}${BASE_PATH}/${locale.toLowerCase()}`)
        })
    })

    // Check that all alternate links for all locales are present on the client side markup.
    it(`dynamically renders client side html that contains all alternate links for '${localeName}'`, () => {
      ACTUAL_LOCALES.forEach((locale) => {
        cy.get(`head link[rel=alternate][hreflang=${locale}]`)
          .should('have.attr', 'href')
          .then((href) => {
            expect(href).eq(`${ORIGIN}${BASE_PATH}/${locale.toLowerCase()}`)
          })
      })
    })

    // Test the localized client side URL for the "about us" page.
    it(`dynamically renders client side html that contains localized links for '${localeName}'`, () => {
      cy.get(
        `body nav a[href='${BASE_PATH}/${locale.toLowerCase()}${localizedAboutUsUrl}']`
      ).should('exist')
    })

    // Test the localized "shared messages".
    it(`renders localized shared messages for '${localeName}'`, () => {
      cy.get('#shared-messages select').contains(localizedFruit)
    })

    // Test localized plural messages.
    it(`renders localized plural messages for '${localeName}'`, () => {
      cy.get('#plural-messages-output').contains(localizedPluralMessages[0])
      cy.get('#plural-messages-add').click()
      cy.get('#plural-messages-output').contains(localizedPluralMessages[1])
      cy.get('#plural-messages-add').click()
      cy.get('#plural-messages-output').contains(localizedPluralMessages[2])
      cy.get('#plural-messages-subtract').click().click().click().click()
      cy.get('#plural-messages-output').contains(localizedPluralMessages[0])
    })

    // Check that the API responses also behaves as expected.
    it(`dynamically fetches API content with the correct 'Accept-Language' header for '${localeName}'`, () => {
      cy.intercept(`${BASE_PATH}/api/hello`).as('getApi')
      cy.visit({
        url: `${BASE_PATH}/`,
        headers: {
          'Accept-Language': locale,
          Cookie: 'L=',
        },
      })
      cy.wait('@getApi', { timeout: 20000 }).then(() => {
        cy.get('#api-response').contains(localizedApiResponse)
      })
    })

    // Persist the locale preference when navigating to a localized pages.
    it(`persists locale preferences when navigating to the localized page for '${localeName}'`, () => {
      cy.visit(`${BASE_PATH}/${locale.toLowerCase()}`)
      cy.wait(1000)
      cy.visit(`${BASE_PATH}/`)
      cy.get('#header').contains(localizedHeader)
    })

    // Persist the locale preference when changing language.
    it(`persists locale preferences when clicking on language picker links for '${localeName}'`, () => {
      cy.visit({
        url: `${BASE_PATH}/`,
        headers: {
          'Accept-Language': locale,
          Cookie: 'L=',
        },
      })

      const visitedLocales: string[] = []
      const languagePickerLinks = cy.get('#language-picker a')
      languagePickerLinks.each((languagePickerLink) => {
        const linkLocale = languagePickerLink.attr('lang')
        if (!visitedLocales.includes(linkLocale)) {
          visitedLocales.push(linkLocale)
          const localizedTargetHeader = HEADERS[linkLocale] as string
          cy.wrap(languagePickerLink).click({ force: true, timeout: 10000 })
          cy.wait(1000)
          cy.get('#header').contains(localizedTargetHeader)
          cy.visit(`${BASE_PATH}/`)
          cy.get('#header').contains(localizedTargetHeader)
          return
        }
      })
    })
  })
})
