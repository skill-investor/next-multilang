import { readdirSync } from 'fs';
import { parse, resolve } from 'path';
import { keySegmentRegExp, keySegmentRegExpDescription } from '.';
import { KeyValueObject, KeyValueObjectCollection, parsePropertiesFile } from './properties';

import * as BabelTypes from '@babel/types';
import type { PluginObj, PluginPass, NodePath } from '@babel/core';
import template from '@babel/template';
import { log } from '..';

export type Program = BabelTypes.Program;
export type Statement = BabelTypes.Statement;
export type ImportDeclaration = BabelTypes.ImportDeclaration;
export type ImportSpecifier = BabelTypes.ImportSpecifier;
export type ImportNamespaceSpecifier = BabelTypes.ImportNamespaceSpecifier;
export type ImportDefaultSpecifier = BabelTypes.ImportDefaultSpecifier;
export type Identifier = BabelTypes.Identifier;

const isImportNamespaceSpecifier = BabelTypes.isImportNamespaceSpecifier;
const isImportSpecifier = BabelTypes.isImportSpecifier;

const isInNextJs = process?.env?.__NEXT_PROCESSED_ENV === 'true';
const applicationIdentifier = process?.env?.nextMultilingualApplicationIdentifier;

if (
  isInNextJs &&
  (applicationIdentifier === undefined || !keySegmentRegExp.test(applicationIdentifier))
) {
  throw new Error(`you must define your application identifier using \`next-multilingual/config\``);
}

/**
 * Target to hijack.
 */
export type HijackTarget = {
  module: string;
  function: string;
};

/**
 * Targets to hijack.
 */
export const hijackTargets: HijackTarget[] = [
  {
    module: 'next-multilingual/messages',
    function: 'useMessages',
  },
  {
    module: 'next-multilingual/messages',
    function: 'getMessages',
  },
];

/**
 * Class used to inject localized messages using Babel (a.k.a "babelified" messages).
 */
export class BabelifiedMessages {
  /** This property is used to confirm that the messages have been "babelified". */
  readonly babelified = true;
  /** The path of the source file that is invoking `useMessages`. */
  readonly sourceFilePath: string;
  /** A collection of "key/value" objects for for all locales. */
  keyValueObjectCollection: KeyValueObjectCollection = {};

  constructor(sourceFilePath: string) {
    this.sourceFilePath = sourceFilePath;
  }
}

/**
 * Get messages from properties file.
 *
 * Since the key prefix is only used by the translation memory (TM) during the translation process, we
 * can remove it from the messages to compress their size while making them easier to access. We also need
 * to validate that the keys are following the expected format.
 *
 * @param propertiesFilePath - The path of the .properties file from which to read the messages.
 *
 * @returns A "key/vale" object storing messages where the key only contains the identifier segment of the key.
 */
export function getMessages(propertiesFilePath: string): KeyValueObject {
  const keyValueObject = parsePropertiesFile(propertiesFilePath);
  let context: string;
  const compactedKeyValueObject = {};
  for (const key in keyValueObject) {
    const keySegments = key.split('.');
    if (keySegments.length !== 3) {
      log.warn(
        `unable to use messages in \`${propertiesFilePath}\` because the key \`${key}\` is invalid. It must follow the \`<application identifier>.<context>.<id>\` format.`
      );
      return {};
    }
    const [appIdSegment, contextSegment, idSegment] = keySegments;

    // Verify the key's unique application identifier.
    if (appIdSegment !== applicationIdentifier) {
      log.warn(
        `unable to use messages in \`${propertiesFilePath}\` because the application identifier \`${appIdSegment}\` in key \`${key}\` is invalid. Expected value: \`${applicationIdentifier}\`.`
      );
      return {};
    }

    // Verify the key's context.
    if (context === undefined) {
      if (!keySegmentRegExp.test(contextSegment)) {
        log.warn(
          `unable to use messages in \`${propertiesFilePath}\` because the context \`${contextSegment}\` in key \`${key}\` is invalid. Key context ${keySegmentRegExpDescription}.`
        );
        return {};
      }
      context = contextSegment;
    } else if (contextSegment !== context) {
      log.warn(
        `unable to use messages in \`${propertiesFilePath}\` because the context \`${contextSegment}\` in key \`${key}\` is invalid. Only one key context is allowed per file. Expected value: \`${context}\`.`
      );
      return {};
    }

    // Verify the key's identifier.
    if (!keySegmentRegExp.test(idSegment)) {
      log.warn(
        `unable to use messages in \`${propertiesFilePath}\` because the identifier \`${idSegment}\` in key \`${key}\` is invalid. Key identifiers ${keySegmentRegExpDescription}.`
      );
      return {};
    }

    // If validation passes, keep only the identifier part of the key to reduce file sizes.
    compactedKeyValueObject[idSegment] = keyValueObject[key];
  }
  return compactedKeyValueObject;
}

