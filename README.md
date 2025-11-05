# Knowledge graph builder (AKA CT's Super Simple Knowledge Graph Machine)

A simple, hackable tool for building and visualizing knowledge graphs from markdown content. Built for technical writers who want to understand how knowledge graphs work by tinkering with real code.

## What this is

This is a learning tool and portfolio project, not enterprise software. The goal is to provide a simple, readable codebase that you can modify and extend to suit your needs. If you're curious about knowledge graphs, information architecture, or want to visualize relationships in your documentation, this is a good place to start.

The code is deliberately straightforward - no complex frameworks, just Node.js scripts that parse markdown files and generate interactive visualizations. You can read through the entire codebase in an afternoon and understand exactly how it works.

## Features

- Parse markdown files with frontmatter
- Detect multiple relationship types (links, tags, series, date proximity)
- Optional AI enrichment using Claude API
- Interactive D3.js visualization with multiple layouts
- Configurable and extensible
- Works in CI/CD pipelines

## Who this is for

- Technical writers who want to understand knowledge graphs by working with code
- Documentation teams looking for a simple way to visualize content relationships
- Anyone curious about information architecture and wants a hands-on learning tool
- Developers who want a starting point they can modify for their specific needs

You don't need to be a programmer, but you should be comfortable reading code and editing configuration files. The codebase is intentionally simple - if you can read JavaScript and understand basic concepts like loops and objects, you can modify this tool.

## Quick start

### Installation

```bash
npm install
```

### Basic usage

1. Update `config.json` to point to your markdown files:
   ```json
   {
     "contentPath": "./content",
     ...
   }
   ```

2. Put your markdown files in the configured directory (or point to an existing directory)

3. Run the builder:
   ```bash
   npm run build
   ```

4. View the visualization:
   ```bash
   npm run serve
   ```

5. Open http://localhost:8000 in your browser

## Configuration

Edit `config.json` to customize behavior:

```json
{
  "contentPath": "./content",
  "outputPath": "./docs/graph-data.json",
  "filePatterns": ["**/*.md"],
  "excludePatterns": [
    "node_modules/**",
    "**/node_modules/**",
    "README.md"
  ],
  "relationships": {
    "detectLinks": true,
    "detectTags": true,
    "detectSeries": true,
    "detectDateProximity": true,
    "dateProximityDays": 7
  },
  "visualization": {
    "colorScheme": "pastel"
  },
  "enrichment": {
    "enabled": false,
    "batchSize": 5,
    "model": "claude-sonnet-4-20250514"
  }
}
```

### Configuration options

**Path settings:**
- `contentPath`: Directory containing your markdown files (relative or absolute path)
- `outputPath`: Where to write the graph data JSON
- `filePatterns`: Glob patterns for finding markdown files
- `excludePatterns`: Files to ignore

**Relationship detection:**
- `relationships.detectLinks`: Extract explicit markdown/HTML links between documents
- `relationships.detectTags`: Create connections between documents with shared tags
- `relationships.detectSeries`: Detect "part 1", "part 2" relationships in titles
- `relationships.detectDateProximity`: Connect documents published close together
- `relationships.dateProximityDays`: Days threshold for proximity connections

**Visualization:**
- `visualization.colorScheme`: Color scheme for nodes (currently only "pastel" supported)

**AI enrichment (optional):**
- `enrichment.enabled`: Enable AI-powered relationship discovery
- `enrichment.batchSize`: Number of documents to process per API call
- `enrichment.model`: Claude model to use for enrichment

## Frontmatter schema

The builder works best with structured frontmatter. Here's what it looks for:

```yaml
---
title: "Your Title"
summary: "Brief description"
published: 2025-10-14
updated: 2025-10-15
tags: [tag1, tag2, tag3]
api-id: unique-identifier
api-type: article
permalink: path/to/page.html
---
```

**Required fields:**
- `title`: Document title (documents without titles are skipped)

**Recommended fields:**
- `tags`: Array of tags for relationship detection
- `api-id`: Unique identifier (falls back to filename if not provided)
- `published`: Publication date for proximity detection (ISO 8601 format or YYYY-MM-DD)
- `permalink`: URL path for the visualization links

**Optional fields:**
- `summary`: Brief description (shown in tooltips)
- `updated`: Last updated date
- `api-type`: Content type (e.g., "article", "page")

