export type BankrollMode = 'finite' | 'infinite'

export type Profile = {
  id: string
  name: string
  bankrollMode: BankrollMode
  balance: number
  createdAt: number
}
