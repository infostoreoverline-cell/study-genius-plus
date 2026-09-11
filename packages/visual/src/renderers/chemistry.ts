import { VisualSpec, ChemistrySemanticModel } from 'contracts';

export class ChemistryRenderer {
  public render(spec: VisualSpec): string {
    const { widthCssPx: w, heightCssPx: h } = spec.presentation;
    const model = spec.semanticModel as ChemistrySemanticModel;
    const smilesText = model.smiles ? model.smiles : 'NO_SMILES';

    // In a full implementation, smiles-drawer or similar would be used here.
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" id="chem">
      <rect x="0" y="0" width="${w}" height="${h}" fill="#f9f9f9" stroke="#ccc" id="bg" />
      <text x="${w / 2}" y="${h / 2}" text-anchor="middle" font-family="monospace" id="smiles_text">${smilesText}</text>
    </svg>`;
  }
}
