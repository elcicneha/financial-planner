import re
import os
from collections import Counter
from datetime import datetime
from app.features.investment_aggregator.extractor.pdfToTxt import pdf_to_txt


# Month name mappings for parsing
MONTH_NAMES = {
    'january': 1, 'jan': 1,
    'february': 2, 'feb': 2,
    'march': 3, 'mar': 3,
    'april': 4, 'apr': 4,
    'may': 5,
    'june': 6, 'jun': 6,
    'july': 7, 'jul': 7,
    'august': 8, 'aug': 8,
    'september': 9, 'sep': 9, 'sept': 9,
    'october': 10, 'oct': 10,
    'november': 11, 'nov': 11,
    'december': 12, 'dec': 12,
}


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


def extract_pay_period_from_text(text: str) -> dict | None:
    """
    Extracts the pay period (month and year) from payslip text.

    Handles various formats:
    - "Pay Period: January 2024"
    - "Month: Jan-24" or "Month: Jan 24"
    - "For the month of January 2024"
    - "Salary Slip for January 2024"
    - "Pay Date: 31-Jan-2024" (extracts month/year)
    - "01/2024" or "01-2024" (MM/YYYY format)
    - "January'24" or "Jan'24"

    Returns:
        Dictionary with 'month' (1-12), 'year' (YYYY), and 'period_key' (YYYY-MM string),
        or None if not found.
    """
    lines = text.strip().split('\n')
    text_lower = text.lower()

    # Patterns to try (in order of specificity)
    patterns = [
        # "January 2024" or "Jan 2024" or "Jan-2024" or "Jan'24"
        r'\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)[,\s\-\']+(\d{4}|\d{2})\b',
        # "01/2024" or "01-2024" (month/year only)
        r'\b(0?[1-9]|1[0-2])[\-/](\d{4})\b',
        # Date formats like "31-Jan-2024" or "31/01/2024" - extract month/year
        r'\b\d{1,2}[\-/](january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)[\-/](\d{4}|\d{2})\b',
        r'\b\d{1,2}[\-/](0?[1-9]|1[0-2])[\-/](\d{4})\b',
    ]

    for pattern in patterns:
        matches = re.findall(pattern, text_lower)
        if matches:
            for match in matches:
                month_val, year_val = None, None

                if len(match) == 2:
                    first, second = match

                    # Check if first is month name or number
                    if first in MONTH_NAMES:
                        month_val = MONTH_NAMES[first]
                        year_str = second
                    elif first.isdigit():
                        month_val = int(first)
                        year_str = second
                    else:
                        continue

                    # Parse year (handle 2-digit years)
                    if year_str.isdigit():
                        year_val = int(year_str)
                        if year_val < 100:
                            year_val = 2000 + year_val if year_val < 50 else 1900 + year_val

                if month_val and year_val and 1 <= month_val <= 12 and 1990 <= year_val <= 2100:
                    return {
                        'month': month_val,
                        'year': year_val,
                        'period_key': f"{year_val}-{month_val:02d}"
                    }

    return None


def _has_company_suffix(text: str) -> bool:
    """Check if text contains common Indian company/business suffixes."""
    text_lower = text.lower()
    suffixes = [
        # Private Limited Company
        r'\b(?:private|pvt\.?)\s+(?:limited|ltd\.?)\b',
        # Public Limited Company
        r'\b(?:limited|ltd\.?)\b',
        # Limited Liability Partnership
        r'\bllp\b',
        r'\bl\.l\.p\.?\b',
        # One Person Company
        r'\bopc\b',
        # Nidhi Company
        r'\bnidhi\s+(?:limited|ltd\.?)\b',
        # Producer Company
        r'\bproducer\s+(?:company|co\.?)\b',
        # Corporation (PSUs, govt companies)
        r'\bcorporation\b',
        # Partnership patterns
        r'\b&\s*(?:co\.?|company)\b',
        r'\b&\s*partners\b',
        r'\b&\s*associates\b',
        r'\b&\s*sons?\b',
        r'\b(?:bros\.?|brothers)\b',
        # Cooperative
        r'\b(?:co-?operative|coop)\b',
        # Society / Trust / Foundation (non-company but can be employers)
        r'\bsociety\b',
        r'\btrust\b',
        r'\bfoundation\b',
        # HUF
        r'\bhuf\b',
        r'\bhindu\s+undivided\s+family\b',
        # Common MNC patterns in India
        r'\b\(india\)\b',
        r'\bindia\s+(?:private|pvt\.?)\b',
    ]
    return any(re.search(pattern, text_lower) for pattern in suffixes)


def extract_company_name_from_text(text: str) -> str | None:
    """
    Extracts the company name from payslip text.

    Logic:
    1. Check first non-empty line - if it has a company suffix (Ltd, Pvt, Inc, etc.),
       return it with high confidence
    2. If first line doesn't have suffix, scan more lines to find one that does
    3. If no line has a suffix, fall back to first non-empty line (low confidence)

    Returns:
        Company name string, or None if not found.
    """
    lines = text.strip().split('\n')

    # Get first non-empty line
    first_line = None
    for line in lines:
        line_stripped = line.strip()
        if line_stripped:
            first_line = line_stripped
            break

    if not first_line:
        return None

    # High confidence: first line has company suffix
    if _has_company_suffix(first_line):
        return first_line

    # Low confidence on first line - search for a line with company suffix
    for line in lines[:20]:
        line_stripped = line.strip()
        if line_stripped and _has_company_suffix(line_stripped):
            return line_stripped

    # Fallback: return first line anyway (low confidence)
    return first_line


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


def extract_tds_from_text(text: str) -> float | None:
    """
    Extracts the TDS (Tax Deducted at Source) value from payslip text content.

    Logic:
    1. Find all instances of "TDS", "Tax Deducted at Source", or "Income Tax"
    2. For each instance, extract the number from same line or next line
    3. If all numbers match, return that value
    4. If numbers differ, return the most common value

    Args:
        text: The text content of the payslip.

    Returns:
        The TDS amount as a float, or None if not found.
    """
    lines = text.strip().split('\n')
    found_values = []

    # Patterns to look for
    tds_patterns = [
        'tax deducted at source',
        'tds',
        'income tax',
        'tax deduction',
        'it deducted',  # Some payslips use "IT" for Income Tax
    ]

    for i, line in enumerate(lines):
        line_lower = line.lower()

        # Check if line contains any TDS-related pattern
        if any(pattern in line_lower for pattern in tds_patterns):
            # Skip if it's just a header or label without value
            if 'description' in line_lower or 'component' in line_lower:
                continue

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
        Dictionary with extracted data:
        - 'gross_pay': float or None
        - 'breakdown': dict with 'monthly'/'annual' keys or None
        - 'pay_period': dict with 'month', 'year', 'period_key' or None
        - 'company_name': string or None
        - 'tds': float or None (Tax Deducted at Source)

        Returns None if extraction completely fails.
    """
    txt_path = pdf_to_txt(pdf_path)
    if not txt_path:
        return None

    try:
        with open(txt_path, 'r', encoding='utf-8') as f:
            text = f.read()

        return {
            'gross_pay': extract_gross_pay_from_text(text),
            'breakdown': extract_salary_breakdown_from_text(text),
            'pay_period': extract_pay_period_from_text(text),
            'company_name': extract_company_name_from_text(text),
            'tds': extract_tds_from_text(text),
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
