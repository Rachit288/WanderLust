import os
import pymongo
import time
from dotenv import load_dotenv
from llama_index.embeddings.huggingface import HuggingFaceEmbedding

# 1. Setup
load_dotenv()
MONGO_URI = os.getenv("ATLASDB_URL")
DB_NAME = "test" 
COLLECTION_NAME = "listings"
BATCH_SIZE = 50  # Process 50 items at a time to keep connections short

def generate_embeddings():
    # 2. Connect to DB
    client = pymongo.MongoClient(MONGO_URI)
    collection = client[DB_NAME][COLLECTION_NAME]
    
    # 3. Load Model
    print("Loading AI Model (BGE-Small)...")
    embed_model = HuggingFaceEmbedding(model_name="BAAI/bge-small-en-v1.5")
    
    while True:
        # 4. Fetch a small batch of missing embeddings
        # We look for documents where 'embedding' does NOT exist yet
        cursor = collection.find({"embedding": {"$exists": False}}).limit(BATCH_SIZE)
        
        # Convert cursor to list immediately to close the DB connection fast
        batch = list(cursor)
        
        if not batch:
            print("✅ All listings have embeddings! Script finished.")
            break
        
        remaining = collection.count_documents({"embedding": {"$exists": False}})
        print(f"Processing batch of {len(batch)}. Remaining: {remaining}")
        
        # 5. Process the Batch
        updates = []
        for doc in batch:
            try:
                text_chunk = doc.get('text_for_ai', '')
                if text_chunk:
                    # Generate Vector
                    vector = embed_model.get_text_embedding(text_chunk)
                    
                    # Prepare the update command
                    updates.append(pymongo.UpdateOne(
                        {"_id": doc["_id"]},
                        {"$set": {"embedding": vector}}
                    ))
            except Exception as e:
                print(f"Skipping doc {doc.get('_id')}: {e}")

        # 6. Bulk Write (Much faster than updating one by one)
        if updates:
            collection.bulk_write(updates)
            
    client.close()

if __name__ == "__main__":
    generate_embeddings()