import re
import pandas as pd
import os

def process_dates_data(input_file):
    """
    Processes a CSV file containing text data, splits it by dates and further by new lines into columns.

    Args:
        input_file (str): Path to the input CSV file.

    Returns:
        str: Path to the generated output CSV file.
    """

    # Function to split the text based on dates and return the result as a list of lists
    def split_text_by_date(text):
        # Regular expression pattern to match dates in the format dd-mmm-yyyy
        date_pattern = r"\d{2}-[A-Za-z]{3}-\d{4}"

        # Find all matches for dates
        dates = re.findall(date_pattern, text)

        # Split the text based on the found dates
        split_text = re.split(date_pattern, text)

        # Initialize the result list
        result = []

        # Loop through the split parts and pair them with corresponding dates
        for i in range(len(dates)):
            result.append([dates[i], split_text[i + 1].strip()])

        # If there's any remaining text after the last date, append it
        if len(split_text) > len(dates):
            result.append(['', split_text[-1].strip()])

        return result

    # Read the CSV into a dataframe
    df = pd.read_csv(input_file, header=None)

    # Initialize an empty list to hold all the processed rows
    all_split_data = []

    # Iterate through each row of the CSV
    for index, row in df.iterrows():
        text = row[0]  # Extract text from the first column
        split_data = split_text_by_date(text)

        # Add row number to each entry
        for entry in split_data:
            all_split_data.append([index + 1] + entry)  # Include the row number (index + 1 for 1-based indexing)

    # Convert the result into a DataFrame with row number included
    result_df = pd.DataFrame(all_split_data, columns=['Row Number', 'Date', 'Content'])

    # Function to split the "Content" column into multiple columns
    def split_content_column(content):
        # Split by new line and pad with empty strings to ensure 5 columns
        return (content.split('\n') + [""] * 5)[:5]

    # Apply the splitting function to the "Content" column
    content_split = result_df['Content'].apply(split_content_column)

    # Create a DataFrame from the split content
    content_columns = pd.DataFrame(content_split.tolist(), columns=['Amount', 'NAV', 'Units', 'Desc', 'Unit Balance'])

    # Concatenate the original result DataFrame with the new columns
    final_df = pd.concat([result_df[['Row Number', 'Date']], content_columns], axis=1)

    # Generate the output file path
    base_name = os.path.splitext(input_file)[0]
    output_file = f"{base_name}_processed.csv"

    # Write the result to a new CSV file
    final_df.to_csv(output_file, index=False)

    print(f"Data has been split and saved to {output_file}")

    return output_file

# # Example usage
if __name__ == "__main__":
    output_csv = process_dates_data('Dates-data.csv')
    print(f"Generated file: {output_csv}")
