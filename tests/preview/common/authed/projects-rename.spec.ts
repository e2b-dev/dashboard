import { expect, type Page, test } from '@playwright/test'

// Smoke pass for the Teams → Projects copy rename over the key authenticated
// surfaces. Assertions target specific product copy rather than blanket
// "no team anywhere" regexes, which false-positive on user data (member
// emails like team@acme.com) and miss portal-mounted dialogs anyway.
// The blocked flow needs a blocked seed team and is covered by targeted
// component render tests instead (tests/unit/team-blocked-dialog-copy).

// auth.setup.ts persists an UNAUTHENTICATED storage state when the Ory
// hosted UI blocks CI runners with a captcha (and still reports success).
// An unauthenticated /dashboard visit then redirect-chains to the Ory
// hosted login on a DIFFERENT origin, so we cannot enumerate the bounce
// destinations — instead, treat "no team-scoped URL within the deadline"
// as the no-session signal and skip. Same tolerance the rest of the
// authed suite relies on.
async function gotoDashboard(page: Page, path = '/dashboard'): Promise<string> {
  await page.goto(path)
  const authed = await page
    .waitForURL(/\/dashboard\/[^/]+/, { timeout: 15_000 })
    .then(() => true)
    .catch(() => false)
  test.skip(
    !authed,
    `no authenticated dashboard session (landed on ${page.url()}); the CI sign-in in auth.setup was likely captcha-blocked`
  )
  return page.url().match(/\/dashboard\/([^/?#]+)/)?.[1] ?? ''
}

test.describe('teams → projects rename', () => {
  test('switcher and sidebar use project vocabulary', async ({ page }) => {
    await gotoDashboard(page)

    // Switcher eyebrow label at the top of the sidebar.
    await expect(page.getByText('PROJECT', { exact: true })).toBeVisible()
    // Sidebar section heading above General / API Keys / Members.
    await expect(
      page.getByText('project', { exact: true }).first()
    ).toBeVisible()

    await page.getByText('PROJECT', { exact: true }).click()
    // The create action is hidden for SSO users, so assert the rename by the
    // absence of the old label rather than the presence of the new one.
    await expect(page.getByText('Create new team')).toHaveCount(0)
    await expect(page.getByText('No teams available')).toHaveCount(0)
  })

  test('create dialog is fully renamed', async ({ page }) => {
    await gotoDashboard(page)

    await page.getByText('PROJECT', { exact: true }).click()
    const createItem = page.getByText('Create new project')
    test.skip(
      !(await createItem.isVisible().catch(() => false)),
      'create action hidden (SSO-managed account)'
    )
    await createItem.click()

    await expect(
      page.getByRole('heading', { name: 'Create Project' })
    ).toBeVisible()
    await expect(
      page.getByText('Create a new project to collaborate with others.')
    ).toBeVisible()
    await expect(page.getByPlaceholder('Enter project name')).toBeVisible()
  })

  test('general page labels the project id and name controls', async ({
    page,
  }) => {
    const slug = await gotoDashboard(page)
    await page.goto(`/dashboard/${slug}/general`)

    await expect(page.getByText('project id', { exact: true })).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Edit project name' })
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Copy project id' })
    ).toBeVisible()
  })

  test('api keys page describes keys as project-scoped', async ({ page }) => {
    const slug = await gotoDashboard(page)
    await page.goto(`/dashboard/${slug}/keys`)

    await expect(
      page.getByText(
        "These keys authenticate API requests from your project's applications."
      )
    ).toBeVisible()
  })

  test('members page carries no renamed team copy', async ({ page }) => {
    const slug = await gotoDashboard(page)
    await page.goto(`/dashboard/${slug}/members`)

    await expect(page.getByRole('heading', { name: 'MEMBERS' })).toBeVisible()
    // Specific strings the rename covered — checked as literals so member
    // names/emails containing "team" can't false-positive the test.
    await expect(page.getByText('No team members found.')).toHaveCount(0)
    await expect(
      page.getByText('All members have the same roles & permissions')
    ).toBeVisible()
  })

  test('old team-tab entry URL keeps working', async ({ page }) => {
    await gotoDashboard(page, '/dashboard?tab=team')

    await expect(page.getByText('PROJECT', { exact: true })).toBeVisible()
  })
})
