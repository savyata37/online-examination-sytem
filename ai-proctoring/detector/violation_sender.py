import requests
from config.api_config import API_URL, JWT_TOKEN

def send_violation(student_id, exam_id, violation_type, details):
    data = {
        "studentId": student_id,
        "examId": exam_id,
        "violationType": violation_type,
        "details": details
    }
    headers = {"Authorization": f"Bearer {JWT_TOKEN}"}
    try:
        requests.post(API_URL, json=data, headers=headers)
        print(f"Logged violation: {violation_type}")
    except Exception as e:
        print("Failed to send violation:", e)
