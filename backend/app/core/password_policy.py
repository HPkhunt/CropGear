import re

PASSWORD_POLICY_MESSAGE = (
    "Password must be at least 8 characters and include an uppercase letter, "
    "lowercase letter, number, and special character."
)
PASSWORD_MAX_LENGTH = 72

_UPPERCASE_PATTERN = re.compile(r"[A-Z]")
_LOWERCASE_PATTERN = re.compile(r"[a-z]")
_NUMBER_PATTERN = re.compile(r"\d")
_SPECIAL_PATTERN = re.compile(r"[^A-Za-z0-9]")


def validate_password_strength(password: str) -> str:
    value = str(password or "")

    if len(value) > PASSWORD_MAX_LENGTH:
        raise ValueError(f"Password must be {PASSWORD_MAX_LENGTH} characters or fewer.")

    if (
        len(value) < 8
        or not _UPPERCASE_PATTERN.search(value)
        or not _LOWERCASE_PATTERN.search(value)
        or not _NUMBER_PATTERN.search(value)
        or not _SPECIAL_PATTERN.search(value)
    ):
        raise ValueError(PASSWORD_POLICY_MESSAGE)

    return value
