import os
from docx import Document
import re
from datetime import datetime

def convert_docx_to_markdown(docx_path, output_dir, image_base_url):
    """
    Convert a Word .docx file to Markdown with images extracted and linked.
    
    Args:
        docx_path (str): Path to the input .docx file
        output_dir (str): Directory to save Markdown file and images
        image_base_url (str): Base URL where images will be hosted
    """
    # Create output directory if it doesn't exist
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    # Load the document
    doc = Document(docx_path)
    
    # Prepare Markdown content
    markdown_lines = []
    image_counter = 0
    
    # Extract filename for output
    base_filename_spaces = os.path.splitext(os.path.basename(docx_path))[0]
    base_filename = base_filename_spaces.replace(" ", "_")
    markdown_filename = f"{base_filename}.md"
    
    # Process each paragraph
    for para in doc.paragraphs:
        text = para.text.strip()
        if not text:
            markdown_lines.append("")
            continue
            
    # Heading detection: must be <= 60 chars and either styled as Heading or bold
        is_heading_style = para.style.name.startswith('Heading')
        is_bold = para.runs and para.runs[0].bold
        is_short_enough = len(text) <= 60
        
        if (is_heading_style or is_bold) and is_short_enough:
            heading_level = min(int(para.style.name.split()[-1]) if is_heading_style else 1, 6)
            markdown_lines.append(f"{'#' * heading_level} {text}")
        else:
            # Treat as regular paragraph, apply basic formatting
            formatted_text = text
            for run in para.runs:
                if run.bold:
                    formatted_text = re.sub(fr'\b{re.escape(run.text)}\b', f"**{run.text}**", formatted_text)
                if run.italic:
                    formatted_text = re.sub(fr'\b{re.escape(run.text)}\b', f"*{run.text}*", formatted_text)
            markdown_lines.append(formatted_text)
    
    # Extract and handle images
    image_dir = os.path.join(output_dir, "images")
    if not os.path.exists(image_dir):
        os.makedirs(image_dir)
    
    for rel in doc.part.rels.values():
        if "image" in rel.target_ref:
            image_counter += 1
            image_data = rel.target_part.blob
            image_ext = rel.target_ref.split('.')[-1]
            image_filename = f"{base_filename}_img{image_counter}.{image_ext}"
            image_path = os.path.join(image_dir, image_filename)
            
            # Save image
            with open(image_path, 'wb') as img_file:
                img_file.write(image_data)
            
            # Add Markdown image link
            image_url = f"{image_base_url}/images/{image_filename}"
            markdown_lines.append(f"![Image {image_counter}]({image_url})")
    
    # Write Markdown file
    with open(os.path.join(output_dir, markdown_filename), 'w', encoding='utf-8') as md_file:
        md_file.write("\n".join(markdown_lines))
    
    print(f"Converted {docx_path} to {markdown_filename}")
    print(f"Extracted {image_counter} images to {image_dir}")

def process_directory(input_dir, output_dir, image_base_url):
    """
    Process all .docx files in a directory.
    """
    for filename in os.listdir(input_dir):
        if filename.endswith('.docx'):
            docx_path = os.path.join(input_dir, filename)
            convert_docx_to_markdown(docx_path, output_dir, image_base_url)

if __name__ == "__main__":
    # Example usage
    input_directory = "Maes_life_history/"
    output_directory = "Maes_life_history/mdout/"
    image_base_url = "https://davidbrowning.github.io/history/Maes_life_history/mdout"  # Replace with your actual image hosting URL
    
    process_directory(input_directory, output_directory, image_base_url)