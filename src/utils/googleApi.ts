import { resolve } from "path";
import { existsSync } from "fs";
import { google } from "googleapis";

export class GoogleApi {
    protected sheets;

    constructor(keyFile: string) {
        if (!existsSync(keyFile)) {
            console.log("Error: The google-credentials.json file does not exist.");
            return;
        }

        try {
            const auth = new google.auth.GoogleAuth({
                keyFile,
                scopes: ["https://www.googleapis.com/auth/spreadsheets"],
            });
            this.sheets = google.sheets({ version: "v4", auth });
        } catch (e) {
            console.log("An error occurred during authorization in Google Sheets.", e);
        }
    }

    async getMetaData(spreadsheetId: string) {
        if (!this.sheets) throw new Error("Not authorized");

        return await this.sheets.spreadsheets.get({ spreadsheetId });
    }

    async fillSheet(spreadsheetId: string, sheetName: string, values: any[][]) {
        if (!this.sheets) throw new Error("Not authorized");
        await this.sheets.spreadsheets.values.append({
            spreadsheetId,
            range: sheetName,
            valueInputOption: "USER_ENTERED",
            requestBody: {
                values,
            },
        });
        return true;
    }

    async clearSheet(spreadsheetId: string, sheetName: string) {
        if (!this.sheets) throw new Error("Not authorized");
        await this.sheets.spreadsheets.values.clear({ spreadsheetId, range: sheetName });
        return true;
    }
}

export const googleApiGlobal = new GoogleApi(resolve("google-credentials.json"));