## Relationship types

The builder detects several types of relationships between documents:

### Explicit links
Direct markdown or HTML links between documents.

**Detection:** Scans content for `[text](url.md)` or `[text](url.html)` patterns  
**Edge type:** `link`  
**Weight:** 1.0 (strongest connection)

**Example:** Article A links to Article B in its content â†’ creates a link edge

### Tag similarity
Documents that share tags are connected. More shared tags = stronger connection.

**Detection:** Compares tag arrays in frontmatter  
**Edge type:** `tag`  
**Weight:** 0.3 Ã— (shared tags / total unique tags)

**Example:** 
- Article A has tags: [ai, documentation, automation]
- Article B has tags: [ai, documentation, testing]
- Weight: 0.3 Ã— (2 shared / 4 total) = 0.15

### Series relationships
Documents with sequential numbering in titles (e.g., "part 1", "part 2").

**Detection:** Matches "part N" patterns in titles with same base title  
**Edge type:** `series`  
**Weight:** 0.8

**Example:** 
- "I miss reltables, part 1" 
- "I miss reltables, part 2"
- "I miss reltables, part 3"

All three are connected sequentially.

### Date proximity
Documents published within N days of each other (configurable).

**Detection:** Compares `published` dates in frontmatter  
**Edge type:** `temporal`  
**Weight:** 0.2

**Example:** Articles published within 7 days of each other get connected.

## Visualization

The visualization (`docs/index.html`) provides an interactive graph with:

### Features
- **Interactive force-directed graph** - nodes push and pull based on relationships
- **Node coloring** - different colors for different content types
- **Hover tooltips** - see full metadata without cluttering the view
- **Click to navigate** - opens the actual document in a new tab
- **Search** - find specific documents by title or summary
- **Filters** - filter by content type or tag
- **Multiple layouts** - switch between force-directed, radial, and clustered views
- **Zoom and pan** - navigate large graphs easily
- **Drag nodes** - reposition for better viewing

### Layout modes

**Force-directed (default):**
- Physics-based simulation
- Nodes repel each other
- Connected nodes attract
- Best for showing natural clustering

**Radial:**
- Nodes arranged in a circle
- Good for seeing all nodes at once
- Fixed positions, no physics

**Clustered:**
- Groups by primary tag
- Each cluster in a grid cell
- Good for tag-based organization

### Visual indicators

**Node size:** Larger nodes = more connections  
**Node color:** Different colors for different content types  
**Edge colors:**
- Blue = direct links
- Green = series relationships
- Yellow = shared tags
- Red = date proximity

## AI enrichment (totally optional)

Use Claude API to discover deeper semantic relationships between documents that aren't captured by explicit links or tags.

### Setup

1. Get an API key from https://console.anthropic.com/

2. Create a `.env` file:
   ```bash
   cp .env.example .env
   ```

3. Add your API key:
   ```
   ANTHROPIC_API_KEY=your_key_here
   ```

4. Run with enrichment:
   ```bash
   npm run build:enrich
   ```

### How enrichment works

The AI enrichment feature:
- Analyzes document titles, summaries, and tags
- Identifies thematic connections beyond explicit links
- Detects conceptual relationships (e.g., "prerequisite", "semantic similarity", "contrasts")
- Suggests relationship strength based on content similarity
- Only suggests relationships not already captured by other detection methods

**Example relationships it might find:**
- A troubleshooting guide and the feature it's troubleshooting
- A beginner tutorial and advanced guide on the same topic
- Two articles discussing opposing approaches to the same problem

**Cost considerations:**
- Processes documents in batches (configurable in `config.json`)
- Uses Claude Sonnet 4 by default
- Cost depends on number of documents and batch size
- Typical cost: $0.01-0.05 for ~50 documents

## Output format

The builder generates `graph-data.json` in this format:

```json
{
  "nodes": [
    {
      "id": "unique-id",
      "title": "Document Title",
      "summary": "Brief description",
      "type": "article",
      "tags": ["tag1", "tag2"],
      "url": "path/to/doc.html",
      "published": "2025-10-14",
      "updated": "2025-10-15"
    }
  ],
  "edges": [
    {
      "source": "node-id-1",
      "target": "node-id-2",
      "type": "link",
      "weight": 1.0
    }
  ],
  "metadata": {
    "generated": "2025-10-31T12:00:00Z",
    "nodeCount": 50,
    "edgeCount": 123,
    "enriched": false
  }
}
```

