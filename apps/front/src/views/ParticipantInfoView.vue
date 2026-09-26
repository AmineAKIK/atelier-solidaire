<template>
  <div class="page">
    <AppHeader />

    <main class="page-content participant-page">
      <RouterLink to="/reservation/heure" class="back-link">
        ← Retour au choix de l'heure
      </RouterLink>

      <h1>Vos informations</h1>

      <p class="intro">
        Renseignez les informations nécessaires pour préparer votre accueil à l'atelier.
      </p>

      <section class="selection-summary">
        <strong>Votre sélection</strong>

        <div class="summary-grid">
          <div>
            <span>Atelier</span>
            <b>{{ reservation.workshop?.title }}</b>
            <small>{{ reservation.workshopDate }}</small>
          </div>

          <div>
            <span>Catégorie</span>
            <b>{{ reservation.categoryLabel }}</b>
          </div>

          <div>
            <span>Heure d'arrivée</span>
            <b>{{ reservation.arrivalTime }}</b>
          </div>
        </div>

        <RouterLink to="/reservation/heure" class="modify-link"> Modifier mes choix </RouterLink>
      </section>

      <form novalidate @submit.prevent="submit">
        <h2>Informations de contact</h2>

        <div class="two-columns">
          <div class="field">
            <label for="firstName">Prénom *</label>
            <input
              id="firstName"
              v-model.trim="reservation.participant.firstName"
              type="text"
              autocomplete="given-name"
              maxlength="80"
              placeholder="Votre prénom"
              aria-describedby="firstName-help firstName-error"
              :aria-invalid="Boolean(errors.firstName)"
            />
            <p id="firstName-help" class="help">80 caractères maximum.</p>
            <p v-if="errors.firstName" id="firstName-error" class="error">
              {{ errors.firstName }}
            </p>
          </div>

          <div class="field">
            <label for="lastName">Nom *</label>
            <input
              id="lastName"
              v-model.trim="reservation.participant.lastName"
              type="text"
              autocomplete="family-name"
              maxlength="80"
              placeholder="Votre nom"
              aria-describedby="lastName-help lastName-error"
              :aria-invalid="Boolean(errors.lastName)"
            />
            <p id="lastName-help" class="help">80 caractères maximum.</p>
            <p v-if="errors.lastName" id="lastName-error" class="error">
              {{ errors.lastName }}
            </p>
          </div>
        </div>

        <div class="field wide">
          <label for="email">Adresse e-mail *</label>

          <input
            id="email"
            v-model.trim="reservation.participant.email"
            type="email"
            autocomplete="email"
            maxlength="255"
            placeholder="exemple@email.fr"
            aria-describedby="email-help email-error"
            :aria-invalid="Boolean(errors.email)"
          />

          <p id="email-help" class="help">
            La confirmation et le lien de gestion de votre réservation seront envoyés à cette
            adresse.
          </p>

          <p v-if="errors.email" id="email-error" class="error">
            {{ errors.email }}
          </p>
        </div>

        <div class="field wide">
          <label for="item">Objet ou appareil *</label>

          <input
            id="item"
            v-model.trim="reservation.participant.item"
            type="text"
            maxlength="160"
            placeholder="Ordinateur portable"
            aria-describedby="item-help item-error"
            :aria-invalid="Boolean(errors.item)"
          />

          <p id="item-help" class="help">160 caractères maximum.</p>

          <p v-if="errors.item" id="item-error" class="error">
            {{ errors.item }}
          </p>
        </div>

        <div class="field wide">
          <label for="problem">Décrivez brièvement le problème *</label>

          <textarea
            id="problem"
            v-model.trim="reservation.participant.problem"
            maxlength="2000"
            placeholder="Exemple : l'ordinateur ne démarre plus depuis une mise à jour."
            aria-describedby="problem-help problem-error"
            :aria-invalid="Boolean(errors.problem)"
          />

          <p id="problem-help" class="help">
            Décrivez simplement ce que vous observez. Aucun diagnostic technique n'est demandé.
            2 000 caractères maximum.
          </p>

          <p v-if="errors.problem" id="problem-error" class="error">
            {{ errors.problem }}
          </p>
        </div>

        <section class="privacy">
          <strong>À propos de vos données</strong>

          <p>
            Ces informations sont utilisées uniquement pour organiser votre réservation et votre
            prise en charge à l'atelier.
          </p>
        </section>

        <div class="actions">
          <AppButton to="/reservation/heure" variant="secondary"> Retour </AppButton>

          <AppButton type="submit"> Continuer </AppButton>
        </div>

        <p class="next-step">Prochaine étape : vérifier votre réservation</p>
      </form>
    </main>
  </div>
</template>

<script setup lang="ts">
import { nextTick, reactive } from 'vue'
import { useRouter } from 'vue-router'

