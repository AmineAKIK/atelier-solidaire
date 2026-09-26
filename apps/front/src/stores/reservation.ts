import { computed, reactive, ref } from 'vue'
import { defineStore } from 'pinia'

import {
  ApiError,
  createReservation,
  getAvailability,
  type ApiCategoryCode,
  type ApiErrorCode,
  type AvailabilityResponse,
} from '../services/api'

/** Category identifiers used by the participant interface. */
export type CategoryId = 'informatique' | 'electromenager' | 'couture' | 'autre'

/** Categories that can be submitted directly to the reservation API. */
export type ReservableCategoryId = Exclude<CategoryId, 'autre'>

/** Participant information collected before the reservation is submitted. */
export interface Participant {
  firstName: string
  lastName: string
  email: string
  item: string
  problem: string
}

/** Minimal confirmation state retained after a successful reservation. */
export interface ReservationConfirmation {
  reservationId: number
  status: string
}

const categoryLabels: Record<CategoryId, string> = {
  informatique: 'Informatique',
  electromenager: 'Petit électroménager',
  couture: 'Couture & textile',
  autre: 'Je ne sais pas / autre',
}

const categoryCodes: Record<ReservableCategoryId, ApiCategoryCode> = {
  informatique: 'IT',
  electromenager: 'PEM',
  couture: 'TXT',
}

const workshopDateFormatter = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'full',
  timeZone: 'Europe/Paris',
})

const workshopTimeFormatter = new Intl.DateTimeFormat('fr-FR', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Europe/Paris',
})

function formatDate(value?: string): string {
  return value ? workshopDateFormatter.format(new Date(value)) : ''
}

function formatTime(value?: string): string {
  return value ? workshopTimeFormatter.format(new Date(value)) : ''
}

/**
 * Central reservation store for workshop availability, participant data, and submission state.
 */
