import { Recommendation } from '../../models';

export interface ExecutionResult {
  success: boolean;
  message: string;
  executedAt: string;
}

export async function executeAction(recommendation: Recommendation): Promise<ExecutionResult> {
  // TODO: Replace with real Meta Ads API calls
  // For MVP, this logs what would happen

  const { action, actionParams, entityId } = recommendation;

  switch (action) {
    case 'pause_campaign':
      return mockExecute(`Paused campaign ${entityId}`);
    case 'start_campaign':
      return mockExecute(`Started campaign ${entityId}`);
    case 'increase_budget':
      return mockExecute(`Increased budget for ${entityId} by ${actionParams.percentage}%`);
    case 'decrease_budget':
      return mockExecute(`Decreased budget for ${entityId} by ${actionParams.percentage}%`);
    default:
      return { success: false, message: `Unknown action: ${action}`, executedAt: new Date().toISOString() };
  }
}

function mockExecute(message: string): ExecutionResult {
  return {
    success: true,
    message: `[MOCK] ${message}`,
    executedAt: new Date().toISOString(),
  };
}
