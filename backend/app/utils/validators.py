def sanitize_input(text: str, max_length: int = 1000) -> str:
    if not isinstance(text, str):
        return ""
    text = text.strip()
    return text[:max_length]
