import requests
from bs4 import BeautifulSoup
import csv

file = "isin_ticker_links_db.csv"

# Read URLs from isin_ticker_db.csv
with open(file, 'r') as csvfile:
    reader = csv.DictReader(csvfile)
    urls = [row['Link'] for row in reader]

# Read the headers of the CSV file to identify the last 4 columns
with open(file, 'r') as csvfile:
    reader = csv.reader(csvfile)
    headers = next(reader)
    last_three_columns = headers[-4:]

# Prepare to update rows
rows = []
with open(file, 'r') as csvfile:
    reader = csv.DictReader(csvfile)
    for row in reader:
        rows.append(row)

# Process each URL and update the corresponding row
for i, url in enumerate(urls):
    if not url.strip():  # Skip rows with empty Link
        continue

    response = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'})

    if response.status_code == 200:
        soup = BeautifulSoup(response.text, 'html.parser')
        holding_list = soup.find(class_='holding-list')

        if holding_list:
            data = {}
            for block in holding_list.find_all(class_='mfScheme-fund-progress'):
                category = block.select_one('.funds-top-label')
                percentage = block.select_one('.pull-right')

                if category and percentage:
                    data[category.get_text(strip=True)] = percentage.get_text(strip=True)

            # Update the row if category matches the last 3 columns
            for category, percentage in data.items():
                if category in last_three_columns:
                    rows[i][category] = percentage
        else:
            print(f"No element with class 'holding-list' found for URL: {url}")
    else:
        print(f"Failed to retrieve the webpage. Status code: {response.status_code} for URL: {url}")

# Write the updated rows back to the CSV file
with open(file, 'w', newline='') as csvfile:
    writer = csv.DictWriter(csvfile, fieldnames=headers)
    writer.writeheader()
    writer.writerows(rows)