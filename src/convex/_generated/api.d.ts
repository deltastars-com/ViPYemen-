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
import type * as ai from "../ai.js";
import type * as auth from "../auth.js";
import type * as automation from "../automation.js";
import type * as campaigns from "../campaigns.js";
import type * as channelPolicy from "../channelPolicy.js";
import type * as channelPush from "../channelPush.js";
import type * as channels from "../channels.js";
import type * as contracts from "../contracts.js";
import type * as controlPanel from "../controlPanel.js";
import type * as crons from "../crons.js";
import type * as email from "../email.js";
import type * as employers from "../employers.js";
import type * as facebook from "../facebook.js";
import type * as facebookStore from "../facebookStore.js";
import type * as fileForward from "../fileForward.js";
import type * as fileQueueInternal from "../fileQueueInternal.js";
import type * as fileQueueMutations from "../fileQueueMutations.js";
import type * as finance from "../finance.js";
import type * as followups from "../followups.js";
import type * as http from "../http.js";
import type * as internal_ from "../internal.js";
import type * as matching from "../matching.js";
import type * as notifications from "../notifications.js";
import type * as offers from "../offers.js";
import type * as openwa from "../openwa.js";
import type * as payments from "../payments.js";
import type * as releases from "../releases.js";
import type * as secureDocs from "../secureDocs.js";
import type * as seed from "../seed.js";
import type * as settings from "../settings.js";
import type * as storage from "../storage.js";
import type * as submissions from "../submissions.js";
import type * as users from "../users.js";
import type * as whatsapp from "../whatsapp.js";
import type * as whatsappBody from "../whatsappBody.js";
import type * as youtube from "../youtube.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ads: typeof ads;
  ai: typeof ai;
  auth: typeof auth;
  automation: typeof automation;
  campaigns: typeof campaigns;
  channelPolicy: typeof channelPolicy;
  channelPush: typeof channelPush;
  channels: typeof channels;
  contracts: typeof contracts;
  controlPanel: typeof controlPanel;
  crons: typeof crons;
  email: typeof email;
  employers: typeof employers;
  facebook: typeof facebook;
  facebookStore: typeof facebookStore;
  fileForward: typeof fileForward;
  fileQueueInternal: typeof fileQueueInternal;
  fileQueueMutations: typeof fileQueueMutations;
  finance: typeof finance;
  followups: typeof followups;
  http: typeof http;
  internal: typeof internal_;
  matching: typeof matching;
  notifications: typeof notifications;
  offers: typeof offers;
  openwa: typeof openwa;
  payments: typeof payments;
  releases: typeof releases;
  secureDocs: typeof secureDocs;
  seed: typeof seed;
  settings: typeof settings;
  storage: typeof storage;
  submissions: typeof submissions;
  users: typeof users;
  whatsapp: typeof whatsapp;
  whatsappBody: typeof whatsappBody;
  youtube: typeof youtube;
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
