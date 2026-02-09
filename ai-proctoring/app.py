import cv2
import numpy as np
import sounddevice as sd
import threading
import time
from detector.violation_sender import send_violation

STUDENT_ID = 12
EXAM_ID = 5

# ---------- Face Detection ----------
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
cap = cv2.VideoCapture(0)

LOOK_AWAY_TIME = 3
look_away_start = None

# ---------- Noise Detection ----------
def detect_noise():
    def callback(indata, frames, time_info, status):
        volume = np.linalg.norm(indata) * 10
        if volume > 20:
            send_violation(STUDENT_ID, EXAM_ID, "Background Noise", "High audio level detected")
    with sd.InputStream(callback=callback):
        sd.sleep(100000)

noise_thread = threading.Thread(target=detect_noise, daemon=True)
noise_thread.start()

# ---------- Main Loop ----------
while True:
    ret, frame = cap.read()
    if not ret:
        break

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, 1.3, 5)

    frame_h, frame_w = frame.shape[:2]
    center_x = frame_w // 2

    if len(faces) > 1:
        send_violation(STUDENT_ID, EXAM_ID, "Multiple Faces", f"{len(faces)} faces detected")

    for (x, y, w, h) in faces:
        face_center_x = x + w // 2
        if abs(face_center_x - center_x) > 150:
            if look_away_start is None:
                look_away_start = time.time()
            elif time.time() - look_away_start > LOOK_AWAY_TIME:
                send_violation(STUDENT_ID, EXAM_ID, "Looking Away", "Face not centered")
                look_away_start = None
        else:
            look_away_start = None

    cv2.imshow("AI Proctoring", frame)
    if cv2.waitKey(1) & 0xFF == 27:
        break

cap.release()
cv2.destroyAllWindows()
