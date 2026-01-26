import re
import os
from collections import Counter
from .pdfToTxt import pdf_to_txt


def extract_gross_pay(pdf_path: str) -> float | None:
    """
    Extracts the Gross Pay value from a payslip PDF.

    Args:
        pdf_path: Path to the payslip PDF file.

    Returns:
        The gross pay amount as a float, or None if not found.
    """
    txt_path = pdf_to_txt(pdf_path)
    if not txt_path:
        return None

    try:
        with open(txt_path, 'r', encoding='utf-8') as f:
            text = f.read()

        return extract_gross_pay_from_text(text)

    finally:
        if txt_path and os.path.exists(txt_path):
            os.remove(txt_path)


def extract_number_from_line(line: str) -> float | None:
    """
    Extracts the first number from a line.
    Handles formats: 94,200 or 94200 or 94,200.00
    """
    match = re.search(r'[\d,]+(?:\.\d+)?', line)
    if match:
        try:
            return float(match.group().replace(',', ''))
        except ValueError:
            return None
    return None


def extract_gross_pay_from_text(text: str) -> float | None:
    """
    Extracts the Gross Pay value from payslip text content.

    Logic:
    1. Find all instances of "Gross Pay"
    2. For each instance, extract the number from same line or next line
    3. If all numbers match, return that value
    4. If numbers differ, return the most common value

    Args:
        text: The text content of the payslip.

    Returns:
        The gross pay amount as a float, or None if not found.
    """
    lines = text.strip().split('\n')
    found_values = []

    for i, line in enumerate(lines):
        if 'gross pay' in line.lower():
            # Try to find number in this line
            number = extract_number_from_line(line)
            if number is not None:
                found_values.append(number)
                continue

            # Check subsequent lines
            for j in range(i + 1, len(lines)):
                next_line = lines[j].strip()

                # Skip empty lines
                if not next_line:
                    continue

                # If line starts with a letter (word), stop - number won't be here
                if next_line[0].isalpha():
                    break

                # Line starts with symbol or digit - extract number
                number = extract_number_from_line(next_line)
                if number is not None:
                    found_values.append(number)

                break

    if not found_values:
        return None

    # All values match - return with confidence
    if len(set(found_values)) == 1:
        return found_values[0]

    # Return most common value
    counter = Counter(found_values)
    most_common_value, _ = counter.most_common(1)[0]
    return most_common_value


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python -m app.services.pdf_extractor.payslip_extractor <pdf_path>")
        sys.exit(1)

    pdf_path = sys.argv[1]
    gross_pay = extract_gross_pay(pdf_path)

    if gross_pay is not None:
        print(f"Gross Pay: {gross_pay:,.2f}")
    else:
        print("Could not extract Gross Pay from the PDF.")
