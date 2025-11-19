# DICOM Diff Tool

A web-based application for comparing two DICOM files tag-by-tag. This tool provides an intuitive interface to visualize differences between DICOM files, with support for nested sequences and advanced filtering.

## Features

- **Tag-by-Tag Comparison**: Compare two DICOM files and see differences highlighted
- **Expandable Sequences**: Navigate through nested DICOM sequences with collapsible tree view
- **Advanced Search**: Filter results using multiple search terms (strings or regular expressions)
- **Visual Indicators**: Color-coded status for matching, differing, and missing tags
- **Pixel Data Exclusion**: Automatically excludes pixel data for better performance

## Installation

1. Clone the repository:
```bash
git clone https://github.com/LukeZekes/dicom-diff-tool.git
cd dicom-diff-tool
```

2. Create and activate a virtual environment:
```bash
python -m venv .venv
.venv\Scripts\activate  # On Windows
# source .venv/bin/activate  # On macOS/Linux
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

## Usage

1. Start the Flask application:
```bash
python app.py
```

2. Open your browser and navigate to:
```
http://localhost:5001
```

3. Upload two DICOM files using the file selectors

4. Click "Compare Files" to view the differences

5. Use the search bar to filter results by tag name, tag number, or value

## Project Structure

```
dicom-diff-tool/
├── app.py              # Flask backend with DICOM comparison logic
├── requirements.txt    # Python dependencies
├── static/
│   ├── script.js      # Frontend JavaScript
│   └── style.css      # Application styles
└── templates/
    └── index.html     # Main HTML template
```

## Requirements

- Python 3.7+
- Flask
- pydicom

## How It Works

The application uses `pydicom` to parse DICOM files and recursively compares all tags. The comparison results are displayed in a hierarchical tree view with the following status indicators:

- **Green**: Tags match between both files
- **Yellow**: Tags have different values
- **Red**: Tag exists in only one file

## License

MIT License

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.