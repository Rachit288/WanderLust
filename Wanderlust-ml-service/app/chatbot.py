import os
import pymongo
from dotenv import load_dotenv
from llama_index.core import VectorStoreIndex, StorageContext, Settings
from llama_index.core.schema import TextNode
from llama_index.vector_stores.mongodb import MongoDBAtlasVectorSearch
from llama_index.llms.gemini import Gemini
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from llama_index.core.vector_stores.types import VectorStoreQuery, VectorStoreQueryResult

load_dotenv()

# CONFIGURATION
MONGO_URI = os.getenv("MONGO_ATLAS_URL")
DB_NAME = "test" 
COLLECTION_NAME = "listings"
INDEX_NAME = "vector_index"

# --- CUSTOM CLASS TO FIX BUGS ---
class SafeMongoDBAtlasVectorSearch(MongoDBAtlasVectorSearch):
    """
    Fixes two critical issues:
    1. Manually builds the aggregation pipeline (Fixes TypeError)
    2. Converts ObjectId to String (Fixes Pydantic/LlamaIndex crash)
    """
    def _query(self, query: VectorStoreQuery, **kwargs) -> VectorStoreQueryResult:
        # 1. Construct the MongoDB Aggregation Pipeline
        # We must translate the LlamaIndex query into a MongoDB $vectorSearch
        params = {
            "index": self._vector_index_name,
            "path": self._embedding_key,
            "queryVector": query.query_embedding,
            "numCandidates": query.similarity_top_k * 10, # Scan 10x more candidates for accuracy
            "limit": query.similarity_top_k,
        }

        pipeline = [
            {"$vectorSearch": params},
            {
                "$project": {
                    "_id": 1,
                    self._text_key: 1,       # 'text_for_ai'
                    self._metadata_key: 1,   # 'image'
                    "score": {"$meta": "vectorSearchScore"}
                }
            }
        ]

        # 2. Run the Query in MongoDB
        cursor = self._collection.aggregate(pipeline)
        
        nodes = []
        ids = []
        similarities = []
        
        # 3. Process Results & Fix ObjectId
        for res in cursor:
            # Extract Data
            text = res.get(self._text_key, "")
            score = res.get("score", 0.0)
            
            # THE CRITICAL FIX: Convert ObjectId -> String
            id_str = str(res["_id"]) 
            
            # Get Image Metadata (Default to empty dict if missing)
            metadata = res.get(self._metadata_key, {}) 

            # Create the Node
            node = TextNode(
                id_=id_str,
                text=text,
                metadata=metadata,
            )
            # node.score = score
            
            nodes.append(node)
            ids.append(id_str)
            similarities.append(score)
        
        # 4. Return the correct Object type
        return VectorStoreQueryResult(nodes=nodes, similarities=similarities, ids=ids)

def init_chatbot():
    # Use the global variables so other files can see them
    global chat_engine, vector_store, embed_model

    # 1. Define Models
    print("Initializing Brain (Gemma 3)...")
    Settings.llm = Gemini(model="models/gemma-3-27b-it")
    
    print("Initializing Memory (Local)...")
    embed_model = HuggingFaceEmbedding(model_name="BAAI/bge-small-en-v1.5")
    Settings.embed_model = embed_model

    # 2. Connect to MongoDB Atlas
    print("Connecting to Vector Store...")
    mongo_client = pymongo.MongoClient(MONGO_URI, directConnection=False)
    
    # 3. Setup the Vector Store (Using our SAFE class)
    vector_store = SafeMongoDBAtlasVectorSearch(
        mongo_client,
        db_name=DB_NAME,
        collection_name=COLLECTION_NAME,
        vector_index_name=INDEX_NAME,
        
        # Configuration
        text_key="text_for_ai",       
        embedding_key="embedding",    
        metadata_key="image"          
    )
    
    # 4. Create Index
    index = VectorStoreIndex.from_vector_store(vector_store)
    
    print("✅ Chatbot is connected to MongoDB!")

    return index.as_chat_engine(
        chat_mode="context", 
        system_prompt="You are a helpful Airbnb Assistant. Use the context to recommend listings. Always mention the Price and Listing ID."
    )

# Initialize global instance
chat_engine = init_chatbot()