/**
 * Get the "babelified" multilingual message collection associated with a source file invoking `useMessages`.
 *
 * @param sourceFilePath - The path of the source file that is invoking `useMessages`.
 *
 * @returns The "babelified" multilingual messages collection in string format.
 */
function getBabelifiedMessages(sourceFilePath: string): string {
  const parsedSourceFile = parse(sourceFilePath);
  const sourceFileDirectoryPath = parsedSourceFile.dir;
  const sourceFilename = parsedSourceFile.name;
  const babelifiedMessages = new BabelifiedMessages(sourceFilePath);

  const fileRegExp = new RegExp(`^${sourceFilename}.(?<locale>[\\w-]+).properties$`);

  readdirSync(sourceFileDirectoryPath, { withFileTypes: true }).forEach((directoryEntry) => {
    if (directoryEntry.isFile()) {
      const directoryEntryFilename = directoryEntry.name;
      const regExpMatch = directoryEntryFilename.match(fileRegExp);
      if (regExpMatch) {
        const locale = regExpMatch.groups.locale;
        const propertiesFilePath = resolve(sourceFileDirectoryPath, directoryEntryFilename);
        babelifiedMessages.keyValueObjectCollection[locale.toLowerCase()] =
          getMessages(propertiesFilePath);
      }
    }
  });

  return JSON.stringify(babelifiedMessages);
}

/**
 * Verify if an import declaration node matches the target module.
 *
 * @param nodePath - A node path object.
 * @param hijackTarget - The target to hijack.
 *
 * @returns True is the node matches, otherwise false.
 */
function isMatchingModule(nodePath: NodePath, hijackTarget: HijackTarget): boolean {
  if (!nodePath.isImportDeclaration()) return false;
  if (nodePath.node.source.value !== hijackTarget.module) return false;
  return true;
}

/**
 * Verify if a specifier matches the target function.
 *
 * @param nodePath - A node path object.
 * @param hijackTarget - The target to hijack.
 *
 * @returns True is the specifier matches, otherwise false.
 */
function isMatchingModuleImportName(
  specifier: ImportDefaultSpecifier | ImportNamespaceSpecifier | ImportSpecifier,
  hijackTarget: HijackTarget
): boolean {
  return (
    isImportSpecifier(specifier) &&
    (specifier.imported as Identifier).name === hijackTarget.function
  );
}

/**
 * Verify if an import declaration node matches the target module and function.
 *
 * @param nodePath - A node path object.
 * @param hijackTarget - The target to hijack.
 *
 * @returns True is the node matches, otherwise false.
 */
function isMatchingNamedImport(nodePath: NodePath, hijackTarget: HijackTarget): boolean {
  return (
    isMatchingModule(nodePath, hijackTarget) &&
    (nodePath.node as ImportDeclaration).specifiers.some((specifier) =>
      isMatchingModuleImportName(specifier, hijackTarget)
    )
  );
}

/**
 * Verify if a namespace import declaration node matches the target module and function.
 *
 * @param nodePath -  A node path object.
 * @param hijackTarget - The target to hijack.
 *
 * @returns True is the node matches, otherwise false.
 */
function isMatchingNamespaceImport(nodePath: NodePath, hijackTarget: HijackTarget): boolean {
  return (
    isMatchingModule(nodePath, hijackTarget) &&
    isImportNamespaceSpecifier((nodePath.node as ImportDeclaration).specifiers[0])
  );
}
/**
 * Class used to inject "babelified" messages.
 */
class Messages {
  /** The program node path associated with the class. */
  private programNodePath: NodePath<Program>;
  /** The source file path associated with the class. */
  private sourceFilePath: string;
  /** The number of time the `getVariableName` was called. */
  private getVariableNameCount = 0;
  /** The unique variable name used relative to the program node path. */
  private variableName: string;

  /**
   * Object used to inject "babelified" messages.
   *
   * @param programNodePath - The program node path associated with the class.
   * @param pluginPass - The `PluginPass` object associated with the class.
   */
  constructor(programNodePath: NodePath<Program>, pluginPass: PluginPass) {
    this.programNodePath = programNodePath;
    this.sourceFilePath = pluginPass.file.opts.filename;
    this.variableName = this.programNodePath.scope.generateUidIdentifier('messages').name;
  }

  /**
   * Get the unique variable name used relative to the program node path.
   */
  public getVariableName(): string {
    this.getVariableNameCount++;
    return this.variableName;
  }

  /**
   * Inject the babelified messages to the program node path, if the variables name was used.
   */
  public injectIfMatchesFound(): void {
    if (!this.getVariableNameCount) return;

    // Inject the messages at the beginning o the file.
    this.programNodePath.node.body.unshift(
      template.ast(
        `const ${this.variableName} = ${getBabelifiedMessages(this.sourceFilePath)};`
      ) as Statement
    );
  }
}