export const useReservationStore = defineStore('reservation', () => {
  const category = ref<CategoryId>('informatique')
  const selectedSlotId = ref<number | null>(null)

  const participant = reactive<Participant>({
    firstName: '',
    lastName: '',
    email: '',
    item: '',
    problem: '',
  })

  const availabilityLoading = ref(false)
  const availabilityError = ref('')
  const availabilityData = ref<AvailabilityResponse | null>(null)

  const submissionLoading = ref(false)
  const submissionError = ref('')
  const submissionErrorCode = ref<ApiErrorCode | null>(null)
  const confirmation = ref<ReservationConfirmation | null>(null)

  const categoryLabel = computed(() => categoryLabels[category.value])

  const categoryApiCode = computed<ApiCategoryCode | null>(() => {
    if (category.value === 'autre') {
      return null
    }

    return categoryCodes[category.value]
  })

  const workshop = computed(() => availabilityData.value?.workshop ?? null)

  const workshopDate = computed(() => formatDate(workshop.value?.startsAt))

  const workshopTimeRange = computed(() => {
    if (!workshop.value) {
      return ''
    }

    return formatTime(workshop.value.startsAt) + ' — ' + formatTime(workshop.value.endsAt)
  })

  const workshopLocation = computed(() => {
    if (!workshop.value) {
      return ''
    }

    return workshop.value.locationName + ' — ' + workshop.value.city
  })

  const workshopCategories = computed(() => {
    const names = new Map<ApiCategoryCode, string>()

    for (const slot of availabilityData.value?.availability ?? []) {
      names.set(slot.categoryCode, slot.categoryName)
    }

    return Array.from(names.values())
  })

  const categorySlots = computed(() => {
    const code = categoryApiCode.value

    if (!code) {
      return []
    }

    return (availabilityData.value?.availability ?? []).filter(
      (slot) => slot.categoryCode === code,
    )
  })

  const selectedSlot = computed(
    () =>
      availabilityData.value?.availability.find((slot) => slot.slotId === selectedSlotId.value) ??
      null,
  )

  const arrivalTime = computed(() => selectedSlot.value?.localTime ?? '')

  const canContinueToParticipant = computed(
    () =>
      category.value !== 'autre' &&
      selectedSlot.value !== null &&
      selectedSlot.value.remaining > 0,
  )

  /**
   * Selects a participant-facing category and clears any slot selected for a previous category.
   *
   * @param nextCategory - Category chosen on the workshop page.
   */
  function selectCategory(nextCategory: CategoryId): void {
    category.value = nextCategory
    selectedSlotId.value = null
    submissionError.value = ''
    submissionErrorCode.value = null
  }

  /**
   * Selects an available API slot for the current category.
   *
   * @param slotId - Slot identifier returned by the availability endpoint.
   */
  function selectSlot(slotId: number): void {
    const slot = categorySlots.value.find((candidate) => candidate.slotId === slotId)

    if (!slot || slot.remaining <= 0) {
      return
    }

    selectedSlotId.value = slotId
  }

  /**
   * Loads the configured workshop and its availability.
   *
   * @param force - Reload even when availability has already been fetched.
   */
  async function loadAvailability(force = false): Promise<void> {
    if (availabilityData.value && !force) {
      return
    }

    const workshopId = Number(import.meta.env.VITE_WORKSHOP_ID)

    if (!Number.isInteger(workshopId) || workshopId <= 0) {
      availabilityError.value = "Les informations de l'atelier sont indisponibles."
      return
    }

    availabilityLoading.value = true
    availabilityError.value = ''

    try {
      availabilityData.value = await getAvailability(workshopId)
    } catch (error) {
      availabilityError.value =
        error instanceof ApiError
          ? error.message
          : "Impossible de charger les informations de l'atelier."
    } finally {
      availabilityLoading.value = false
    }
  }

  /**
   * Submits the current reservation to the API and stores a user-safe confirmation state.
   *
   * @returns Whether the reservation was accepted by the API.
   */
  async function submitReservation(): Promise<boolean> {
    if (submissionLoading.value) {
      return false
    }

    if (category.value === 'autre') {
      submissionError.value =
        "Cette demande doit d'abord être vérifiée par l'association avant toute réservation."
      submissionErrorCode.value = null
      return false
    }

    const slot = selectedSlot.value

    if (!slot || slot.remaining <= 0) {
      submissionError.value = "Choisissez une heure disponible avant de confirmer."
      submissionErrorCode.value = null
      return false
    }

    submissionLoading.value = true
    submissionError.value = ''
    submissionErrorCode.value = null

    try {
      // Client-side checks improve feedback, but the API remains authoritative for all booking rules.
      const response = await createReservation({
        slotId: slot.slotId,
        categoryId: slot.categoryId,
        firstName: participant.firstName,
        lastName: participant.lastName,
        email: participant.email,
        itemName: participant.item,
        problemDescription: participant.problem,
      })

      confirmation.value = {
        reservationId: response.reservation.id,
        status: response.reservation.status,
      }

      return true
    } catch (error) {
      if (error instanceof ApiError) {
        submissionError.value = error.message
        submissionErrorCode.value = error.code

        if (error.code === 'capacity_full') {
          await loadAvailability(true)
        }
      } else {
        submissionError.value =
          'Le service de réservation rencontre un problème. Réessayez dans quelques instants.'
        submissionErrorCode.value = 'server_error'
      }

      return false
    } finally {
      submissionLoading.value = false
    }
  }

  return {
    category,
    selectedSlotId,
    participant,
    availabilityLoading,
    availabilityError,
    availabilityData,
    submissionLoading,
    submissionError,
    submissionErrorCode,
    confirmation,
    categoryLabel,
    categoryApiCode,
    workshop,
    workshopDate,
    workshopTimeRange,
    workshopLocation,
    workshopCategories,
    categorySlots,
    selectedSlot,
    arrivalTime,
    canContinueToParticipant,
    selectCategory,
    selectSlot,
    loadAvailability,
    submitReservation,
  }
})
