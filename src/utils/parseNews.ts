import { parse } from 'csv-parse';
import * as fs from 'fs';
import * as path from 'path';
import { MarketEvent, NewsRow } from '../types';

/**
 * Parse news CSV file and convert to MarketEvent stream
 */
export async function* parseNewsCSV(filePath: string): AsyncGenerator<MarketEvent> {
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
    const row = record as NewsRow;
    
    try {
      // Parse sentiment score
      const sentimentScore = parseFloat(row['Sentiment Score']);
      
      const event: MarketEvent = {
        type: 'news',
        timestamp: new Date(row.Date).toISOString(),
        headline: row.Article,
        sentiment: isNaN(sentimentScore) ? undefined : sentimentScore,
        sentimentLabel: row['Sentiment Label'],
        source: 'Bloomberg',
        meta: {
          originalDate: row.Date,
        },
      };

      yield event;
    } catch (error) {
      console.error('Error parsing news row:', error, row);
      // Continue with next row
    }
  }
}

/**
 * Get all news CSV files from the news directory
 */
export function getNewsFiles(newsDir: string): string[] {
  try {
    const files = fs.readdirSync(newsDir);
    return files
      .filter(file => file.endsWith('.csv'))
      .map(file => path.join(newsDir, file))
      .sort(); // Sort to ensure consistent order
  } catch (error) {
    console.error('Error reading news directory:', error);
    return [];
  }
}

/**
 * Parse all news files and merge into a single sorted stream
 */
export async function* parseAllNews(newsDir: string): AsyncGenerator<MarketEvent> {
  const files = getNewsFiles(newsDir);
  
  if (files.length === 0) {
    console.warn('No news CSV files found in:', newsDir);
    return;
  }

  console.log(`📰 Found ${files.length} news file(s)`);

  // Collect all events from all files
  const allEvents: MarketEvent[] = [];

  for (const file of files) {
    console.log(`   Reading: ${path.basename(file)}`);
    for await (const event of parseNewsCSV(file)) {
      allEvents.push(event);
    }
  }

  // Sort by timestamp
  allEvents.sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  console.log(`   Total news articles: ${allEvents.length}`);

  // Yield sorted events
  for (const event of allEvents) {
    yield event;
  }
}
