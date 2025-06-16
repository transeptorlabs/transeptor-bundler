/**
 * Utility function to deeply freeze plain objects and arrays, and explicitly guards against accidental use with class instances
 * Used to lock down dependency objects to prevent accidental mutations during
 * runtime. (ie. runtime immutability protection)
 *
 * @param obj - The object to be deeply frozen.
 * @returns A deeply frozen version of the object, ensuring that all nested objects are also frozen.
 */
function deepFreezeClone<T>(obj: T): Readonly<T> {
  if (typeof obj !== 'object' || obj === null) return obj

  const proto = Object.getPrototypeOf(obj)
  const isPlain = proto === Object.prototype || proto === Array.prototype

  if (!isPlain) {
    // Skip over class instances of Pino to avoid freezing the logger
    if (proto?.constructor?.name === 'Pino') {
      return obj
    }

    throw new Error(
      `deepFreezeClone only supports plain objects and arrays. Got instance of ${proto?.constructor?.name}`,
    )
  }

  const cloned: unknown = Array.isArray(obj) ? [] : {}

  for (const key of Object.keys(obj)) {
    const value = (obj as unknown)[key]
    cloned[key] = deepFreezeClone(value)
  }

  return Object.freeze(cloned) as Readonly<T>
}

/**
 * Wrapper function to deeply freeze an object.
 *
 * @param obj - The object to be deeply frozen.
 * @returns A deeply frozen version of the object, ensuring that all nested objects are also frozen.
 */
function readonlyWrapper<T>(obj: T): Readonly<T> {
  return deepFreezeClone(obj)
}

/**
 * Higher-order function to automatically wrap dependencies with readonlyWrapper.
 *
 * @param createModuleFn - A function that takes the dependencies and returns a module with readonly properties.
 * @returns A function that takes the dependencies and returns the result, ensuring the dependencies are readonly.
 */
export function withReadonly<TDependencies, TModule>(
  createModuleFn: (deps: Readonly<TDependencies>) => TModule,
) {
  return (deps: TDependencies): TModule =>
    Object.freeze(createModuleFn(readonlyWrapper(deps)))
}
