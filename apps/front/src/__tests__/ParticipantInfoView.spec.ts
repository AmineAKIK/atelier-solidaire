import { nextTick } from 'vue'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import ParticipantInfoView from '../views/ParticipantInfoView.vue'

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/reservation/heure', component: { template: '<div />' } },
      { path: '/reservation/verifier', component: { template: '<div />' } },
    ],
  })
}

async function mountView() {
  const router = createTestRouter()
  const pinia = createPinia()

  await router.push('/')
  await router.isReady()

  const wrapper = mount(ParticipantInfoView, {
    attachTo: document.body,
    global: {
      plugins: [pinia, router],
    },
  })

  return wrapper
}

describe('ParticipantInfoView', () => {
  it('marks empty required fields invalid and focuses the first invalid field', async () => {
    const wrapper = await mountView()

    await wrapper.get('form').trigger('submit')
    await nextTick()

    for (const fieldId of ['firstName', 'lastName', 'email', 'item', 'problem']) {
      expect(wrapper.get('#' + fieldId).attributes('aria-invalid')).toBe('true')
    }

    expect(document.activeElement).toBe(wrapper.get('#firstName').element)

    wrapper.unmount()
  })

  it('shows the expected message for an invalid email address', async () => {
    const wrapper = await mountView()

    await wrapper.get('#firstName').setValue('Amine')
    await wrapper.get('#lastName').setValue('Akik')
    await wrapper.get('#email').setValue('adresse-invalide')
    await wrapper.get('#item').setValue('Ordinateur portable')
    await wrapper.get('#problem').setValue('Il ne démarre plus.')

    await wrapper.get('form').trigger('submit')
    await nextTick()

    expect(wrapper.get('#email-error').text()).toBe("L'adresse e-mail n'est pas valide.")
    expect(wrapper.get('#email').attributes('aria-invalid')).toBe('true')

    wrapper.unmount()
  })
})
