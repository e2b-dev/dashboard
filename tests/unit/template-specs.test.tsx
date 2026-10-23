import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { TemplateSpecs } from '@/features/dashboard/templates/detail/overview/template-specs'

const build = {
  cpuCount: 2,
  memoryMB: 512,
  diskSizeMB: 1024,
  envdVersion: '0.2.0',
}

it('shows the disk size of a build that recorded one', () => {
  const html = renderToStaticMarkup(<TemplateSpecs build={build} />)

  expect(html).toContain('1,024')
})

it('hides the disk size of a build that recorded none (0)', () => {
  const html = renderToStaticMarkup(
    <TemplateSpecs build={{ ...build, diskSizeMB: 0 }} />
  )

  expect(html).toContain('512')
  expect(html).not.toMatch(/>0<!-- --> MB|>0 MB/)
})
