interface IWbTariffWarehouseDto {
    boxDeliveryBase: string;
    boxDeliveryCoefExpr: string;
    boxDeliveryLiter: string;
    boxDeliveryMarketplaceBase: string;
    boxDeliveryMarketplaceCoefExpr: string;
    boxDeliveryMarketplaceLiter: string;
    boxStorageBase: string;
    boxStorageCoefExpr: string;
    boxStorageLiter: string;
    geoName: string;
    warehouseName: string;
}

export interface IWbTariffSuccessDto {
    response: {
        data: {
            dtNextBox: string;
            dtTillMax: string;
            warehouseList: Array<IWbTariffWarehouseDto>;
        };
    };
}

export interface IWbTariffErrorDto {
    detail: string;
    origin: string;
    requestId: string;
    title: string;
}

export type IWbTariffResponseDto = IWbTariffSuccessDto | IWbTariffErrorDto;

export interface IWbTariffDbWEntity {
    id?: number;
    current_date: string;
    dt_till: string;
    delivery_base: string;
    delivery_coef_expr: string;
    delivery_liter: string;
    delivery_marketplace_base: string;
    delivery_marketplace_coef_expr: string;
    delivery_marketplace_liter: string;
    storage_base: string;
    storage_coef_expr: string;
    storage_liter: string;
    geo_name: string;
    warehouse_name: string;
}
