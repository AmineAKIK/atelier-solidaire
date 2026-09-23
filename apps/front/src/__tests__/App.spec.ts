import { describe, expect, it } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { RouterView } from 'vue-router'

import App from '../App.vue'

describe('App', () => {
  it('renders the router outlet', () => {
    const wrapper = shallowMount(App)

    expect(wrapper.findComponent(RouterView).exists()).toBe(true)
  })
})
