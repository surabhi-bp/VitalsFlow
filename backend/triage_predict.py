import joblib
import numpy as np

# load trained model
model = joblib.load("xgboost_age_triage.joblib")

def predict_triage(age, hr, rr, temp, spo2, bp):

    features = np.array([[age, hr, rr, temp, spo2, bp]])

    prediction = model.predict(features)

    return int(prediction[0])