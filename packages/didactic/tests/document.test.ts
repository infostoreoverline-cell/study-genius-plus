import { describe, it, expect, beforeEach } from 'vitest';
import { DocumentAssembler } from '../src/assembler.js';
import { SymbolRegistry } from '../src/symbol_registry.js';
import { DocumentEditor } from '../src/editor.js';
import { ChapterNode, DocumentRevision, FormulaNode, FigureRefNode } from '../../contracts/src/index.js';

describe('Document M11 Tests', () => {
  let assembler: DocumentAssembler;
  let registry: SymbolRegistry;
  let editor: DocumentEditor;

  beforeEach(() => {
    assembler = new DocumentAssembler();
    registry = new SymbolRegistry();
    editor = new DocumentEditor();
  });

  const sampleChapters: ChapterNode[] = [
    {
      id: 'ch1',
      type: 'chapter',
      title: 'Chapter 1',
      hash: 'ch1_hash',
      sourceRefs: [],
      content: [
        {
          id: 'p1',
          type: 'paragraph',
          content: 'Hello world',
          hash: 'p1_hash',
          sourceRefs: []
        },
        {
          id: 'f1',
          type: 'formula',
          latex: 'E = mc^2',
          isBlock: true,
          hash: 'f1_hash',
          sourceRefs: [],
          symbols: [
            { symbol: 'E', meaning: 'Energy', nodeId: 'f1' }
          ]
        },
        {
          id: 'fig1',
          type: 'figure_ref',
          figureId: 'fig_alpha',
          caption: 'Figura X',
          hash: 'fig1_hash',
          sourceRefs: []
        }
      ]
    },
    {
      id: 'ch2',
      type: 'chapter',
      title: 'Chapter 2',
      hash: 'ch2_hash',
      sourceRefs: [],
      content: [
        {
          id: 'f2',
          type: 'formula',
          latex: 'E = \\frac{F}{q}',
          isBlock: true,
          hash: 'f2_hash',
          sourceRefs: [],
          symbols: [
            { symbol: 'E', meaning: 'Electric Field', nodeId: 'f2' }
          ]
        }
      ]
    }
  ];

  it('Assembler should resolve figure numbering', () => {
    const doc = assembler.assemble('Test Doc', JSON.parse(JSON.stringify(sampleChapters)));
    expect(doc.chapters[0].content[2].type).toBe('figure_ref');
    expect((doc.chapters[0].content[2] as FigureRefNode).caption).toBe('Figura 1');
  });

  it('SymbolRegistry should detect conflicts', () => {
    const doc = assembler.assemble('Test Doc', JSON.parse(JSON.stringify(sampleChapters)));
    const conflicts = registry.processDocument(doc);
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].symbol).toBe('E');
    expect(conflicts[0].meanings).toContain('Energy');
    expect(conflicts[0].meanings).toContain('Electric Field');
  });

  it('Editor should reject conflicts from older revisions (two tabs)', () => {
    const doc = assembler.assemble('Test Doc', JSON.parse(JSON.stringify(sampleChapters)));
    
    const initialRev: DocumentRevision = {
      revisionId: 'rev_1',
      documentId: doc.id,
      timestamp: new Date(),
      ast: doc,
      cost: 0
    };

    editor.loadRevision(initialRev);
    
    // Tab 1 edits
    const rev2 = editor.applyPatch('rev_1', {
      nodeId: 'ch1',
      payload: { title: 'Chapter 1 modified' }
    });

    // Tab 2 tries to edit based on rev_1
    expect(() => {
      editor.applyPatch('rev_1', {
        nodeId: 'p1',
        payload: { content: 'Conflict edit' }
      });
    }).toThrow('Conflict: The document has been modified in another session or tab.');
  });

  it('Editor should invalidate dependent figures when formula changes', () => {
    const doc = assembler.assemble('Test Doc', JSON.parse(JSON.stringify(sampleChapters)));
    
    const initialRev: DocumentRevision = {
      revisionId: 'rev_1',
      documentId: doc.id,
      timestamp: new Date(),
      ast: doc,
      cost: 0
    };

    editor.loadRevision(initialRev);
    
    const rev2 = editor.applyPatch('rev_1', {
      nodeId: 'f1',
      payload: { latex: 'E = m c^2 + \text{correction}' }
    });

    const updatedFig = rev2.ast.chapters[0].content[2] as any;
    expect(updatedFig.needsReview).toBe(true);
    expect(updatedFig.hash).not.toBe('fig1_hash'); // Hash should have changed
  });

  it('Editor should allow title change with zero or minimal cost', () => {
    const doc = assembler.assemble('Test Doc', JSON.parse(JSON.stringify(sampleChapters)));
    
    const initialRev: DocumentRevision = {
      revisionId: 'rev_1',
      documentId: doc.id,
      timestamp: new Date(),
      ast: doc,
      cost: 10
    };

    editor.loadRevision(initialRev);
    
    const rev2 = editor.applyPatch('rev_1', {
      nodeId: 'ch2',
      payload: { title: 'Chapter 2 renamed' }
    });

    expect(rev2.cost).toBe(10); // cost unchanged for title change
  });
});
