import pandas as pd

file_path = 'noodles_ratings.csv'
noodles_data = pd.read_csv(file_path, encoding='ISO-8859-1')

noodles_data['Brand'] = noodles_data['Brand'].str.lower()

noodles_data_unique = noodles_data.drop_duplicates(subset=['Brand', 'Variety'])

import ace_tools as tools; tools.display_dataframe_to_user(name="Cleaned Noodles Ratings Data", dataframe=noodles_data_unique)
