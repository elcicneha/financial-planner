"""Calculator registry pattern for playground calculators.

This allows dynamic discovery of calculators without modifying routes.
Perfect for bot integration and adding many calculators without code changes.
"""

from typing import Dict, List, Any, Type

# Global registry
CALCULATORS: Dict[str, Dict[str, Any]] = {}


def register_calculator(name: str, description: str):
    """
    Decorator to register calculators for discovery.

    Usage:
        @register_calculator("break", "Calculate optimal break duration")
        class BreakCalculator:
            def calculate(self, **params) -> dict:
                # Logic here
                return {"result": ...}

    Args:
        name: Unique calculator identifier
        description: Human-readable description for UI/bot
    """
    def decorator(cls: Type):
        CALCULATORS[name] = {
            "class": cls,
            "description": description,
            "name": name
        }
        return cls
    return decorator


def get_calculator(name: str):
    """
    Get calculator instance by name.

    Args:
        name: Calculator identifier

    Returns:
        Calculator instance

    Raises:
        ValueError: If calculator not found
    """
    if name not in CALCULATORS:
        raise ValueError(f"Calculator '{name}' not found")
    return CALCULATORS[name]["class"]()


def list_calculators() -> List[Dict[str, str]]:
    """
    List all registered calculators.

    Returns:
        List of dicts with calculator metadata (for bot/UI discovery)
    """
    return [
        {"name": k, "description": v["description"]}
        for k, v in CALCULATORS.items()
    ]


def get_calculator_count() -> int:
    """Get total number of registered calculators."""
    return len(CALCULATORS)
