import type { Page } from '@rehearsal-labs/retest'
import { expect, test } from '@rehearsal-labs/retest'

// The app's public test account, written in the README too.
const EMAIL = 'member@testbed.test'
const PASSWORD = 'TestbedMember123!'

async function signIn(page: Page, password = PASSWORD): Promise<void> {
  await page.goto('/')
  await page.getByLabel('Email').fill(EMAIL)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
}

async function addTask(page: Page, title: string): Promise<void> {
  await page.getByLabel('New task').fill(title)
  await page.getByRole('button', { name: 'Add task' }).click()
}

test('signs in with the test account', async ({ page }) => {
  await signIn(page)
  await expect(page.getByRole('heading', { name: 'Tasks' })).toBeVisible()
  await expect(page.getByTestId('signed-in-as')).toHaveText(EMAIL)
})

test('shows the title of a new task', async ({ page }) => {
  await signIn(page)
  await addTask(page, 'Write the release notes')
  await expect(page.getByTestId('task-title')).toHaveText('Write the release notes')
  await expect(page.getByTestId('task-count')).toHaveText('1 task, 0 done')
})

test('keeps a done task done after a reload', async ({ page }) => {
  await signIn(page)
  await addTask(page, 'Book the venue')
  await page.getByTestId('task-done').check()
  await expect(page.getByTestId('task-count')).toHaveText('1 task, 1 done')

  await page.reload()
  await expect(page.getByTestId('task-done')).toBeChecked()
  await page.getByRole('button', { name: 'Done' }).click()
  await expect(page.getByTestId('task-item')).toHaveCount(1)
})

test('shows an error for a wrong password', async ({ page }) => {
  await signIn(page, 'not-the-password')
  await expect(page.getByTestId('sign-in-error')).toHaveText('Wrong email or password. Try again.')
  await expect(page.getByRole('heading', { name: 'Tasks' })).toBeHidden()
})
