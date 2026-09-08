/**
 * Copyright (C) 2022 Mailvelope GmbH
 * Copyright (C) 2026 Secure Mail (internal customisation)
 * Licensed under the GNU Affero General Public License version 3
 *
 * Telemetry removed.
 *
 * Upstream Mailvelope bundles the Clean Insights SDK and, when the build-time
 * flag `ciActive` is set, reports onboarding milestones to an external metrics
 * server. The flag ships false, but the SDK, the campaign definitions and the
 * server URL are all present in the compiled bundle, and the consent
 * interstitial invites the user to turn reporting on.
 *
 * Secure Mail is deployed on the premise that nothing about who uses it, when,
 * or what they do with it reaches a third party. A disabled-by-default switch
 * is not the same guarantee as absent code: it can be flipped by a later
 * upstream merge, and an auditor cannot distinguish "off" from "not there"
 * without reading the source. The dependency is therefore removed outright, so
 * `npm ls clean-insights-sdk` reports nothing and no metrics endpoint appears
 * in any built artefact. `scripts/verify-no-external-endpoints.sh` enforces
 * this on every build.
 *
 * The module keeps its original export surface so the call sites in
 * pgpModel.js, app.controller.js, menu.controller.js and background.js stay
 * untouched; every entry point is now inert.
 */

export const ONBOARDING_CAMPAIGN = 'onboarding';
export const BEGIN = 'Load Extension';
export const ADD_KEY = 'Added Key';
export const COMMUNICATION = 'Communication';

/**
 * Kept because pgpModel.js compares message senders against it. It is a
 * plain constant, never contacted.
 */
export const KEYSERVER_ADDRESS = 'noreply@mailvelope.com';

export function initAnalytics() {}

export function binInto10sIncrements(milliseconds) {
  return Math.floor(milliseconds / (10 * 1000)) * 10;
}

export function recordOnboardingStep() {}

/** Never show the consent interstitial: there is nothing to consent to. */
export function shouldSeeConsentDialog() {
  return false;
}

export function denyCampaign() {}

/** Reported as denied so any surviving UI renders the "off" state. */
export function isCampaignCurrentlyGranted() {
  return false;
}

export function grantCampaign() {}
