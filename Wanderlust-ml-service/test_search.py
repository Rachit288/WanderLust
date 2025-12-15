import os
import pymongo
from dotenv import load_dotenv

load_dotenv()

# 1. Connect
uri = os.getenv("ATLASDB_URL")
print(f"Connecting to: {uri.split('@')[1] if '@' in uri else 'LOCAL/INVALID'}") # Prints masked URL
client = pymongo.MongoClient(uri)
db = client["test"]
collection = db["listings"]

# 2. Define a Dummy Vector (Length 384 for BGE-Small)
# We just want to see if the server accepts the command
dummy_vector = [0.1] * 384 

# 3. Build Query
pipeline = [
    {
        "$vectorSearch": {
            "index": "vector_index", # Make sure this matches Atlas UI
            "path": "embedding",
            "queryVector": dummy_vector,
            "numCandidates": 10,
            "limit": 1
        }
    },
    {
        "$project": {"title": 1}
    }
]

# 4. Run
try:
    print("Attempting Vector Search...")
    results = list(collection.aggregate(pipeline))
    print("✅ SUCCESS! Search works.")
    print(results)
except Exception as e:
    print("\n❌ FAILED.")
    print(e)