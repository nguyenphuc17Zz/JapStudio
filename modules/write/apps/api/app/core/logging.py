import logging
import sys
import warnings


def setup_logging(level: str = "INFO") -> None:
    """Configure structured, key=value style logging for the application."""
    # Filter out Pydantic v2 UserWarning about "register" domain field shadowing BaseModel.register
    warnings.filterwarnings(
        "ignore",
        message=r'Field name "register" in .* shadows an attribute in parent "BaseModel"',
        category=UserWarning,
    )
    root = logging.getLogger()
    root.setLevel(level.upper())
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        logging.Formatter("%(asctime)s level=%(levelname)s logger=%(name)s message=%(message)s")
    )
    root.handlers = [handler]
