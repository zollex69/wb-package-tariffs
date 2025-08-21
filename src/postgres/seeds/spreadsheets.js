/**
 * @param {import("knex").Knex} knex
 * @returns {Promise<void>}
 */
export async function seed(knex) {
    await knex("spreadsheets")
        .insert([{ spreadsheet_id: "1ASFgKCcc9hJptouPRc5V0q6jWbqb6kJNFwhtZsCOPi0" }, { spreadsheet_id: "1ASFgKCcc9hJptouPRc5V0q6jWbqb6kJNFwhtZsCOPi0" }])
        .onConflict(["spreadsheet_id"])
        .ignore();
}
