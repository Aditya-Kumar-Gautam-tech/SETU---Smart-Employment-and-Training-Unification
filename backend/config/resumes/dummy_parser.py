from .parser_interface import ResumeParserInterface

class DummyResumeParser(ResumeParserInterface):
    """
    Temporary rule-based parser.
    Will be replaced by ML parser later.
    """

    def parse(self, file_path: str) -> dict:
        return {
            "skills": ["python", "django", "sql"]
        }
