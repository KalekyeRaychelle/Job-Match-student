from openai import OpenAI
from flask import Flask, request, jsonify
import PyPDF2
import os
from dotenv import load_dotenv
from flask_cors import CORS
import logging
import json
import re
import requests
import firebase_admin
from argon2.exceptions import VerifyMismatchError
from firebase_admin import credentials, firestore
from argon2 import PasswordHasher
from google.cloud import firestore

# Load environment variables ( OpenAI API key from .env file)
load_dotenv()

# Initialize OpenAI client (auto-detects key from env)
client = OpenAI()

# Initialize Flask application
application = Flask(__name__)

# Enable CORS for frontend running on localhost:3575
CORS(application, origins=["http://localhost:3575"])

# Debugging: print partial API key (first 8 characters only)
print("OpenAI Key (partial):", os.getenv("OPENAI_API_KEY")[:8])

# Configure Google Firestore with service account credentials
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "jobmatch-29e52-firebase-adminsdk-fbsvc-433c0cfd11.json"
db = firestore.Client()

# Initialize password hasher for secure password storage (Argon2)
ph = PasswordHasher()

# Set up logging (logs both to file and console)
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("app.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


# -------------------- HELPER FUNCTIONS --------------------

def is_valid_url(url):
    """Check if a given URL is valid and reachable within 5 seconds."""
    try:
        response = requests.head(url, timeout=5, allow_redirects=True)
        return response.status_code == 200
    except requests.RequestException:
        return False


def extract_text_from_pdf(pdf_file):
    """Extract raw text from an uploaded PDF file."""
    try:
        reader = PyPDF2.PdfReader(pdf_file)
        text = ''
        for page in reader.pages:
            text += page.extract_text()
        logger.info('PDF text extraction successful')
        return text
    except Exception as e:
        logger.error(f"Error extracting text from PDF: {e}")
        raise


def compare_with_gpt_for_non_immediate_interview(job_description, cv_text):
    """
    Send job description + CV to GPT for analysis.
    GPT returns a JSON object containing:
    - match percentage
    - similarities
    - missing skills
    - recommended courses with links
    """
    try:
        prompt = f"""
Job Description: {job_description}

CV Content: {cv_text}

Analyze the match between the job description and the CV. Return a JSON object with:
- "match_percentage"
- "similarities"
- "missing"
- "course_recommendations" (with 'name' and 'url')
"""
        response = client.chat.completions.create(
            model="gpt-4o-mini",  # ✅ upgraded model
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": prompt}
            ]
        )

        feedback_raw = response.choices[0].message.content.strip()
        match = re.search(r"\{.*\}", feedback_raw, re.DOTALL)
        if not match:
            logger.error("No JSON object found in GPT response.")
            raise ValueError("Invalid response format from GPT")

        feedback = json.loads(match.group(0))

        # Keep only valid course URLs
        feedback['course_recommendations'] = [
            course for course in feedback.get('course_recommendations', [])
            if is_valid_url(course['url'])
        ]

        return feedback
    except Exception as e:
        logger.error(f"Error in GPT API request: {e}")
        raise


# -------------------- ROUTES --------------------

@application.route('/')
def index():
    """Health check route — confirms backend is running."""
    return "Backend is running"


