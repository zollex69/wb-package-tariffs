import Request from "#utils/request.js";
import env from "#config/env/env.js";

export default class Wildberries extends Request {
    constructor(apiKey: string) {
        super({
            id: "wildberries",
            baseUrl: "https://common-api.wildberries.ru",
            headers: {
                Authorization: apiKey,
            },
            logs: false,
        });
    }

    async get<T>(url: string, body?: any, params?: any, headers?: any) {
        return await this.fetch<T>(url, "GET", body, params, headers);
    }
}

export const wbGlobal = new Wildberries(env.WB_API_KEY);
