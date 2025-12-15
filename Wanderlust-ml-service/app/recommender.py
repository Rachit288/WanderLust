import numpy as np
from typing import List, Dict
from llama_index.core.vector_stores.types import VectorStoreQuery
from bson import ObjectId

class RecommendationEngine:
    def __init__(self, vector_store, embed_model):
        """
        Initialize with the connected Database (vector_store) 
        and the AI Brain (embed_model) for generating vectors.
        """
        self.vector_store = vector_store
        self.embed_model = embed_model

    def recommend_by_id(self, listing_id: str, top_k: int = 5) -> List[Dict]:
        """
        Scenario: User is looking at Listing A. Show them similar Listing B, C, D.
        Logic: Fetch Listing A's vector from DB -> Find neighbors.
        """
        # 1. Fetch the source listing directly from MongoDB
        try:
            # We access the underlying collection to get the raw document
            listing = self.vector_store._collection.find_one({"_id": ObjectId(listing_id)})
        except:
            return [] # Invalid ID format

        if not listing or "embedding" not in listing:
            return [] # Listing doesn't exist or isn't processed yet

        query_vector = listing["embedding"]
        
        # 2. Search
        return self._perform_search(query_vector, top_k, exclude_ids=listing_id)

    def recommend_by_text(self, description: str, top_k: int = 5) -> List[Dict]:
        """
        Scenario: User types "I want a treehouse in the rain".
        Logic: Convert text to Vector -> Find neighbors.
        """
        # 1. Generate Vector on the fly
        query_vector = self.embed_model.get_text_embedding(description)
        
        # 2. Search
        return self._perform_search(query_vector, top_k)
    
    def recommend_by_history(self, listing_ids: List[str], top_k: int = 5) -> List[Dict]:
        if not listing_ids:
            return []

        try:
            object_ids = [ObjectId(lid) for lid in listing_ids if ObjectId.is_valid(lid)]

            if not object_ids:
                return []
            docs = list(self.vector_store._collection.find(
                {"_id": {"$in": object_ids}}
            ))
        except Exception as e:
            print(f"Error fetching history: {e}")
            return []
        
        vectors = []
        found_ids = []
        for doc in docs:
            if "embedding" in doc and doc["embedding"]:
                vectors.append(doc["embedding"])
                found_ids.append(str(doc["_id"]))

        if not vectors:
            return []

        avg_vector = np.mean(vectors, axis=0).tolist()

        return self._perform_search(avg_vector, top_k, exclude_ids=found_ids)        

    def _perform_search(self, query_vector: List[float], top_k: int, exclude_ids: List[str] = []) -> List[Dict]:
        """
        Helper function that actually queries the Vector Store.
        """
        # Create LlamaIndex Query Object
        query_obj = VectorStoreQuery(
            query_embedding=query_vector, 
            similarity_top_k=top_k + len(exclude_ids)
        )
        
        # Execute Query (using our SafeMongoDB class logic)
        result = self.vector_store.query(query_obj)
        
        recommendations = []
        for i, node in enumerate(result.nodes):
            # Skip the listing itself if we are doing "Similar to X"
            if exclude_ids and str(node.id_) in (exclude_ids):
                continue
                
            recommendations.append({
                "id": node.id_,
                "title": node.text.split("\n")[0] if node.text else "Untitled",
                "image": node.metadata.get("url", ""), 
                "match_score": f"{result.similarities[i]:.2f}" # Format as 0.85
            })

            if len(recommendations) >= top_k:
                break
            
        return recommendations