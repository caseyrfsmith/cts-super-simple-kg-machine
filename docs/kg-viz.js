const pastelColors = ['#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFC9', '#BAE1FF', '#E0BBE4', '#FFDFD3', '#C7CEEA', '#D4F1F4', '#FFE5E5'];
let graphData = null;
let simulation = null;
let currentLayout = 'force';

// Helper function to get human-readable edge descriptions
function getEdgeDescription(edgeType) {
    const descriptions = {
        'link': 'LINKS TO',
        'series': 'PART OF SAME SERIES',
        'tag': 'SHARES TAGS WITH',
        'semantic': 'SEMANTICALLY RELATED TO',
        'contrasts': 'CONTRASTS WITH',
        'same-author': 'SAME AUTHOR'
    };
    return descriptions[edgeType] || edgeType.toUpperCase();
}

async function loadGraph() {
    try {
        console.log('Loading graph data...');
        const response = await fetch('graph-data.json');
        graphData = await response.json();
        console.log('Loaded:', graphData.nodes.length, 'nodes,', graphData.edges.length, 'edges');
        populateFilters();
        renderGraph();
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('graph').innerHTML = '<text x="50%" y="50%" text-anchor="middle">Error loading graph</text>';
    }
}

const selectedTypes = new Set();
const selectedTags = new Set();

function populateFilters() {
    const types = new Set(graphData.nodes.map(n => n.type));
    const typeMenu = document.getElementById('type-filter-menu');
    typeMenu.innerHTML = '<label class="filter-checkbox"><input type="checkbox" id="select-all-types" checked> <strong>Select All</strong></label>';
    types.forEach(type => {
        const label = document.createElement('label');
        label.className = 'filter-checkbox';
        label.innerHTML = `<input type="checkbox" value="${type}" class="type-checkbox" checked> ${type}`;
        typeMenu.appendChild(label);
    });
    
    const tags = new Set(graphData.nodes.flatMap(n => n.tags));
    const tagMenu = document.getElementById('tag-filter-menu');
    tagMenu.innerHTML = `
        <input type="text" id="tag-search" placeholder="Search tags..." style="width: 100%; padding: 0.25rem; margin-bottom: 0.5rem; box-sizing: border-box;">
        <label class="filter-checkbox"><input type="checkbox" id="select-all-tags" checked> <strong>Select All</strong></label>
    `;
    const tagList = document.createElement('div');
    tagList.id = 'tag-list';
    Array.from(tags).sort().forEach(tag => {
        const label = document.createElement('label');
        label.className = 'filter-checkbox';
        label.setAttribute('data-tag', tag.toLowerCase());
        label.innerHTML = `<input type="checkbox" value="${tag}" class="tag-checkbox" checked> ${tag}`;
        tagList.appendChild(label);
    });
    tagMenu.appendChild(tagList);
    
    // Add tag search handler
    document.getElementById('tag-search').addEventListener('input', (e) => {
        const search = e.target.value.toLowerCase();
        document.querySelectorAll('#tag-list .filter-checkbox').forEach(label => {
            const tag = label.getAttribute('data-tag');
            label.style.display = tag.includes(search) ? 'block' : 'none';
        });
    });
    
    // Populate edge type filter
    const edgeTypes = new Set(graphData.edges.map(e => e.type));
    const edgeSelect = document.getElementById('filter-edge');
    Array.from(edgeTypes).sort().forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = getEdgeDescription(type);
        edgeSelect.appendChild(option);
    });
    
    // Setup menu toggles
    setupFilterMenus();
}

function setupFilterMenus() {
    // Toggle menus
    document.getElementById('type-filter-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        const menu = document.getElementById('type-filter-menu');
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
        document.getElementById('tag-filter-menu').style.display = 'none';
    });
    
    document.getElementById('tag-filter-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        const menu = document.getElementById('tag-filter-menu');
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
        document.getElementById('type-filter-menu').style.display = 'none';
    });
    
    // Close menus when clicking outside
    document.addEventListener('click', () => {
        document.getElementById('type-filter-menu').style.display = 'none';
        document.getElementById('tag-filter-menu').style.display = 'none';
    });
    
    // Handle "Select All" for types
    document.getElementById('select-all-types').addEventListener('change', (e) => {
        document.querySelectorAll('.type-checkbox').forEach(cb => {
            cb.checked = e.target.checked;
        });
        renderGraph();
    });
    
    // Handle "Select All" for tags
    document.getElementById('select-all-tags').addEventListener('change', (e) => {
        document.querySelectorAll('.tag-checkbox').forEach(cb => {
            cb.checked = e.target.checked;
        });
        renderGraph();
    });
    
    // Handle individual type checkboxes
    document.querySelectorAll('.type-checkbox').forEach(cb => {
        cb.addEventListener('change', renderGraph);
    });
    
    // Handle individual tag checkboxes
    document.querySelectorAll('.tag-checkbox').forEach(cb => {
        cb.addEventListener('change', renderGraph);
    });
}

