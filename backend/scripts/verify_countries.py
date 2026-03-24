#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Verify countries and terms"""

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

# Create term ID lookup
term_ids = {t['id']: t for t in terms}

# Check countries
print(f"Total countries: {len(countries)}")
countries_without_name_id = [c for c in countries if c.get('NAME_ID') is None]
print(f"Countries without NAME_ID: {len(countries_without_name_id)}")
if countries_without_name_id:
    for c in countries_without_name_id:
        print(f"  - {c['name']} (COUNTRY_ID: {c['COUNTRY_ID']})")

# Check country terms
country_terms = [t for t in terms if t.get('categoryId') == 2]
print(f"\nTotal country terms: {len(country_terms)}")

# Check if all countries have valid NAME_IDs
print("\nChecking NAME_ID references...")
missing_terms = []
for country in countries:
    name_id = country.get('NAME_ID')
    if name_id is not None:
        if name_id not in term_ids:
            missing_terms.append(f"{country['name']} (NAME_ID: {name_id} not found)")
        elif term_ids[name_id].get('categoryId') != 2:
            missing_terms.append(f"{country['name']} (NAME_ID: {name_id} is not a country term)")

if missing_terms:
    print("Issues found:")
    for issue in missing_terms:
        print(f"  - {issue}")
else:
    print("All countries have valid NAME_ID references!")

print(f"\nSample of new countries (last 5):")
for country in countries[-5:]:
    print(f"  - {country['name']} ({country['COUNTRY_CODE']}) - NAME_ID: {country.get('NAME_ID')}")
