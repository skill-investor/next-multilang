import { MessagesIndex, MixedValues, PlaceholderValues, slugify } from '.'
import { highlight, highlightFilePath, log, normalizeLocale } from '..'
import { Message } from './message'
import { KeyValueObject } from './properties'

/**
 * Object used to format localized messages of a local scope.
 */
export class Messages {
  /** Localized messages of a local scope. */
  private messages: Message[] = []
  /** An index to optimize `get` access on messages. */
  private messagesIndex: MessagesIndex = {}
  /** The current locale from Next.js. */
  readonly locale: string
  /** The source (the file calling `useMessages`) file path. */
  readonly sourceFilePath: string
  /** The messages file path. */
  readonly messagesFilePath: string

  /**
   * Create an object used to format localized messages of a local scope.
   *
   * @param keyValueObject - The "key/value" object coming directly from a `.properties` file.
   * @param locale - The current locale from Next.js.
   * @param sourceFilePath - The file path of the source file associated with the messages.
   * @param messagesFilePath - The file path of the messages.
   */
  constructor(
    keyValueObject: KeyValueObject,
    locale: string,
    sourceFilePath: string,
    messagesFilePath: string
  ) {
    if (keyValueObject) {
      Object.keys(keyValueObject).forEach((key) => {
        this.messagesIndex[key] =
          this.messages.push(new Message(this, key, keyValueObject[key])) - 1
      })
    }
    this.locale = normalizeLocale(locale)
    this.sourceFilePath = sourceFilePath
    this.messagesFilePath = messagesFilePath
  }

  /**
   * Format a message identified by a key in a local scope.
   *
   * @param key - The local scope key identifying the message.
   * @param values - The values of the message's placeholders (e.g., `{name: 'Joe'}`).
   *
   * @returns The formatted message as a string.
   */
  public format(key: string, values?: PlaceholderValues): string {
    if (this.messages.length === 0) {
      // No need to log the error since it was caught when calling `useMessage()`.
      return ''
    }

    // Safety check in case of bad user type assertion.
    if (typeof key !== 'string') {
      log.warn(
        `trying to call ${highlight(
          'format'
        )} with an key identifier that is not a string in ${highlightFilePath(this.sourceFilePath)}`
      )
      return ''
    }

    // Empty keys are not expected.
    if (!key) {
      log.warn(
        `trying to call ${highlight('format')} with an empty key identifier in ${highlightFilePath(
          this.sourceFilePath
        )}`
      )
      return ''
    }

    // Empty messages are not expected.
    const message = this.messages?.[this.messagesIndex?.[key]]
    if (message === undefined) {
      log.warn(
        `unable to format key with identifier ${highlight(key)} in ${highlightFilePath(
          this.sourceFilePath
        )} because it was not found in messages file ${highlightFilePath(this.messagesFilePath)}`
      )
      return ''
    }

    return message.format(values)
  }

  /**
   * Format a message identified by a key in a local into a JSX element.
   *
   * @param key - The local scope key identifying the message.
   * @param values - The values of the message's placeholders and/or JSX elements.
   *
   * @returns The formatted message as a JSX element.
   */
  public formatJsx(key: string, values: MixedValues): JSX.Element {
    if (this.messages.length === 0) {
      // No need to log the error since it was caught when calling `useMessage()`.
      return <></>
    }

    if (!key) {
      log.warn(
        `trying to call ${highlight(
          'formatJsx'
        )} with an empty key identifier in ${highlightFilePath(this.sourceFilePath)}`
      )
      return <></>
    }

    const message = this.messages[this.messagesIndex[key]]

    if (message === undefined) {
      log.warn(
        `unable to format key with identifier ${highlight(key)} in ${highlightFilePath(
          this.sourceFilePath
        )} because it was not found in messages file ${highlightFilePath(this.messagesFilePath)}`
      )
      return <></>
    }

    return message.formatJsx(values)
  }

  /**
   * Get a message contained in a given local scope.
   *
   * @param key - The local scope key identifying the message.
   *
   * @returns The message associated with the key in a given local scope or `undefined` when not found.
   */
  public get(key: string): Message | undefined {
    return this.messages[this.messagesIndex[key]]
  }

  /**
   * Get the key associated with a route parameter in a given local scope.
   *
   * @param routeParameter - A route parameter.
   *
   * @returns The key associated with a route parameter in a given local scope or `undefined` when not found.
   */
  public getRouteParameterKey(routeParameter: string): string | undefined {
    return this.messages.find(
      (message) => slugify(message.format(), this.locale) === routeParameter
    )?.key
  }

  /**
   * Get all messages contained in a given local scope.
   *
   * @returns All messages contained in a given local scope.
   */
  public getAll(): Message[] {
    return this.messages
  }

  /**
   * Check if a message contained in a given local scope exists.
   *
   * @param key - The local scope key identifying the message.
   *
   * @returns True if the message associated with the key in a given local scope exists, otherwise false.
   */
  public exists(key: string): boolean {
    return this.messages[this.messagesIndex[key]] !== undefined
  }
}
