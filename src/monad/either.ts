export abstract class Either<L, R> {
  constructor(protected value: L | R) {}

  /**
   * Transforms the value in a `Right`, does nothing for a `Left`.
   */
  abstract map<U>(f: (value: R) => U): Either<L, U>

  /**
   * Chains computations that return an `Either`.
   * Propagates `Left` if the current value is `Left`.
   */
  abstract flatMap<U>(f: (value: R) => Either<L, U>): Either<L, U>

  /**
   * Returns the value inside a `Right` or the provided default value if `Left`.
   */
  abstract getOrElse(defaultValue: R): R

  /**
   * Determines if the instance is `Left`.
   */
  abstract isLeft(): boolean

  /**
   * Determines if the instance is `Right`.
   */
  abstract isRight(): boolean

  /**
   * Returns a string representation of the instance.
   *
   * @returns A string representation of the instance.
   */
  toString(): string {
    const str = JSON.stringify(this.value)
    return `${this.isLeft() ? 'Left' : 'Right'}: (${str})`
  }

  /**
   * Handles both `Left` and `Right` cases with provided functions.
   *
   * @param onLeft - Function to handle `Left`.
   * @param onRight - Function to handle `Right`.
   * @returns The result of the function that matches the instance.
   */
  fold<U>(onLeft: (error: L) => U, onRight: (value: R) => U): U {
    return this.isLeft() ? onLeft(this.value as L) : onRight(this.value as R)
  }

  foldAsync<U>(
    onLeft: (error: L) => Promise<U>,
    onRight: (value: R) => Promise<U>,
  ): Promise<U> {
    return this.isLeft() ? onLeft(this.value as L) : onRight(this.value as R)
  }

  /**
   * Factory method for creating a `Right` instance.
   *
   * @param value - The value to wrap in a `Right`.
   * @returns A `Right` instance.
   */
  static of<R>(value: R): Either<never, R> {
    return new Right(value)
  }

  /**
   * Factory method for creating a `Left` instance.
   *
   * @param value - The value to wrap in a `Left`.
   * @returns A `Left` instance.
   */
  static Left<L, R>(value: L): Either<L, R> {
    return new Left(value)
  }

  /**
   * Factory method for creating a `Right` instance.
   *
   * @param value - The value to wrap in a `Right`.
   * @returns A `Right` instance.
   */
  static Right<L, R>(value: R): Either<L, R> {
    return new Right(value)
  }
}

class Left<L, R> extends Either<L, R> {
  constructor(value: L) {
    super(value)
  }

  map<U>(_: (value: R) => U): Either<L, U> {
    return this as unknown as Either<L, U>
  }

  flatMap<U>(_: (value: R) => Either<L, U>): Either<L, U> {
    return this as unknown as Either<L, U>
  }

  getOrElse(defaultValue: R): R {
    return defaultValue
  }

  isLeft(): boolean {
    return true
  }

  isRight(): boolean {
    return false
  }
}

class Right<L, R> extends Either<L, R> {
  constructor(value: R) {
    super(value)
  }

  map<U>(f: (value: R) => U): Either<L, U> {
    return Either.of(f(this.value as R))
  }

  flatMap<U>(f: (value: R) => Either<L, U>): Either<L, U> {
    return f(this.value as R)
  }

  getOrElse(_: R): R {
    return this.value as R
  }

  isLeft(): boolean {
    return false
  }

  isRight(): boolean {
    return true
  }
}

/**
 * Determines if the provided value is an instance of `Either`.
 *
 * @param value - The value to check.
 * @returns `true` if the value is an instance of `Either`, `false` otherwise.
 */
export const isEither = <L>(value: unknown): value is Either<L, unknown> => {
  return value instanceof Either
}
