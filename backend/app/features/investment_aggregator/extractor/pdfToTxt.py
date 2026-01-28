import fitz  # PyMuPDF
import os

def pdf_to_txt(pdf_path):
    """
    Converts a PDF file to a text file and returns the path of the text file.

    Args:
        pdf_path (str): The path to the PDF file.

    Returns:
        str: The path to the generated text file.
    """
    # Extract base name and prepare the text file path
    base_name = os.path.splitext(pdf_path)[0]
    txt_file_path = f"{base_name}.txt"

    try:
        # Open the PDF file
        pdf_document = fitz.open(pdf_path)
        pdf_content = ''

        # Extract text from each page
        for page_num in range(len(pdf_document)):
            pdf_content += pdf_document[page_num].get_text()

        # Write the extracted text to a file
        with open(txt_file_path, 'w', encoding='utf-8') as txt_file:
            txt_file.write(pdf_content)

        print(f"Content written to {txt_file_path}")
        return txt_file_path

    except Exception as e:
        print(f"An error occurred: {e}")
        return None


# # **** Example usage ****
if __name__ == "__main__":
    pdf_path = 'adarsh.pdf'
    txt_path = pdf_to_txt(pdf_path)

    if txt_path:
        print(f"Text file created at: {txt_path}")
    else:
        print("Failed to convert PDF to text.")