import { computed, reactive, ref } from 'vue'
import { defineStore } from 'pinia'

export type CategoryId = 'informatique' | 'electromenager' | 'couture' | 'autre'

export type ArrivalTime = '09:00' | '10:00'

export interface Participant {
  firstName: string
  lastName: string
  email: string
  item: string
  problem: string
}

const categoryLabels: Record<CategoryId, string> = {
  informatique: 'Informatique',
  electromenager: 'Petit électroménager',
  couture: 'Couture & textile',
  autre: 'Je ne sais pas / autre',
}

export const useReservationStore = defineStore('reservation', () => {
  const category = ref<CategoryId>('informatique')
  const arrivalTime = ref<ArrivalTime>('10:00')

  const participant = reactive<Participant>({
    firstName: '',
    lastName: '',
    email: '',
    item: '',
    problem: '',
  })

  const categoryLabel = computed(() => categoryLabels[category.value])

  return {
    category,
    categoryLabel,
    arrivalTime,
    participant,
  }
})
