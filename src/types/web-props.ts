/**
 * DOM-only props passed to React Native Web views: tabIndex, aria-* and a DOM onKeyDown handler. React Native 0.88 types
 * onKeyDown with its own KeyDownEvent, so these objects are typed loosely and built only when Platform.OS is "web".
 * Keep them as object literals: wrapping them in a helper call makes the React compiler treat the handlers as render-time calls.
 */
export type WebOnlyProps = object;
