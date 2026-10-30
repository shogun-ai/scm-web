const validTerms = (principal, rate, months) => Number.isFinite(principal) && principal > 0
  && Number.isFinite(rate) && rate >= 0
  && Number.isInteger(months) && months >= 1 && months <= 1200;

// expm1/log1p preserve precision when the monthly rate is close to zero.
function annuityFactor(rate, months) {
  return rate === 0 ? months : -Math.expm1(-months * Math.log1p(rate)) / rate;
}

export function calculateAnnuityPayment(principal, monthlyRate, months) {
  if (!validTerms(principal, monthlyRate, months)) return null;
  const payment = principal / annuityFactor(monthlyRate, months);
  return Number.isFinite(payment) && payment > 0 ? payment : null;
}

// Bullet loan: monthly interest + spread costs each period, full principal at end.
export function calculateBulletMonthlyPayment(principal, monthlyRate, months, totalCosts) {
  if (!validTerms(principal, monthlyRate, months)
    || !Number.isFinite(totalCosts) || totalCosts < 0) return null;
  const p = monthlyRate * principal + totalCosts / months;
  return Number.isFinite(p) && p >= 0 ? p : null;
}

export function calculateBulletAPR(principal, monthlyRate, months, totalCosts) {
  if (!validTerms(principal, monthlyRate, months)
    || !Number.isFinite(totalCosts) || totalCosts < 0) return null;
  const monthlyPayment = calculateBulletMonthlyPayment(principal, monthlyRate, months, totalCosts);
  if (monthlyPayment === null) return null;
  if (totalCosts === 0) return monthlyRate * 1200;
  // Find i: PV of (monthlyPayment each period + principal at end) = principal
  function npv(i) {
    let pv = 0;
    const d = 1 + i;
    let dp = d;
    for (let t = 1; t <= months; t++) { pv += monthlyPayment / dp; dp *= d; }
    pv += principal / dp * d; // principal / (1+i)^months
    return pv;
  }
  let low = 0;
  let high = Math.max(1, monthlyRate * 10);
  while (npv(high) > principal) { high *= 2; if (!Number.isFinite(high)) return null; }
  for (let k = 0; k < 200; k++) {
    const mid = low + (high - low) / 2;
    if (mid === low || mid === high) break;
    if (npv(mid) > principal) low = mid; else high = mid;
  }
  const annual = (low + (high - low) / 2) * 1200;
  return Number.isFinite(annual) ? annual : null;
}

export function calculateAPR(principal, monthlyRate, months, totalCosts) {
  if (!validTerms(principal, monthlyRate, months)
    || !Number.isFinite(totalCosts) || totalCosts < 0) return null;
  const payment = calculateAnnuityPayment(principal + totalCosts, monthlyRate, months);
  if (payment === null) return null;
  if (totalCosts === 0) {
    const annual = monthlyRate * 1200;
    return Number.isFinite(annual) ? annual : null;
  }
  // Compare factors instead of multiplying payment by a potentially large PV factor.
  const target = principal / payment;
  let low = 0;
  let high = Math.max(1, monthlyRate);
  while (annuityFactor(high, months) > target) {
    high *= 2;
    if (!Number.isFinite(high)) return null;
  }
  for (let k = 0; k < 200; k++) {
    const mid = low + (high - low) / 2;
    if (mid === low || mid === high) break;
    if (annuityFactor(mid, months) > target) low = mid;
    else high = mid;
  }
  const annual = (low + (high - low) / 2) * 1200;
  return Number.isFinite(annual) ? annual : null;
}
