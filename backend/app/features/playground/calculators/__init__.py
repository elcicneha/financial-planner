"""Playground calculators.

Import all calculators here to ensure they get registered via the @register_calculator decorator.
"""

# Import all calculators to trigger registration
from .break_calculator import BreakCalculator

__all__ = ["BreakCalculator"]
