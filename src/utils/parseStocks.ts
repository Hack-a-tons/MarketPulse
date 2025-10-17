import { parse } from 'csv-parse';
import * as fs from 'fs';
import { MarketEvent } from '../types';

/**
 * Parse wide-format stock prices CSV and convert to MarketEvent stream
 * Format: Row 1 = headers (Price, Close, Close, ...), Row 2 = tickers (Ticker, A, AAPL, ...)
 *         Row 3+ = date, price1, price2, price3, ...
 */
export async function* parseStocksCSV(filePath: string): AsyncGenerator<MarketEvent> {
  const parser = fs
    .createReadStream(filePath)
    .pipe(
      parse({
        columns: false, // Don't use first row as columns
        skip_empty_lines: true,
        trim: true,
        relax_quotes: true,
      })
    );

  let tickers: string[] = [];
  let rowIndex = 0;

  for await (const row of parser) {
    rowIndex++;

    // Skip row 1 (Price, Close, Close, ...)
    if (rowIndex === 1) {
      continue;
    }

    // Row 2 contains ticker symbols
    if (rowIndex === 2) {
      tickers = row.slice(1); // Skip first column ("Ticker")
      console.log(`📈 Found ${tickers.length} stock tickers`);
      continue;
    }

    // Rows 3+ contain actual price data
    try {
      const dateStr = row[0];
      if (!dateStr) continue;

      const parsedDate = new Date(dateStr);
      if (isNaN(parsedDate.getTime())) {
        continue;
      }

      // Create event for each ticker's price
      for (let i = 1; i < row.length && i <= tickers.length; i++) {
        const priceStr = row[i];
        if (!priceStr || priceStr === '') continue;

        const price = parseFloat(priceStr);
        if (isNaN(price) || price <= 0) continue;

        const ticker = tickers[i - 1];
        if (!ticker) continue;

        const event: MarketEvent = {
          type: 'price',
          symbol: ticker,
          timestamp: parsedDate.toISOString(),
          price: price,
          close: price,
          source: 'Kaggle',
          meta: {
            originalDate: dateStr,
          },
        };

        yield event;
      }
    } catch (error) {
      // Skip invalid rows
      continue;
    }
  }
}
