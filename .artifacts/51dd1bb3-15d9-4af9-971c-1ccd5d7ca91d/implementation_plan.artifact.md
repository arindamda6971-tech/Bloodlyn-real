# Mobile Performance Optimization Plan (Native-Feel)

This plan focuses on transforming the current "web-wrapped" experience into a smooth, native-like mobile application by optimizing the rendering pipeline, reducing DOM bloat, and minimizing main-thread jank.

## User Review Required

> [!IMPORTANT]
> This optimization prioritizes **Runtime Performance (FPS)** over visual effects. On native Android devices, we will be disabling some "expensive" effects like `backdrop-blur` to ensure 60fps scrolling.

## Proposed Changes

### 1. UI Infrastructure
Add a specialized component to handle the "heavy lifting" of image rendering without blocking the UI thread.

#### [NEW] [OptimizedImage.tsx](file:///C:/Users/Arindam%20Das/StudioProjects/healthswift-mobile-design/src/components/ui/OptimizedImage.tsx)
*   **Async Decoding**: Decodes images on a background thread.
*   **Blur-up Placeholder**: Shows a skeleton/pulse while the image is loading to prevent layout shifts.

#### [MODIFY] [index.css](file:///C:/Users/Arindam%20Das/StudioProjects/healthswift-mobile-design/src/index.css)
*   **Force Opaque on Native**: Automatically swaps semi-transparent blurred headers for high-performance opaque backgrounds when `html.native` is present.
*   **Layer Promotion**: Promote fixed UI elements (Nav bars) to their own GPU layers.

---

### 2. Feature-Specific Optimization (Home & Categories)
Refactor heavy sections to use "Lazy Sequential Rendering".

#### [MODIFY] [HomeScreen.tsx](file:///C:/Users/Arindam%20Das/StudioProjects/healthswift-mobile-design/src/pages/HomeScreen.tsx)
*   **Sequential Stagger**: Instead of mounting 7 heavy blocks at once, they will mount with a 50-100ms stagger. This keeps the First Contentful Paint (FCP) fast.
*   **Optimized Images**: Replace standard `<img>` tags in quick actions and banners.

#### [MODIFY] [HealthPackagesSection.tsx](file:///C:/Users/Arindam%20Das/StudioProjects/healthswift-mobile-design/src/components/home/HealthPackagesSection.tsx)
*   **Render Containment**: Add `contain: content` to tell the browser this section is isolated, preventing layout recalculations of the whole page when packages load.

---

### 3. Capacitor & Build Tuning

#### [MODIFY] [capacitor.config.ts](file:///C:/Users/Arindam%20Das/StudioProjects/healthswift-mobile-design/capacitor.config.ts)
*   **Memory Tuning**: Adjust Android settings for better cache handling.
*   **Input Capture**: Ensure `captureInput: true` is active for zero-latency touch response.

## Verification Plan

### Automated Tests
*   Run `npm run build` to ensure no regressions in the build pipeline.
*   Verify that `html.native` is correctly applied via `NativeChrome.tsx`.

### Manual Verification
*   **Scroll Test**: Swipe rapidly on the Home Screen and check for "checkerboarding" or stutter.
*   **Navigation Test**: Move from Home -> Categories -> Test Detail and back. Check if the "Back" animation is smooth or hitches.
*   **Inspect Memory**: Verify that unmounting "leaf" pages (Test Details) prevents memory buildup.
