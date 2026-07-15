import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.hourly("purge expired event photos", { minuteUTC: 12 }, internal.photos.purgeExpired);

export default crons;
