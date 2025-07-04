// koatuu_worker.js

let koatuuData = []; // Stores the full flat array of KOATUU items
let koatuuTree = []; // Stores the full hierarchical tree structure
let koatuuNodeMap = new Map(); // Map: nodeId -> nodeObject (from koatuuTree)

// Mapping for more descriptive parameter names (for column headers/tree display)
const paramNamesMap = {
    "a": "Рівень 1 (АРК, Області, Міста спец. статусу)",
    "b": "Рівень 2 (Міста обл. підп., Райони АРК/обл., Райони міст спец. статусу)",
    "c": "Рівень 3 (Міста рай. підп., Райони міст обл. підп., СМТ, Сільські ради)",
    "d": "Рівень 4 (Села, Селища)",
    "categ": "Категорія",
    "name": "Назва об'єкта"
};

// Define the order of levels for filtering logic
const levelOrder = ["a", "b", "c", "d"];

/**
 * Determines the most specific level for a given KOATUU item.
 * @param {object} item The KOATUU item.
 * @returns {string} The key of the most specific level (e.g., "a", "b").
 */
function getMostSpecificLevel(item) {
    const itemLevels = [
        { key: "a", code: String(item.a || '').trim() },
        { key: "b", code: String(item.b || '').trim() },
        { key: "c", code: String(item.c || '').trim() },
        { key: "d", code: String(item.d || '').trim() }
    ];

    for (let i = itemLevels.length - 1; i >= 0; i--) {
        if (itemLevels[i].code !== '') {
            return itemLevels[i].key;
        }
    }
    return ''; // Should not happen for valid KOATUU data
}

/**
 * Builds the hierarchical KOATUU tree from flat data.
 * @param {Array<object>} data The flat KOATUU data.
 * @returns {Array<object>} The root nodes of the hierarchical tree.
 */
function buildKoatuuTree(data) {
    const tree = [];
    const allNodes = new Map(); // Stores all unique administrative unit nodes by their KOATUU code
    koatuuNodeMap.clear(); // Clear the map before populating

    // Helper to get the level index
    const getLevelIndex = (levelKey) => levelOrder.indexOf(levelKey);

    // Helper to get or create a node
    const getOrCreateNode = (code, levelKey, name, category, fullItem = null) => {
        if (!allNodes.has(code)) {
            const newNode = {
                id: code,
                name: name,
                category: category,
                level: levelKey, // This will be the most specific level with a non-empty code
                code: code,
                children: [],
                fullItem: fullItem, // Attach full item if this is the defining row for this code
                parentCode: null // Will be set later
            };
            allNodes.set(code, newNode);
            koatuuNodeMap.set(code, newNode); // Store in global map
        }
        return allNodes.get(code);
    };

    // First pass: Create all unique nodes and store their canonical data (name, category, fullItem)
    data.forEach(item => {
        const itemLevels = [
            { key: "a", code: String(item.a || '').trim() },
            { key: "b", code: String(item.b || '').trim() },
            { key: "c", code: String(item.c || '').trim() },
            { key: "d", code: String(item.d || '').trim() }
        ];

        // Determine the most specific non-empty level for this item
        let mostSpecificLevelIndex = -1;
        for (let i = itemLevels.length - 1; i >= 0; i--) {
            if (itemLevels[i].code !== '') {
                mostSpecificLevelIndex = i;
                break;
            }
        }

        if (mostSpecificLevelIndex !== -1) {
            const { key: definingLevelKey, code: definingCode } = itemLevels[mostSpecificLevelIndex];
            const nodeName = item.name; // Changed key
            const nodeCategory = item.categ; // Changed key

            // Get or create the node for this defining code
            let node = getOrCreateNode(definingCode, definingLevelKey, nodeName, nodeCategory, item);

            // If this node was just created or if this item provides a more specific definition
            // for an existing node (unlikely with this logic, but good to be explicit for fullItem)
            if (!node.fullItem || (getLevelIndex(definingLevelKey) < getLevelIndex(node.level))) {
                node.name = nodeName;
                node.category = nodeCategory;
                node.level = definingLevelKey;
                node.fullItem = item;
            }
        }
    });

    // Second pass: Establish parent-child relationships
    data.forEach(item => {
        const itemLevels = [
            { key: "a", code: String(item.a || '').trim() },
            { key: "b", code: String(item.b || '').trim() },
            { key: "c", code: String(item.c || '').trim() },
            { key: "d", code: String(item.d || '').trim() }
        ];

        let parentNode = null;
        for (let i = 0; i < itemLevels.length; i++) {
            const { code: currentCode } = itemLevels[i];
            if (currentCode === '') continue;

            let currentNode = allNodes.get(currentCode);
            if (!currentNode) {
                // This case should ideally not happen if the first pass correctly created all nodes.
                // But as a fallback, create a basic node.
                // Using the current item's name/category if available, otherwise a placeholder
                const name = item.name || `Невідома назва (${currentCode})`; // Changed key
                const category = item.categ || ''; // Changed key
                currentNode = getOrCreateNode(currentCode, itemLevels[i].key, name, category, item);
            }

            if (parentNode) {
                // Add as child if not already present
                if (!parentNode.children.some(child => child.id === currentNode.id)) {
                    parentNode.children.push(currentNode);
                    currentNode.parentCode = parentNode.id; // Set parent code
                }
            } else {
                // If no parent, it's a root node (level 1)
                if (!tree.some(root => root.id === currentNode.id)) {
                    tree.push(currentNode);
                }
            }
            parentNode = currentNode;
        }
    });

    // Sort children recursively by name
    const sortChildren = (nodes) => {
        nodes.sort((a, b) => {
            const nameA = a.name.toLowerCase();
            const nameB = b.name.toLowerCase();
            if (nameA < nameB) return -1;
            if (nameA > nameB) return 1;
            return 0;
        });
        nodes.forEach(node => {
            if (node.children.length > 0) {
                sortChildren(node.children);
            }
        });
    };
    sortChildren(tree);

    return tree;
}

