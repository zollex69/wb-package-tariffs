import path from "path";
import fs from "fs";

export interface IResult<T> {
    data?: T | null;
    error?: string;
    errorText?: string;
}
export interface IUserConfig {
    id: string;
    baseUrl: string;
    clientId?: string;
    apiKey?: string;
    userAgent?: string;
    headers?: { [key: string]: string };
    origin?: string;
    agent?: string;
    logs?: boolean;
    log_path?: string;
}

export default class Request {
    id: string | undefined;
    baseUrl: string;
    userAgent: string | undefined;
    userAgents: { [key: string]: string };
    headers: { [key: string]: string };
    origin: string;
    agent: string | undefined;
    verbose?: boolean;
    AbortError?: typeof DOMException;
    FetchError?: typeof TypeError;
    httpsAgent?: any;
    httpAgent?: any;
    nodeHttpModuleLoaded?: boolean;
    logs?: boolean;
    log_path?: string;
    protected timeout: number;
    constructor(userConfig: IUserConfig) {
        this.id = userConfig?.id || undefined;
        this.baseUrl = userConfig?.baseUrl;
        this.userAgent = userConfig?.userAgent || undefined;
        this.timeout = 120000;
        //
        this.userAgents = {
            chrome: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.94 Safari/537.36",
            chrome39: "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.71 Safari/537.36",
            chrome100: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.75 Safari/537.36",
        };
        this.headers = userConfig.headers || {};
        this.origin = userConfig.origin || "*";

        this.agent = userConfig.agent || undefined;
        this.logs = userConfig.logs || false;
        this.log_path = userConfig.log_path || undefined;
        if (userConfig.log_path) {
            this.ensureLogFileExists(userConfig.log_path);
        }
    }

    ensureLogFileExists(log_path: string) {
        if (!log_path) return;
        const dir = path.dirname(log_path);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        if (!fs.existsSync(log_path)) {
            fs.writeFileSync(log_path, "");
        }
    }
    log(...args: any) {
        if (!this.logs || !this.log_path) return;
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${JSON.stringify(args, null, 2)}\n\n\n`;
        fs.appendFile(this.log_path, logMessage, (err) => {
            if (err) {
                console.error("Ошибка при записи в лог-файл:", err);
            }
        });
    }
    async fetch<T>(
        url: string,
        method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = "GET",
        body?: any,
        params?: any,
        headers?: { [key: string]: string },
        retries: number = 3, // Количество попыток
        retryDelay: number = 1000, // Задержка между попытками (в миллисекундах)
    ): Promise<IResult<T>> {
        let fullUrl = `${this.baseUrl}${url}`;
        headers = { ...this.headers, ...headers };
        if (this.userAgent) {
            headers["User-Agent"] = this.userAgent;
        }
        const options: RequestInit = {
            method,
            headers,
        };
        if (body) {
            options.body = JSON.stringify(body);
        }
        if (params) {
            fullUrl += `?${new URLSearchParams(params).toString()}`;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response: Response = await fetch(fullUrl, {
                ...options,
                signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (response.status === 204) {
                if (this.logs) {
                    this.toLog(fullUrl, headers, body, params, response);
                }
                return { data: null };
            }

            const clonedResponse = response.clone();
            let data: IResult<T> = {
                data: null,
            };
            try {
                const text = await clonedResponse.text();
                if (text && text.trim() !== "") {
                    try {
                        data.data = JSON.parse(text) as T;
                    } catch (parseError) {
                        const error = parseError as SyntaxError;
                        throw new Error(`Invalid JSON response: ${error.message}`);
                    }
                }
            } catch (readError) {
                const error = readError as SyntaxError;
                throw new Error(`Failed to read response: ${error.message}`);
            }

            if (this.logs) {
                this.toLog(fullUrl, headers, body, params, response);
            }
            if (!response.ok) {
                // Если это временная ошибка (например, 502, 503, 504), повторяем запрос
                if ([502, 503, 504, 429, 420].includes(response.status) && retries > 0) {
                    console.log(`[${url}]Retrying... Attempts left: ${retries}`);
                    await new Promise((resolve) => setTimeout(resolve, retryDelay)); // Ждем перед повторной попыткой
                    return this.fetch<T>(url, method, body, params, headers, retries - 1, retryDelay);
                }
                if (response.status === 400) {
                    return data;
                }

                throw new Error("Failed request");
            }
            return data;
        } catch (error) {
            console.log(error);
            clearTimeout(timeoutId);

            if (error instanceof (this.AbortError || DOMException)) {
                if (retries > 0) {
                    console.log(`[${url}]Retrying... Attempts left: ${retries}`);
                    await new Promise((resolve) => setTimeout(resolve, retryDelay)); // Ждем перед повторной попыткой
                    return this.fetch<T>(url, method, body, params, headers, retries - 1, retryDelay);
                }
                throw new Error(`Request timed out after ${this.timeout} ms`);
            } else if (error instanceof (this.FetchError || TypeError)) {
                if (retries > 0) {
                    console.log(`[${url}]Retrying... Attempts left: ${retries}`);
                    console.log(error);
                    await new Promise((resolve) => setTimeout(resolve, retryDelay)); // Ждем перед повторной попыткой
                    return this.fetch<T>(url, method, body, params, headers, retries - 1, retryDelay);
                }
                throw new Error("Network error or fetch failed");
            }

            throw error;
        }
    }
    async toLog(fullUrl: string, headers: any, body: any, params: any, response: Response) {
        let logMessage = null;
        try {
            if (response) {
                if (response.body) {
                    const contentType = response.headers.get("content-type");
                    if (contentType && contentType.includes("application/json")) {
                        const clonedResponse = response.clone();
                        logMessage = await clonedResponse.json();
                    } else {
                        logMessage = { status: response.status, statusText: response.statusText, body: "Non-JSON response" };
                    }
                } else {
                    logMessage = { status: response.status, statusText: response.statusText, body: "No body" };
                }
            }
        } catch (error) {
            const newError = error as SyntaxError;
            logMessage = {
                status: response.status,
                statusText: response.statusText,
                error: newError.message,
                body: "Failed to parse response",
            };
        }
        this.log({
            baseUrl: fullUrl,
            headers: headers || {},
            body: body || {},
            params: params || {},
            response: logMessage,
        });
    }
}
export { Request as Vendor };
