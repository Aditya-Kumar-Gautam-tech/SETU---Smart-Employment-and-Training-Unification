from sentence_transformers import SentenceTransformer
import os
from pathlib import Path

# Define a standard, high-performance model
MODEL_NAME = "all-MiniLM-L6-v2"
MODEL_PATH = Path(__file__).resolve().parent / "model"

if __name__ == "__main__":
    if not MODEL_PATH.exists():
        print(f"Downloading model '{MODEL_NAME}' to '{MODEL_PATH}'...")
        model = SentenceTransformer(MODEL_NAME)
        model.save(str(MODEL_PATH))
        print("Model download complete.")
    else:
        print(f"Model directory '{MODEL_PATH}' already exists. Skipping download.")
