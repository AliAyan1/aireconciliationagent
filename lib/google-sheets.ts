export function parseGoogleSheetsExportUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed.includes("docs.google.com/spreadsheets")) return null;

  const idMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!idMatch) return null;

  const sheetId = idMatch[1];
  let gid = "0";
  const gidMatch = trimmed.match(/[#&?]gid=(\d+)/);
  if (gidMatch) gid = gidMatch[1];

  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
}

export async function fetchGoogleSheetCsv(url: string): Promise<string> {
  const exportUrl = parseGoogleSheetsExportUrl(url);
  if (!exportUrl) {
    throw new Error("Invalid Google Sheets URL. Paste a share link from Google Sheets.");
  }

  const res = await fetch(exportUrl, { mode: "cors" });
  if (!res.ok) {
    throw new Error(
      "Could not fetch sheet. Ensure the sheet is shared as “Anyone with the link can view”."
    );
  }
  return res.text();
}
