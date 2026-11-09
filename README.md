# Testbed

Testbed is a small task app for testing Rehearsal's GitHub integrations for real. Vercel deploys it from this repository, so every pull request gets a preview and every merge to `main` gets a production deployment. Four things then test it: the Rehearsal GitHub Action, the check the Rehearsal GitHub App posts from Vercel's deployments, the Rehearsal CLI in a workflow, and Retest tests on GitHub's Ubuntu runner.

The app has no build step and no dependencies. Vercel serves `public/` as it is, and `vercel.json` turns off the install and build steps. The packages in `package.json` are only for the Retest tests.

## The app

Sign in with the test account. These are public test values, and nothing else accepts them.

| Email | Password |
| --- | --- |
| `member@testbed.test` | `TestbedMember123!` |

The browser checks the password, because the app has no server. A wrong password shows "Wrong email or password. Try again." Once signed in, you can add a task, mark it done and back, show all, open or done tasks, and delete a task after a confirm dialog. Each account's tasks are kept in `localStorage`, so they survive a reload and stay in that one browser. Sign out returns to the sign-in page.

Every field has a label and every button a name a person can find. The controls and the list items also carry `data-testid` values, such as `new-task-title`, `task-item` and `task-done`.

To look at it on your computer, run `npm start` and open http://127.0.0.1:4380.

## Plant a bug

`public/bugs.js` exports `PLANTED_BUG`, which is empty while the app works. Each of these values breaks one behaviour:

| Value | What breaks | Retest test that fails |
| --- | --- | --- |
| `title-drops-last-letter` | A saved task loses the last letter of its title. | shows the title of a new task |
| `done-does-not-stick` | A task marked done is open again after a reload. | keeps a done task done after a reload |
| `sign-in-always-fails` | The right password is refused. | signs in with the test account, and the two tests that sign in first |

Planting a bug is a one-line pull request. Its preview has the bug, so Retest fails in CI, and Rehearsal's checks fail when its saved tests cover that behaviour. Close the pull request afterwards, or set the value back to `''` before you merge.

## Run the Retest tests

You need Node.js 24.12 or later and Google Chrome.

```sh
npm ci
npx retest run
```

Retest starts `scripts/serve.mjs` on port 4380 when nothing answers there, runs `tests/tasks.retest.ts` in Chrome, and stops the server at the end. Each run keeps its events, logs and screenshots in `.retest/runs/`, which git ignores. `npm run typecheck` checks the tests' types.

## The workflows

`retest.yml` runs on every push to `main` and every pull request. It installs the packages with `npm ci`, checks the tests' types and runs `npx retest run` on `ubuntu-24.04`. Retest's `chrome()` finds the Google Chrome that GitHub's image installs at `/opt/google/chrome/chrome`. When a test fails, the job uploads `.retest/runs` as the `retest-runs` artifact.

`rehearsal-action.yml` runs on every push to `main` and every pull request into `main`. It waits up to ten minutes for Vercel to report a successful deployment of the commit, which on a pull request is its newest commit. It reads the deployment's address from GitHub's Deployments API and hands it to `rehearsal-labs/run@v1`, with the rule for the event. The Action signs in with GitHub's identity for the workflow, so it needs no Rehearsal secret. It waits for the run and fails the job when a test fails. The run also posts a check on the commit, named `Rehearsal · main` for a push and `Rehearsal` for a pull request.

`rehearsal-cli.yml` runs on every push to `main`, and when you start it from the Actions tab. It signs in from the `REHEARSAL_CREDENTIALS` secret and starts every approved test of the app on its production environment with `rehearsal runs start`. Then `rehearsal runs wait` follows the run and fails the job unless every test passed. The workflow has the shape of the example in Rehearsal's docs, [Run it in GitHub Actions](https://rehearsal.dev/docs/cli/run-tests#github-actions), so a green run shows that the example works. It tests whatever the production address serves when it starts, which can be the commit before while Vercel is still deploying the new one.

Rehearsal's own pull-request check needs no workflow. The Rehearsal GitHub App hears Vercel's deployment of each pull request and runs the Vercel rule's tests on that preview.

Each workflow stops with one sentence that names the variable or secret it is missing.

## One-time setup