/**
 * Get a variable name to hijack either a named import or a namespace import.
 *
 * @param nodePath - The node path from which to get the unique variable name.
 * @param hijackTarget - The target to hijack.
 * @param suffix - The suffix of the variable name.
 *
 * @returns A unique variable name in the node path's scope.
 */
function getVariableName(nodePath: NodePath, hijackTarget: HijackTarget, suffix: string): string {
  return nodePath.scope.generateUidIdentifier(`${hijackTarget.function}${suffix}`).name;
}

/**
 * "Hijack" a namespace (`import * as messages from`) import.
 *
 * This will simply copy the namespace on another function (because namespaces are readonly), and then bind the
 * target function with the babelified messages. All bindings of the original namespace will be replaced by the
 * hijacked namespace.
 *
 * @param nodePath - The node path being hijacked.
 * @param hijackTarget - The target to hijack.
 * @param messages - The object used to conditionally inject babelified messages.
 */
function hijackNamespaceImport(
  nodePath: NodePath<ImportDeclaration>,
  hijackTarget: HijackTarget,
  messages: Messages
): void {
  const node = nodePath.node;
  const specifier = node.specifiers[0];
  const currentName = specifier.local.name;

  // This is the scope-unique variable name that will replace all matching namespace bindings.
  const hijackedNamespace = getVariableName(nodePath, hijackTarget, 'Namespace');

  // Rename all bindings with the the new name (this excludes the import declaration).
  const binding = nodePath.scope.getBinding(currentName);

  binding.referencePaths.forEach((referencePath) => {
    referencePath.scope.rename(currentName, hijackedNamespace, referencePath.parent);
  });

  // Insert the new "hijacked" namespace variable, with the correct binding.
  nodePath.insertAfter(
    template.ast(
      `const ${hijackedNamespace} = ${currentName};` +
        `${hijackedNamespace}.${hijackTarget.function}.bind(${messages.getVariableName()});`
    ) as Statement
  );
}

/**
 * "Hijack" a named import (e.g. `import { useMessages } from`).
 *
 * This will simply bind the named import to the babelified messages, on a new function name. All bindings
 * of the original function will replaced by the hijacked function.
 *
 * @param nodePath - The node path being hijacked.
 * @param hijackTarget - The target to hijack.
 * @param messages - The object used to conditionally inject babelified messages.
 */
function hijackNamedImport(
  nodePath: NodePath<ImportDeclaration>,
  hijackTarget: HijackTarget,
  messages: Messages
): void {
  const node = nodePath.node;

  node.specifiers.forEach((specifier) => {
    if (isMatchingModuleImportName(specifier, hijackTarget)) {
      // This is the scope-unique variable name that will replace all matching function bindings.
      const hijackedFunction = getVariableName(nodePath, hijackTarget, 'Function');

      const currentName = specifier.local.name;

      // Rename all bindings with the the new name (this excludes the import declaration).
      const binding = nodePath.scope.getBinding(currentName);

      binding.referencePaths.forEach((referencePath) => {
        referencePath.scope.rename(currentName, hijackedFunction, referencePath.parent);
      });

      // Insert the new "hijacked" namespace variable, with the correct binding.
      nodePath.insertAfter(
        template.ast(
          `const ${hijackedFunction} = ${currentName}.bind(${messages.getVariableName()});`
        ) as Statement
      );
    }
  });
}

/**
 * This is the Babel plugin.
 *
 * This plugin will visit all files used by Next.js during the build time and inject the localized messages
 * to the hijack targets.
 *
 * What is supported:
 *
 * - Named imports (e.g. `import { useMessages } from`): this is how both `useMessages` and `getMessages` are meant
 *   to be used.
 * - Namespace imports (e.g. `import * as messages from`): there is no reason to use this, but it's supported.
 *
 * What is not supported:
 *
 * - Dynamic `import()` statements.
 *
 * @returns A Babel plugin object.
 */
export default function plugin(): PluginObj {
  return {
    visitor: {
      Program(programNodePath: NodePath<Program>, pluginPass: PluginPass) {
        const messages = new Messages(programNodePath, pluginPass);

        (programNodePath.get('body') as NodePath[]).forEach((bodyNodePath) => {
          hijackTargets.forEach((hijackTarget) => {
            if (isMatchingNamespaceImport(bodyNodePath, hijackTarget)) {
              hijackNamespaceImport(
                bodyNodePath as NodePath<ImportDeclaration>,
                hijackTarget,
                messages
              );
            } else if (isMatchingNamedImport(bodyNodePath, hijackTarget)) {
              hijackNamedImport(
                bodyNodePath as NodePath<ImportDeclaration>,
                hijackTarget,
                messages
              );
            }
          });
        });

        messages.injectIfMatchesFound();
      },
    },
  };
}
