import os
from flask import Flask, render_template, request, jsonify
import pydicom
from pydicom.dataset import Dataset
from pydicom.sequence import Sequence

app = Flask(__name__)

def get_tag_name(tag):
    try:
        return pydicom.datadict.keyword_for_tag(tag) or str(tag)
    except:
        return str(tag)

def recursive_diff(ds1, ds2, path=""):
    diff_result = []
    
    # Get all unique tags from both datasets
    tags1 = set(ds1.keys()) if ds1 else set()
    tags2 = set(ds2.keys()) if ds2 else set()
    all_tags = sorted(list(tags1.union(tags2)))

    for tag in all_tags:
        # Skip Pixel Data and other bulk data tags for performance
        # 0x7FE00010: PixelData, 0x7FE00008: FloatPixelData, 0x7FE00009: DoubleFloatPixelData
        if tag in [0x7FE00010, 0x7FE00008, 0x7FE00009]:
            continue

        elem1 = ds1.get(tag) if ds1 else None
        elem2 = ds2.get(tag) if ds2 else None
        
        tag_str = str(tag).replace("(", "").replace(")", "").replace(", ", "")
        tag_name = get_tag_name(tag)
        vr = elem1.VR if elem1 else (elem2.VR if elem2 else "??")
        
        item = {
            "tag": tag_str,
            "name": tag_name,
            "vr": vr,
            "path": f"{path}.{tag_name}" if path else tag_name,
            "status": "match",
            "val1": str(elem1.value) if elem1 and not isinstance(elem1.value, (Sequence, bytes)) else "",
            "val2": str(elem2.value) if elem2 and not isinstance(elem2.value, (Sequence, bytes)) else "",
            "children": []
        }

        if elem1 and elem2:
            if elem1.VR == "SQ":
                # Handle Sequences
                # For simplicity in this version, we compare items by index.
                # A more robust diff might try to match items by some ID.
                seq1 = elem1.value
                seq2 = elem2.value
                max_len = max(len(seq1), len(seq2))
                
                for i in range(max_len):
                    item1 = seq1[i] if i < len(seq1) else None
                    item2 = seq2[i] if i < len(seq2) else None
                    
                    child_diff = recursive_diff(item1, item2, f"{item['path']}[{i}]")
                    if any(d['status'] != 'match' for d in child_diff):
                         item['status'] = 'diff' # Mark parent as diff if children differ
                    
                    # Create a dummy node for the sequence item to group its children
                    seq_item_node = {
                        "tag": f"Item {i}",
                        "name": f"Item {i}",
                        "vr": "Item",
                        "path": f"{item['path']}[{i}]",
                        "status": "match" if item1 and item2 else ("missing_2" if item1 else "missing_1"),
                        "val1": "",
                        "val2": "",
                        "children": child_diff
                    }
                    # If the item itself is missing, mark it
                    if not item1: seq_item_node['status'] = "missing_1"
                    elif not item2: seq_item_node['status'] = "missing_2"
                    elif any(d['status'] != 'match' for d in child_diff):
                         seq_item_node['status'] = 'diff'

                    item['children'].append(seq_item_node)

                if item['status'] == 'match' and item['children']:
                     # Check if any children are diff/missing
                     if any(child['status'] != 'match' for child in item['children']):
                         item['status'] = 'diff'

            else:
                # Simple value comparison
                if elem1.value != elem2.value:
                    item['status'] = 'diff'
        elif elem1 and not elem2:
            item['status'] = 'missing_2'
            item['val1'] = str(elem1.value) if not isinstance(elem1.value, (Sequence, bytes)) else "Sequence/Bytes"
        elif not elem1 and elem2:
            item['status'] = 'missing_1'
            item['val2'] = str(elem2.value) if not isinstance(elem2.value, (Sequence, bytes)) else "Sequence/Bytes"
            
        diff_result.append(item)
        
    return diff_result

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/compare', methods=['POST'])
def compare():
    if 'file1' not in request.files or 'file2' not in request.files:
        return jsonify({"error": "Two files are required"}), 400
    
    file1 = request.files['file1']
    file2 = request.files['file2']
    
    try:
        ds1 = pydicom.dcmread(file1, force=True)
        ds2 = pydicom.dcmread(file2, force=True)
        
        diff = recursive_diff(ds1, ds2)
        return jsonify(diff)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5001)