1. Create the private repository `rehearsal-labs/testbed` and push this folder to `main`.
2. Import the repository in Vercel, in the `rehearsal-labs` team, as a project named `testbed`. Keep the build settings as they are, because `vercel.json` already says there is nothing to install or build. Then open Settings, then Deployment Protection, and turn Vercel Authentication off. Rehearsal's browsers cannot get past Vercel's sign-in. Vercel's Standard Protection also covers each production deployment's own address, which the push workflow tests, so opening only the previews is not enough. Note the production address Vercel lists under Domains. It is `https://testbed-rehearsal-labs.vercel.app`, unless `testbed.vercel.app` was free.
3. In Rehearsal, create a project named `testbed` with one app named `web`. Give `web` a production environment at the production address. Add a second environment of the kind preview at `https://testbed-git-main-rehearsal-labs.vercel.app`, the address Vercel keeps for the newest deployment of `main`. Add the test account to both environments, since each environment keeps its own.
4. Connect the repository. In Rehearsal, open Settings, then Repository, choose `rehearsal-labs/testbed`, and install the Rehearsal GitHub App on it when GitHub asks.
5. Create tests. In Rehearsal's chat, ask Re:agent to sign in, add a task, and mark a task done and reload, on the production environment, and save each flow it finds. Rehearsal writes and checks a test from each flow. Wait until `rehearsal tests list` shows every test as ready. A rule runs only approved tests, and a test that is not ready keeps a run from passing.
6. Add three rules. Open Pull requests, then Rules, then Add a rule, and pick All approved tests for each one.
   - When a branch is updated, branch `main`, address to test the production environment, with An address from GitHub Actions. Under Extra preview hosts, add `testbed-*-rehearsal-labs.vercel.app`. The workflow sends the commit's own deployment address, such as `https://testbed-4f9k2m1xq-rehearsal-labs.vercel.app`, and that is not a subdomain of the production address. This rule's ID goes in `REHEARSAL_PUSH_RULE`.
   - When a pull request is opened or updated, into `main`, address to test the preview environment, with An address from GitHub Actions and the same extra preview host. This rule's ID goes in `REHEARSAL_PULL_REQUEST_RULE`.
   - When a pull request is opened or updated, into `main`, address to test the production environment, with The pull request's Vercel preview and Require passing tests before merging turned on.

   Rehearsal allows one live rule for each environment, trigger and branch. That is why the two pull-request rules sit on two environments. Both post a check named `Rehearsal`, so each pull request shows two checks with that name. You can also hold both Action rules to `.github/workflows/rehearsal-action.yml` under Workflow file.

   Vercel names a commit's deployment `testbed-<9 letters and digits>-rehearsal-labs.vercel.app` and a branch's `testbed-git-<branch>-rehearsal-labs.vercel.app`. The host pattern matches both.
7. Set the repository variables, with `gh` or under Settings, then Secrets and variables, then Actions. `rehearsal workspaces list` prints the workspace ID, and `rehearsal projects list` the project's slug, which `REHEARSAL_PROJECT` takes, as does an ID.

   ```sh
   gh variable set REHEARSAL_PUSH_RULE --repo rehearsal-labs/testbed --body <push-rule-id>
   gh variable set REHEARSAL_PULL_REQUEST_RULE --repo rehearsal-labs/testbed --body <pull-request-rule-id>
   gh variable set REHEARSAL_WORKSPACE_ID --repo rehearsal-labs/testbed --body <workspace-id>
   gh variable set REHEARSAL_PROJECT --repo rehearsal-labs/testbed --body <project-slug>
   gh variable set REHEARSAL_APP --repo rehearsal-labs/testbed --body web
   ```

8. Add the `REHEARSAL_CREDENTIALS` secret the way Rehearsal's docs show. Make the sign-in in a folder of its own, so that signing in again on your computer later leaves it alone. Store it as the secret, then delete the folder.

   ```sh
   XDG_CONFIG_HOME="$HOME/.rehearsal-ci" rehearsal login --scope testing:read --scope testing:run
   gh secret set REHEARSAL_CREDENTIALS --repo rehearsal-labs/testbed < "$HOME/.rehearsal-ci/rehearsal/credentials.json"
   rm -r "$HOME/.rehearsal-ci"
   ```

   The secret acts as you, with your permissions, and starting a run needs Manage projects in the workspace. It lasts 30 days. After that, `rehearsal-cli.yml` fails with exit code 3, and you make a new one the same way.

No Rehearsal or Vercel secret is ever written into this repository. The Action signs in with GitHub's identity for each workflow run, and the CLI's sign-in lives only in the repository secret.

## Required checks on GitHub Free

GitHub does not enforce required checks on a private repository in an organisation on the Free plan. The Vercel rule's check still shows on every pull request, but a failing one does not block the merge. So here the merge gate can be seen and not enforced. Enforcing it needs a paid GitHub plan or a public repository.

## Files

| Path | What it holds |
| --- | --- |
| `public/` | The app: `index.html`, `app.js`, `styles.css` and the planted-bug switch `bugs.js` |
| `vercel.json` | Serve `public/` with no install and no build |
| `scripts/serve.mjs` | A static server for `public/` with no dependencies, which the Retest config starts |
| `retest.config.ts` | One app, `web`, on Google Chrome |
| `tests/tasks.retest.ts` | Four tests: sign in, a new task's title, a done task after a reload, a wrong password |
| `.github/workflows/` | `retest.yml`, `rehearsal-action.yml` and `rehearsal-cli.yml` |
