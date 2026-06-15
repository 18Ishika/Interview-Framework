import pdfplumber
import docx
import os

def extract_text_from_file(file):
    ext = os.path.splitext(file.name)[1].lower()

    if ext == ".pdf":
        return extract_from_pdf(file)
    elif ext == ".docx":
        return extract_from_docx(file)
    else:
        raise ValueError("Unsupported file type. Upload a PDF or DOCX.")

def extract_from_pdf(file):
    text = ""
    with pdfplumber.open(file) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    return text

def extract_from_docx(file):
    doc = docx.Document(file)
    text = ""
    for para in doc.paragraphs:
        text += para.text + "\n"
    return text