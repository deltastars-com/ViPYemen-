import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "automation-tick",
  { seconds: 300 },
  internal.automation.tick
);

export default crons;