function getFilteredData() {
    const searchTerm = document.getElementById('search').value.toLowerCase();
    const filterEdge = document.getElementById('filter-edge').value;
    
    // Get selected types and tags from checkboxes
    const selectedTypes = Array.from(document.querySelectorAll('.type-checkbox:checked')).map(cb => cb.value);
    const selectedTags = Array.from(document.querySelectorAll('.tag-checkbox:checked')).map(cb => cb.value);
    
    let filteredNodes = graphData.nodes;
    
    // Filter by search
    if (searchTerm) {
        filteredNodes = filteredNodes.filter(n => 
            n.title.toLowerCase().includes(searchTerm) || 
            n.summary.toLowerCase().includes(searchTerm)
        );
    }
    
    // Filter by selected types
    if (selectedTypes.length > 0) {
        filteredNodes = filteredNodes.filter(n => selectedTypes.includes(n.type));
    }
    
    // Filter by selected tags (node must have at least one selected tag)
    if (selectedTags.length > 0) {
        filteredNodes = filteredNodes.filter(n => 
            n.tags.some(tag => selectedTags.includes(tag))
        );
    }
    
    const nodeIds = new Set(filteredNodes.map(n => n.id));
    
    let filteredEdges = graphData.edges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target));
    if (filterEdge) filteredEdges = filteredEdges.filter(e => e.type === filterEdge);
    
    return { nodes: filteredNodes.map(n => ({...n})), edges: filteredEdges.map(e => ({...e})) };
}

function renderGraph() {
    const data = getFilteredData();
    document.getElementById('node-count').textContent = graphData.nodes.length;
    document.getElementById('edge-count').textContent = graphData.edges.length;
    document.getElementById('filtered-count').textContent = data.nodes.length;
    d3.select('#graph').selectAll('*').remove();
    if (data.nodes.length === 0) return;
    const svg = d3.select('#graph');
    const width = window.innerWidth;
    const height = window.innerHeight - 80;
    const zoom = d3.zoom().scaleExtent([0.1, 10]).on('zoom', (event) => g.attr('transform', event.transform));
    svg.call(zoom);
    const g = svg.append('g');
    const typeColorMap = new Map();
    const types = [...new Set(data.nodes.map(n => n.type))];
    types.forEach((type, i) => typeColorMap.set(type, pastelColors[i % pastelColors.length]));
    const nodeDegree = new Map();
    data.edges.forEach(e => {
        nodeDegree.set(e.source, (nodeDegree.get(e.source) || 0) + 1);
        nodeDegree.set(e.target, (nodeDegree.get(e.target) || 0) + 1);
    });
    if (currentLayout === 'force') renderForceLayout(g, data, width, height, typeColorMap, nodeDegree);
    else if (currentLayout === 'radial') renderRadialLayout(g, data, width, height, typeColorMap, nodeDegree);
    else if (currentLayout === 'cluster') renderClusterLayout(g, data, width, height, typeColorMap, nodeDegree);
    document.getElementById('reset').onclick = () => svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity);
}

function renderForceLayout(g, data, width, height, typeColorMap, nodeDegree) {
    simulation = d3.forceSimulation(data.nodes)
        .force('link', d3.forceLink(data.edges)
            .id(d => d.id)
            .distance(d => {
                // Stronger connections = shorter distance
                if (d.type === 'link' || d.type === 'series') return 50;
                if (d.type === 'tag') return 80;
                return 100;
            })
            .strength(d => {
                // Weight affects pull strength
                if (d.type === 'link' || d.type === 'series') return 1.0;
                return d.weight;
            }))
        .force('charge', d3.forceManyBody().strength(-150)) // Less repulsion
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(d => {
            // More space for nodes with more connections
            return 25 + Math.sqrt((nodeDegree.get(d.id) || 0)) * 3;
        }));
    const link = g.append('g').selectAll('line').data(data.edges).join('line')
        .attr('class', d => `link link-type-${d.type}`)
        .attr('stroke-width', d => {
            // More visible for strong connections
            if (d.type === 'link' || d.type === 'series') return 3;
            return Math.max(2, Math.sqrt(d.weight) * 3);
        });
    
    // Add edge hover tooltips
    addEdgeInteractivity(link, data);
    
    const node = g.append('g').selectAll('circle').data(data.nodes).join('circle')
        .attr('class', 'node')
        .attr('r', d => 6 + Math.sqrt((nodeDegree.get(d.id) || 0)) * 2.5)
        .attr('fill', d => typeColorMap.get(d.type))
        .call(drag(simulation));
    const label = g.append('g').selectAll('text').data(data.nodes).join('text')
        .attr('class', 'node-label').attr('dx', 12).attr('dy', 4)
        .text(d => d.title.length > 50 ? d.title.substring(0, 50) + '...' : d.title)
        .style('display', document.getElementById('show-labels').checked ? 'block' : 'none');
    addInteractivity(node, label, data);
    simulation.on('tick', () => {
        link.attr('x1', d => d.source.x).attr('y1', d => d.source.y).attr('x2', d => d.target.x).attr('y2', d => d.target.y);
        node.attr('cx', d => d.x).attr('cy', d => d.y);
        label.attr('x', d => d.x).attr('y', d => d.y);
    });
}