import AppHeader from '../components/AppHeader.vue'
import AppButton from '../components/ui/AppButton.vue'
import { useReservationStore } from '../stores/reservation'

const router = useRouter()
const reservation = useReservationStore()

const errors = reactive({
  firstName: '',
  lastName: '',
  email: '',
  item: '',
  problem: '',
})

const fieldOrder = ['firstName', 'lastName', 'email', 'item', 'problem'] as const

function validate() {
  // Client-side validation improves immediate feedback; the API remains authoritative for booking data.
  errors.firstName = reservation.participant.firstName ? '' : 'Le prénom est obligatoire.'

  errors.lastName = reservation.participant.lastName ? '' : 'Le nom est obligatoire.'

  errors.item = reservation.participant.item ? '' : "L'objet ou l'appareil est obligatoire."

  errors.problem = reservation.participant.problem
    ? ''
    : 'La description du problème est obligatoire.'

  if (!reservation.participant.email) {
    errors.email = "L'adresse e-mail est obligatoire."
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reservation.participant.email)) {
    errors.email = "L'adresse e-mail n'est pas valide."
  } else {
    errors.email = ''
  }

  return !Object.values(errors).some(Boolean)
}

async function submit() {
  if (!validate()) {
    await nextTick()

    const firstInvalidField = fieldOrder.find((field) => Boolean(errors[field]))

    if (firstInvalidField) {
      document.getElementById(firstInvalidField)?.focus()
    }

    return
  }

  await router.push('/reservation/verifier')
}
</script>

<style scoped>
.participant-page {
  max-width: 1060px;

  padding-top: 48px;
  padding-bottom: 96px;
}

.back-link {
  display: inline-block;
  margin-bottom: 22px;

  color: #4b5563;
  font-size: 14px;
}

h1 {
  margin: 0 0 8px;

  font-size: 28px;
  line-height: 36px;
}

.intro {
  margin: 0;

  color: #4b5563;
  line-height: 24px;
}

.selection-summary {
  max-width: 900px;
  margin-top: 32px;
  padding: 20px 24px;

  border: 1px solid #d1d5db;
  border-radius: 12px;

  background: #f3f4f6;
}

.selection-summary > strong {
  font-size: 14px;
}

.summary-grid {
  margin-top: 16px;

  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px;
}

.summary-grid span,
.summary-grid b,
.summary-grid small {
  display: block;

  font-size: 14px;
}

.summary-grid span {
  margin-bottom: 2px;
  color: #4b5563;
  font-weight: 400;
}

.summary-grid b {
  font-weight: 500;
}

.summary-grid small {
  margin-top: 2px;
  color: #4b5563;
}

.modify-link {
  display: inline-block;
  margin-top: 14px;

  color: #1d4ed8;
  font-size: 14px;
}

form {
  max-width: 800px;
  margin-top: 44px;
}

h2 {
  margin: 0 0 24px;

  font-size: 20px;
  line-height: 28px;
}

.two-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.field {
  margin-bottom: 20px;
}

.field label {
  display: block;
  margin-bottom: 8px;

  font-size: 14px;
  font-weight: 500;
}

input,
textarea {
  width: 100%;

  border: 1px solid #d1d5db;
  border-radius: 8px;

  background: white;
  color: #111827;

  font: inherit;
  font-size: 16px;
}

input {
  height: 48px;
  padding: 0 16px;
}

textarea {
  min-height: 120px;
  padding: 14px 16px;
  resize: vertical;
}

input::placeholder,
textarea::placeholder {
  color: #999ea8;
}

input:focus,
textarea:focus {
  outline: 2px solid #166534;
  outline-offset: 1px;
}

input[aria-invalid='true'],
textarea[aria-invalid='true'] {
  border-color: #b91c1c;
}

.error {
  margin: 6px 0 0;

  color: #b91c1c;
  font-size: 13px;
}

.help {
  margin: 8px 0 0;

  color: #4b5563;
  font-size: 14px;
  line-height: 20px;
}

.privacy {
  margin-top: 24px;
}

.privacy strong {
  font-size: 14px;
}

.privacy p {
  color: #4b5563;
  font-size: 14px;
  line-height: 20px;
}

.actions {
  margin-top: 32px;

  display: flex;
  gap: 12px;
}

.next-step {
  margin-top: 12px;

  color: #4b5563;
  font-size: 14px;
}

@media (max-width: 768px) {
  .participant-page {
    padding-top: 32px;
  }

  h1 {
    font-size: 24px;
    line-height: 32px;
  }

  .selection-summary {
    padding: 16px;
  }

  .summary-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .two-columns {
    grid-template-columns: 1fr;
    gap: 0;
  }

  .actions {
    flex-direction: column;
  }
}
</style>