/**
 * Recursively filters the KOATUU tree based on the search query and selected parameters.
 * Marks nodes that should be expanded to show matching children.
 * @param {object} node The current node in the tree.
 * @param {string} query The search query.
 * @param {Array<string>} selectedParams The array of selected parameters.
 * @param {boolean} isQueryLongEnough True if query length is >= MIN_SEARCH_LENGTH.
 * @returns {object|null} A copy of the node with filtered children, or null if no match.
 */
function filterTree(node, query, selectedParams, isQueryLongEnough) {
    let nodeCopy = { ...node, children: [] };
    let itemMatchesFilter = false; // Does the current node's item itself match the filter criteria?

    if (node.fullItem) {
        const item = node.fullItem;
        const lowerCaseQuery = query.toLowerCase();
        let queryMatches = false;

        // Determine fields for query matching
        let fieldsForQueryMatch = [];
        if (selectedParams.length > 0) {
            // If a specific level is selected, we only search within that level's code or the name field.
            fieldsForQueryMatch = [selectedParams[0], "name"]; // Updated to 'name'
        } else {
            // Default search fields if "All" is selected
            fieldsForQueryMatch = [
                "name", // Updated to 'name'
                "a", "b", "c", "d" // Updated to 'a', 'b', 'c', 'd'
            ];
        }

        if (query.length === 0) { // If query is empty, all items pass query match
            queryMatches = true;
        } else {
            queryMatches = fieldsForQueryMatch.some(param => {
                const itemValue = item[param];
                if (itemValue === undefined || itemValue === null) return false;
                const stringValue = String(itemValue).trim();

                if (["a", "b", "c", "d"].includes(param)) { // Check against new level keys
                    // For level codes, check if the query starts with the code
                    return stringValue.toLowerCase().startsWith(lowerCaseQuery);
                } else if (param === "name") { // Check against new name key
                    // For name, check if query starts with the name (changed from includes)
                    return isQueryLongEnough && stringValue.toLowerCase().startsWith(lowerCaseQuery);
                }
                return false;
            });
        }

        // Check for level completeness based on selected radio button
        let levelCompletenessMatches = true;
        if (selectedParams.length > 0) {
            const selectedLevelKey = selectedParams[0];
            levelCompletenessMatches = (node.level === selectedLevelKey);
        }
        itemMatchesFilter = queryMatches && levelCompletenessMatches;
    }

    // Set directMatch flag for the current node
    nodeCopy.directMatch = itemMatchesFilter;

    let childrenMatch = false;
    // Recursively filter children
    if (node.children && node.children.length > 0) {
        node.children.forEach(child => {
            const filteredChild = filterTree(child, query, selectedParams, isQueryLongEnough);
            if (filteredChild) {
                nodeCopy.children.push(filteredChild);
                childrenMatch = true; // If any child matches, this parent node also needs to be included
            }
        });
    }

    // A node is included if its item matches the filter OR if any of its children match
    if (itemMatchesFilter || childrenMatch) {
        if (nodeCopy.children.length > 0) {
            nodeCopy.shouldExpand = true;
        }
        return nodeCopy;
    }
    return null; // This node and its descendants do not match
}

