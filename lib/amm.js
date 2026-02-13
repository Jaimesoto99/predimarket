export function calculatePrices(yesPool, noPool) {
  const b = 100
  const expYes = Math.exp(yesPool / b)
  const expNo = Math.exp(noPool / b)
  const yesPrice = expYes / (expYes + expNo)
  return {
    yes: Math.round(yesPrice * 100),
    no: Math.round((1 - yesPrice) * 100)
  }
}