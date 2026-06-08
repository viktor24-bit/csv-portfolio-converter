const requiredColumns = ["Symbol", "Side", "Qty", "Fill Price", "Commission", "Closing Time"];

const aliases = {
  Symbol: ["symbol", "ticker", "ticker symbol", "isin"],
  Qty: ["qty", "quantity", "shares", "amount", "aantal"],
  "Fill Price": ["fill price", "purchase price", "price", "current price", "koopprijs"],
  "Closing Time": ["closing time", "operation date", "date", "trade date", "time", "datum"],
};

const state = {
  fileName: "",
  headers: [],
  rows: [],
  convertedRows: [],
  mapping: {},
};

const fileInput = document.querySelector("#fileInput");
const dropzone = document.querySelector("#dropzone");
const statusText = document.querySelector("#statusText");
const mappingList = document.querySelector("#mappingList");
const convertButton = document.querySelector("#convertButton");
const downloadButton = document.querySelector("#downloadButton");
const sideSelect = document.querySelector("#sideSelect");
const commissionInput = document.querySelector("#commissionInput");
const previewTable = document.querySelector("#previewTable");

fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  if (file) readFile(file);
});

dropzone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropzone.classList.add("is-dragging");
});

dropzone.addEventListener("dragleave", () => {
  dropzone.classList.remove("is-dragging");
});

dropzone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropzone.classList.remove("is-dragging");
  const file = event.dataTransfer.files?.[0];
  if (file) readFile(file);
});

convertButton.addEventListener("click", convertRows);
downloadButton.addEventListener("click", downloadConvertedCsv);
sideSelect.addEventListener("change", () => state.rows.length && convertRows());
commissionInput.addEventListener("input", () => state.rows.length && convertRows());

function readFile(file) {
  const reader = new FileReader();

  reader.onload = () => {
    try {
      const parsed = parseCsv(String(reader.result ?? ""));
      state.fileName = file.name.replace(/\.csv$/i, "");
      state.headers = parsed.headers;
      state.rows = parsed.rows;
      state.mapping = detectMapping(parsed.headers);
      state.convertedRows = [];

      renderMapping();
      clearPreview();
      convertButton.disabled = state.rows.length === 0;
      downloadButton.disabled = true;
      statusText.textContent = `${state.rows.length} rijen geladen`;
    } catch (error) {
      statusText.textContent = error.message;
      convertButton.disabled = true;
      downloadButton.disabled = true;
    }
  };

  reader.readAsText(file);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);

  if (rows.length < 2) {
    throw new Error("CSV bevat geen data.");
  }

  const headers = rows[0].map((header) => header.replace(/^\uFEFF/, ""));
  const dataRows = rows.slice(1).map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])),
  );

  return { headers, rows: dataRows };
}

function detectMapping(headers) {
  const normalizedHeaders = headers.map((header) => ({
    original: header,
    normalized: normalize(header),
  }));

  return Object.fromEntries(
    requiredColumns.map((target) => {
      if (target === "Side") return [target, "Buy"];
      if (target === "Commission") return [target, "0"];

      const candidates = aliases[target] ?? [target];
      const found = normalizedHeaders.find((header) =>
        candidates.some((candidate) => header.normalized === normalize(candidate)),
      );

      return [target, found?.original ?? ""];
    }),
  );
}

function normalize(value) {
  return String(value).trim().toLowerCase().replace(/\s+/g, " ");
}

function renderMapping() {
  mappingList.innerHTML = "";

  requiredColumns.forEach((target) => {
    const source = state.mapping[target];
    const row = document.createElement("div");
    row.className = "mapping-row";
    row.innerHTML = `
      <code>${escapeHtml(source || "niet gevonden")}</code>
      <span>naar</span>
      <code>${escapeHtml(target)}</code>
    `;
    mappingList.append(row);
  });
}

function convertRows() {
  const side = sideSelect.value;
  const commission = commissionInput.value || "0";

  state.convertedRows = state.rows.map((row) => ({
    Symbol: valueFrom(row, state.mapping.Symbol),
    Side: side,
    Qty: valueFrom(row, state.mapping.Qty),
    "Fill Price": valueFrom(row, state.mapping["Fill Price"]),
    Commission: commission,
    "Closing Time": formatClosingTime(valueFrom(row, state.mapping["Closing Time"])),
  }));

  renderPreview(state.convertedRows.slice(0, 25));
  downloadButton.disabled = state.convertedRows.length === 0;
  statusText.textContent = `${state.convertedRows.length} rijen geconverteerd`;
}

function valueFrom(row, key) {
  return key ? row[key] ?? "" : "";
}

function formatClosingTime(value) {
  if (!value) return "";
  if (/\d{1,2}:\d{2}/.test(value)) return value;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value} 00:00:00`;
  return value;
}

function renderPreview(rows) {
  const thead = previewTable.querySelector("thead");
  const tbody = previewTable.querySelector("tbody");

  thead.innerHTML = `<tr>${requiredColumns.map((header) => `<th>${header}</th>`).join("")}</tr>`;
  tbody.innerHTML = rows
    .map(
      (row) =>
        `<tr>${requiredColumns.map((header) => `<td>${escapeHtml(row[header])}</td>`).join("")}</tr>`,
    )
    .join("");
}

function clearPreview() {
  previewTable.querySelector("thead").innerHTML = "";
  previewTable.querySelector("tbody").innerHTML = "";
}

function downloadConvertedCsv() {
  const csv = toCsv(state.convertedRows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${state.fileName || "portfolio"}_converted.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function toCsv(rows) {
  const lines = [requiredColumns.join(",")];

  rows.forEach((row) => {
    lines.push(requiredColumns.map((header) => csvCell(row[header])).join(","));
  });

  return `${lines.join("\r\n")}\r\n`;
}

function csvCell(value) {
  const text = String(value ?? "");
  if (/[",\r\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
