from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, List

# Import our two engines
from app.recommender import RecommendationEngine
from app.chatbot import chat_engine, vector_store, embed_model
import traceback

app = FastAPI()

rec_engine = RecommendationEngine(vector_store, embed_model)

# --- DATA MODELS ---
class ChatRequest(BaseModel):
    message: str
    
class EmbeddingRequest(BaseModel):
    text: str

class RecommendationRequest(BaseModel):
    listing_id: Optional[str] = None
    description: Optional[str] = None
    
class UserHistoryRequest(BaseModel):
    history_ids: List[str]

# --- 3. ENDPOINTS ---

@app.get("/")
def home():
    return {"status": "active", "services": ["recommender", "chatbot"]}

# Endpoint 1: The ML Recommender (Math-based)
@app.post("/recommend")
def recommend_listings(payload: RecommendationRequest):
    try:
        results = []
        if payload.listing_id:
            results = rec_engine.recommend_by_id(payload.listing_id)
        elif payload.description:
            results = rec_engine.recommend_by_text(payload.description)
        else:
            raise HTTPException(status_code=400, detail="Provide listing_id or description")
        return {"recommendations": results}
    except Exception as e:
        # Graceful error handling
        print("❌ REC ERROR:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint 2: The AI Chatbot (LlamaIndex)
@app.post("/chat")
def chat_with_ai(payload: ChatRequest):
    try:
        # The engine handles context retrieval and LLM generation
        response = chat_engine.chat(payload.message)
        
        # Return simple string to Node.js
        return {"response": str(response)}
    except Exception as e:
        print("❌ CRITICAL ERROR IN CHATBOT:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/get-embedding")
def get_embedding(payload: EmbeddingRequest):
    try:
        vector = embed_model.get_text_embedding(payload.text)
        return {"embedding": vector} 
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/recommend-for-user")
def recommend_for_user(payload: UserHistoryRequest):
    try:
        results = rec_engine.recommend_by_history(payload.history_ids)
        return {"recommendations": results}          
    except Exception as e:
        print("❌ USER REC ERROR:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e)) 