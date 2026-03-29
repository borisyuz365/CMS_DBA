#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fix existing countries to use correct NAME_IDs"""

import json
import os

script_dir = os.path.dirname(os.path.abspath(__file__))
data_dir = os.path.join(script_dir, '..', 'data')

countries_file = os.path.join(data_dir, 'countries.json')
terms_file = os.path.join(data_dir, 'terms.json')

# Load data
with open(countries_file, 'r', encoding='utf-8') as f:
    countries = json.load(f)

with open(terms_file, 'r', encoding='utf-8') as f:
    terms = json.load(f)

# Create mapping: country name -> term ID
country_terms = {t['id']: t for t in terms if t.get('categoryId') == 2}
name_to_term_id = {}

for term_id, term in country_terms.items():
    for value in term.get('values', []):
        if value.get('isDefault'):
            name_to_term_id[value['value']] = term_id
            break

# Mapping of country names to their correct term IDs
country_fixes = {
    "Germany": 20,
    "Spain": 22,
    "England": 24,
    "Italy": 23,
    "France": 21,
}

# Find Israel and Europe terms
for term_id, term in country_terms.items():
    for value in term.get('values', []):
        if value.get('isDefault'):
            if value['value'] == "Israel":
                country_fixes["Israel"] = term_id
            elif value['value'] == "Europe":
                country_fixes["Europe"] = term_id

print("Fixing countries:")
for country in countries:
    country_name = country.get('name')
    if country_name in country_fixes:
        old_name_id = country.get('NAME_ID')
        new_name_id = country_fixes[country_name]
        if old_name_id != new_name_id:
            print(f"  {country_name}: {old_name_id} -> {new_name_id}")
            country['NAME_ID'] = new_name_id

# Write back
with open(countries_file, 'w', encoding='utf-8') as f:
    json.dump(countries, f, indent=2, ensure_ascii=False)

print("Done!")
