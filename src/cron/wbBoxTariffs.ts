import knex from "#postgres/knex.js";
import { wbGlobal } from "#marketplaces/wildberries.js";
import { IWbTariffDbWEntity, IWbTariffResponseDto, ISpreadsheetDbEntity } from "#types/index.js";
import { googleApiGlobal } from "#utils/googleApi.js";
import { getDate } from "#utils/utils.js";

export async function getWbBoxTariff() {
    const date = getDate();

    try {
        const response = await wbGlobal.get<IWbTariffResponseDto>("/api/v1/tariffs/box", null, {
            date,
        });
        if (!response.data) return;

        if (!("response" in response.data)) {
            console.log("Received an error from WB:", JSON.stringify(response.data));
            return;
        }

        const dateTill = response.data.response.data.dtTillMax;
        for (const warehouseData of response.data.response.data.warehouseList) {
            try {
                const tariff = await knex<IWbTariffDbWEntity>("tariffs")
                    .where(knex.raw("current_date = ?", date))
                    .andWhere(knex.raw("warehouse_name = ?", warehouseData.warehouseName))
                    .first("*");
                const upsertData: IWbTariffDbWEntity = {
                    current_date: date,
                    dt_till: dateTill,
                    delivery_base: warehouseData.boxDeliveryBase,
                    delivery_coef_expr: warehouseData.boxDeliveryCoefExpr,
                    delivery_liter: warehouseData.boxDeliveryLiter,
                    delivery_marketplace_base: warehouseData.boxDeliveryMarketplaceBase,
                    delivery_marketplace_coef_expr: warehouseData.boxDeliveryMarketplaceCoefExpr,
                    delivery_marketplace_liter: warehouseData.boxDeliveryMarketplaceLiter,
                    storage_base: warehouseData.boxStorageBase,
                    storage_coef_expr: warehouseData.boxStorageCoefExpr,
                    storage_liter: warehouseData.boxStorageLiter,
                    geo_name: warehouseData.geoName,
                    warehouse_name: warehouseData.warehouseName,
                };
                if (!tariff) {
                    knex("tariffs").insert(upsertData);
                    continue;
                }
                knex("tariffs").where({ id: tariff.id }).update(upsertData);
            } catch (e) {
                console.log("An error occurred during updating data.", e);
            }
        }
        console.log("Tariffs written successfully to Database!");

        updateGoogleSpreadsheets();
    } catch (error) {
        console.log("An error occurred during getting WB tariff.", error);
    }
}

export async function updateGoogleSpreadsheets() {
    const date = getDate();
    const spreadsheets = await knex<ISpreadsheetDbEntity>("spreadsheets").select();
    if (!spreadsheets) {
        console.log("There is no one spreadsheet created.");
        return;
    }
    const tariffs = await knex<IWbTariffDbWEntity>("tariffs").where(knex.raw("current_date = ?", date)).select();
    if (!tariffs) {
        console.log("There is no one tariffs created for today.");
        return;
    }

    const spreadsheetId = spreadsheets[0].spreadsheet_id;
    const sheetName = "stocks_coefs";
    const sort_by = "delivery_marketplace_coef_expr";

    try {
        const metaData = await googleApiGlobal.getMetaData(spreadsheetId);
        console.log(`Spreadsheet title: ${metaData.data.properties?.title}`);
        console.log(`Sheet title: ${sheetName}`);

        const sortedData = tariffs.sort((a, b) => {
            const numA = parseFloat(a[sort_by]);
            const numB = parseFloat(b[sort_by]);

            if (isNaN(numA) && isNaN(numB)) return 0;
            if (isNaN(numA)) return 1;
            if (isNaN(numB)) return -1;

            return numB - numA;
        });

        // Write data from a spreadsheet
        await googleApiGlobal.clearSheet(spreadsheetId, sheetName);

        // Write data to the spreadsheet
        const written = await googleApiGlobal.fillSheet(spreadsheetId, sheetName, [
            [...Object.keys(tariffs[0]).slice(1)],
            ...sortedData.map((t) => {
                const { id: _, ...rest } = t;
                return Object.values(rest);
            }),
        ]);
        if (written) {
            console.log("Data written successfully to Google Sheets.");
            return;
        }
        console.log("Data not written.");
    } catch (error) {
        console.error("An error occurred when interacting with Google Sheets: \n", error);
    }
}
