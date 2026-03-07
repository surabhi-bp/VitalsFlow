"""
train_triage_with_age.py
Run this ONCE in your backend folder to retrain with age.

Steps:
1. Put synthetic_medical_triage.csv in your backend folder
2. Run: python train_triage_with_age.py
3. It saves: xgboost_age_triage.joblib
4. Push that file to GitHub
"""

import pandas as pd
import xgboost as xgb
import joblib
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report

# 1. Load dataset
df = pd.read_csv("synthetic_medical_triage.csv")
print(f"Loaded {df.shape[0]} rows")

# 2. Features — matches what receptionist form will send
# age, HR, SBP, Saturation, BT (no DBP/RR in this dataset)
features = [
    'age',
    'heart_rate',
    'systolic_blood_pressure',
    'oxygen_saturation',
    'body_temperature',
]
target = 'triage_level'

# 3. Clean
data = df[features + [target]].copy().dropna()
for f in features:
    data[f] = pd.to_numeric(data[f], errors='coerce')
data = data.dropna()
print(f"Clean rows: {data.shape[0]}")
print(f"Triage distribution:\n{data[target].value_counts().sort_index()}")

X = data[features]
y = data[target]  # already 0-indexed (0,1,2,3)

# 4. Split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# 5. Train
print("\nTraining with age included...")
model = xgb.XGBClassifier(
    objective="multi:softmax",
    num_class=4,
    eval_metric="mlogloss",
    n_estimators=200,
    max_depth=6,
    learning_rate=0.1,
    random_state=42
)
model.fit(X_train, y_train)

# 6. Evaluate
preds = model.predict(X_test)
acc = accuracy_score(y_test, preds)
print(f"\nAccuracy: {acc * 100:.2f}%")
print(classification_report(y_test, preds,
      target_names=['Non-Urgent','Less Urgent','Urgent','Emergent']))

# Feature importance
print("Feature importance:")
for feat, imp in zip(features, model.feature_importances_):
    print(f"  {feat}: {imp:.3f}")

# 7. Save
joblib.dump(model, "xgboost_age_triage.joblib")
print("\nSaved: xgboost_age_triage.joblib")