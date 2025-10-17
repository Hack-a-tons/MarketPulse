import { parse } from 'csv-parse';
import * as fs from 'fs';
import { MarketEvent } from '../types';

/**
 * Parse stock prices CSV and convert to MarketEvent stream
 */
export async function* parseStocksCSV(filePath: string): AsyncGenerator<MarketEvent> {
  const parser = fs
    .createReadStream(filePath)
    .pipe(
      parse({
        columns: true,
        skip_empty_lines: true,
        trim: true,
      })
    );

  for await (const record of parser) {
    try {
      // Skip header-like rows
      if (record.Date === 'Date' || record.Date === 'Ticker' || record.Date === 'Price') {
        continue;
      }

      const parsedDate = new Date(record.Date);
      if (isNaN(parsedDate.getTime())) {
        continue;
      }

      // Get all columns except Date, Ticker, Price
      const columns = Object.keys(record);
      
      // Find price-related columns dynamically
      for (const col of columns) {
        if (col === 'Date' || col === 'Ticker' || col === 'Price') continue;
        
        const value = parseFloat(record[col]);
        if (isNaN(value)) continue;

        // Extract ticker from column name if available
        const ticker = record.Ticker || 'UNKNOWN';

        const event: MarketEvent = {
          type: 'price',
          symbol: ticker,
          timestamp: parsedDate.toISOString(),
          price: value,
          source: 'Kaggle',
          meta: {
            originalDate: record.Date,
            column: col,
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
