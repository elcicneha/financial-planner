"""
Base parser class for CAS (Capital Account Statement) formats.

Defines the interface for format-specific parsers (CAMS, KFINTECH).
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Tuple, Any
import pandas as pd


class BaseCAParser(ABC):
    """Abstract base class for CAS parsers."""

    def __init__(self, excel_file: pd.ExcelFile):
        """
        Initialize parser with an opened Excel file.

        Args:
            excel_file: Opened pandas ExcelFile object.
        """
        self.excel_file = excel_file

    @abstractmethod
    def get_summary_sheet_names(self) -> Tuple[str, str]:
        """
        Get the names of equity and debt summary sheets.

        Returns:
            Tuple of (equity_sheet_name, debt_sheet_name)
        """
        pass

    @abstractmethod
    def get_transaction_sheet_name(self) -> str:
        """
        Get the name of the transaction details sheet.

        Returns:
            Name of the transaction sheet.
        """
        pass

    @abstractmethod
    def parse_transactions(self) -> List[Dict[str, Any]]:
        """
        Parse individual transactions from the transaction details sheet.

        Returns:
            List of transaction dictionaries with keys:
            - fund_name, folio, buy_date, sell_date, units, buy_nav,
            - sale_consideration, acquisition_cost, gain_loss, asset_type, term
        """
        pass

    @abstractmethod
    def determine_asset_types(self, transactions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Determine asset type (EQUITY/DEBT) for transactions.

        Args:
            transactions: List of transactions with potentially UNKNOWN asset_type

        Returns:
            Updated transactions list with asset_type filled in
        """
        pass

    def parse_summary_sheet(self, df: pd.DataFrame) -> Tuple[float, float, float, float, float, float]:
        """
        Parse summary sheet (common for both CAMS and KFINTECH).

        Args:
            df: DataFrame from summary sheet (read with header=None).

        Returns:
            Tuple of (st_sale, st_cost, st_gain, lt_sale, lt_cost, lt_gain)
        """
        st_sale = 0.0
        st_cost = 0.0
        st_gain = 0.0
        lt_sale = 0.0
        lt_cost = 0.0
        lt_gain = 0.0

        # Look for specific row labels in first column
        for idx, row in df.iterrows():
            label = str(row.iloc[0]).strip() if pd.notna(row.iloc[0]) else ""

            # Get "Total" column value (usually last column with data)
            total_value = 0.0
            for col_idx in range(len(row) - 1, 0, -1):
                if pd.notna(row.iloc[col_idx]) and isinstance(row.iloc[col_idx], (int, float)):
                    total_value = float(row.iloc[col_idx])
                    break

            if "Full Value Consideration" in label:
                if st_sale == 0.0:  # First occurrence = Short-term
                    st_sale = total_value
                else:  # Second occurrence = Long-term
                    lt_sale = total_value

            elif "Cost of Acquisition" in label:
                if st_cost == 0.0:  # First occurrence = Short-term
                    st_cost = total_value
                else:  # Second occurrence = Long-term
                    lt_cost = total_value

            elif "Short Term Capital Gain/Loss" in label or "Short Term Capital Gain" in label:
                st_gain = total_value

            elif "LongTermWithOutIndex" in label and "CapitalGain" in label:
                lt_gain = total_value

        return st_sale, st_cost, st_gain, lt_sale, lt_cost, lt_gain

    def parse_all_summaries(self) -> Dict[str, Any]:
        """
        Parse both equity and debt summary sheets.

        Returns:
            Dictionary with 4 category keys (equity/debt × short/long term).
        """
        equity_sheet, debt_sheet = self.get_summary_sheet_names()

        summary = {
            'equity_short_term': {'sale_consideration': 0.0, 'acquisition_cost': 0.0, 'gain_loss': 0.0},
            'equity_long_term': {'sale_consideration': 0.0, 'acquisition_cost': 0.0, 'gain_loss': 0.0},
            'debt_short_term': {'sale_consideration': 0.0, 'acquisition_cost': 0.0, 'gain_loss': 0.0},
            'debt_long_term': {'sale_consideration': 0.0, 'acquisition_cost': 0.0, 'gain_loss': 0.0},
        }

        if equity_sheet in self.excel_file.sheet_names:
            equity_df = pd.read_excel(self.excel_file, sheet_name=equity_sheet, header=None)
            eq_st_sale, eq_st_cost, eq_st_gain, eq_lt_sale, eq_lt_cost, eq_lt_gain = \
                self.parse_summary_sheet(equity_df)
            summary['equity_short_term'] = {
                'sale_consideration': eq_st_sale,
                'acquisition_cost': eq_st_cost,
                'gain_loss': eq_st_gain
            }
            summary['equity_long_term'] = {
                'sale_consideration': eq_lt_sale,
                'acquisition_cost': eq_lt_cost,
                'gain_loss': eq_lt_gain
            }

        if debt_sheet in self.excel_file.sheet_names:
            debt_df = pd.read_excel(self.excel_file, sheet_name=debt_sheet, header=None)
            debt_st_sale, debt_st_cost, debt_st_gain, debt_lt_sale, debt_lt_cost, debt_lt_gain = \
                self.parse_summary_sheet(debt_df)
            summary['debt_short_term'] = {
                'sale_consideration': debt_st_sale,
                'acquisition_cost': debt_st_cost,
                'gain_loss': debt_st_gain
            }
            summary['debt_long_term'] = {
                'sale_consideration': debt_lt_sale,
                'acquisition_cost': debt_lt_cost,
                'gain_loss': debt_lt_gain
            }

        return summary
