/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ads from "../ads.js";
import type * as auth from "../auth.js";
import type * as automation from "../automation.js";
import type * as crons from "../crons.js";
import type * as email from "../email.js";
import type * as finance from "../finance.js";
import type * as followups from "../followups.js";
import type * as internal_ from "../internal.js";
import type * as notifications from "../notifications.js";
import type * as offers from "../offers.js";
import type * as releases from "../releases.js";
import type * as seed from "../seed.js";
import type * as settings from "../settings.js";
import type * as storage from "../storage.js";
import type * as submissions from "../submissions.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ads: typeof ads;
  auth: typeof auth;
  automation: typeof automation;
  crons: typeof crons;
  email: typeof email;
  finance: typeof finance;
  followups: typeof followups;
  internal: typeof internal_;
  notifications: typeof notifications;
  offers: typeof offers;
  releases: typeof releases;
  seed: typeof seed;
  settings: typeof settings;
  storage: typeof storage;
  submissions: typeof submissions;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
