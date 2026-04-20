import re
from typing import str


def sanitize_logs(logs: str) -> str:
    """
    Remove sensitive data from logs before sending to AI
    
    Args:
        logs: Raw log content
    
    Returns:
        Sanitized log content
    """
    if not logs:
        return logs
    
    # Remove API keys
    logs = re.sub(
        r'(api[_-]?key|apikey)[\s:=]+[\w\-]+',
        r'\1=REDACTED',
        logs,
        flags=re.IGNORECASE
    )
    
    # Remove passwords
    logs = re.sub(
        r'(password|passwd|pwd)[\s:=]+[\w\-]+',
        r'\1=REDACTED',
        logs,
        flags=re.IGNORECASE
    )
    
    # Remove tokens
    logs = re.sub(
        r'(token|auth|bearer)[\s:=]+[\w\.\-]+',
        r'\1=REDACTED',
        logs,
        flags=re.IGNORECASE
    )
    
    # Remove email addresses
    logs = re.sub(
        r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
        'EMAIL_REDACTED',
        logs
    )
    
    # Remove IP addresses (optional - might be needed for debugging)
    # logs = re.sub(r'\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b', 'IP_REDACTED', logs)
    
    # Remove potential private keys
    logs = re.sub(
        r'-----BEGIN (RSA |)PRIVATE KEY-----[\s\S]+?-----END (RSA |)PRIVATE KEY-----',
        '-----BEGIN PRIVATE KEY-----\nREDACTED\n-----END PRIVATE KEY-----',
        logs
    )
    
    return logs