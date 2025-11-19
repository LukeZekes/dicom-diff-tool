document.addEventListener('DOMContentLoaded', () => {
    const file1Input = document.getElementById('file1');
    const file2Input = document.getElementById('file2');
    const compareBtn = document.getElementById('compare-btn');
    const resultsContainer = document.getElementById('results-container');
    const searchInput = document.getElementById('search-input');
    const addSearchBtn = document.getElementById('add-search-btn');
    const searchTermsContainer = document.getElementById('search-terms-container');
    const regexToggle = document.getElementById('regex-toggle');

    let currentDiffData = null;
    let searchTerms = []; // Array of {term: string, isRegex: boolean}

    compareBtn.addEventListener('click', async () => {
        if (!file1Input.files[0] || !file2Input.files[0]) {
            alert('Please select both files.');
            return;
        }

        const formData = new FormData();
        formData.append('file1', file1Input.files[0]);
        formData.append('file2', file2Input.files[0]);

        resultsContainer.innerHTML = '<div class="placeholder-text">Comparing...</div>';

        try {
            const response = await fetch('/api/compare', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Comparison failed');
            }

            currentDiffData = await response.json();
            renderTree(currentDiffData);
        } catch (error) {
            resultsContainer.innerHTML = `<div class="placeholder-text" style="color: var(--diff-removed-text)">Error: ${error.message}</div>`;
        }
    });

    // Add search term
    const addSearchTerm = () => {
        const term = searchInput.value.trim();
        if (!term) return;

        const isRegex = regexToggle.checked;

        // Validate regex if needed
        if (isRegex) {
            try {
                new RegExp(term);
            } catch (e) {
                alert('Invalid regular expression: ' + e.message);
                return;
            }
        }

        searchTerms.push({ term, isRegex });
        searchInput.value = '';
        renderSearchTerms();
        if (currentDiffData) {
            renderTree(currentDiffData);
        }
    };

    addSearchBtn.addEventListener('click', addSearchTerm);

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addSearchTerm();
        }
    });

    // Remove search term
    const removeSearchTerm = (index) => {
        searchTerms.splice(index, 1);
        renderSearchTerms();
        if (currentDiffData) {
            renderTree(currentDiffData);
        }
    };

    // Render search term chips
    const renderSearchTerms = () => {
        searchTermsContainer.innerHTML = '';
        searchTerms.forEach((searchTerm, index) => {
            const chip = document.createElement('div');
            chip.className = `search-term-chip ${searchTerm.isRegex ? 'regex-chip' : ''}`;

            const label = document.createElement('span');
            label.textContent = searchTerm.isRegex ? `/${searchTerm.term}/` : searchTerm.term;

            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-btn';
            removeBtn.innerHTML = '×';
            removeBtn.onclick = () => removeSearchTerm(index);

            chip.appendChild(label);
            chip.appendChild(removeBtn);
            searchTermsContainer.appendChild(chip);
        });
    };

    function renderTree(data) {
        resultsContainer.innerHTML = '';

        // Header row
        const header = document.createElement('div');
        header.className = 'tree-node';
        header.innerHTML = `
            <div class="node-content" style="font-weight: bold; border-bottom: 1px solid var(--border-color)">
                <span></span>
                <span>Tag ID</span>
                <span>Name</span>
                <span>VR</span>
                <span>File A Value</span>
                <span>File B Value</span>
            </div>
        `;
        resultsContainer.appendChild(header);

        const treeRoot = document.createElement('div');
        data.forEach(item => {
            const node = createNode(item);
            if (node) {
                treeRoot.appendChild(node);
            }
        });

        if (treeRoot.children.length === 0 && searchTerms.length > 0) {
            resultsContainer.innerHTML += '<div class="placeholder-text">No matches found.</div>';
        } else {
            resultsContainer.appendChild(treeRoot);
        }
    }

    function createNode(item) {
        // Filter logic - match if ANY search term matches (OR logic)
        let isMatch = searchTerms.length === 0; // If no search terms, show all

        if (searchTerms.length > 0) {
            const textToSearch = `${item.tag} ${item.name} ${item.val1} ${item.val2}`.toLowerCase();

            for (const searchTerm of searchTerms) {
                let termMatches = false;

                if (searchTerm.isRegex) {
                    try {
                        const regex = new RegExp(searchTerm.term, 'i');
                        termMatches = regex.test(textToSearch);
                    } catch (e) {
                        // Invalid regex, skip
                        termMatches = false;
                    }
                } else {
                    termMatches = textToSearch.includes(searchTerm.term.toLowerCase());
                }

                if (termMatches) {
                    isMatch = true;
                    break; // Found a match, no need to check other terms
                }
            }
        }

        // If not a match, check if children match (if any)
        // We want to show parents if children match
        let childrenNodes = [];
        let hasMatchingChild = false;

        if (item.children && item.children.length > 0) {
            item.children.forEach(child => {
                const childNode = createNode(child);
                if (childNode) {
                    childrenNodes.push(childNode);
                    hasMatchingChild = true;
                }
            });
        }

        if (!isMatch && !hasMatchingChild) {
            return null;
        }

        const node = document.createElement('div');
        node.className = `tree-node diff-${item.status}`;

        const content = document.createElement('div');
        content.className = 'node-content';

        // Toggle Icon
        const toggleSpan = document.createElement('span');
        toggleSpan.className = 'toggle-icon';
        if (childrenNodes.length > 0) {
            toggleSpan.textContent = hasMatchingChild ? '▼' : '▶'; // Auto-expand if searching
            toggleSpan.onclick = (e) => {
                e.stopPropagation();
                const container = node.querySelector('.children-container');
                container.classList.toggle('expanded');
                toggleSpan.textContent = container.classList.contains('expanded') ? '▼' : '▶';
            };
        }
        content.appendChild(toggleSpan);

        // Tag ID
        const tagSpan = document.createElement('span');
        tagSpan.className = 'tag-id';
        tagSpan.textContent = item.tag;
        content.appendChild(tagSpan);

        // Name
        const nameSpan = document.createElement('span');
        nameSpan.className = 'tag-name';
        nameSpan.textContent = item.name;
        content.appendChild(nameSpan);

        // VR
        const vrSpan = document.createElement('span');
        vrSpan.className = 'tag-vr';
        vrSpan.textContent = item.vr;
        content.appendChild(vrSpan);

        // Val 1
        const val1Span = document.createElement('span');
        val1Span.className = 'val-col';
        if (item.status === 'diff' || item.status === 'missing_2') {
            val1Span.classList.add('val-removed'); // Or changed
        }
        val1Span.textContent = item.val1;
        val1Span.title = item.val1; // Tooltip
        content.appendChild(val1Span);

        // Val 2
        const val2Span = document.createElement('span');
        val2Span.className = 'val-col';
        if (item.status === 'diff' || item.status === 'missing_1') {
            val2Span.classList.add('val-added'); // Or changed
        }
        val2Span.textContent = item.val2;
        val2Span.title = item.val2; // Tooltip
        content.appendChild(val2Span);

        node.appendChild(content);

        if (childrenNodes.length > 0) {
            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'children-container';
            if (hasMatchingChild && searchTerms.length > 0) {
                childrenContainer.classList.add('expanded');
            }
            childrenNodes.forEach(child => childrenContainer.appendChild(child));
            node.appendChild(childrenContainer);
        }

        return node;
    }
});
