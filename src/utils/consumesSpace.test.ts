import { describe, expect, it } from 'vitest'
import { consumesSpace } from './consumesSpace'

describe('consumesSpace', () => {
  it.each(['input', 'textarea', 'button', 'a'])('is true for a <%s> element', (tag) => {
    expect(consumesSpace(document.createElement(tag))).toBe(true)
  })

  // contentEditable/isContentEditable is unimplemented in jsdom (setting the
  // property is a silent no-op there), so that branch can't be exercised in
  // this test environment — covered by live-browser verification instead.

  it('is true for an element with role="button"', () => {
    const div = document.createElement('div')
    div.setAttribute('role', 'button')
    expect(consumesSpace(div)).toBe(true)
  })

  it('is false for a plain div', () => {
    expect(consumesSpace(document.createElement('div'))).toBe(false)
  })

  it('is false for the document body (nothing specific focused)', () => {
    expect(consumesSpace(document.body)).toBe(false)
  })
})
