/**
 * Type helper to ensure all enum keys are mapped in a mapped type
 * This provides compile-time type safety by verifying that all enum values
 * are present in the mapped type.
 *
 * @template E - The enum type (string | number)
 * @template M - The mapped type that should contain all enum keys
 *
 * @example
 * ```typescript
 * export type TEnsureAllKeysMap<E extends string | number, M extends Record<E, any>> = M;
 *
 * type TMyEnumMap = {
 *   [MyEnum.VALUE1]: Type1,
 *   [MyEnum.VALUE2]: Type2,
 * };
 *
 * type TChecked = TEnsureAllKeysMap<MyEnum, TMyEnumMap>;
 * // This will cause a compile error if any MyEnum value is missing from TMyEnumMap
 * ```
 */
export type TEnsureAllKeysMap<E extends string | number, M extends Record<E, any>> = M;
