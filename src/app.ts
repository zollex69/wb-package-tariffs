import knex, { migrate, seed } from "#postgres/knex.js";
import { cronService } from "#utils/cron.js";
import { getWbBoxTariff } from "#cron/wbBoxTariffs.js";

await migrate.latest();
await seed.run();
console.log("All migrations and seeds have been run");

cronService.planAndStart("0 * * * *", getWbBoxTariff);