@application.route('/signUp', methods=['POST'])
def add_student():
    """
    Register a new student.
    - Expects JSON with name, email, and password.
    - Password is hashed using Argon2 before saving.
    - Student data is stored in Firestore.
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "message": "No data provided"}), 400

        required_fields = ["name", "email", "password"]
        for field in required_fields:
            if field not in data:
                return jsonify({"success": False, "message": f"Missing field: {field}"}), 400

        hashed_password = ph.hash(data["password"])
        data["password"] = hashed_password  

        db.collection("students").add(data)

        return jsonify({"success": True, "message": "Student added!"}), 201
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@application.route('/login', methods=['POST'])
def login_student():
    """
    Authenticate a student.
    - Checks Firestore for email match.
    - Verifies password against Argon2 hash.
    - Returns student ID, name, and email if successful.
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "message": "No data provided"}), 400

        email = data.get("email")
        password = data.get("password")

        if not email or not password:
            return jsonify({"success": False, "message": "Email and password required"}), 400

        students_ref = db.collection("students").where("email", "==", email).limit(1).get()
        if not students_ref:
            return jsonify({"success": False, "message": "Invalid email or password"}), 401

        student_doc = students_ref[0]
        student_data = student_doc.to_dict()

        try:
            ph.verify(student_data["password"], password)
        except VerifyMismatchError:
            return jsonify({"success": False, "message": "Invalid email or password"}), 401

        return jsonify({
            "success": True,
            "message": "Login successful",
            "student": {
                "id": student_doc.id,
                "name": student_data.get("name"),
                "email": student_data.get("email")
            }
        }), 200

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@application.route('/get-questions', methods=['POST'])
def generate_questions():
    """
    Generate interview questions from a job description (PDF).
    - Extracts text from uploaded PDF.
    - Sends text to GPT model.
    - Parses Q/A pairs and returns them as JSON.
    """
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400

    pdf_file = request.files['file']

    try:
        job_description = extract_text_from_pdf(pdf_file)
    except Exception as e:
        return jsonify({'error': f'Failed to extract text from PDF: {str(e)}'}), 500

    if not job_description.strip():
        return jsonify({'error': 'PDF contains no extractable text'}), 400

    prompt = f"Based on the following job description, generate 10 common interview questions and their answers in the format Q: ... A: ...\n\n{job_description}"

    response = client.chat.completions.create(
        model="gpt-4o-mini",  # ✅ upgraded model
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": prompt}
        ]
    )
    answer_text = response.choices[0].message.content

    # Parse GPT output into structured Q/A pairs
    qa_pairs = []
    lines = answer_text.split('\n')
    current_q, current_a = '', ''
    for line in lines:
        if line.strip().startswith("Q:"):
            if current_q and current_a:
                qa_pairs.append({'question': current_q, 'answer': current_a})
            current_q = line.strip()[2:].strip()
            current_a = ''
        elif line.strip().startswith("A:"):
            current_a = line.strip()[2:].strip()
        else:
            current_a += ' ' + line.strip()

    if current_q and current_a:
        qa_pairs.append({'question': current_q, 'answer': current_a})

    return jsonify({'questions': qa_pairs})


@application.route('/Ask', methods=['POST'])
def Ask():
    """
    General Q&A route.
    - Takes a user question as input.
    - Returns GPT-generated response.
    """
    try:
        data = request.get_json()
        question = data.get('question')

        if not question:
            return jsonify({"error": "No question provided"}), 400

        response = client.chat.completions.create(
            model="gpt-4o-mini",  # ✅ upgraded model
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": question}
            ]
        )

        answer = response.choices[0].message.content.strip()
        logger.debug(f"Received question: {question}")
        logger.debug(f"OpenAI response: {answer}")

        return jsonify({"answer": answer})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@application.route('/analyze', methods=['POST'])
def analyze():
    """
    Compare CV against job description.
    - Accepts two uploaded PDFs (JD + CV).
    - Extracts text from both.
    - Sends them to GPT for analysis.
    - Returns JSON with match %, similarities, missing skills, and course recommendations.
    """
    jd_file = request.files.get('job_description')
    cv_file = request.files.get('cv')

    if not jd_file or not cv_file:
        logger.error('Missing data: Job description file or CV not provided')
        return jsonify({'error': 'Missing data'}), 400

    try:
        job_description = extract_text_from_pdf(jd_file)   # extract JD text
        cv_text = extract_text_from_pdf(cv_file)
    except Exception as e:
        logger.error(f"Error processing files: {e}")
        return jsonify({'error': f"Error processing files: {str(e)}"}), 500

    try:
        feedback = compare_with_gpt_for_non_immediate_interview(job_description, cv_text)
        return jsonify({'feedback': feedback}), 200
    except Exception as e:
        logger.error(f"Error during analysis: {e}")
        return jsonify({'error': f"Error during analysis: {str(e)}"}), 500


# Run app
if __name__ == '__main__':
    application.run(debug=True)
