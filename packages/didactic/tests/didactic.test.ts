import { describe, it, expect, vi } from 'vitest';
import { PromptCompiler } from '../src/prompt_compiler.js';
import { Validator } from '../src/validator.js';
import { DidacticGenerator } from '../src/generator.js';
import { DidacticMode, SubjectProfile, GenerationRequirement } from 'contracts';

describe('Didactic Engine', () => {
  const profile: SubjectProfile = {
    id: 'matematica_base',
    name: 'Matematica',
    focus: 'Derivazioni formali e applicazioni',
    rules: ['Includi passaggi intermedi', 'Usa il punto per i decimali']
  };

  const requirements: GenerationRequirement[] = [
    {
      id: 'req_1',
      description: 'Legge di Gauss',
      source: 'src_1',
      priority: 'HIGH',
      expectedLevel: 'Universitario',
      chapter: 'Capitolo 1',
      developmentCriteria: 'Enunciato, condizioni, significato',
      completionEvidence: 'Blocchi indicati',
      status: 'PENDING'
    }
  ];

  it('Compiler > should merge prompt elements correctly', () => {
    const compiler = new PromptCompiler();
    const prompt = compiler.compileChapterPrompt(
      DidacticMode.COMPLETO,
      profile,
      'Capitolo 1',
      requirements,
      ['Evidenza di prova']
    );

    expect(prompt).toContain('Materia: Matematica');
    expect(prompt).toContain('Modalità: COMPLETO');
    expect(prompt).toContain('Legge di Gauss (Atteso: Enunciato, condizioni, significato)');
    expect(prompt).toContain('[Evidenza]: Evidenza di prova');
    expect(prompt).toContain('Includi passaggi intermedi');
  });

  it('Validator > should return critical finding if generated text lacks requirements', () => {
    const validator = new Validator();
    const findings = validator.validateChapter(
      DidacticMode.COMPLETO,
      requirements,
      'Questo testo parla di argomenti matematici vari, ma non nomina la specifica legge.',
      'Capitolo 1'
    );

    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].severity).toBe('CRITICAL');
    expect(findings[0].type).toBe('SCIENTIFIC');
  });

  it('Validator > should fail structurally for "Solo Gauss" fixture', () => {
    const validator = new Validator();
    const findings = validator.validateChapter(
      DidacticMode.COMPLETO,
      requirements,
      'Solo Gauss',
      'Capitolo 1'
    );

    const didacticFinding = findings.find(f => f.type === 'DIDACTIC');
    expect(didacticFinding).toBeDefined();
    expect(didacticFinding!.severity).toBe('CRITICAL');
  });

  it('Generator > should attempt repair on failure and eventually mark NEEDS_REVIEW', async () => {
    const mockGateway = {
      generate: vi.fn().mockResolvedValue({ text: 'Solo Gauss', hash: 'bad-hash' }),
      getAvailableModels: vi.fn().mockReturnValue([]),
      setBudgetAccount: vi.fn(),
      getBudgetAccount: vi.fn().mockReturnValue('dummy-account')
    } as any;

    const generator = new DidacticGenerator(mockGateway);
    
    const result = await generator.generateChapter(
      'job_1',
      DidacticMode.COMPLETO,
      profile,
      'Capitolo 1',
      requirements,
      ['Evidenza']
    );

    expect(mockGateway.generate).toHaveBeenCalledTimes(3); // 1 initial + 2 repairs
    expect(result.status).toBe('NEEDS_REVIEW');
    expect(result.text).toBe('Solo Gauss');
  });
});