function renderRadialLayout(g, data, width, height, typeColorMap, nodeDegree) {
    const radius = Math.min(width, height) / 2 - 100;
    const angleStep = (2 * Math.PI) / data.nodes.length;
    data.nodes.forEach((node, i) => {
        node.x = width / 2 + radius * Math.cos(i * angleStep);
        node.y = height / 2 + radius * Math.sin(i * angleStep);
    });
    const link = g.append('g').selectAll('line').data(data.edges).join('line')
        .attr('class', d => `link link-type-${d.type}`)
        .attr('stroke-width', d => Math.max(2, Math.sqrt(d.weight) * 3))
        .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
    
    addEdgeInteractivity(link, data);
    
    const node = g.append('g').selectAll('circle').data(data.nodes).join('circle')
        .attr('class', 'node')
        .attr('r', d => 5 + Math.sqrt((nodeDegree.get(d.id) || 0)) * 2)
        .attr('fill', d => typeColorMap.get(d.type))
        .attr('cx', d => d.x).attr('cy', d => d.y);
    const label = g.append('g').selectAll('text').data(data.nodes).join('text')
        .attr('class', 'node-label')
        .attr('x', d => d.x + 12).attr('y', d => d.y + 4)
        .text(d => d.title.length > 30 ? d.title.substring(0, 30) + '...' : d.title)
        .style('display', document.getElementById('show-labels').checked ? 'block' : 'none');
    addInteractivity(node, label, data);
}

function renderClusterLayout(g, data, width, height, typeColorMap, nodeDegree) {
    const clusters = new Map();
    data.nodes.forEach(node => {
        const primaryTag = node.tags[0] || 'untagged';
        if (!clusters.has(primaryTag)) clusters.set(primaryTag, []);
        clusters.get(primaryTag).push(node);
    });
    const clusterArray = Array.from(clusters.entries());
    const cols = Math.ceil(Math.sqrt(clusterArray.length));
    const cellWidth = width / cols;
    const cellHeight = height / Math.ceil(clusterArray.length / cols);
    clusterArray.forEach(([tag, nodes], i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const centerX = col * cellWidth + cellWidth / 2;
        const centerY = row * cellHeight + cellHeight / 2;
        nodes.forEach((node, j) => {
            const angle = (j / nodes.length) * 2 * Math.PI;
            const radius = Math.min(cellWidth, cellHeight) / 4;
            node.x = centerX + radius * Math.cos(angle);
            node.y = centerY + radius * Math.sin(angle);
        });
    });
    const link = g.append('g').selectAll('line').data(data.edges).join('line')
        .attr('class', d => `link link-type-${d.type}`)
        .attr('stroke-width', d => Math.max(2, Math.sqrt(d.weight) * 3))
        .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
    
    addEdgeInteractivity(link, data);
    
    const node = g.append('g').selectAll('circle').data(data.nodes).join('circle')
        .attr('class', 'node')
        .attr('r', d => 5 + Math.sqrt((nodeDegree.get(d.id) || 0)) * 2)
        .attr('fill', d => typeColorMap.get(d.type))
        .attr('cx', d => d.x).attr('cy', d => d.y);
    const label = g.append('g').selectAll('text').data(data.nodes).join('text')
        .attr('class', 'node-label')
        .attr('x', d => d.x + 12).attr('y', d => d.y + 4)
        .text(d => d.title.length > 30 ? d.title.substring(0, 30) + '...' : d.title)
        .style('display', document.getElementById('show-labels').checked ? 'block' : 'none');
    addInteractivity(node, label, data);
}

