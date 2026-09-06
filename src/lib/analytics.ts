/**
 * Centralized Telemetry & Analytics Pipeline.
 * 
 * This file acts as a modular wrapper around your analytics provider 
 * (e.g. PostHog, Mixpanel, Google Analytics). 
 * By routing all tracking through here, you can swap providers instantly.
 */

// Placeholder for future provider instance
// import posthog from 'posthog-js';
// posthog.init('phc_...', { api_host: 'https://app.posthog.com' });

const isProd = import.meta.env.PROD;

const log = (event: string, properties?: Record<string, any>) => {
  if (!isProd) {
    console.log(`[Telemetry] ${event}`, properties || '');
  }
  // Example PostHog integration:
  // posthog.capture(event, properties);
};

export const Analytics = {
  /**
   * Identifies a user when they log in.
   */
  identify: (userId: string, traits?: Record<string, any>) => {
    if (!isProd) console.log(`[Telemetry] Identified User: ${userId}`, traits || '');
    // posthog.identify(userId, traits);
  },

  /**
   * Tracks a screen view.
   */
  trackPageView: (screenName: string, path: string) => {
    log("Page View", { screen_name: screenName, path });
  },

  /**
   * Tracks when a user adds a lab test or package to their cart.
   */
  trackAddToCart: (item: { id: string; name: string; price: number; kind?: string }) => {
    log("Add To Cart", item);
  },

  /**
   * Tracks progression through the checkout flow.
   */
  trackCheckoutStep: (stepName: string, properties?: Record<string, any>) => {
    log("Checkout Step", { step: stepName, ...properties });
  },

  /**
   * Tracks when an unexpected error occurs for quality monitoring.
   */
  trackError: (errorName: string, message: string, context?: Record<string, any>) => {
    log("Error Encountered", { error: errorName, message, ...context });
  }
};
