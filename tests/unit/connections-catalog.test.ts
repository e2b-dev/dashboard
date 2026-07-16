import { describe, expect, it } from 'vitest'
import { mergeConnectionCatalog } from '@/features/dashboard/connections/catalog'

describe('mergeConnectionCatalog', () => {
  it('appends additional connections after declared connections', () => {
    expect(
      mergeConnectionCatalog(
        [
          {
            name: 'Declared',
            template: 'declared-template',
            description: 'Declared connection',
          },
        ],
        [
          {
            name: 'Development',
            template: 'development-template',
            description: 'Development connection',
          },
        ]
      )
    ).toEqual([
      {
        name: 'Declared',
        template: 'declared-template',
        description: 'Declared connection',
      },
      {
        name: 'Development',
        template: 'development-template',
        description: 'Development connection',
      },
    ])
  })

  it('keeps declared connections when templates collide', () => {
    expect(
      mergeConnectionCatalog(
        [
          {
            name: 'Declared',
            template: 'shared-template',
            description: 'Declared connection',
          },
        ],
        [
          {
            name: 'Override',
            template: 'shared-template',
            description: 'Flag connection',
          },
        ]
      )
    ).toEqual([
      {
        name: 'Declared',
        template: 'shared-template',
        description: 'Declared connection',
      },
    ])
  })

  it('deduplicates repeated additional templates', () => {
    expect(
      mergeConnectionCatalog(
        [],
        [
          {
            name: 'First',
            template: 'shared-template',
            description: 'First connection',
          },
          {
            name: 'Second',
            template: 'shared-template',
            description: 'Second connection',
          },
        ]
      )
    ).toEqual([
      {
        name: 'First',
        template: 'shared-template',
        description: 'First connection',
      },
    ])
  })
})
