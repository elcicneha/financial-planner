import re
import os
from collections import Counter
from .pdfToTxt import pdf_to_txt


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


def normalize_component_name(name: str) -> str:
    """
    Normalizes a salary component name to a consistent key.
    E.g., "House Rent Allowance" -> "house_rent_allowance"
          "Basic" -> "basic"
    """
    # Remove extra whitespace and convert to lowercase
    name = ' '.join(name.lower().split())
    # Replace spaces with underscores
    name = name.replace(' ', '_')
    return name


def extract_component_name(line: str) -> str | None:
    """
    Extracts the component name from a line (text before the number).
    """
    # Find where the first number starts
    match = re.search(r'[\d,]', line)
    if match:
        name_part = line[:match.start()].strip()
        if name_part:
            return normalize_component_name(name_part)
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


def extract_salary_breakdown_from_text(text: str) -> dict | None:
    """
    Extracts salary breakdown from payslip text content.

    Logic:
    1. Default to monthly section, switch to annual when "year"/"annual" is found
    2. Extract "basic" and "*allowance*" components (also hra, lta, da abbreviations)
    3. Stop section when hitting "gross pay" or "total" (but not "total amount")
    4. For each component: check same line for number, then subsequent lines
       until hitting a line that starts with a letter

    Args:
        text: The text content of the payslip.

    Returns:
        Dictionary with 'monthly' and/or 'annual' keys containing component breakdowns,
        or None if nothing was extracted.
    """
    lines = text.strip().split('\n')

    result = {'monthly': None, 'annual': None}
    current_section = 'monthly'  # Default to monthly
    current_components = {}

    for i, line in enumerate(lines):
        line_lower = line.lower()
        line_stripped = line_lower.strip()

        # Check for stop conditions (but not column headers like "Total Amount")
        is_stop = (
            'gross pay' in line_lower or
            line_stripped == 'total' or
            (line_stripped.startswith('total ') and 'amount' not in line_stripped)
        )
        if is_stop and current_section:
            # Only save if we have components (don't overwrite with empty)
            if current_components:
                result[current_section] = current_components
            current_section = None
            current_components = {}
            continue

        # Check for section headers
        if 'month' in line_lower:
            if current_section and current_components:
                result[current_section] = current_components
            current_section = 'monthly'
            current_components = {}
            continue

        if 'year' in line_lower or 'annual' in line_lower:
            if current_section and current_components:
                result[current_section] = current_components
            current_section = 'annual'
            current_components = {}
            continue

        # Extract components if we're in a section
        # Match: basic, *allowance*, hra, lta, da (common abbreviations)
        is_component = (
            'basic' in line_lower or
            'allowance' in line_lower or
            line_stripped in ('hra', 'lta', 'da')
        )

        if current_section and is_component:
            # Try to find number in this line
            value = extract_number_from_line(line)
            if value is not None:
                component_name = extract_component_name(line)
            else:
                # Number not on same line, check subsequent lines
                component_name = normalize_component_name(line.strip())

                for j in range(i + 1, len(lines)):
                    next_line = lines[j].strip()

                    # Skip empty lines
                    if not next_line:
                        continue

                    # If line starts with a letter, stop - we've hit the next component
                    if next_line[0].isalpha():
                        break

                    # Line starts with digit/symbol - extract number
                    value = extract_number_from_line(next_line)
                    if value is not None:
                        break

            if component_name and value is not None:
                current_components[component_name] = value

    # Save any remaining section
    if current_section and current_components:
        result[current_section] = current_components

    if result['monthly'] is None and result['annual'] is None:
        return None

    return result


# =============================================================================
# Main Entry Point
# =============================================================================

def extract_payslip_data(pdf_path: str) -> dict | None:
    """
    Extracts all data from a payslip PDF.

    This is the main entry point. Converts PDF to text once and runs all extractors.

    Args:
        pdf_path: Path to the payslip PDF file.

    Returns:
        Dictionary with 'gross_pay' and 'breakdown' keys, or None if extraction fails.
    """
    txt_path = pdf_to_txt(pdf_path)
    if not txt_path:
        return None

    try:
        with open(txt_path, 'r', encoding='utf-8') as f:
            text = f.read()

        return {
            'gross_pay': extract_gross_pay_from_text(text),
            'breakdown': extract_salary_breakdown_from_text(text)
        }
    finally:
        if txt_path and os.path.exists(txt_path):
            os.remove(txt_path)


def extract_gross_pay(pdf_path: str) -> float | None:
    """
    Extracts only the Gross Pay value from a payslip PDF.

    For extracting multiple fields, use extract_payslip_data() instead.
    """
    result = extract_payslip_data(pdf_path)
    return result['gross_pay'] if result else None


if __name__ == "__main__":
    import sys
    import json

    if len(sys.argv) < 2:
        print("Usage: python -m app.services.pdf_extractor.payslip_extractor <pdf_path>")
        sys.exit(1)

    pdf_path = sys.argv[1]
    data = extract_payslip_data(pdf_path)

    if data:
        print(json.dumps(data, indent=2))
    else:
        print("Could not extract data from the PDF.")
