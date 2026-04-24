import '@testing-library/jest-dom';

// Polyfill window.matchMedia for embla-carousel and other components that use media queries in tests
if (typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// Basic IntersectionObserver mock for components that rely on it (embla-carousel, lazy-load, etc.)
if (typeof (window as any).IntersectionObserver === 'undefined') {
  class MockIntersectionObserver {
    callback: IntersectionObserverCallback;
    constructor(cb: IntersectionObserverCallback) {
      this.callback = cb;
    }
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  }
  (window as any).IntersectionObserver = MockIntersectionObserver;
}

// Basic ResizeObserver mock for components that rely on it (embla-carousel, layout calculations)
if (typeof (window as any).ResizeObserver === 'undefined') {
  class MockResizeObserver {
    callback: ResizeObserverCallback;
    constructor(cb: ResizeObserverCallback) {
      this.callback = cb;
    }
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (window as any).ResizeObserver = MockResizeObserver;
}

// Pointer capture mocks for Radix components in jsdom
if (typeof Element !== 'undefined') {
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false;
  }
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = () => {};
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = () => {};
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }
}
