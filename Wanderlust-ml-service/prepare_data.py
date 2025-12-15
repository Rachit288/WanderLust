import pandas as pd
import os

# CONFIGURATION
INPUT_FILE = "./data/listings.csv"
OUTPUT_FILE = "./data/cleaned_listings.csv"

def clean_data():
    print(f"Loading data from {INPUT_FILE}...")
    
    # 1. UPDATED: Added 'latitude', 'longitude', 'accommodates'
    cols_to_keep = [
        'id', 'name', 'description', 'price', 'amenities', 
        'review_scores_rating', 'neighbourhood_cleansed', 'property_type',
        'latitude', 'longitude', 'accommodates' 
    ]
    
    try:
        df = pd.read_csv(INPUT_FILE, usecols=cols_to_keep)
    except FileNotFoundError:
        print(f"Error: Could not find {INPUT_FILE}.")
        return

    # 2. Clean Price
    if df['price'].dtype == 'object':
        df['price'] = df['price'].replace('[\$,]', '', regex=True).astype(float)
    
    # 3. Handle Missing Values
    df['description'] = df['description'].fillna("No description provided.")
    df['name'] = df['name'].fillna("Untitled Listing")
    df['amenities'] = df['amenities'].fillna("[]")
    df['review_scores_rating'] = df['review_scores_rating'].fillna(0)
    df['accommodates'] = df['accommodates'].fillna(2).astype(int) # Default to 2 guests

    # 4. Generate AI Text Blob (Updated with Guest Count)
    df['text_for_ai'] = (
        "Title: " + df['name'] + "\n" +
        "Type: " + df['property_type'] + "\n" +
        "Location: " + df['neighbourhood_cleansed'] + "\n" +
        "Price: $" + df['price'].astype(str) + "\n" +
        "Guests: " + df['accommodates'].astype(str) + "\n" + 
        "Amenities: " + df['amenities'] + "\n" +
        "Description: " + df['description']
    )

    print(f"Saving {len(df)} rows to {OUTPUT_FILE}...")
    df.to_csv(OUTPUT_FILE, index=False)
    print("Done!")

if __name__ == "__main__":
    os.makedirs("./data", exist_ok=True)
    clean_data()