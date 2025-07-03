// koatuu-worker.js
let koatuuData = []; // Stores the full flat array of KOATUU items
let koatuuFlatMap = new Map(); // Map: koatuuCode -> fullItemObject for quick lookup

// Define the order of levels for filtering logic (must be consistent with main thread)
const levelOrder = ["Перший рівень", "Другий рівень", "Третій рівень", "Четвертий рівень"];

/**
 * Determines the most specific level for a given KOATUU item.
 * @param {object} item The KOATUU item.
 * @returns {string} The key of the most specific level (e.g., "Перший рівень", "Другий рівень").
 */
function getMostSpecificLevel(item) {
    const itemLevels = [
        { key: "Перший рівень", code: String(item["Перший рівень"] || '').trim() }, 
        { key: "Другий рівень", code: String(item["Другий рівень"] || '').trim() }, 
        { key: "Третій рівень", code: String(item["Третій рівень"] || '').trim() },
        { key: "Четвертий рівень", code: String(item["Четвертий рівень"] || '').trim() }
    ];

    for (let i = itemLevels.length - 1; i >= 0; i--) {
        if (itemLevels[i].code !== '') {
            return itemLevels[i].key;
        }
    }
    return ''; // Should not happen for valid KOATUU data
}

/**
 * Filters the flat KOATUU data based on the search query and selected parameters.
 * @param {string} query The search query.
 * @param {Array<string>} selectedParams The array of selected parameters.
 * @returns {Array<object>} A flat array of KOATUU items that match the criteria.
 */
function getMatchingItems(query, selectedParams) {
    const lowerCaseQuery = query.toLowerCase();
    const filteredItems = koatuuData.filter(item => {
        let queryMatches = false;
        if (query.length === 0) {
            queryMatches = true; // No query means all items pass the query check
        } else {
            let fieldsForQueryMatch = [];
            if (selectedParams.length > 0) {
                fieldsForQueryMatch = [selectedParams[0], "Назва об'єкта українською мовою"];
            } else {
                fieldsForQueryMatch = [
                    "Назва об'єкта українською мовою",
                    "Перший рівень", "Другий рівень", "Третій рівень", "Четвертий рівень"
                ];
            }

            queryMatches = fieldsForQueryMatch.some(param => {
                const itemValue = item[param];
                if (itemValue === undefined || itemValue === null) return false;
                const stringValue = String(itemValue).trim();

                if (param.includes("рівень")) {
                    return stringValue.toLowerCase().startsWith(lowerCaseQuery);
                } else if (param === "Назва об'єкта українською мовою") {
                    return stringValue.toLowerCase().includes(lowerCaseQuery);
                }
                return false;
            });
        }

        let levelCompletenessMatches = true;
        if (selectedParams.length > 0) {
            const selectedLevelKey = selectedParams[0];
            levelCompletenessMatches = (item.level === selectedLevelKey);
        }

        return queryMatches && levelCompletenessMatches;
    });
    return filteredItems;
}

/**
 * Builds a hierarchical tree structure for display based on a flat list of matched items.
 * Includes ancestors to maintain hierarchy.
 * @param {Array<object>} matchedItems A flat array of KOATUU items that match the search/filters.
 * @returns {Array<object>} The root nodes of the display-specific hierarchical tree.
 */
