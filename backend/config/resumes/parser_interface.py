class ResumeParserInterface:
    """
    This class defines the contract that the ML team must follow.
    """

    def parse(self, file_path: str) -> dict:
        """
        Input: path to resume file
        Output: dict with extracted skills

        Example:
        {
            "skills": ["python", "django", "sql"]
        }
        """
        raise NotImplementedError
