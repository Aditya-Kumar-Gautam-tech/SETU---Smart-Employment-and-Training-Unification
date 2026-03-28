from fastapi import FastAPI, File, UploadFile, HTTPException
from app.parser import parse_resume  # Import your new parser function
import uvicorn
import os

# Fix for a potential warning with PyMuPDF in a server environment
os.environ["PYMUPDF_DEF_USE_SYSTEM_FONT"] = "1" 

# Initialize the FastAPI app
app = FastAPI(
    title="Resume Parser API",
    description="Upload a PDF resume to parse data and get suggested roles.",
)

@app.get("/")
def read_root():
    """A simple root endpoint to check if the server is running."""
    return {"message": "Welcome to the Resume Parser API. POST to /parse-resume/ with a PDF."}

@app.post("/parse-resume/")
async def create_parse_resume(file: UploadFile = File(...)):
    """
    The main endpoint to parse a resume.
    Accepts a PDF file upload and returns structured JSON.
    """
    
    # 1. Check if the file is a PDF
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a PDF.")
        
    # 2. Read the file's contents into memory
    pdf_contents = await file.read()
    
    try:
        # 3. Pass the raw bytes to your parser function
        parsed_data = parse_resume(pdf_contents)
        return parsed_data
    
    except Exception as e:
        # 4. Handle any errors during parsing
        print(f"Error during parsing: {e}") # Log the error to your console
        raise HTTPException(status_code=500, detail=f"An error occurred during parsing: {str(e)}")

if __name__ == "__main__":
    # This allows you to run the app directly for testing
    # uvicorn.run(app, host="0.0.0.0", port=8000)
    # Use this line for development (auto-reloads on code change)
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)