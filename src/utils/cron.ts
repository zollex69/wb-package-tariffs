import cron, { CronJob } from "cron";

export const cronService = {
    planAndStart(cronTime: string, onTick = () => {}) {
        console.log("Cron plan");
        return new CronJob(cronTime, onTick, null, true);
    },
};
