import { describe, it, expect } from 'vitest';
import { PHASE_1_DIALOGUE_TREES } from '../src/dialogue.js';

describe('Phase 1 Dialogue Trees', () => {
  it('should define valid initial nodes for all Phase 1 dialogue trees', () => {
    expect(PHASE_1_DIALOGUE_TREES['dialogue_farhana_student']).toBeDefined();
    expect(PHASE_1_DIALOGUE_TREES['dialogue_police_rafiq']).toBeDefined();
    expect(PHASE_1_DIALOGUE_TREES['dialogue_artisan_gouranga']).toBeDefined();

    for (const [id, tree] of Object.entries(PHASE_1_DIALOGUE_TREES)) {
      expect(tree.id).toBe(id);
      expect(tree.initialNodeId).toBeTruthy();
      const initialNode = tree.nodes[tree.initialNodeId];
      expect(initialNode).toBeDefined();
      expect(initialNode.textBn.length).toBeGreaterThan(0);
      expect(initialNode.textEn.length).toBeGreaterThan(0);
      expect(initialNode.speakerNameBn.length).toBeGreaterThan(0);
      expect(initialNode.speakerNameEn.length).toBeGreaterThan(0);
    }
  });

  it('should ensure all choices reference valid next nodes or triggers', () => {
    for (const [, tree] of Object.entries(PHASE_1_DIALOGUE_TREES)) {
      for (const [, node] of Object.entries(tree.nodes)) {
        if (node.choices) {
          for (const choice of node.choices) {
            expect(choice.textBn.length).toBeGreaterThan(0);
            expect(choice.textEn.length).toBeGreaterThan(0);
            if (choice.nextNodeId) {
              expect(tree.nodes[choice.nextNodeId]).toBeDefined();
            }
          }
        }
      }
    }
  });

  it('should verify Farhana dialogue triggers passenger boarding for Mission 1', () => {
    const tree = PHASE_1_DIALOGUE_TREES['dialogue_farhana_student'];
    const initial = tree.nodes[tree.initialNodeId];
    const acceptChoice = initial.choices?.find((c) => c.actionTrigger === 'BOARD_PASSENGER');
    expect(acceptChoice).toBeDefined();
    expect(acceptChoice?.nextNodeId).toBe('node_accepted');
  });
});