function addEdgeInteractivity(link, data) {
    const tooltip = d3.select('#tooltip');
    
    link.on('mouseover', (event, d) => {
        // Highlight this edge
        d3.select(event.target).classed('highlighted', true);
        
        const sourceNode = data.nodes.find(n => n.id === (d.source.id || d.source));
        const targetNode = data.nodes.find(n => n.id === (d.target.id || d.target));
        
        let themeHTML = '';
        if (d.theme) {
            themeHTML = `<p><strong>Theme:</strong> ${d.theme}</p>`;
        }
        
        tooltip.style('opacity', 1)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px')
            .html(`
                <h3>${getEdgeDescription(d.type)}</h3>
                <p><strong>From:</strong> ${sourceNode ? sourceNode.title : d.source}</p>
                <p><strong>To:</strong> ${targetNode ? targetNode.title : d.target}</p>
                ${themeHTML}
                <p><strong>Weight:</strong> ${d.weight.toFixed(2)}</p>
            `);
    }).on('mouseout', (event) => {
        // Remove highlight
        d3.select(event.target).classed('highlighted', false);
        tooltip.style('opacity', 0);
    });
}

function addInteractivity(node, label, data) {
    const tooltip = d3.select('#tooltip');
    
    node.on('mouseover', (event, d) => {
        // Find all edges connected to this node
        const connections = data.edges.filter(e => {
            const sourceId = e.source.id || e.source;
            const targetId = e.target.id || e.target;
            return sourceId === d.id || targetId === d.id;
        });
        
        // Group connections by type
        const connectionsByType = {};
        connections.forEach(conn => {
            const sourceId = conn.source.id || conn.source;
            const targetId = conn.target.id || conn.target;
            const otherId = sourceId === d.id ? targetId : sourceId;
            const otherNode = data.nodes.find(n => n.id === otherId);
            
            if (!connectionsByType[conn.type]) {
                connectionsByType[conn.type] = [];
            }
            if (otherNode) {
                const connInfo = {
                    title: otherNode.title,
                    theme: conn.theme || null
                };
                connectionsByType[conn.type].push(connInfo);
            }
        });
        
        // Build connections HTML
        let connectionsHTML = '';
        if (Object.keys(connectionsByType).length > 0) {
            connectionsHTML = '<div style="margin-top: 0.75rem; border-top: 1px solid #ddd; padding-top: 0.5rem;"><strong>Connections:</strong>';
            for (const [type, items] of Object.entries(connectionsByType)) {
                connectionsHTML += `<p style="margin: 0.25rem 0;"><em>${getEdgeDescription(type)}:</em> ${items.length} node(s)`;
                // Show themes if any exist
                const withThemes = items.filter(i => i.theme);
                if (withThemes.length > 0) {
                    connectionsHTML += '<br><span style="font-size: 0.8em; color: #666;">';
                    withThemes.forEach((item, idx) => {
                        if (idx > 0) connectionsHTML += '; ';
                        connectionsHTML += `${item.theme}`;
                    });
                    connectionsHTML += '</span>';
                }
                connectionsHTML += '</p>';
            }
            connectionsHTML += '</div>';
        }
        
        // Build book-specific HTML
        let bookHTML = '';
        if (d.type === 'book') {
            if (d.author) bookHTML += `<p><strong>Author:</strong> ${d.author}</p>`;
            if (d.status) bookHTML += `<p><strong>Status:</strong> ${d.status}</p>`;
            if (d.rating) bookHTML += `<p><strong>Rating:</strong> ${d.rating}/5</p>`;
        }
        
        tooltip.style('opacity', 1)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px')
            .html(`
                <h3>${d.title}</h3>
                ${bookHTML}
                <p>${d.summary}</p>
                <p><strong>Type:</strong> ${d.type}</p>
                ${d.published ? `<p><strong>Published:</strong> ${d.published}</p>` : ''}
                <div class="tags">${d.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>
                ${connectionsHTML}
            `);
    }).on('mouseout', () => {
        tooltip.style('opacity', 0);
    }).on('click', (event, d) => {
        if (d.url) {
            // Make URL absolute from site root
            const url = d.url.startsWith('http') ? d.url : '/' + d.url.replace(/^\//, '');
            window.open(url, '_blank');
        }
    });
}

function drag(simulation) {
    function dragstarted(event) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
    }
    function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
    }
    function dragended(event) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
    }
    return d3.drag().on('start', dragstarted).on('drag', dragged).on('end', dragended);
}

document.getElementById('search').addEventListener('input', renderGraph);
document.getElementById('filter-edge').addEventListener('change', renderGraph);
document.getElementById('show-labels').addEventListener('change', renderGraph);
document.getElementById('layout').addEventListener('change', (e) => {
    currentLayout = e.target.value;
    renderGraph();
});

loadGraph();