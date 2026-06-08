# CSV Portfolio Converter

A small browser-based tool that converts portfolio or holdings CSV exports into a trade import CSV format.

The current output format is:

```csv
Symbol,Side,Qty,Fill Price,Commission,Closing Time
```

## Features

- Upload or drag and drop a CSV file
- Detect common portfolio columns like `Ticker`, `Shares`, `Purchase Price`, and `Operation Date`
- Preview the converted rows
- Download a converted CSV file
- Runs fully in the browser
- No install required

## How to Use

1. Download or clone this repository.
2. Open `START_HIER.html` or `index.html` in your browser.
3. Upload a holdings CSV.
4. Click **Converteren**.
5. Download the converted CSV.

Do not double-click `app.js`. That file contains browser code and is loaded by
`index.html`.

## Example Mapping

| Source column | Output column |
| --- | --- |
| `Ticker` | `Symbol` |
| `Shares` | `Qty` |
| `Purchase Price` | `Fill Price` |
| `Operation Date` | `Closing Time` |

The tool also sets:

| Output column | Default value |
| --- | --- |
| `Side` | `Buy` |
| `Commission` | `0` |

## Tech Stack

- HTML
- CSS
- JavaScript

## License

MIT
