#!/usr/bin/env bash

###############################################################################
# analyze_date_range.sh
# 
# Analyzes the date range of news and stock datasets and finds their overlap.
# This script helps determine which historical data is available for training
# and backtesting the Market Pulse Analyst system.
###############################################################################

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default paths
STOCKS_FILE="${STOCKS_FILE:-data/kaggle/stocks/SnP_daily_update.csv}"
NEWS_FILE="${NEWS_FILE:-data/kaggle/news/news_sentiment_scores.csv}"

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Market Pulse Analyst - Dataset Date Range Analysis${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Check if files exist
if [[ ! -f "$STOCKS_FILE" ]]; then
    echo -e "${RED}Error: Stock data file not found: $STOCKS_FILE${NC}"
    echo "Please download the S&P 500 dataset from Kaggle"
    exit 1
fi

if [[ ! -f "$NEWS_FILE" ]]; then
    echo -e "${RED}Error: News data file not found: $NEWS_FILE${NC}"
    echo "Please download the Bloomberg News dataset from Kaggle"
    exit 1
fi

# Python script to analyze dates
python3 << 'EOF'
import csv
import sys
from datetime import datetime, timedelta
from collections import Counter

def parse_date(date_str):
    """Parse date string handling various formats."""
    try:
        # Try full datetime format first
        return datetime.strptime(date_str.split()[0], '%Y-%m-%d')
    except:
        try:
            # Try just date
            return datetime.strptime(date_str, '%Y-%m-%d')
        except:
            return None

def analyze_dataset(filepath, date_column, is_csv=True):
    """Extract and analyze dates from a dataset."""
    dates = []
    
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        if is_csv:
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    date_str = row.get(date_column, '').strip()
                    if date_str:
                        date_obj = parse_date(date_str)
                        if date_obj:
                            dates.append(date_obj.strftime('%Y-%m-%d'))
                except:
                    pass
        else:
            # For non-standard CSV, read first column
            reader = csv.reader(f)
            next(reader)  # skip header
            for row in reader:
                if row and row[0] not in ['Ticker', 'Date', 'Price']:
                    try:
                        date_obj = parse_date(row[0])
                        if date_obj:
                            dates.append(date_obj.strftime('%Y-%m-%d'))
                    except:
                        pass
    
    return sorted(set(dates))

# Analyze news dataset
print("📰 Analyzing news dataset...")
news_dates = analyze_dataset('data/kaggle/news/news_sentiment_scores.csv', 'Date')

if not news_dates:
    print("Error: No valid dates found in news dataset", file=sys.stderr)
    sys.exit(1)

print(f"   • First article: {news_dates[0]}")
print(f"   • Last article:  {news_dates[-1]}")
print(f"   • Unique dates:  {len(news_dates):,}")

# Calculate date span
news_start = datetime.strptime(news_dates[0], '%Y-%m-%d')
news_end = datetime.strptime(news_dates[-1], '%Y-%m-%d')
news_days = (news_end - news_start).days
print(f"   • Total span:    {news_days:,} days ({news_days/365.25:.1f} years)")

# Analyze stock dataset  
print("\n📈 Analyzing stock dataset...")
stock_dates = analyze_dataset('data/kaggle/stocks/SnP_daily_update.csv', None, is_csv=False)

if not stock_dates:
    print("Error: No valid dates found in stock dataset", file=sys.stderr)
    sys.exit(1)

print(f"   • First date:    {stock_dates[0]}")
print(f"   • Last date:     {stock_dates[-1]}")
print(f"   • Unique dates:  {len(stock_dates):,}")

stock_start = datetime.strptime(stock_dates[0], '%Y-%m-%d')
stock_end = datetime.strptime(stock_dates[-1], '%Y-%m-%d')
stock_days = (stock_end - stock_start).days
print(f"   • Total span:    {stock_days:,} days ({stock_days/365.25:.1f} years)")

# Find overlap
overlap_start = max(news_dates[0], stock_dates[0])
overlap_end = min(news_dates[-1], stock_dates[-1])

print(f"\n{'─' * 59}")
print("🎯 OVERLAPPING DATE RANGE (Both datasets available)")
print(f"{'─' * 59}")
print(f"   📅 From: {overlap_start}")
print(f"   📅 To:   {overlap_end}")

overlap_start_dt = datetime.strptime(overlap_start, '%Y-%m-%d')
overlap_end_dt = datetime.strptime(overlap_end, '%Y-%m-%d')
overlap_days = (overlap_end_dt - overlap_start_dt).days
overlap_years = overlap_days / 365.25

print(f"   ⏱️  Duration: {overlap_days:,} days ({overlap_years:.1f} years)")

# Count overlapping dates
overlap_dates = set(news_dates) & set(stock_dates)
print(f"   📊 Common dates: {len(overlap_dates):,}")

# Calculate coverage percentage
news_in_overlap = len([d for d in news_dates if overlap_start <= d <= overlap_end])
stock_in_overlap = len([d for d in stock_dates if overlap_start <= d <= overlap_end])

print(f"\n📊 Data availability in overlap period:")
print(f"   • News coverage:  {news_in_overlap:,} days ({news_in_overlap/overlap_days*100:.1f}%)")
print(f"   • Stock coverage: {stock_in_overlap:,} days ({stock_in_overlap/overlap_days*100:.1f}%)")

# Recommendations
print(f"\n{'─' * 59}")
print("💡 RECOMMENDATIONS")
print(f"{'─' * 59}")

if overlap_years >= 3:
    print("   ✅ EXCELLENT: 3+ years of overlap for robust training")
elif overlap_years >= 1:
    print("   ⚠️  ACCEPTABLE: 1-3 years of overlap, consider more data")
else:
    print("   ❌ INSUFFICIENT: Less than 1 year of overlap")

if len(overlap_dates) / overlap_days > 0.7:
    print("   ✅ HIGH COVERAGE: Good date alignment between datasets")
elif len(overlap_dates) / overlap_days > 0.4:
    print("   ⚠️  MODERATE COVERAGE: Some gaps in aligned dates")
else:
    print("   ❌ LOW COVERAGE: Significant gaps between datasets")

print(f"\n{'═' * 59}")
print("Use this range for Phase 1 implementation:")
print(f"   export DATA_START_DATE='{overlap_start}'")
print(f"   export DATA_END_DATE='{overlap_end}'")
print(f"{'═' * 59}\n")

EOF

echo -e "${GREEN}Analysis complete!${NC}"
