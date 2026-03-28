from sentence_transformers import SentenceTransformer
import os

# Define a standard, high-performance model
MODEL_NAME = 'all-MiniLM-L6-v2'
MODEL_PATH = './model'

if __name__ == "__main__":
    if not os.path.exists(MODEL_PATH):
        print(f"Downloading model '{MODEL_NAME}' to '{MODEL_PATH}'...")
        # Download the model
        model = SentenceTransformer(MODEL_NAME)
        # Save it to the 'model/' directory
        model.save(MODEL_PATH)
        print("Model download complete.")
    else:
        print(f"Model directory '{MODEL_PATH}' already exists. Skipping download.")