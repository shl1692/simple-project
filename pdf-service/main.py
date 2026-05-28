from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from reportlab.pdfgen import canvas
import io

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PDFRequest(BaseModel):
    title: str
    content: str = ""

@app.post("/generate")
def generate_pdf(req: PDFRequest):
    if not req.title:
        raise HTTPException(status_code=400, detail="Title is required")
        
    try:
        buffer = io.BytesIO()
        c = canvas.Canvas(buffer)
        
        # Draw title
        c.setFont("Helvetica-Bold", 24)
        c.drawCentredString(300, 750, req.title)
        
        # Draw content
        c.setFont("Helvetica", 12)
        textobject = c.beginText(50, 700)
        textobject.setLeading(14)
        for line in req.content.split('\n'):
            textobject.textLine(line)
        c.drawText(textobject)
        
        c.showPage()
        c.save()
        
        buffer.seek(0)
        pdf_bytes = buffer.getvalue()
        
        headers = {
            'Content-Disposition': f'attachment; filename="{req.title}.pdf"'
        }
        
        return Response(content=pdf_bytes, media_type="application/pdf", headers=headers)
        
    except Exception as e:
        print(f"Error generating PDF: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate PDF")
