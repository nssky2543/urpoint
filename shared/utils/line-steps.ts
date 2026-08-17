export type LineStepCompleteness = {
  step1: boolean
  step2: boolean
  step3: boolean
  step4: boolean
  complete: boolean
}

export function canAccessLineStep(
  step: number,
  completeness: LineStepCompleteness,
) {
  if (step <= 1) return true
  if (step === 2) return completeness.step1
  if (step === 3) return completeness.step2
  return completeness.step3
}

export function getHighestAccessibleLineStep(
  completeness: LineStepCompleteness,
) {
  if (completeness.step3) return 4
  if (completeness.step2) return 3
  if (completeness.step1) return 2
  return 1
}

export function canAdvanceLineStep(
  step: number,
  completeness: LineStepCompleteness,
) {
  if (step === 1) return completeness.step1
  if (step === 2) return completeness.step2
  if (step === 3) return completeness.step3
  return false
}
