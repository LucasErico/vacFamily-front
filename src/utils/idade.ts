export function calcularIdade(dataNascimento: string): string {
  const nasc = new Date(dataNascimento)
  const hoje = new Date()
  const diffMs = hoje.getTime() - nasc.getTime()
  const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDias < 30) return `${diffDias} dia${diffDias !== 1 ? 's' : ''}`
  if (diffDias < 365) {
    const meses = Math.floor(diffDias / 30)
    return `${meses} ${meses === 1 ? 'mês' : 'meses'}`
  }
  const anos = Math.floor(diffDias / 365)
  const mesesRestantes = Math.floor((diffDias % 365) / 30)
  if (mesesRestantes > 0) return `${anos} ano${anos !== 1 ? 's' : ''} e ${mesesRestantes} ${mesesRestantes === 1 ? 'mês' : 'meses'}`
  return `${anos} ano${anos !== 1 ? 's' : ''}`
}

export function iniciais(nome: string): string {
  return nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0].toUpperCase())
    .join('')
}

export function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}
