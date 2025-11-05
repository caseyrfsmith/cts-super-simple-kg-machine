#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import yaml from 'js-yaml';
import { glob } from 'glob';
import { program } from 'commander';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';


config(); // load env file

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class KnowledgeGraphBuilder {
  constructor(configPath = './config.json') {
    // Try to find config in current directory first, then in tool directory
    let config;
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } else {
      const defaultConfigPath = path.join(__dirname, '..', 'config.json');
      if (fs.existsSync(defaultConfigPath)) {
        config = JSON.parse(fs.readFileSync(defaultConfigPath, 'utf-8'));
      } else {
        throw new Error('Config file not found');
      }
    }
    this.config = config;
    this.nodes = new Map();
    this.edges = [];
    this.tagIndex = new Map();
  }

  async build(options = {}) {
    console.log(' Building knowledge graph...\n');
    
    const files = await this.findMarkdownFiles();
    console.log(` Found ${files.length} markdown files\n`);
    
    // Parse files and build nodes
    for (const file of files) {
      await this.processFile(file);
    }
    
    console.log(` Processed ${this.nodes.size} nodes\n`);
    
    // Extract links AFTER all nodes are created
    if (this.config.relationships.detectLinks) {
      console.log(' Extracting links...');
      for (const [nodeId, node] of this.nodes.entries()) {
        if (node._body) {
          this.extractLinks(nodeId, node._body);
          delete node._body; // Clean up temporary content
        }
      }
    }
    
    // Build relationships
    if (this.config.relationships.detectTags) {
      this.buildTagRelationships();
    }
    
    if (this.config.relationships.detectSeries) {
      this.buildSeriesRelationships();
    }
    
    // Always build book relationships
    this.buildBookRelationships();
    
    console.log(` Created ${this.edges.length} edges\n`);
    
    // AI enrichment (optional)
    if (options.enrich) {
      await this.enrichWithAI();
    }
    
    // Write output
    this.writeOutput();
    
    console.log(' Graph built successfully!');
    console.log(` Final stats: ${this.nodes.size} nodes, ${this.edges.length} edges`);
  }

  async findMarkdownFiles() {
    const patterns = this.config.filePatterns.map(p => 
      path.join(this.config.contentPath, p)
    );
    
    const files = await glob(patterns, {
      ignore: this.config.excludePatterns
    });
    
    return files;
  }

  async processFile(filepath) {
    try {
      // Check if this is a YAML file
      if (filepath.endsWith('.yml') || filepath.endsWith('.yaml')) {
        await this.processYamlFile(filepath);
        return;
      }
      
      const content = fs.readFileSync(filepath, 'utf-8');
      const { data: frontmatter, content: body } = matter(content);
      
      // Skip files without titles
      if (!frontmatter.title) {
        console.log(`  Skipping ${filepath} (no title in frontmatter)`);
        return;
      }
      
      // Create node ID
      const nodeId = frontmatter['api-id'] || this.getFileId(filepath);
      
      // Build node
      const node = {
        id: nodeId,
        title: frontmatter.title,
        summary: frontmatter.summary || '',
        type: frontmatter['api-type'] || 'page',
        tags: frontmatter.tags || [],
        url: frontmatter.permalink || this.getRelativeUrl(filepath),
        published: frontmatter.published || null,
        updated: frontmatter.updated || null,
        filepath: filepath,
        series: frontmatter.series || null,
        series_order: frontmatter.series_order || null
      };
      
      this.nodes.set(nodeId, node);
      
      // Index tags
      for (const tag of node.tags) {
        if (!this.tagIndex.has(tag)) {
          this.tagIndex.set(tag, []);
        }
        this.tagIndex.get(tag).push(nodeId);
      }
      
      // Store the body content for later link extraction
      node._body = body;
      
    } catch (error) {
      console.error(` Error processing ${filepath}:`, error.message);
    }
  }

  async processYamlFile(filepath) {
    try {
      const content = fs.readFileSync(filepath, 'utf-8');
      const data = yaml.load(content);
      
      // Handle reading_list.yml specifically
      if (data.reading_list) {
        for (const book of data.reading_list) {
          if (!book.title) continue;
          
          const nodeId = book.id || `book-${book.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
          
          const node = {
            id: nodeId,
            title: book.title,
            summary: book.notes || `${book.status} - ${book.genre || 'book'}`,
            type: 'book',
            tags: book.tags || [book.genre, book.status].filter(Boolean),
            url: book.url || 'books.html',
            published: book.date_added || null,
            updated: book.date_finished || null,
            filepath: filepath,
            author: book.author,
            rating: book.rating || null,
            status: book.status,
            genre: book.genre
          };
          
          this.nodes.set(nodeId, node);
          
          // Index tags
          for (const tag of node.tags) {
            if (!this.tagIndex.has(tag)) {
              this.tagIndex.set(tag, []);
            }
            this.tagIndex.get(tag).push(nodeId);
          }
        }
        console.log(`  Processed ${data.reading_list.length} books from ${path.basename(filepath)}`);
      }
    } catch (error) {
      console.error(` Error processing YAML ${filepath}:`, error.message);
    }
  }

  getFileId(filepath) {
    return path.basename(filepath, '.md')
      .replace(/^\d+-\d+-\d+-/, ''); // Remove date prefix if present
  }

  getRelativeUrl(filepath) {
    return filepath
      .replace(this.config.contentPath, '')
      .replace(/\.md$/, '.html')
      .replace(/^\//, '');
  }

  extractLinks(sourceId, content) {
    // Match markdown links: [text](url.md) or [text](url.html)
    const mdLinkRegex = /\[([^\]]+)\]\(([^)]+\.(?:md|html))\)/g;
    let match;
    let foundLinks = 0;
    
    // Debug: Show what we're processing
    if (sourceId === 'blog') {
      console.log(`  Extracting links from ${sourceId}...`);
    }
    
    while ((match = mdLinkRegex.exec(content)) !== null) {
      const linkedUrl = match[2];
      
      // Debug: Show what links we found
      if (sourceId === 'blog') {
        console.log(`    Found link: ${linkedUrl}`);
      }
      
      // Find the target node by matching URL or filename
      const targetNode = this.findNodeByUrl(linkedUrl);
      
      if (targetNode) {
        this.addEdge(sourceId, targetNode.id, 'link', 1.0);
        foundLinks++;
        if (sourceId === 'blog') {
          console.log(`      ✓ Matched to node: ${targetNode.id}`);
        }
      } else {
        console.log(`  Could not find target for link: ${linkedUrl} from ${sourceId}`);
      }
    }
    
    if (foundLinks > 0) {
      console.log(`  ${sourceId}: found ${foundLinks} links`);
    }
  }

  findNodeByUrl(url) {
    // Clean the URL
    const cleanUrl = url.replace(/^\.\//, '').replace(/\.md$/, '.html');
    
    // Get just the filename without directory
    const filename = path.basename(cleanUrl);
    
    // Debug: Show what we're trying to match
    const debugMatch = cleanUrl.includes('25-10-28');
    if (debugMatch) {
      console.log(`    Trying to match: "${cleanUrl}" (filename: "${filename}")`);
      console.log(`    Total nodes to check: ${this.nodes.size}`);
    }
    
    let checkedCount = 0;
    for (const node of this.nodes.values()) {
      const nodeFilename = path.basename(node.url);
      
      if (debugMatch) {
        checkedCount++;
        if (node.id === 'reader-simulator-build') {
          console.log(`      FOUND THE NODE! id: ${node.id}, url: "${node.url}", filename: "${nodeFilename}"`);
          console.log(`        filename match check: "${nodeFilename}" === "${filename}" = ${nodeFilename === filename}`);
        }
      }
      
      // Match if:
      // 1. URLs match exactly
      // 2. Filenames match (ignoring directory structure)
      // 3. One URL ends with the other
      // 4. URL without leading path matches node URL
      if (node.url === cleanUrl || 
          nodeFilename === filename ||
          node.url.endsWith('/' + cleanUrl) ||
          node.url.endsWith(cleanUrl)) {
        return node;
      }
    }
    
    // If still not found and URL doesn't have directory, try prepending common dirs
    if (!cleanUrl.includes('/')) {
      for (const node of this.nodes.values()) {
        if (node.url.endsWith('/' + cleanUrl)) {
          return node;
        }
      }
    }
    
    return null;
  }

  buildTagRelationships() {
        console.log(' Building tag relationships...');
    let tagEdges = 0;
    
    for (const [tag, nodeIds] of this.tagIndex.entries()) {
      // Connect all nodes that share this tag
      for (let i = 0; i < nodeIds.length; i++) {
        for (let j = i + 1; j < nodeIds.length; j++) {
          const node1 = this.nodes.get(nodeIds[i]);
          const node2 = this.nodes.get(nodeIds[j]);
          
          // Calculate weight based on shared tags
          const sharedTags = node1.tags.filter(t => node2.tags.includes(t)).length;
          const totalUniqueTags = new Set([...node1.tags, ...node2.tags]).size;
          const weight = 0.3 * (sharedTags / totalUniqueTags);
          
          this.addEdge(nodeIds[i], nodeIds[j], 'tag', weight);
          tagEdges++;
        }
      }
    }
    
    console.log(`  Created ${tagEdges} tag relationships`);
  }

  buildSeriesRelationships() {
    console.log(' Building series relationships...');
    let seriesEdges = 0;
    
    // Group nodes by series
    const seriesGroups = new Map();
    
    for (const node of this.nodes.values()) {
      // Check if node has series in any of its data
      const series = node.series;
      const seriesOrder = node.series_order;
      
      if (series && seriesOrder !== undefined) {
        console.log(`  Found series item: ${node.title} (${series} #${seriesOrder})`);
        if (!seriesGroups.has(series)) {
          seriesGroups.set(series, []);
        }
        seriesGroups.get(series).push({
          id: node.id,
          order: parseInt(seriesOrder)
        });
      }
    }
    
    console.log(`  Found ${seriesGroups.size} series groups`);
    
    // Connect sequential items in each series
    for (const [seriesName, items] of seriesGroups.entries()) {
      // Sort by order
      items.sort((a, b) => a.order - b.order);
      
      console.log(`  Series "${seriesName}": ${items.length} items`);
      
      // Connect each item to the next
      for (let i = 0; i < items.length - 1; i++) {
        this.addEdge(items[i].id, items[i + 1].id, 'series', 0.8);
        seriesEdges++;
      }
    }
    
    console.log(`  Created ${seriesEdges} series relationships`);
  }

  buildDateProximityRelationships() {
        console.log(' Building date proximity relationships...');
    let dateEdges = 0;
    
    const nodesWithDates = Array.from(this.nodes.values())
      .filter(n => n.published);
    
    for (let i = 0; i < nodesWithDates.length; i++) {
      for (let j = i + 1; j < nodesWithDates.length; j++) {
        const node1 = nodesWithDates[i];
        const node2 = nodesWithDates[j];
        
        const date1 = new Date(node1.published);
        const date2 = new Date(node2.published);
        
        const daysDiff = Math.abs((date2 - date1) / (1000 * 60 * 60 * 24));
        
        if (daysDiff <= this.config.relationships.dateProximityDays) {
          this.addEdge(node1.id, node2.id, 'temporal', 0.2);
          dateEdges++;
        }
      }
    }
    
    console.log(`  Created ${dateEdges} temporal relationships`);
  }
  
  buildBookRelationships() {
    console.log(' Building book relationships...');
    let bookEdges = 0;
    
    const books = Array.from(this.nodes.values()).filter(n => n.type === 'book');
    
    // Group by author
    const authorMap = new Map();
    for (const book of books) {
      if (book.author) {
        if (!authorMap.has(book.author)) {
          authorMap.set(book.author, []);
        }
        authorMap.get(book.author).push(book);
      }
    }
    
    // Connect books by same author
    for (const [author, authorBooks] of authorMap.entries()) {
      if (authorBooks.length > 1) {
        for (let i = 0; i < authorBooks.length; i++) {
          for (let j = i + 1; j < authorBooks.length; j++) {
            this.addEdge(authorBooks[i].id, authorBooks[j].id, 'same-author', 0.5);
            bookEdges++;
          }
        }
      }
    }
    
    console.log(`  Created ${bookEdges} book relationships`);
  }
  
  buildBookRelationships() {
    console.log(' Building book relationships...');
    let bookEdges = 0;
    
    // Group books by author
    const authorGroups = new Map();
    
    for (const node of this.nodes.values()) {
      if (node.type === 'book' && node.author) {
        if (!authorGroups.has(node.author)) {
          authorGroups.set(node.author, []);
        }
        authorGroups.get(node.author).push(node.id);
      }
    }
    
    // Connect books by same author
    for (const [author, bookIds] of authorGroups.entries()) {
      if (bookIds.length > 1) {
        for (let i = 0; i < bookIds.length; i++) {
          for (let j = i + 1; j < bookIds.length; j++) {
            this.addEdge(bookIds[i], bookIds[j], 'same-author', 0.4);
            bookEdges++;
          }
        }
      }
    }
    
    console.log(`  Created ${bookEdges} author relationships`);
  }

  addEdge(sourceId, targetId, type, weight) {
    // Check if edge of this TYPE already exists between these nodes
    const existing = this.edges.find(e => 
      e.type === type &&
      ((e.source === sourceId && e.target === targetId) ||
       (e.source === targetId && e.target === sourceId))
    );
    
    if (!existing) {
      this.edges.push({
        source: sourceId,
        target: targetId,
        type: type,
        weight: weight
      });
    }
  }

  async enrichWithAI() {
    console.log('\nEnriching with AI...');
    
    try {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const apiKey = process.env.ANTHROPIC_API_KEY;
      
      if (!apiKey) {
        console.log('  ANTHROPIC_API_KEY not found. Skipping AI enrichment.');
        console.log('   Set your API key in .env file to enable this feature.\n');
        return;
      }
      
      const anthropic = new Anthropic({ apiKey });
      
      // Process in batches
      const nodeArray = Array.from(this.nodes.values());
      const batchSize = this.config.enrichment.batchSize;
      
      for (let i = 0; i < nodeArray.length; i += batchSize) {
        const batch = nodeArray.slice(i, i + batchSize);
        console.log(`  Processing batch ${Math.floor(i/batchSize) + 1}...`);
        
        const prompt = this.buildEnrichmentPrompt(batch);
        
        const message = await anthropic.messages.create({
          model: this.config.enrichment.model,
          max_tokens: 2000,
          messages: [{
            role: 'user',
            content: prompt
          }]
        });
        
        const response = message.content[0].text;
        this.parseEnrichmentResponse(response);
      }
      
      console.log('   AI enrichment complete\n');
      
    } catch (error) {
      console.error(' Error during AI enrichment:', error.message);
    }
  }

  buildEnrichmentPrompt(nodes) {
    const nodeDescriptions = nodes.map(n => 
      `ID: ${n.id}\nTitle: ${n.title}\nSummary: ${n.summary}\nTags: ${n.tags.join(', ')}`
    ).join('\n\n');
    
    return `You are analyzing documentation and content to find meaningful semantic relationships.

DOCUMENTS TO ANALYZE:
${nodeDescriptions}

TASK: Identify genuine thematic and conceptual connections between these documents.

RELATIONSHIP TYPES:
- semantic: Documents share a common theme, concept, or subject matter (but aren't obvious from tags alone)
- contrasts: Documents present opposing viewpoints, approaches, or solutions to similar problems

IMPORTANT RULES:
1. ONLY suggest relationships that add meaningful insight beyond what tags/titles already show
2. For EACH relationship, you MUST explain the connecting theme in 2-5 words
3. Weight should reflect strength: 0.9-1.0 = very strong thematic connection, 0.4-0.6 = moderate, 0.1-0.3 = weak
4. Skip relationships that are obvious from shared tags
5. Be selective - quality over quantity

OUTPUT FORMAT (one per line):
RELATIONSHIP: <id1> -> <id2> | <type> | <weight> | THEME: <brief theme description>

EXAMPLES OF GOOD RELATIONSHIPS:
RELATIONSHIP: functional-programming -> oop-patterns | contrasts | 0.7 | THEME: state management approaches
RELATIONSHIP: career-advice -> imposter-syndrome | semantic | 0.6 | THEME: professional growth struggles

Only output RELATIONSHIP lines, nothing else.`;
  }

  parseEnrichmentResponse(response) {
    const lines = response.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('RELATIONSHIP:')) {
        // Parse: RELATIONSHIP: id1 -> id2 | type | weight | THEME: description
        const content = line.replace('RELATIONSHIP:', '').trim();
        const parts = content.split('|').map(p => p.trim());
        
        if (parts.length >= 3) {
          const ids = parts[0];
          const type = parts[1];
          const weight = parts[2];
          
          // Extract theme if present
          let theme = null;
          if (parts.length >= 4 && parts[3].startsWith('THEME:')) {
            theme = parts[3].replace('THEME:', '').trim();
          }
          
          const [source, target] = ids.split('->').map(id => id.trim());
          
          if (this.nodes.has(source) && this.nodes.has(target)) {
            const edge = {
              source: source,
              target: target,
              type: type,
              weight: parseFloat(weight)
            };
            
            if (theme) {
              edge.theme = theme;
            }
            
            this.edges.push(edge);
            console.log(`  Added ${type} relationship: ${source} -> ${target}${theme ? ' (' + theme + ')' : ''}`);
          }
        }
      }
    }
  }

  writeOutput() {
    const outputDir = path.dirname(this.config.outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const output = {
      nodes: Array.from(this.nodes.values()).map(n => ({
        id: n.id,
        title: n.title,
        summary: n.summary,
        type: n.type,
        tags: n.tags,
        url: n.url,
        published: n.published,
        updated: n.updated
      })),
      edges: this.edges,
      metadata: {
        generated: new Date().toISOString(),
        nodeCount: this.nodes.size,
        edgeCount: this.edges.length,
        enriched: !!process.env.ANTHROPIC_API_KEY
      }
    };
    
    fs.writeFileSync(
      this.config.outputPath,
      JSON.stringify(output, null, 2),
      'utf-8'
    );
    
    console.log(`\n Graph data written to ${this.config.outputPath}`);
  }
}

// CLI
program
  .name('build-graph')
  .description('Build knowledge graphs from markdown content')
  .option('-e, --enrich', 'Enable AI enrichment using Claude API')
  .option('-c, --config <path>', 'Path to config file', './config.json')
  .option('--content <path>', 'Override content path from config')
  .option('--output <path>', 'Override output path from config')
  .action(async (options) => {
    try {
      const builder = new KnowledgeGraphBuilder(options.config);
      
      // Allow CLI overrides
      if (options.content) {
        builder.config.contentPath = options.content;
      }
      if (options.output) {
        builder.config.outputPath = options.output;
      }
      
      await builder.build(options);
    } catch (error) {
      console.error(' Error:', error.message);
      process.exit(1);
    }
  });

program.parse();