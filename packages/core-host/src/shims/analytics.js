/**
 * Hard no-op analytics. CLAUDE.md forbids telemetry, analytics and trackers.
 * Exports every binding mailvelope/src/modules imports from lib/analytics.js.
 */
export const ONBOARDING_CAMPAIGN = 'onboarding';
export const BEGIN = 'Load Extension';
export const ADD_KEY = 'Added Key';
export const COMMUNICATION = 'Communication';
export const KEYSERVER_ADDRESS = 'noreply@mailvelope.com';

export function initAnalytics() {}
export function binInto10sIncrements(milliseconds) { return Math.round(milliseconds / 10000) * 10; }
export function recordOnboardingStep() {}
export function shouldSeeConsentDialog() { return false; }
export function denyCampaign() {}
export function isCampaignCurrentlyGranted() { return false; }
export function grantCampaign() {}