/**
 * Generates suggestions for autocomplete, primarily using 'name'.
 * @param {string} query The search query for suggestions.
 * @param {number} MIN_SEARCH_LENGTH Minimum search query length for suggestions.
 * @returns {Array} An array of suggestion strings.
 */
function getSuggestions(query, MIN_SEARCH_LENGTH) {
    if (!query || query.length < MIN_SEARCH_LENGTH) {
        return [];
    }
    const lowerCaseQuery = query.toLowerCase();
    const suggestionParam = "name"; // Updated to 'name'

    const uniqueSuggestions = new Set();
    koatuuData.forEach(item => {
        const value = item[suggestionParam];
        if (value !== undefined && value !== null && String(value).toLowerCase().startsWith(lowerCaseQuery)) { // Changed to startsWith
            uniqueSuggestions.add(value);
        }
    });
    return Array.from(uniqueSuggestions).slice(0, 10);
}

// Listen for messages from the main thread
self.onmessage = async function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'loadData':
            try {
                const response = await fetch('https://wgis.project.co.ua/koatuu_output_formatted.json');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const rawData = await response.json();
                koatuuData = rawData.map(item => {
                    return { ...item, level: getMostSpecificLevel(item) };
                });
                koatuuTree = buildKoatuuTree(koatuuData);
                self.postMessage({ type: 'dataLoaded', payload: { koatuuDataLength: koatuuData.length } });
            } catch (error) {
                console.error('Помилка завантаження даних КОАТУУ у воркері:', error);
                self.postMessage({ type: 'error', payload: { message: 'Помилка завантаження даних.' } });
            }
            break;
        case 'getRandomItemForPlaceholder':
            if (koatuuData && koatuuData.length > 0) {
                const randomIndex = Math.floor(Math.random() * koatuuData.length);
                const randomItem = koatuuData[randomIndex];
                self.postMessage({ type: 'randomItemForPlaceholder', payload: { randomItem } });
            }
            break;
        case 'searchData':
            const { query, selectedParams, isQueryLongEnough } = payload;
            const filteredTreeForDisplay = koatuuTree.map(rootNode => filterTree(rootNode, query, selectedParams, isQueryLongEnough)).filter(Boolean);

            let actualCount = 0;
            if (selectedParams.length === 0) { // "Усі" selected
                // Count only nodes that directly matched the search query
                const countDirectlyMatchedNodes = (nodes) => {
                    let count = 0;
                    nodes.forEach(node => {
                        if (node.directMatch) { // Only count if this node itself matched the query
                            count++;
                        }
                        count += countDirectlyMatchedNodes(node.children);
                    });
                    return count;
                };
                actualCount = countDirectlyMatchedNodes(filteredTreeForDisplay);
            } else { // Specific level selected
                const selectedLevelKey = selectedParams[0];
                // Count only nodes whose 'level' property matches the selected level key
                const countSpecificLevelNodes = (nodes) => {
                    let count = 0;
                    nodes.forEach(node => {
                        if (node.level === selectedLevelKey) {
                            count++;
                        }
                        count += countSpecificLevelNodes(node.children);
                    });
                    return count;
                };
                actualCount = countSpecificLevelNodes(filteredTreeForDisplay);
            }
            self.postMessage({ type: 'searchResults', payload: { filteredTree: filteredTreeForDisplay, totalResultsCount: actualCount } });
            break;
        case 'getSuggestions':
            const { query: suggestionQuery, MIN_SEARCH_LENGTH: minSearchLength } = payload;
            const suggestions = getSuggestions(suggestionQuery, minSearchLength);
            self.postMessage({ type: 'suggestions', payload: { suggestions: suggestions } });
            break;
    }
};