function buildDisplayTree(matchedItems) {
    const displayNodesMap = new Map(); // Map: nodeId -> nodeObject for the display tree
    const rootNodes = [];

    // Helper to get or create a display node
    const getOrCreateDisplayNode = (item, level) => {
        const nodeId = item[level] || item["Назва об'єкта українською мовою"];
        if (!displayNodesMap.has(nodeId)) {
            const newNode = {
                id: nodeId,
                name: item["Назва об'єкта українською мовою"],
                category: item["Категорія"],
                level: level, // This is the KOATUU level key (e.g., "Перший рівень")
                code: item[level],
                children: [],
                fullItem: item, // Reference to the original item
                parentCode: null
            };
            displayNodesMap.set(nodeId, newNode);
        }
        return displayNodesMap.get(nodeId);
    };

    // Identify all nodes that need to be in the display tree (matched items and their ancestors)
    const nodesToInclude = new Set(); // Stores IDs of all nodes that should be in the display tree
    matchedItems.forEach(item => {
        // Add the matched item itself
        const itemId = item[item.level] || item["Назва об'єкта українською мовою"];
        if (itemId) nodesToInclude.add(itemId);

        // Add all ancestors
        let currentItem = item;
        for (let i = levelOrder.indexOf(item.level) - 1; i >= 0; i--) {
            const parentLevelKey = levelOrder[i];
            const parentCode = currentItem[parentLevelKey];
            if (parentCode && koatuuFlatMap.has(parentCode)) {
                nodesToInclude.add(parentCode);
                currentItem = koatuuFlatMap.get(parentCode);
            } else {
                break; // Stop if parent code is missing or not found in flat map
            }
        }
    });

    // Create display node objects for all included nodes
    nodesToInclude.forEach(nodeId => {
        const item = koatuuFlatMap.get(nodeId);
        if (item) {
            getOrCreateDisplayNode(item, item.level); // Create the node in displayNodesMap
        }
    });

    // Establish parent-child relationships for display nodes
    displayNodesMap.forEach(node => {
        let parentFound = false;
        for (let i = levelOrder.indexOf(node.level) - 1; i >= 0; i--) {
            const parentLevelKey = levelOrder[i];
            const parentCode = node.fullItem[parentLevelKey];
            if (parentCode && displayNodesMap.has(parentCode)) {
                const parentNode = displayNodesMap.get(parentCode);
                if (!parentNode.children.some(child => child.id === node.id)) {
                    parentNode.children.push(node);
                    node.parentCode = parentNode.id;
                }
                parentFound = true;
                break; // Found the closest parent in the display tree
            }
        }
        if (!parentFound && node.level === "Перший рівень") {
            // If it's a top-level node and no parent found, it's a root
            rootNodes.push(node);
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
    sortChildren(rootNodes);

    return rootNodes;
}

/**
 * Generates suggestions for autocomplete, primarily using 'Назва об\'єкта українською мовою'.
 * @param {string} query The search query for suggestions.
 * @returns {Array} An array of suggestion strings.
 */
function getSuggestions(query) {
    const MIN_SEARCH_LENGTH = 1; // Worker also needs this constant
    if (!query || query.length < MIN_SEARCH_LENGTH) {
        return [];
    }
    const lowerCaseQuery = query.toLowerCase();
    const suggestionParam = "Назва об'єкта українською мовою"; 

    const uniqueSuggestions = new Set();
    koatuuData.forEach(item => {
        const value = item[suggestionParam];
        if (value !== undefined && value !== null && String(value).toLowerCase().includes(lowerCaseQuery)) {
            uniqueSuggestions.add(value);
        }
    });
    return Array.from(uniqueSuggestions).slice(0, 10); 
}

// Listen for messages from the main thread
self.onmessage = async function(event) {
    const { type, query, selectedParams } = event.data;

    switch (type) {
        case 'init':
            try {
                const response = await fetch(`https://wgis.project.co.ua/koatuu_2023.json`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const rawData = await response.json();
                
                koatuuData = rawData.map(item => {
                    return { ...item, level: getMostSpecificLevel(item) };
                });

                koatuuFlatMap.clear();
                koatuuData.forEach(item => {
                    const id = item[item.level] || item["Назва об'єкта українською мовою"];
                    if (id) {
                        koatuuFlatMap.set(id, item);
                    }
                });
                
                // Send processed data back to main thread
                self.postMessage({ 
                    type: 'dataReady', 
                    payload: { 
                        koatuuData: koatuuData,
                        koatuuFlatMap: Array.from(koatuuFlatMap.entries()) // Convert map to array for transfer
                    } 
                });
            } catch (error) {
                self.postMessage({ type: 'error', payload: { message: error.message } });
            }
            break;
        case 'search':
            // Perform search and build display tree
            const matchedItems = getMatchingItems(query, selectedParams);
            const displayTreeNodes = buildDisplayTree(matchedItems);

            let actualCount = 0;
            if (selectedParams.length === 0) { // "Усі" selected
                const countAllNodesInDisplayTree = (nodes) => {
                    let count = 0;
                    nodes.forEach(node => {
                        count++;
                        count += countAllNodesInDisplayTree(node.children);
                    });
                    return count;
                };
                actualCount = countAllNodesInDisplayTree(displayTreeNodes);
            } else { // Specific level selected
                const selectedLevelKey = selectedParams[0];
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
                actualCount = countSpecificLevelNodes(displayTreeNodes);
            }

            // Send results back to main thread
            self.postMessage({ 
                type: 'searchResults', 
                payload: { displayTreeNodes, actualCount } 
            });
            break;
        case 'getSuggestions':
            const suggestions = getSuggestions(query);
            self.postMessage({ 
                type: 'suggestionsResult', 
                payload: { suggestions } 
            });
            break;
    }
};
