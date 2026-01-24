import re
import csv

def extract_text_to_csv(txt_file_path):
    """
    Extracts text between predefined delimiters from a text file and writes it to CSV files.

    Args:
        txt_file_path (str): Path to the text file.

    Returns:
        str, str: Paths to the two generated CSV files.
    """
    # Define the delimiters and their corresponding output file names
    delimiters_and_files = [
        ("KYC: OK  PAN: OK", "Nominee 1:", "extracted_fund_deets.csv"),
        ("Opening Unit Balance: ", "NAV on ", "extracted_dates_data.csv")
    ]

    csv_file_1 = None
    csv_file_2 = None

    try:
        # Read the content of the file
        with open(txt_file_path, 'r', encoding='utf-8') as file:
            file_content = file.read()

        # Process each pair of delimiters
        for idx, (start_delim, end_delim, output_csv) in enumerate(delimiters_and_files, start=1):
            # Use regular expressions to extract text between the delimiters
            pattern = re.compile(rf"{re.escape(start_delim)}(.*?){re.escape(end_delim)}", re.DOTALL)
            matches = pattern.findall(file_content)

            # Check if matches are found
            if not matches:
                print(f"  ⚠ No matches for segment {idx}")
                continue

            # Write the results to a CSV file
            with open(output_csv, 'w', newline='', encoding='utf-8') as csvfile:
                writer = csv.writer(csvfile)

                # Write a header row
                writer.writerow(['Segment'])

                # Write each extracted segment as a new row
                for match in matches:
                    writer.writerow([match.strip()])

            print(f"  ✓ {len(matches)} segments -> {output_csv}")

            # Assign the file paths to respective variables
            if idx == 1:
                csv_file_1 = output_csv
            elif idx == 2:
                csv_file_2 = output_csv

        # Ensure two CSVs were created
        if not csv_file_1 or not csv_file_2:
            print("  ⚠ Some segments missing")

        return csv_file_1, csv_file_2

    except Exception as e:
        print(f"  ✗ Error: {e}")
        return None, None

# # Example usage
if __name__ == "__main__":
    csv_file_1, csv_file_2 = extract_text_to_csv('CAMS-Mutual-Funds.txt')
    if csv_file_1 and csv_file_2:
        print("CSV files created:", csv_file_1, csv_file_2)
