import { AiGateway } from 'providers';
import { PromptCompiler } from './prompt_compiler.js';
import { Validator } from './validator.js';
import { DidacticMode, SubjectProfile, GenerationRequirement, ValidationFinding } from 'contracts';

export class DidacticGenerator {
  private gateway: AiGateway;
  private compiler: PromptCompiler;
  private validator: Validator;

  constructor(gateway: AiGateway) {
    this.gateway = gateway;
    this.compiler = new PromptCompiler();
    this.validator = new Validator();
  }

  public async generateChapter(
    jobId: string,
    mode: DidacticMode,
    profile: SubjectProfile,
    chapterTitle: string,
    requirements: GenerationRequirement[],
    evidences: string[]
  ): Promise<{ text: string, hash: string, status: string, findings: ValidationFinding[] }> {
    let retryCount = 0;
    const maxRetries = 2;
    
    let currentPrompt = this.compiler.compileChapterPrompt(mode, profile, chapterTitle, requirements, evidences);
    let generatedText = '';
    let findings: ValidationFinding[] = [];

    while (retryCount <= maxRetries) {
      // 1. Call provider
      const response = await this.gateway.generate(jobId, currentPrompt);
      generatedText = response.text;
      
      // 2. Validate
      findings = this.validator.validateChapter(mode, requirements, generatedText, chapterTitle);
      
      const criticalFindings = findings.filter(f => f.severity === 'CRITICAL');
      if (criticalFindings.length === 0) {
        // Success
        return {
          text: generatedText,
          hash: response.hash,
          status: 'VALIDATED',
          findings
        };
      }

      // 3. Repair loop
      retryCount++;
      if (retryCount <= maxRetries) {
        const repairInstructions = criticalFindings.map(f => `- ${f.explanation} (Azione: ${f.proposedAction})`).join('\n');
        currentPrompt = `Il seguente testo generato contiene difetti critici:\n\n${generatedText}\n\nPer favore correggi secondo questi findings:\n${repairInstructions}`;
      }
    }

    return {
      text: generatedText,
      hash: 'fallback-hash',
      status: 'NEEDS_REVIEW',
      findings
    };
  }
}
