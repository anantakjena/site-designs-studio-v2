import { ServiceKey, ServiceScope } from "@microsoft/sp-core-library";
import { ISiteScriptContent, ISiteScript } from "../../models/ISiteScript";
import { toJSON } from "../../utils/jsonUtils";
import { saveAs } from "file-saver";
import * as JSZip from "jszip";

export interface IExportService {
    exportSiteScriptAsJSON(siteScript: ISiteScript): Promise<void>;
    exportSiteScriptAsPnPPowershellScript(siteScriptContent: ISiteScript): Promise<void>;
    exportSiteScriptAsPnPTemplate(siteScriptContent: ISiteScript): Promise<void>;
    exportSiteScriptAsO365CLIScript(siteScriptContent: ISiteScript, flavour: "Powershell" | "Bash"): Promise<void>;
}

const Templates = {
    PnPPowerShell_Header: `
#####################################################################################
### PnP Powershell script generated by Site Designs Studio
### Make sure to be logged in with PnP Powershell before executing this script
#####################################################################################`,
    PnPPowerShell_AddSiteScript: `
### Add {{title}} Site Script
$script = Get-Content "{{jsonFileName}}"
Add-PnPSiteScript -Title "{{title}}" -Description "{{description}}" -Content $script
    `,
    O365cli_Header: `
#####################################################################################
### Office 365 CLI script (PowerShell) generated by Site Designs Studio
### Make sure to be logged in with O365 CLI before executing this script
#####################################################################################`,
    O365cli_PS_AddSiteScript: `
### Add {{title}} Site Script
$script = Get-Content "{{jsonFileName}}"
o365 spo sitescript add --title "{{title}}" --description "{{description}}" --content $script
        `
};


class ExportService implements IExportService {

    constructor(serviceScope: ServiceScope) {

    }

    public async exportSiteScriptAsJSON(siteScript: ISiteScript): Promise<void> {
        const scriptContentJSON = toJSON(siteScript.Content);
        const blob = new Blob([scriptContentJSON], { type: "octet/stream" });
        saveAs(blob, `${siteScript.Title}.json`);
    }
    public async exportSiteScriptAsPnPPowershellScript(siteScript: ISiteScript): Promise<void> {
        // Create a new zip archive
        const zip = new JSZip();
        // Add the JSON of the site script to the zip
        const scriptContentJSON = toJSON(siteScript.Content);
        const jsonFileName = `${siteScript.Title}.json`;
        zip.file(jsonFileName, scriptContentJSON);

        const processedTemplate = Templates.PnPPowerShell_Header + '\n' + Templates.PnPPowerShell_AddSiteScript
            .replace(/\{\{title\}\}/g, siteScript.Title || "SiteScript - No title")
            .replace(/\{\{jsonFileName\}\}/g, jsonFileName)
            .replace(/\{\{description\}\}/g, siteScript.Description || "");
        zip.file("AddSiteScript.ps1", processedTemplate);

        await zip.generateAsync({ type: "blob" })
            .then((content) => {
                saveAs(content, `${siteScript.Title}_PnPPowershell.zip`);
            });
    }
    public exportSiteScriptAsPnPTemplate(siteScript: ISiteScript): Promise<void> {
        throw new Error("Method not implemented.");
    }
    public async exportSiteScriptAsO365CLIScript(siteScript: ISiteScript, flavour: "Powershell" | "Bash" = "Powershell"): Promise<void> {
        // Create a new zip archive
        const zip = new JSZip();
        // Add the JSON of the site script to the zip
        const scriptContentJSON = toJSON(siteScript.Content);
        const jsonFileName = `${siteScript.Title}.json`;
        zip.file(jsonFileName, scriptContentJSON);

        if (flavour == "Powershell") {
            const processedTemplate = Templates.O365cli_Header + '\n' + Templates.O365cli_PS_AddSiteScript
                .replace(/\{\{title\}\}/g, siteScript.Title || "SiteScript - No title")
                .replace(/\{\{jsonFileName\}\}/g, jsonFileName)
                .replace(/\{\{description\}\}/g, siteScript.Description || "");
            zip.file("AddSiteScript.ps1", processedTemplate);
        } else {
            throw new Error("No yet supported...");
        }

        await zip.generateAsync({ type: "blob" })
            .then((content) => {
                saveAs(content, `${siteScript.Title}_O365cli_PS.zip`);
            });
    }

}

export const ExportServiceKey = ServiceKey.create<IExportService>('YPCODE:SDSv2:ExportService', ExportService);