## Using in CI/CD

Add to your GitHub Actions workflow to automatically rebuild the graph when content changes:

```yaml
name: Build Knowledge Graph

on:
  push:
    paths:
      - 'content/**/*.md'
      - 'blog/**/*.md'

jobs:
  build-graph:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd knowledge-graph-builder
          npm install
      
      - name: Build graph
        run: |
          cd knowledge-graph-builder
          npm run build
      
      - name: Commit graph data
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add knowledge-graph-builder/docs/graph-data.json
          git commit -m "Update knowledge graph" || exit 0
          git push
```

## Typical workflow

### For a new site

1. Clone this repo into your project:
   ```bash
   git clone https://github.com/yourusername/knowledge-graph-builder
   cd knowledge-graph-builder
   npm install
   ```

2. Update `config.json` to point to your content:
   ```json
   {
     "contentPath": "../my-site/blog"
   }
   ```

3. Build and view:
   ```bash
   npm run build
   npm run serve
   ```

4. Optionally, copy `docs/` to your site's public directory for hosting

### For ongoing use

Run `npm run build` whenever you add new content. The graph will update automatically.

You can also:
- Set up a git hook to rebuild on commit
- Add to your site's build script
- Run in CI/CD (see above)

## Project structure

```
knowledge-graph-builder/
├── src/
│   └── graph-builder.js       # Main builder script
├── docs/
│   ├── index.html             # Visualization UI
│   ├── kg-viz.js              # Visualization JavaScript
│   ├── graph-data.json        # Generated graph data
│   └── example-graph-data.json # Pre-built example
├── content/
│   └── examples/              # Example markdown files
├── config.json                 # Configuration
├── package.json
├── .gitignore
├── .env.example
└── README.md
```

## Example content

The repository includes example markdown files in `content/examples/` demonstrating a fictional WeatherFlow API documentation set. This example shows all relationship types including links, tags, series, and AI-enriched semantic connections. This example content is fully Claude-generated. I didn't even read it before plopping it in the repo, I just wanted something basic and accessible.

To build the example graph:
```bash
node src/graph-builder.js --content ./content/examples --output ./docs/example-graph-data.json
```

To view the example visualization, open `docs/index.html` in a browser and it will load `example-graph-data.json` by default.

## Troubleshooting

### "No nodes found"
- Check that `contentPath` points to the correct directory
- Verify your markdown files have `title` in frontmatter
- Check file patterns in `config.json`

### "Graph is blank"
- Make sure `npm run build` completed successfully
- Check browser console for errors (F12)
- Verify `graph-data.json` exists and has data
- Try accessing http://localhost:8000/graph-data.json directly

### "No relationships found"
- Check that documents have tags in frontmatter
- Verify documents link to each other in content
- Add `published` dates for temporal relationships
- Consider using more consistent tagging

### AI enrichment not working
- Verify `ANTHROPIC_API_KEY` is set in `.env`
- Check that `.env` file is in the project root
- Make sure you have API credits available
- Check console for error messages

## Contributing

I don't really intend to maintain this, if you want to contribute, fork it and build something cool for yourself, then talk about it online :)

## Customizing for your needs

This tool is designed to be modified. Here are some ideas:

**Add new relationship types**: Edit `src/graph-builder.js` and add your own detection methods. For example, you could detect relationships based on:
- Author names
- Document types
- Your own custom frontmatter fields
- Content similarity
- Citation patterns

**Change the visualization**: Edit `docs/kg-viz.js` to:
- Add new layout modes
- Change colors and styling
- Add filtering options
- Create custom tooltips
- Export graphs as images

**Extend the data model**: Modify the node and edge structures to include additional metadata relevant to your documentation.

The code is yours to hack on. Break things, fix them, and learn how knowledge graphs work in practice.

## License

MIT

## Credits

Built with:
- [D3.js](https://d3js.org/) for visualization
- [gray-matter](https://github.com/jonschlinkert/gray-matter) for frontmatter parsing
- [glob](https://github.com/isaacs/node-glob) for file finding
- [Commander.js](https://github.com/tj/commander.js) for CLI
- [Anthropic Claude](https://anthropic.com/) for AI enrichment (optional)
- I used Claude.ai for helping write the code for this project
