import { DEFAULT_LOCALE, LOCALE_NAMES, LOCALES, ORIGIN } from '../constants';

export const ABOUT_US_URLS = {
  'en-US': '/about-us',
  'fr-CA': '/%C3%A0-propos-de-nous',
};

export const HEADERS = {
  'en-US': 'English header',
  'fr-CA': 'En-tête française',
};

export const LANGUAGE_DIRECTIVES = {
  'en-US': 'fr;q=0.8, en;q=0.9',
  'fr-CA': 'fr;q=0.9, en;q=0.8',
};

export const FRUITS = {
  'en-US': 'Banana',
  'fr-CA': 'Banane',
};

export const PLURAL_MESSAGES = {
  'en-US': ['No candy left.', 'Got 1 candy left.', 'Got 2 candies left.'],
  'fr-CA': ['Il ne reste aucun bonbon.', 'Il reste 1 bonbon.', 'Il reste 2 bonbons.'],
};

export const API_RESPONSES = {
  'en-US': 'Hello from the API.',
  'fr-CA': "L'API dit bonjour.",
};

describe('The Next.js application', () => {
  // Check that the HTML tag has the default locale on the SSR markup.
  const invalidLocale = 'invalid';
  const htmlTagMarkup = `<html lang="${DEFAULT_LOCALE}"`;
  it(`returns SSR html that contains '${htmlTagMarkup}' (default locale) when a client locale is invalid`, () => {
    cy.request({
      method: 'GET',
      url: '/',
      headers: {
        'Accept-Language': invalidLocale,
        Cookie: 'L=',
      },
    }).then((response) => {
      expect(response.body).to.contain(htmlTagMarkup);
    });
  });

  // Check that the content renders using the default locale on the client side.
  it(`dynamically renders content with the default locale when a client locale is invalid`, () => {
    cy.visit({
      url: '/',
      headers: {
        'Accept-Language': invalidLocale,
        Cookie: 'L=',
      },
    });
    cy.get('#header').contains(HEADERS[DEFAULT_LOCALE]);
  });

  LOCALES.forEach((locale) => {
    let source;

    // Check that the HTML tag has the correct locale on the SSR markup.
    const htmlTagMarkup = `<html lang="${locale}"`;
    it(`returns SSR html that contains '${htmlTagMarkup}' for '${LOCALE_NAMES[locale]}'`, () => {
      cy.request({
        method: 'GET',
        url: '/',
        headers: {
          'Accept-Language': locale,
          Cookie: 'L=',
        },
      }).then((response) => {
        source = response.body;
        expect(source).to.contain(htmlTagMarkup);
      });
    });

    // Check that the canonical link points on the default locale on the SSR markup.
    const canonicalLinkMarkup = `<link rel="canonical" href="${ORIGIN}/${DEFAULT_LOCALE.toLowerCase()}"/>`;
    it(`returns SSR html that contains '${canonicalLinkMarkup}' for '${LOCALE_NAMES[locale]}'`, () => {
      expect(source).to.contain(canonicalLinkMarkup);
    });

    // Check that all alternate links or all locales are present on the SSR markup.
    it(`returns SSR html that contains all alternate links for '${LOCALE_NAMES[locale]}'`, () => {
      LOCALES.forEach((locale) => {
        const alternateLinkMarkup = `<link rel="alternate" href="${ORIGIN}/${locale.toLowerCase()}" hrefLang="${locale}"/>`;
        expect(source).to.contain(alternateLinkMarkup);
      });
    });

    // Test the localized SSR URL for the "about us" page.
    const aboutUsAnchorMarkup = `<a href="/${locale.toLowerCase()}${ABOUT_US_URLS[locale]}">`;
    it(`returns SSR html that contains '${aboutUsAnchorMarkup}' for '${LOCALE_NAMES[locale]}'`, () => {
      expect(source).to.contain(aboutUsAnchorMarkup);
    });

    // Check that the content renders dynamically on the client side.
    it(`dynamically renders content with the correct 'Accept-Language' header for '${LOCALE_NAMES[locale]}'`, () => {
      cy.visit({
        url: '/',
        headers: {
          'Accept-Language': LANGUAGE_DIRECTIVES[locale],
          Cookie: 'L=',
        },
      });
      cy.get('#header').contains(HEADERS[locale]);
    });

    // Check that the correct canonical link is present on the client side markup.
    it(`dynamically renders client side html that contains the correct canonical link for '${LOCALE_NAMES[locale]}'`, () => {
      cy.get(`head link[rel=canonical]`)
        .should('have.attr', 'href')
        .then((href) => {
          expect(href).eq(`${ORIGIN}/${DEFAULT_LOCALE.toLowerCase()}`);
        });
    });

    // Check that all alternate links for all locales are present on the client side markup.
    it(`dynamically renders client side html that contains all alternate links for '${LOCALE_NAMES[locale]}'`, () => {
      LOCALES.forEach((locale) => {
        cy.get(`head link[rel=alternate][hreflang=${locale}]`)
          .should('have.attr', 'href')
          .then((href) => {
            expect(href).eq(`${ORIGIN}/${locale.toLowerCase()}`);
          });
      });
    });

    // Test the localized client side URL for the "about us" page.
    it(`dynamically renders client side html that contains localized links for '${LOCALE_NAMES[locale]}'`, () => {
      cy.get(`body nav a[href='/${locale.toLowerCase()}${ABOUT_US_URLS[locale]}']`).should('exist');
    });

    // Test the localized "shared messages".
    it(`renders localized shared messages for '${LOCALE_NAMES[locale]}'`, () => {
      cy.get('#shared-messages select').contains(FRUITS[locale]);
    });

    // Test localized plural messages.
    it(`renders localized plural messages for '${LOCALE_NAMES[locale]}'`, () => {
      cy.get('#plural-messages-output').contains(PLURAL_MESSAGES[locale][0]);
      cy.get('#plural-messages-add').click();
      cy.get('#plural-messages-output').contains(PLURAL_MESSAGES[locale][1]);
      cy.get('#plural-messages-add').click();
      cy.get('#plural-messages-output').contains(PLURAL_MESSAGES[locale][2]);
      cy.get('#plural-messages-subtract').click().click().click().click();
      cy.get('#plural-messages-output').contains(PLURAL_MESSAGES[locale][0]);
    });

    // Check that the API responses also behaves as expected.
    it(`dynamically fetches API content with the correct 'Accept-Language' header for '${LOCALE_NAMES[locale]}'`, () => {
      cy.intercept('/api/hello').as('getApi');
      cy.visit({
        url: '/',
        headers: {
          'Accept-Language': locale,
          Cookie: 'L=',
        },
      });
      cy.wait('@getApi', { timeout: 20000 }).then(() => {
        cy.get('#api-response').contains(API_RESPONSES[locale]);
      });
    });

    // Persist the locale preference when navigating to a localized pages.
    it(`persists locale preferences when navigating to the localized page for '${LOCALE_NAMES[locale]}'`, () => {
      cy.visit(`/${locale.toLowerCase()}`);
      cy.visit('/');
      cy.get('#header').contains(HEADERS[locale]);
    });

    // Persist the locale preference when changing language.
    it(`persists locale preferences when clicking on language picker links for '${LOCALE_NAMES[locale]}'`, () => {
      cy.visit({
        url: '/',
        headers: {
          'Accept-Language': locale,
          Cookie: 'L=',
        },
      });

      const visitedLocales: string[] = [];
      const languagePickerLinks = cy.get('#language-picker a');
      languagePickerLinks.each((languagePickerLink) => {
        const linkLocale = languagePickerLink.attr('lang');
        if (!visitedLocales.includes(linkLocale)) {
          visitedLocales.push(linkLocale);
          cy.wrap(languagePickerLink).click({ force: true });
          cy.get('#header').contains(HEADERS[linkLocale]);
          cy.visit('/');
          cy.get('#header').contains(HEADERS[linkLocale]);
          return;
        }
      });
    });
  });
});
