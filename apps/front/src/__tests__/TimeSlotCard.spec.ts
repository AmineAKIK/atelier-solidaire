import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import TimeSlotCard from '../components/TimeSlotCard.vue'

describe('TimeSlotCard', () => {
  it('disables a full slot and does not emit select', async () => {
    const wrapper = mount(TimeSlotCard, {
      props: {
        time: '11:00',
        status: 'full',
      },
    })

    const button = wrapper.get('button')

    expect(button.attributes('disabled')).toBeDefined()
    expect(button.text()).toContain('Complet')

    await button.trigger('click')

    expect(wrapper.emitted('select')).toBeUndefined()
  })
})
