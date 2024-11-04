import pandas as pd

# Load the CSV files
noodles_df = pd.read_csv("noodles_consumptions.csv")
happiness_df = pd.read_csv("world_happiness.csv")

# Standardize country names in happiness_df to match noodles_df
happiness_df["Country"] = happiness_df["Country"].replace(
    {"Taiwan Province of China": "Taiwan", "Czechia": "Czech Republic"}
)

# Perform the merge, including the "Continent" column
merged_df = pd.merge(
    happiness_df[["Country", "Happiness score"]],
    noodles_df[["Country/Region", "2022", "Continent"]],
    left_on="Country",
    right_on="Country/Region",
    how="inner",
)

# Select and rename the columns as specified
merged_df = merged_df[["Country", "2022", "Happiness score", "Continent"]].rename(
    columns={"Happiness score": "happiness_score", "2022": "2022_consumption"}
)

# Remove rows with missing values in "happiness_score" or "2022_consumption"
merged_df = merged_df.dropna(subset=["happiness_score", "2022_consumption"])

# Save the merged data to a new CSV file
merged_df.to_csv("merged_scatterplot_data.csv", index=False)

# Display the first few rows to verify
print(merged_df.head())
