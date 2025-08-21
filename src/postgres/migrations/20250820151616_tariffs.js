/**
 * @param {import("knex").Knex} knex
 * @returns {Promise<void>}
 */
export async function up(knex) {
    return knex.schema.createTable("tariffs", (table) => {
        table.increments("id").primary();

        table.date("current_date").notNullable();
        table.dateTime("dt_till").notNullable();
        table.string("delivery_base").notNullable();
        table.string("delivery_coef_expr").notNullable();
        table.string("delivery_liter").notNullable();
        table.string("delivery_marketplace_base").notNullable();
        table.string("delivery_marketplace_coef_expr").notNullable();
        table.string("delivery_marketplace_liter").notNullable();
        table.string("storage_base").notNullable();
        table.string("storage_coef_expr").notNullable();
        table.string("storage_liter").notNullable();
        table.string("geo_name").notNullable();
        table.string("warehouse_name").notNullable();
    });
}

/**
 * @param {import("knex").Knex} knex
 * @returns {Promise<void>}
 */
export async function down(knex) {
    return knex.schema.dropTable("tariffs");
}
